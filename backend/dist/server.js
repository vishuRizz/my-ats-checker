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
const recruiter_search_1 = require("./engine/recruiter-search");
const linkedin_scanner_1 = require("./engine/linkedin-scanner");
const client_1 = require("./db/client");
const schema_1 = require("./db/schema");
const drizzle_orm_1 = require("drizzle-orm");
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
        let clerkId = request.headers["x-clerk-user-id"] || null;
        let userEmail = request.headers["x-clerk-user-email"] || null;
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
            else if (part.type === "field") {
                if (part.fieldname === "jd")
                    jdText = part.value;
                if (part.fieldname === "clerkId")
                    clerkId = part.value;
                if (part.fieldname === "userEmail")
                    userEmail = part.value;
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
        let persistedResumeId = null;
        if (client_1.db) {
            const capturedBuffer = fileBuffer;
            const capturedClerkId = clerkId;
            const capturedUserEmail = userEmail;
            const capturedJdText = jdText;
            setImmediate(async () => {
                try {
                    let dbUserId = null;
                    if (capturedClerkId) {
                        const existingUsers = await client_1.db
                            .select()
                            .from(schema_1.users)
                            .where((0, drizzle_orm_1.eq)(schema_1.users.clerkId, capturedClerkId))
                            .limit(1);
                        if (existingUsers.length > 0) {
                            dbUserId = existingUsers[0].id;
                            if (capturedUserEmail && existingUsers[0].email !== capturedUserEmail) {
                                await client_1.db
                                    .update(schema_1.users)
                                    .set({ email: capturedUserEmail, updatedAt: new Date() })
                                    .where((0, drizzle_orm_1.eq)(schema_1.users.id, dbUserId));
                            }
                        }
                        else {
                            const [newUser] = await client_1.db
                                .insert(schema_1.users)
                                .values({
                                clerkId: capturedClerkId,
                                email: capturedUserEmail || null,
                            })
                                .returning({ id: schema_1.users.id });
                            dbUserId = newUser.id;
                        }
                    }
                    let jdRowId = null;
                    if (capturedJdText && capturedJdText.trim()) {
                        const [jdRow] = await client_1.db
                            .insert(schema_1.jobDescriptions)
                            .values({
                            userId: dbUserId,
                            rawText: capturedJdText.trim(),
                            extractedRequirements: analysisResult.keywordReport
                                ? {
                                    matched: analysisResult.keywordReport.matched,
                                    missing: analysisResult.keywordReport.missing,
                                }
                                : null,
                        })
                            .returning({ id: schema_1.jobDescriptions.id });
                        jdRowId = jdRow.id;
                    }
                    const [resumeRow] = await client_1.db
                        .insert(schema_1.resumes)
                        .values({
                        userId: dbUserId,
                        filename,
                        fileType: parseResult.fileType,
                        fileSizeBytes: capturedBuffer.length,
                        status: "done",
                        deleteAt: dbUserId ? null : new Date(Date.now() + 24 * 60 * 60 * 1000),
                    })
                        .returning({ id: schema_1.resumes.id });
                    persistedResumeId = resumeRow.id;
                    await client_1.db.insert(schema_1.parseResults).values({
                        resumeId: resumeRow.id,
                        parserVersion: parseResult.parserVersion || "2.0.0",
                        pageCount: parseResult.pageCount,
                        isMultiColumn: parseResult.isMultiColumn,
                        isImageOnly: parseResult.isImageOnly,
                        readingOrderText: parseResult.readingOrderText,
                        bestEffortText: parseResult.bestEffortText,
                        sections: parseResult.sections,
                        entities: parseResult.entities,
                        lostRegions: parseResult.lostRegions,
                        warnings: parseResult.warnings,
                    });
                    await client_1.db.insert(schema_1.analyses).values({
                        resumeId: resumeRow.id,
                        jdId: jdRowId,
                        scoreBreakdown: analysisResult.scoreBreakdown,
                        keywordReport: analysisResult.keywordReport,
                        vendorReports: analysisResult.vendorReports,
                        rules: analysisResult.rules,
                    });
                    fastify.log.info({ event: "analysis.persisted", resumeId: resumeRow.id, userId: dbUserId }, "Persisted scan to DB");
                }
                catch (e) {
                    fastify.log.warn({ event: "analysis.persistence_failed", err: e?.message }, "DB persistence failed");
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
// ─── GET /api/user/scans ──────────────────────────────────────
// Returns all past scans for an authenticated Clerk user
fastify.get("/api/user/scans", async (request, reply) => {
    if (!client_1.db)
        return reply.send({ scans: [] });
    const { clerkId } = request.query;
    if (!clerkId) {
        return reply.status(400).send({ error: "missing_clerk_id", message: "clerkId is required." });
    }
    try {
        const userRecord = await client_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.clerkId, clerkId)).limit(1);
        if (userRecord.length === 0) {
            return reply.send({ scans: [] });
        }
        const userResumes = await client_1.db
            .select({
            id: schema_1.resumes.id,
            filename: schema_1.resumes.filename,
            fileType: schema_1.resumes.fileType,
            fileSizeBytes: schema_1.resumes.fileSizeBytes,
            uploadedAt: schema_1.resumes.uploadedAt,
            status: schema_1.resumes.status,
            scoreBreakdown: schema_1.analyses.scoreBreakdown,
            keywordReport: schema_1.analyses.keywordReport,
        })
            .from(schema_1.resumes)
            .leftJoin(schema_1.analyses, (0, drizzle_orm_1.eq)(schema_1.analyses.resumeId, schema_1.resumes.id))
            .where((0, drizzle_orm_1.eq)(schema_1.resumes.userId, userRecord[0].id))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.resumes.uploadedAt));
        const scans = userResumes.map((r) => {
            const sb = r.scoreBreakdown;
            const kw = r.keywordReport;
            return {
                id: r.id,
                filename: r.filename,
                fileType: r.fileType,
                fileSizeBytes: r.fileSizeBytes,
                uploadedAt: r.uploadedAt,
                overallScore: sb?.overall ?? 0,
                hasJD: Boolean(kw),
                matchRate: kw?.matchRate ?? null,
                requiredMatchRate: kw?.requiredMatchRate ?? null,
            };
        });
        return reply.send({ scans });
    }
    catch (err) {
        fastify.log.error({ event: "get_scans_failed", err: err?.message }, "Failed to get user scans");
        return reply.status(500).send({ error: "db_error", message: "Failed to load scans." });
    }
});
// ─── GET /api/scans/:id ───────────────────────────────────────
// Returns full analysis payload for a saved scan
fastify.get("/api/scans/:id", async (request, reply) => {
    if (!client_1.db)
        return reply.status(503).send({ error: "db_unavailable" });
    const { id } = request.params;
    try {
        const resumeRows = await client_1.db.select().from(schema_1.resumes).where((0, drizzle_orm_1.eq)(schema_1.resumes.id, id)).limit(1);
        if (resumeRows.length === 0) {
            return reply.status(404).send({ error: "not_found", message: "Scan not found." });
        }
        const analysisRows = await client_1.db.select().from(schema_1.analyses).where((0, drizzle_orm_1.eq)(schema_1.analyses.resumeId, id)).limit(1);
        const parseRows = await client_1.db.select().from(schema_1.parseResults).where((0, drizzle_orm_1.eq)(schema_1.parseResults.resumeId, id)).limit(1);
        let jdText = "";
        if (analysisRows[0]?.jdId) {
            const jdRows = await client_1.db.select().from(schema_1.jobDescriptions).where((0, drizzle_orm_1.eq)(schema_1.jobDescriptions.id, analysisRows[0].jdId)).limit(1);
            jdText = jdRows[0]?.rawText || "";
        }
        if (!analysisRows[0] || !parseRows[0]) {
            return reply.status(404).send({ error: "analysis_missing", message: "Scan details unavailable." });
        }
        return reply.send({
            filename: resumeRows[0].filename,
            parseResult: parseRows[0],
            rules: analysisRows[0].rules || [],
            keywordReport: analysisRows[0].keywordReport || null,
            scoreBreakdown: analysisRows[0].scoreBreakdown,
            vendorReports: analysisRows[0].vendorReports || [],
            engineVersion: "2.0.0",
            jdText,
            meta: {
                parseTimeMs: 0,
                totalTimeMs: 0,
                filename: resumeRows[0].filename,
                fileSize: resumeRows[0].fileSizeBytes || 0,
            },
        });
    }
    catch (err) {
        fastify.log.error({ event: "get_scan_detail_failed", err: err?.message }, "Failed to get scan details");
        return reply.status(500).send({ error: "db_error", message: "Failed to load scan." });
    }
});
// ─── POST /api/simulator/boolean-search ───────────────────────
// Evaluates boolean queries (AND / OR / NOT / quotes) against resume text
fastify.post("/api/simulator/boolean-search", async (request, reply) => {
    const { query, resumeText } = request.body;
    if (!query || typeof query !== "string") {
        return reply.status(400).send({ error: "missing_query", message: "Search query is required." });
    }
    const result = (0, recruiter_search_1.evaluateRecruiterQuery)(query, resumeText || "");
    return reply.send(result);
});
// ─── GET /api/linkedin/demos ──────────────────────────────────
fastify.get("/api/linkedin/demos", async (_request, reply) => {
    return reply.send({
        demos: Object.entries(linkedin_scanner_1.DEMO_PROFILES).map(([id, p]) => ({
            id,
            name: p.name,
            role: p.targetRole,
            headline: p.headline,
            company: p.currentCompany,
        })),
    });
});
// ─── POST /api/linkedin/scan ──────────────────────────────────
fastify.post("/api/linkedin/scan", async (request, reply) => {
    try {
        let url;
        let targetRole;
        let profileText;
        let demoId;
        if (request.isMultipart()) {
            let fileBuffer = null;
            let filename = "linkedin_profile.pdf";
            let mimeType = "application/pdf";
            const parts = request.parts();
            for await (const part of parts) {
                if (part.type === "file") {
                    filename = part.filename || "linkedin_profile.pdf";
                    mimeType = part.mimetype;
                    fileBuffer = await part.toBuffer();
                }
                else if (part.type === "field") {
                    if (part.fieldname === "url")
                        url = part.value;
                    if (part.fieldname === "targetRole")
                        targetRole = part.value;
                    if (part.fieldname === "profileText")
                        profileText = part.value;
                    if (part.fieldname === "demoId")
                        demoId = part.value;
                }
            }
            if (fileBuffer) {
                try {
                    const parsed = await (0, index_1.parse)(fileBuffer, mimeType, filename);
                    profileText = parsed.bestEffortText || parsed.readingOrderText;
                }
                catch (e) {
                    fastify.log.warn({ err: e?.message }, "Failed to parse uploaded LinkedIn PDF");
                }
            }
        }
        else {
            const body = request.body;
            if (body) {
                url = body.url;
                targetRole = body.targetRole;
                profileText = body.profileText;
                demoId = body.demoId;
            }
        }
        if (!url && !profileText && !demoId) {
            return reply.status(400).send({
                error: "missing_input",
                message: "Please provide a LinkedIn URL, paste profile text, upload a PDF, or pick a demo.",
            });
        }
        const auditResult = await (0, linkedin_scanner_1.auditLinkedInProfile)({
            url,
            targetRole,
            profileText,
            demoId,
        });
        return reply.status(200).send(auditResult);
    }
    catch (err) {
        fastify.log.error({ err: err?.message }, "LinkedIn scan failed");
        return reply.status(500).send({
            error: "scan_failed",
            message: err?.message || "Failed to audit LinkedIn profile. Please try again.",
        });
    }
});
// ─── DELETE /api/scans/:id ────────────────────────────────────
fastify.delete("/api/scans/:id", async (request, reply) => {
    if (!client_1.db)
        return reply.status(503).send({ error: "db_unavailable" });
    const { id } = request.params;
    try {
        await client_1.db.delete(schema_1.resumes).where((0, drizzle_orm_1.eq)(schema_1.resumes.id, id));
        return reply.send({ success: true });
    }
    catch (err) {
        return reply.status(500).send({ error: "delete_failed", message: "Unable to delete scan." });
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
