// ============================================================
// Fastify Server - ATS Checker Backend
// Routes: POST /api/analyze
// ============================================================

import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { parse, analyze } from "./engine/index";
import { extractBullets } from "./engine/bullet-extractor";
import { rewriteBullets } from "./llm/bullet-rewriter";
import { generateApplicationKit } from "./llm/application-kit";
import { extractJDRequirements } from "./engine/keyword-matcher";
import { db } from "./db/client";
import { resumes, analyses } from "./db/schema";
import { z } from "zod";

const PORT = parseInt(process.env.PORT || "3001", 10);
const HOST = process.env.HOST || "0.0.0.0";
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const ANALYZE_LIMIT = parseInt(process.env.ANALYZE_LIMIT_PER_HOUR || "10", 10);
const SUGGEST_LIMIT = parseInt(process.env.SUGGEST_LIMIT_PER_HOUR || "5", 10);
const KIT_LIMIT = parseInt(process.env.KIT_LIMIT_PER_HOUR || "5", 10);
const MAX_JOB_DESCRIPTION_CHARACTERS = 20_000;

const suggestRequestSchema = z.object({
  parseResult: z.object({
    bestEffortText: z.string().max(100_000).optional(),
    sections: z.array(z.object({
      name: z.string().min(1).max(100),
      text: z.string().max(20_000),
    }).passthrough()).max(100),
  }).passthrough(),
  jdText: z.string().max(20_000).optional(),
});

const generateKitSchema = z.object({
  parseResult: z.object({
    bestEffortText: z.string().max(100_000).optional(),
    readingOrderText: z.string().max(100_000).optional(),
    sections: z.array(z.object({
      name: z.string().min(1).max(100),
      text: z.string().max(20_000),
    }).passthrough()).max(100).optional(),
    entities: z.object({
      name: z.object({ value: z.string() }).optional(),
      skills: z.array(z.string()).optional(),
    }).passthrough().optional(),
  }).passthrough(),
  jdText: z.string().min(10, "Job description is required to tailor the application kit.").max(20_000),
  type: z.enum(["cover_letter", "linkedin_summary"]),
  tone: z.enum(["professional", "confident", "concise"]).optional(),
});

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info",
    transport:
      process.env.NODE_ENV !== "production"
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined,
  },
});

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const analyzeCallsPerIp = new Map<string, RateLimitRecord>();
const suggestCallsPerIp = new Map<string, RateLimitRecord>();
const kitCallsPerIp = new Map<string, RateLimitRecord>();

function consumeRateLimit(store: Map<string, RateLimitRecord>, ip: string, limit: number): number | null {
  const now = Date.now();
  const record = store.get(ip);
  if (record && record.resetAt > now && record.count >= limit) return record.resetAt;

  if (!record || record.resetAt <= now) {
    store.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  } else {
    record.count += 1;
  }

  // Keep the simple in-memory limiter bounded until a shared limiter is added with auth.
  if (store.size > 10_000) {
    for (const [key, value] of store) if (value.resetAt <= now) store.delete(key);
  }
  return null;
}

// ─── Plugins ─────────────────────────────────────────────────

fastify.register(cors, {
  origin: true,
  methods: ["GET", "POST", "OPTIONS"],
});

fastify.register(multipart, {
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1,
  },
});

// ─── Health Check ─────────────────────────────────────────────

fastify.get("/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString(), dbConnected: !!db };
});

// ─── POST /api/analyze ────────────────────────────────────────
// Accepts multipart form:
//   - resume: File (PDF or DOCX, max 5MB)
//   - jd: string (optional, job description text)

fastify.post("/api/analyze", async (request, reply) => {
  const startTime = Date.now();

  let fileBuffer: Buffer | null = null;
  let filename = "resume";
  let mimeType = "application/octet-stream";
  let jdText: string | null = null;

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
        if (
          !allowedMimes.includes(part.mimetype) &&
          !part.filename?.toLowerCase().endsWith(".pdf") &&
          !part.filename?.toLowerCase().endsWith(".docx")
        ) {
          await part.toBuffer(); // drain the stream
          return reply.status(400).send({
            error: "invalid_file_type",
            message: "Only PDF and DOCX files are accepted.",
          });
        }

        filename = part.filename || "resume";
        mimeType = part.mimetype;
        fileBuffer = await part.toBuffer();
      } else if (part.type === "field" && part.fieldname === "jd") {
        jdText = (part as any).value as string;
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
    const parseResult = await parse(fileBuffer, mimeType, filename);
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
    const analysisResult = await analyze(parseResult, jdText || null);
    const totalTime = Date.now() - startTime;
    fastify.log.info({
      event: "analysis.completed",
      requestId: request.id,
      hasJobDescription: Boolean(jdText?.trim()),
      durationMs: totalTime,
    }, "Analysis complete");

    // ─── Persist to DB (fire-and-forget, never blocks response) ──
    // PRD §5.1: persist resumes + analyses. Anonymous users get 24h auto-delete.
    if (db) {
      const capturedBuffer = fileBuffer;
      setImmediate(async () => {
        try {
          const [resumeRow] = await db!
            .insert(resumes)
            .values({
              filename,
              fileType: parseResult.fileType,
              fileSizeBytes: capturedBuffer.length,
              status: "done",
              // Auto-delete in 24h for anonymous uploads (PRD §9)
              deleteAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            })
            .returning({ id: resumes.id });

          await db!.insert(analyses).values({
            resumeId: resumeRow.id,
            scoreBreakdown: analysisResult.scoreBreakdown as any,
            keywordReport: analysisResult.keywordReport as any,
            rules: analysisResult.rules as any,
          });

          fastify.log.info({ event: "analysis.persisted", resumeId: resumeRow.id }, "Persisted resume+analysis to DB");
        } catch {
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
  } catch (err: any) {
    const message = err?.message || "An unexpected error occurred during analysis.";
    const isUserError =
      message.includes("too large") ||
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
    const bullets = extractBullets(parseResult);
    if (bullets.length === 0) {
      return reply.status(200).send({
        suggestions: [],
        source: "none",
        message: "No bullet points found in experience or projects sections.",
      });
    }

    // Extract JD keywords for alignment hints
    const jdKeywords = jdText.trim().length > 20
      ? extractJDRequirements(jdText).map((r) => r.keyword)
      : [];

    // Call Groq rewriter
    const suggestions = await rewriteBullets(bullets, jdKeywords, parseResult.bestEffortText ?? "");

    const usedLLM = suggestions.some((s) => s.suggested !== s.original);

    fastify.log.info(
      { event: "suggest.completed", requestId: request.id, bulletCount: bullets.length, suggestionCount: suggestions.length, usedLLM, durationMs: Date.now() - startTime },
      "Suggest complete"
    );

    return reply.status(200).send({
      suggestions,
      source: usedLLM ? "llm" : "rule_based",
    });
  } catch (err: any) {
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

    const kitResult = await generateApplicationKit({
      candidateName,
      resumeText,
      skills,
      jdText,
      type,
      tone,
    });

    fastify.log.info(
      { event: "generate_kit.completed", requestId: request.id, type, durationMs: Date.now() - startTime },
      "Generate kit completed"
    );

    return reply.status(200).send(kitResult);
  } catch (err: any) {
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
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
