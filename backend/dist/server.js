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
const keyword_matcher_1 = require("./engine/keyword-matcher");
const client_1 = require("./db/client");
const schema_1 = require("./db/schema");
const PORT = parseInt(process.env.PORT || "3001", 10);
const HOST = process.env.HOST || "0.0.0.0";
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";
const fastify = (0, fastify_1.default)({
    logger: {
        level: process.env.LOG_LEVEL || "info",
        transport: process.env.NODE_ENV !== "production"
            ? { target: "pino-pretty", options: { colorize: true } }
            : undefined,
    },
});
// ─── Plugins ─────────────────────────────────────────────────
fastify.register(cors_1.default, {
    origin: ALLOWED_ORIGIN === "*" ? true : [ALLOWED_ORIGIN, "http://localhost:3000"],
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
        // ─── Parse ────────────────────────────────────────────────
        fastify.log.info({ filename, mimeType, size: fileBuffer.length }, "Starting parse");
        const parseResult = await (0, index_1.parse)(fileBuffer, mimeType, filename);
        const parseTime = Date.now() - startTime;
        fastify.log.info({ parseTime, sections: parseResult.sections.length }, "Parse complete");
        // ─── Analyze ──────────────────────────────────────────────
        const analysisResult = await (0, index_1.analyze)(parseResult, jdText || null);
        const totalTime = Date.now() - startTime;
        fastify.log.info({ totalTime, score: analysisResult.scoreBreakdown.overall }, "Analysis complete");
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
                    fastify.log.info({ resumeId: resumeRow.id }, "Persisted resume+analysis to DB");
                }
                catch (dbErr) {
                    // DB errors never surface to the user
                    fastify.log.warn(dbErr, "DB persistence failed (non-fatal)");
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
                jdText: jdText ?? undefined,
            },
        });
    }
    catch (err) {
        fastify.log.error(err, "Analysis error");
        // Return user-friendly errors without PII
        const message = err?.message || "An unexpected error occurred during analysis.";
        const isUserError = message.includes("too large") ||
            message.includes("password-protected") ||
            message.includes("Unsupported file") ||
            message.includes("Failed to open") ||
            message.includes("Failed to parse");
        return reply.status(isUserError ? 400 : 500).send({
            error: isUserError ? "parse_error" : "internal_error",
            message,
        });
    }
});
// ─── POST /api/suggest ────────────────────────────────────────
// Accepts JSON body: { parseResult: ParseResult, jdText?: string }
// Returns: { suggestions: BulletSuggestion[], source: "llm" | "rule_based" }
const suggestCallsPerIp = new Map();
const SUGGEST_LIMIT = 5; // free calls per hour per IP
fastify.post("/api/suggest", async (request, reply) => {
    // Simple IP-based rate limiting
    const ip = request.ip ?? "unknown";
    const now = Date.now();
    const record = suggestCallsPerIp.get(ip);
    if (record && record.resetAt > now && record.count >= SUGGEST_LIMIT) {
        return reply.status(429).send({
            error: "rate_limited",
            message: `Free AI rewrite limit reached (${SUGGEST_LIMIT}/hour). Try again later.`,
            resetAt: record.resetAt,
        });
    }
    if (!record || record.resetAt <= now) {
        suggestCallsPerIp.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
    }
    else {
        record.count++;
    }
    try {
        const body = request.body;
        if (!body?.parseResult) {
            return reply.status(400).send({ error: "missing_parse_result", message: "parseResult is required." });
        }
        const parseResult = body.parseResult;
        const jdText = body.jdText ?? "";
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
        fastify.log.info({ bulletCount: bullets.length, suggestionCount: suggestions.length, usedLLM }, "Suggest complete");
        return reply.status(200).send({
            suggestions,
            source: usedLLM ? "llm" : "rule_based",
        });
    }
    catch (err) {
        fastify.log.error(err, "Suggest error");
        return reply.status(500).send({
            error: "suggest_error",
            message: err?.message || "Failed to generate suggestions.",
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
