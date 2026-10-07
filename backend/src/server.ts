// ============================================================
// Fastify Server — ATS Checker Backend
// Routes: POST /api/analyze
// ============================================================

import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { parse, analyze } from "./engine/index";
import { db } from "./db/client";
import { resumes, analyses } from "./db/schema";

const PORT = parseInt(process.env.PORT || "3001", 10);
const HOST = process.env.HOST || "0.0.0.0";
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info",
    transport:
      process.env.NODE_ENV !== "production"
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined,
  },
});

// ─── Plugins ─────────────────────────────────────────────────

fastify.register(cors, {
  origin: ALLOWED_ORIGIN === "*" ? true : [ALLOWED_ORIGIN, "http://localhost:3000"],
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

    // ─── Parse ────────────────────────────────────────────────
    fastify.log.info({ filename, mimeType, size: fileBuffer.length }, "Starting parse");
    const parseResult = await parse(fileBuffer, mimeType, filename);
    const parseTime = Date.now() - startTime;
    fastify.log.info({ parseTime, sections: parseResult.sections.length }, "Parse complete");

    // ─── Analyze ──────────────────────────────────────────────
    const analysisResult = await analyze(parseResult, jdText || null);
    const totalTime = Date.now() - startTime;
    fastify.log.info({ totalTime, score: analysisResult.scoreBreakdown.overall }, "Analysis complete");

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

          fastify.log.info({ resumeId: resumeRow.id }, "Persisted resume+analysis to DB");
        } catch (dbErr) {
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
      },
    });
  } catch (err: any) {
    fastify.log.error(err, "Analysis error");

    // Return user-friendly errors without PII
    const message = err?.message || "An unexpected error occurred during analysis.";
    const isUserError =
      message.includes("too large") ||
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
