"use strict";
// ============================================================
// Fastify Server - ATS Checker Backend
// Routes: POST /api/analyze
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const multipart_1 = __importDefault(require("@fastify/multipart"));
const index_1 = require("./engine/index");
const bullet_extractor_1 = require("./engine/bullet-extractor");
const bullet_rewriter_1 = require("./llm/bullet-rewriter");
const application_kit_1 = require("./llm/application-kit");
const keyword_matcher_1 = require("./engine/keyword-matcher");
const client_1 = require("./db/client");
const schema_1 = require("./db/schema");
const zod_1 = require("zod");
const PORT = parseInt(process.env.PORT || "3001", 10);
const HOST = process.env.HOST || "0.0.0.0";
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const ANALYZE_LIMIT = parseInt(process.env.ANALYZE_LIMIT_PER_HOUR || "10", 10);
const SUGGEST_LIMIT = parseInt(process.env.SUGGEST_LIMIT_PER_HOUR || "5", 10);
const KIT_LIMIT = parseInt(process.env.KIT_LIMIT_PER_HOUR || "5", 10);
const MAX_JOB_DESCRIPTION_CHARACTERS = 20_000;
const suggestRequestSchema = zod_1.z.object({
    parseResult: zod_1.z.object({
        bestEffortText: zod_1.z.string().max(100_000).optional(),
        sections: zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string().min(1).max(100),
            text: zod_1.z.string().max(20_000),
        }).passthrough()).max(100),
    }).passthrough(),
    jdText: zod_1.z.string().max(20_000).optional(),
});
const generateKitSchema = zod_1.z.object({
    parseResult: zod_1.z.object({
        bestEffortText: zod_1.z.string().max(100_000).optional(),
        readingOrderText: zod_1.z.string().max(100_000).optional(),
        sections: zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string().min(1).max(100),
            text: zod_1.z.string().max(20_000),
        }).passthrough()).max(100).optional(),
        entities: zod_1.z.object({
            name: zod_1.z.object({ value: zod_1.z.string() }).optional(),
            skills: zod_1.z.array(zod_1.z.string()).optional(),
        }).passthrough().optional(),
    }).passthrough(),
    jdText: zod_1.z.string().min(10, "Job description is required to tailor the application kit.").max(20_000),
    type: zod_1.z.enum(["cover_letter", "linkedin_summary"]),
    tone: zod_1.z.enum(["professional", "confident", "concise"]).optional(),
});
const fastify = (0, fastify_1.default)({
    logger: {
        level: process.env.LOG_LEVEL || "info",
        transport: process.env.NODE_ENV !== "production"
            ? { target: "pino-pretty", options: { colorize: true } }
            : undefined,
    },
});
const analyzeCallsPerIp = new Map();
const suggestCallsPerIp = new Map();
const kitCallsPerIp = new Map();
function consumeRateLimit(store, ip, limit) {
    const now = Date.now();
    const record = store.get(ip);
    if (record && record.resetAt > now && record.count >= limit)
        return record.resetAt;
    if (!record || record.resetAt <= now) {
        store.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    }
    else {
        record.count += 1;
    }
    // Keep the simple in-memory limiter bounded until a shared limiter is added with auth.
    if (store.size > 10_000) {
        for (const [key, value] of store)
            if (value.resetAt <= now)
                store.delete(key);
    }
    return null;
}
// ─── Plugins ─────────────────────────────────────────────────
fastify.register(cors_1.default, {
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
});
fastify.register(multipart_1.default, {
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 1,
    },
});
// ─── Health Check ─────────────────────────────────────────────
fastify.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString(), dbConnected: !!client_1.db };
});
// ─── POST /api/analyze ────────────────────────────────────────
// Accepts multipart form:
//   - resume: File (PDF or DOCX, max 5MB)
//   - jd: string (optional, job description text)
fastify.post("/api/analyze", async (request, reply) => {
    const startTime = Date.now();
    let fileBuffer = null;
    let filename = "resume";
    let mimeType = "application/octet-stream";
    let jdText = null;
    try {
        const rateLimitResetAt = consumeRateLimit(analyzeCallsPerIp, request.ip ?? "unknown", ANALYZE_LIMIT);
        if (rateLimitResetAt) {
            return reply.status(429).send({
                error: "rate_limited",
                message: `Free analysis limit reached (${ANALYZE_LIMIT}/hour). Try again later.`,
                resetAt: rateLimitResetAt,
            });
        }
        const parts = request.parts();
        for await (const part of parts) {
            if (part.type === "file" && part.fieldname === "resume") {
                // Validate file type early
                const allowedMimes = [
                    "application/pdf",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ];
                if (!allowedMimes.includes(part.mimetype) &&
                    !part.filename?.toLowerCase().endsWith(".pdf") &&
                    !part.filename?.toLowerCase().endsWith(".docx")) {
                    await part.toBuffer(); // drain the stream
                    return reply.status(400).send({
                        error: "invalid_file_type",
                        message: "Only PDF and DOCX files are accepted.",
                    });
                }
                filename = part.filename || "resume";
                mimeType = part.mimetype;
                fileBuffer = await part.toBuffer();
            }
            else if (part.type === "field" && part.fieldname === "jd") {
                jdText = part.value;
            }
        }
        if (!fileBuffer) {
            return reply.status(400).send({
                error: "missing_file",
                message: "No resume file was uploaded. Please attach a PDF or DOCX.",
            });
        }
        if (jdText && jdText.length > MAX_JOB_DESCRIPTION_CHARACTERS) {
            return reply.status(400).send({
                error: "job_description_too_large",
                message: `Job description must be ${MAX_JOB_DESCRIPTION_CHARACTERS.toLocaleString()} characters or fewer.`,
            });
        }
        // ─── Parse ────────────────────────────────────────────────
        const parseResult = await (0, index_1.parse)(fileBuffer, mimeType, filename);
        const parseTime = Date.now() - startTime;
        fastify.log.info({
            event: "analysis.parse_completed",
            requestId: request.id,
            fileType: parseResult.fileType,
            fileSizeBytes: fileBuffer.length,
            pageCount: parseResult.pageCount,
            sectionCount: parseResult.sections.length,
            durationMs: parseTime,
        }, "Parse complete");
        // ─── Analyze ──────────────────────────────────────────────
        const analysisResult = await (0, index_1.analyze)(parseResult, jdText || null);
        const totalTime = Date.now() - startTime;
        fastify.log.info({
            event: "analysis.completed",
            requestId: request.id,
            hasJobDescription: Boolean(jdText?.trim()),
            durationMs: totalTime,
        }, "Analysis complete");
        // ─── Persist to DB (fire-and-forget, never blocks response) ──
        // PRD §5.1: persist resumes + analyses. Anonymous users get 24h auto-delete.
        if (client_1.db) {
            const capturedBuffer = fileBuffer;
            setImmediate(async () => {
                try {
                    const [resumeRow] = await client_1.db
                        .insert(schema_1.resumes)
                        .values({
                        filename,
                        fileType: parseResult.fileType,
                        fileSizeBytes: capturedBuffer.length,
                        status: "done",
                        // Auto-delete in 24h for anonymous uploads (PRD §9)
                        deleteAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                    })
                        .returning({ id: schema_1.resumes.id });
                    await client_1.db.insert(schema_1.analyses).values({
                        resumeId: resumeRow.id,
                        scoreBreakdown: analysisResult.scoreBreakdown,
                        keywordReport: analysisResult.keywordReport,
                        rules: analysisResult.rules,
                    });
                    fastify.log.info({ event: "analysis.persisted", resumeId: resumeRow.id }, "Persisted resume+analysis to DB");
                }
                catch {
                    // DB errors never surface to the user
                    fastify.log.warn({ event: "analysis.persistence_failed" }, "DB persistence failed (non-fatal)");
                }
            });
        }
        return reply.status(200).send({
            ...analysisResult,
            meta: {
                parseTimeMs: parseTime,
                totalTimeMs: totalTime,
                filename,
                fileSize: fileBuffer.length,
            },
        });
    }
    catch (err) {
        const message = err?.message || "An unexpected error occurred during analysis.";
        const isUserError = message.includes("too large") ||
            message.includes("password-protected") ||
            message.includes("Unsupported") ||
            message.includes("invalid file") ||
            message.includes("Maximum is") ||
            message.includes("contains too much text") ||
            message.includes("Failed to open") ||
            message.includes("Failed to parse");
        fastify.log.error({
            event: "analysis.failed",
            requestId: request.id,
            errorType: isUserError ? "invalid_upload" : "internal_error",
            durationMs: Date.now() - startTime,
        }, "Analysis failed");
        return reply.status(isUserError ? 400 : 500).send({
            error: isUserError ? "parse_error" : "internal_error",
            message: isUserError ? message : "Unable to analyze this resume right now. Please try again.",
        });
    }
});
// ─── POST /api/suggest ────────────────────────────────────────
// Accepts JSON body: { parseResult: ParseResult, jdText?: string }
// Returns: { suggestions: BulletSuggestion[], source: "llm" | "rule_based" }
fastify.post("/api/suggest", async (request, reply) => {
    const startTime = Date.now();
    const rateLimitResetAt = consumeRateLimit(suggestCallsPerIp, request.ip ?? "unknown", SUGGEST_LIMIT);
    if (rateLimitResetAt) {
        return reply.status(429).send({
            error: "rate_limited",
            message: `Free AI rewrite limit reached (${SUGGEST_LIMIT}/hour). Try again later.`,
            resetAt: rateLimitResetAt,
        });
    }
    try {
        const validation = suggestRequestSchema.safeParse(request.body);
        if (!validation.success) {
            return reply.status(400).send({
                error: "invalid_suggest_request",
                message: "A parsed resume with valid sections is required.",
            });
        }
        const parseResult = validation.data.parseResult;
        const jdText = validation.data.jdText ?? "";
        // Extract bullets from parse result
        const bullets = (0, bullet_extractor_1.extractBullets)(parseResult);
        if (bullets.length === 0) {
            return reply.status(200).send({
                suggestions: [],
                source: "none",
                message: "No bullet points found in experience or projects sections.",
            });
        }
        // Extract JD keywords for alignment hints
        const jdKeywords = jdText.trim().length > 20
            ? (0, keyword_matcher_1.extractJDRequirements)(jdText).map((r) => r.keyword)
            : [];
        // Call Groq rewriter
        const suggestions = await (0, bullet_rewriter_1.rewriteBullets)(bullets, jdKeywords, parseResult.bestEffortText ?? "");
        const usedLLM = suggestions.some((s) => s.suggested !== s.original);
        fastify.log.info({ event: "suggest.completed", requestId: request.id, bulletCount: bullets.length, suggestionCount: suggestions.length, usedLLM, durationMs: Date.now() - startTime }, "Suggest complete");
        return reply.status(200).send({
            suggestions,
            source: usedLLM ? "llm" : "rule_based",
        });
    }
    catch (err) {
        fastify.log.error({ event: "suggest.failed", requestId: request.id, durationMs: Date.now() - startTime }, "Suggest failed");
        return reply.status(500).send({
            error: "suggest_error",
            message: "Unable to create suggestions right now. Please try again.",
        });
    }
});
// ─── POST /api/generate-kit ──────────────────────────────────
// Accepts JSON body: { parseResult, jdText, type: "cover_letter" | "linkedin_summary", tone? }
// Returns: { content: string, type, keyMatchesHighlighted: string[], wordCount: number }
fastify.post("/api/generate-kit", async (request, reply) => {
    const startTime = Date.now();
    const rateLimitResetAt = consumeRateLimit(kitCallsPerIp, request.ip ?? "unknown", KIT_LIMIT);
    if (rateLimitResetAt) {
        return reply.status(429).send({
            error: "rate_limited",
            message: `Free application kit limit reached (${KIT_LIMIT}/hour). Try again later.`,
            resetAt: rateLimitResetAt,
        });
    }
    try {
        const validation = generateKitSchema.safeParse(request.body);
        if (!validation.success) {
            return reply.status(400).send({
                error: "invalid_kit_request",
                message: validation.error.issues[0]?.message || "Invalid application kit request.",
            });
        }
        const { parseResult, jdText, type, tone } = validation.data;
        const resumeText = parseResult.bestEffortText || parseResult.readingOrderText || "";
        const candidateName = parseResult.entities?.name?.value || "Candidate";
        const skills = parseResult.entities?.skills || [];
        const kitResult = await (0, application_kit_1.generateApplicationKit)({
            candidateName,
            resumeText,
            skills,
            jdText,
            type,
            tone,
        });
        fastify.log.info({ event: "generate_kit.completed", requestId: request.id, type, durationMs: Date.now() - startTime }, "Generate kit completed");
        return reply.status(200).send(kitResult);
    }
    catch (err) {
        fastify.log.error({ event: "generate_kit.failed", requestId: request.id, durationMs: Date.now() - startTime }, "Generate kit failed");
        return reply.status(500).send({
            error: "kit_generation_error",
            message: "Unable to generate application kit right now. Please try again.",
        });
    }
});
// ─── Start ────────────────────────────────────────────────────
const start = async () => {
    try {
        await fastify.listen({ port: PORT, host: HOST });
        fastify.log.info(`ATS Checker backend running on http://${HOST}:${PORT}`);
    }
    catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};
start();
