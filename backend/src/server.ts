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
import { evaluateRecruiterQuery } from "./engine/recruiter-search";
import { auditLinkedInProfile, DEMO_PROFILES } from "./engine/linkedin-scanner";
import { matchJobDescription, quickTailorBullets, detectVendorFromUrl } from "./engine/extension-service";
import { db } from "./db/client";
import { resumes, analyses, users, jobDescriptions, parseResults } from "./db/schema";
import { eq, desc } from "drizzle-orm";
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

    let clerkId: string | null = (request.headers["x-clerk-user-id"] as string) || null;
    let userEmail: string | null = (request.headers["x-clerk-user-email"] as string) || null;

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
      } else if (part.type === "field") {
        if (part.fieldname === "jd") jdText = (part as any).value as string;
        if (part.fieldname === "clerkId") clerkId = (part as any).value as string;
        if (part.fieldname === "userEmail") userEmail = (part as any).value as string;
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
    let persistedResumeId: string | null = null;
    if (db) {
      const capturedBuffer = fileBuffer;
      const capturedClerkId = clerkId;
      const capturedUserEmail = userEmail;
      const capturedJdText = jdText;

      setImmediate(async () => {
        try {
          let dbUserId: string | null = null;
          if (capturedClerkId) {
            const existingUsers = await db!
              .select()
              .from(users)
              .where(eq(users.clerkId, capturedClerkId))
              .limit(1);

            if (existingUsers.length > 0) {
              dbUserId = existingUsers[0].id;
              if (capturedUserEmail && existingUsers[0].email !== capturedUserEmail) {
                await db!
                  .update(users)
                  .set({ email: capturedUserEmail, updatedAt: new Date() })
                  .where(eq(users.id, dbUserId));
              }
            } else {
              const [newUser] = await db!
                .insert(users)
                .values({
                  clerkId: capturedClerkId,
                  email: capturedUserEmail || null,
                })
                .returning({ id: users.id });
              dbUserId = newUser.id;
            }
          }

          let jdRowId: string | null = null;
          if (capturedJdText && capturedJdText.trim()) {
            const [jdRow] = await db!
              .insert(jobDescriptions)
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
              .returning({ id: jobDescriptions.id });
            jdRowId = jdRow.id;
          }

          const [resumeRow] = await db!
            .insert(resumes)
            .values({
              userId: dbUserId,
              filename,
              fileType: parseResult.fileType,
              fileSizeBytes: capturedBuffer.length,
              status: "done",
              deleteAt: dbUserId ? null : new Date(Date.now() + 24 * 60 * 60 * 1000),
            })
            .returning({ id: resumes.id });

          persistedResumeId = resumeRow.id;

          await db!.insert(parseResults).values({
            resumeId: resumeRow.id,
            parserVersion: parseResult.parserVersion || "2.0.0",
            pageCount: parseResult.pageCount,
            isMultiColumn: parseResult.isMultiColumn,
            isImageOnly: parseResult.isImageOnly,
            readingOrderText: parseResult.readingOrderText,
            bestEffortText: parseResult.bestEffortText,
            sections: parseResult.sections as any,
            entities: parseResult.entities as any,
            lostRegions: parseResult.lostRegions as any,
            warnings: parseResult.warnings as any,
          });

          await db!.insert(analyses).values({
            resumeId: resumeRow.id,
            jdId: jdRowId,
            scoreBreakdown: analysisResult.scoreBreakdown as any,
            keywordReport: analysisResult.keywordReport as any,
            vendorReports: analysisResult.vendorReports as any,
            rules: analysisResult.rules as any,
          });

          fastify.log.info({ event: "analysis.persisted", resumeId: resumeRow.id, userId: dbUserId }, "Persisted scan to DB");
        } catch (e: any) {
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

// ─── GET /api/user/scans ──────────────────────────────────────
// Returns all past scans for an authenticated Clerk user
fastify.get("/api/user/scans", async (request, reply) => {
  if (!db) return reply.send({ scans: [] });
  const { clerkId } = request.query as { clerkId?: string };
  if (!clerkId) {
    return reply.status(400).send({ error: "missing_clerk_id", message: "clerkId is required." });
  }

  try {
    const userRecord = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
    if (userRecord.length === 0) {
      return reply.send({ scans: [] });
    }

    const userResumes = await db
      .select({
        id: resumes.id,
        filename: resumes.filename,
        fileType: resumes.fileType,
        fileSizeBytes: resumes.fileSizeBytes,
        uploadedAt: resumes.uploadedAt,
        status: resumes.status,
        scoreBreakdown: analyses.scoreBreakdown,
        keywordReport: analyses.keywordReport,
      })
      .from(resumes)
      .leftJoin(analyses, eq(analyses.resumeId, resumes.id))
      .where(eq(resumes.userId, userRecord[0].id))
      .orderBy(desc(resumes.uploadedAt));

    const scans = userResumes.map((r) => {
      const sb = r.scoreBreakdown as any;
      const kw = r.keywordReport as any;
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
  } catch (err: any) {
    fastify.log.error({ event: "get_scans_failed", err: err?.message }, "Failed to get user scans");
    return reply.status(500).send({ error: "db_error", message: "Failed to load scans." });
  }
});

// ─── GET /api/scans/:id ───────────────────────────────────────
// Returns full analysis payload for a saved scan
fastify.get("/api/scans/:id", async (request, reply) => {
  if (!db) return reply.status(503).send({ error: "db_unavailable" });
  const { id } = request.params as { id: string };

  try {
    const resumeRows = await db.select().from(resumes).where(eq(resumes.id, id)).limit(1);
    if (resumeRows.length === 0) {
      return reply.status(404).send({ error: "not_found", message: "Scan not found." });
    }

    const analysisRows = await db.select().from(analyses).where(eq(analyses.resumeId, id)).limit(1);
    const parseRows = await db.select().from(parseResults).where(eq(parseResults.resumeId, id)).limit(1);
    let jdText = "";
    if (analysisRows[0]?.jdId) {
      const jdRows = await db.select().from(jobDescriptions).where(eq(jobDescriptions.id, analysisRows[0].jdId)).limit(1);
      jdText = jdRows[0]?.rawText || "";
    }

    if (!analysisRows[0] || !parseRows[0]) {
      return reply.status(404).send({ error: "analysis_missing", message: "Scan details unavailable." });
    }

    return reply.send({
      filename: resumeRows[0].filename,
      parseResult: parseRows[0],
      rules: (analysisRows[0].rules as any) || [],
      keywordReport: (analysisRows[0].keywordReport as any) || null,
      scoreBreakdown: analysisRows[0].scoreBreakdown as any,
      vendorReports: (analysisRows[0].vendorReports as any) || [],
      engineVersion: "2.0.0",
      jdText,
      meta: {
        parseTimeMs: 0,
        totalTimeMs: 0,
        filename: resumeRows[0].filename,
        fileSize: resumeRows[0].fileSizeBytes || 0,
      },
    });
  } catch (err: any) {
    fastify.log.error({ event: "get_scan_detail_failed", err: err?.message }, "Failed to get scan details");
    return reply.status(500).send({ error: "db_error", message: "Failed to load scan." });
  }
});

// ─── POST /api/simulator/boolean-search ───────────────────────
// Evaluates boolean queries (AND / OR / NOT / quotes) against resume text
fastify.post("/api/simulator/boolean-search", async (request, reply) => {
  const { query, resumeText } = request.body as { query?: string; resumeText?: string };
  if (!query || typeof query !== "string") {
    return reply.status(400).send({ error: "missing_query", message: "Search query is required." });
  }

  const result = evaluateRecruiterQuery(query, resumeText || "");
  return reply.send(result);
});

// ─── GET /api/linkedin/demos ──────────────────────────────────
fastify.get("/api/linkedin/demos", async (_request, reply) => {
  return reply.send({
    demos: Object.entries(DEMO_PROFILES).map(([id, p]) => ({
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
    let url: string | undefined;
    let targetRole: string | undefined;
    let profileText: string | undefined;
    let demoId: string | undefined;

    if (request.isMultipart()) {
      let fileBuffer: Buffer | null = null;
      let filename = "linkedin_profile.pdf";
      let mimeType = "application/pdf";

      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === "file") {
          filename = part.filename || "linkedin_profile.pdf";
          mimeType = part.mimetype;
          fileBuffer = await part.toBuffer();
        } else if (part.type === "field") {
          if (part.fieldname === "url") url = (part as any).value;
          if (part.fieldname === "targetRole") targetRole = (part as any).value;
          if (part.fieldname === "profileText") profileText = (part as any).value;
          if (part.fieldname === "demoId") demoId = (part as any).value;
        }
      }

      if (fileBuffer) {
        try {
          const parsed = await parse(fileBuffer, mimeType, filename);
          profileText = parsed.bestEffortText || parsed.readingOrderText;
        } catch (e: any) {
          fastify.log.warn({ err: e?.message }, "Failed to parse uploaded LinkedIn PDF");
        }
      }
    } else {
      const body = request.body as any;
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

    const auditResult = await auditLinkedInProfile({
      url,
      targetRole,
      profileText,
      demoId,
    });

    return reply.status(200).send(auditResult);
  } catch (err: any) {
    fastify.log.error({ err: err?.message }, "LinkedIn scan failed");
    return reply.status(500).send({
      error: "scan_failed",
      message: err?.message || "Failed to audit LinkedIn profile. Please try again.",
    });
  }
});

// ─── GET /api/extension/sync ──────────────────────────────────
fastify.get("/api/extension/sync", async (request, reply) => {
  const { clerkId, email } = request.query as { clerkId?: string; email?: string };

  if (!db) {
    return reply.send({
      authenticated: false,
      user: null,
      activeResume: null,
      allResumes: [],
      message: "Database unavailable in demo mode",
    });
  }

  try {
    let userRow: any = null;
    if (clerkId) {
      const usersFound = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
      userRow = usersFound[0];
    } else if (email) {
      const usersFound = await db.select().from(users).where(eq(users.email, email)).limit(1);
      userRow = usersFound[0];
    }

    if (!userRow) {
      return reply.send({
        authenticated: false,
        user: null,
        activeResume: null,
        allResumes: [],
        message: "User not found or not signed in yet",
      });
    }

    const userResumes = await db
      .select({
        id: resumes.id,
        filename: resumes.filename,
        fileType: resumes.fileType,
        uploadedAt: resumes.uploadedAt,
        scoreBreakdown: analyses.scoreBreakdown,
        entities: parseResults.entities,
        sections: parseResults.sections,
      })
      .from(resumes)
      .leftJoin(analyses, eq(analyses.resumeId, resumes.id))
      .leftJoin(parseResults, eq(parseResults.resumeId, resumes.id))
      .where(eq(resumes.userId, userRow.id))
      .orderBy(desc(resumes.uploadedAt));

    const active = userResumes[0] || null;
    const activeScore = (active?.scoreBreakdown as any)?.overall ?? null;
    const activeEntities = active?.entities as any;
    const activeSkills = activeEntities?.skills || [];

    return reply.send({
      authenticated: true,
      user: {
        id: userRow.id,
        email: userRow.email,
        clerkId: userRow.clerkId,
      },
      activeResume: active
        ? {
            id: active.id,
            filename: active.filename,
            fileType: active.fileType,
            uploadedAt: active.uploadedAt,
            overallScore: activeScore,
            skills: activeSkills.slice(0, 30),
          }
        : null,
      allResumes: userResumes.map((r) => ({
        id: r.id,
        filename: r.filename,
        fileType: r.fileType,
        uploadedAt: r.uploadedAt,
        overallScore: (r.scoreBreakdown as any)?.overall ?? 0,
      })),
    });
  } catch (err: any) {
    fastify.log.error({ err: err?.message }, "Extension sync failed");
    return reply.status(500).send({ error: "sync_failed", message: "Failed to sync profile" });
  }
});

// ─── POST /api/extension/match ────────────────────────────────
fastify.post("/api/extension/match", async (request, reply) => {
  const {
    clerkId,
    resumeId,
    resumeText,
    jobTitle,
    company,
    jobUrl,
    jdText,
  } = request.body as {
    clerkId?: string;
    resumeId?: string;
    resumeText?: string;
    jobTitle?: string;
    company?: string;
    jobUrl?: string;
    jdText?: string;
  };

  if (!jdText || jdText.trim().length < 20) {
    return reply.status(400).send({
      error: "invalid_jd",
      message: "Job description is too short to evaluate requirements.",
    });
  }

  try {
    let parseResultData: any = null;

    if (db && resumeId) {
      const rows = await db.select().from(parseResults).where(eq(parseResults.resumeId, resumeId)).limit(1);
      if (rows[0]) parseResultData = rows[0];
    } else if (db && clerkId) {
      const userRows = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
      if (userRows[0]) {
        const resumeRows = await db
          .select()
          .from(resumes)
          .where(eq(resumes.userId, userRows[0].id))
          .orderBy(desc(resumes.uploadedAt))
          .limit(1);
        if (resumeRows[0]) {
          const rows = await db.select().from(parseResults).where(eq(parseResults.resumeId, resumeRows[0].id)).limit(1);
          if (rows[0]) parseResultData = rows[0];
        }
      }
    }

    if (!parseResultData) {
      const textToUse = resumeText || "Experienced Software Engineer with TypeScript, React, Node.js, REST APIs, Git, and Cloud Infrastructure.";
      parseResultData = {
        fileType: "pdf",
        pageCount: 1,
        readingOrderText: textToUse,
        bestEffortText: textToUse,
        sections: [{ name: "experience", rawHeading: "Experience", text: textToUse, startPage: 1, confidence: 1 }],
        entities: {
          name: { value: "Candidate", confidence: 1 },
          email: { value: "", confidence: 1 },
          phone: { value: "", confidence: 1 },
          links: [],
          skills: ["TypeScript", "React", "Node.js", "Git", "REST API", "SQL"],
          experience: [],
          education: [],
        },
        lostRegions: [],
        warnings: [],
        isImageOnly: false,
        isMultiColumn: false,
        hasHeaderFooterContent: false,
        parserVersion: "2.0.0",
        parsabilityRisk: "low",
        parsabilityReason: "Direct text evaluation",
        textItemCount: 100,
        textToPageRatio: 100,
      };
    }

    const result = matchJobDescription(parseResultData, jdText, jobUrl, jobTitle, company);
    return reply.status(200).send(result);
  } catch (err: any) {
    fastify.log.error({ err: err?.message }, "Extension match failed");
    return reply.status(500).send({ error: "match_failed", message: "Failed to evaluate job match." });
  }
});

// ─── POST /api/extension/quick-tailor ─────────────────────────
fastify.post("/api/extension/quick-tailor", async (request, reply) => {
  const { resumeId, resumeText, jdText, jobTitle } = request.body as {
    resumeId?: string;
    resumeText?: string;
    jdText?: string;
    jobTitle?: string;
  };

  if (!jdText || jdText.trim().length < 20) {
    return reply.status(400).send({ error: "missing_jd", message: "Job description is required." });
  }

  try {
    let bullets: string[] = [];

    if (db && resumeId) {
      const rows = await db.select().from(parseResults).where(eq(parseResults.resumeId, resumeId)).limit(1);
      if (rows[0]?.entities) {
        const ents = rows[0].entities as any;
        bullets = ents.experience?.flatMap((e: any) => e.bullets || []) || [];
      }
    }

    if (bullets.length === 0 && resumeText) {
      bullets = resumeText.split("\n").filter((l) => l.trim().length > 20);
    }

    if (bullets.length === 0) {
      bullets = [
        "Architected scalable backend microservices reducing system latency by 35%.",
        "Led cross-functional frontend migration delivering improved Core Web Vitals across web applications.",
      ];
    }

    const tailored = await quickTailorBullets(bullets, jdText, jobTitle);
    return reply.status(200).send({ tailored });
  } catch (err: any) {
    fastify.log.error({ err: err?.message }, "Quick tailor failed");
    return reply.status(500).send({ error: "tailor_failed", message: "Failed to generate tailored bullets." });
  }
});

// ─── DELETE /api/scans/:id ────────────────────────────────────
fastify.delete("/api/scans/:id", async (request, reply) => {
  if (!db) return reply.status(503).send({ error: "db_unavailable" });
  const { id } = request.params as { id: string };

  try {
    await db.delete(resumes).where(eq(resumes.id, id));
    return reply.send({ success: true });
  } catch (err: any) {
    return reply.status(500).send({ error: "delete_failed", message: "Unable to delete scan." });
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
