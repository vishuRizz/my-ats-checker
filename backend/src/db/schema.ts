// ============================================================
// Drizzle ORM Schema - ATS Checker (Neon PostgreSQL)
// All tables use pgvector for embeddings (Phase 2)
// ============================================================

import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  real,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── Users ────────────────────────────────────────────────────
// Clerk manages auth; we store only the clerk userId for RLS
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: varchar("clerk_id", { length: 255 }).unique().notNull(),
  email: varchar("email", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Resumes ─────────────────────────────────────────────────
export const resumes = pgTable("resumes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  sessionId: varchar("session_id", { length: 255 }), // anonymous users
  filename: varchar("filename", { length: 500 }).notNull(),
  fileType: varchar("file_type", { length: 10 }).notNull(), // pdf | docx
  fileSizeBytes: integer("file_size_bytes"),
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending | done | error
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  deleteAt: timestamp("delete_at"), // auto-delete for anonymous: 24h
});

// ─── Parse Results ────────────────────────────────────────────
export const parseResults = pgTable("parse_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  resumeId: uuid("resume_id")
    .references(() => resumes.id, { onDelete: "cascade" })
    .notNull(),
  parserVersion: varchar("parser_version", { length: 100 }).notNull(),
  pageCount: integer("page_count"),
  isMultiColumn: boolean("is_multi_column").default(false),
  isImageOnly: boolean("is_image_only").default(false),
  readingOrderText: text("reading_order_text"), // ATS-naive order
  bestEffortText: text("best_effort_text"),     // human-correct order
  sections: jsonb("sections"),                  // SectionResult[]
  entities: jsonb("entities"),                  // EntityResult
  lostRegions: jsonb("lost_regions"),           // LostRegion[]
  warnings: jsonb("warnings"),                  // ParseWarning[]
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Job Descriptions ─────────────────────────────────────────
export const jobDescriptions = pgTable("job_descriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  sessionId: varchar("session_id", { length: 255 }),
  rawText: text("raw_text").notNull(),
  sourceUrl: varchar("source_url", { length: 2048 }),
  extractedRequirements: jsonb("extracted_requirements"), // { required: [], niceToHave: [] }
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Analyses ─────────────────────────────────────────────────
export const analyses = pgTable("analyses", {
  id: uuid("id").primaryKey().defaultRandom(),
  resumeId: uuid("resume_id")
    .references(() => resumes.id, { onDelete: "cascade" })
    .notNull(),
  jdId: uuid("jd_id").references(() => jobDescriptions.id),
  scoreBreakdown: jsonb("score_breakdown").notNull(),
  keywordReport: jsonb("keyword_report"),
  vendorReports: jsonb("vendor_reports"),
  rules: jsonb("rules").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Suggestions (LLM rewrites, Phase 3) ─────────────────────
export const suggestions = pgTable("suggestions", {
  id: uuid("id").primaryKey().defaultRandom(),
  analysisId: uuid("analysis_id")
    .references(() => analyses.id, { onDelete: "cascade" })
    .notNull(),
  type: varchar("type", { length: 50 }).notNull(), // bullet_rewrite | heading_fix | contact_fix
  targetRef: text("target_ref"),                   // path to the field being fixed
  originalText: text("original_text"),
  suggestedText: text("suggested_text"),
  rationale: text("rationale"),
  needsUserProof: boolean("needs_user_proof").default(false),
  status: varchar("status", { length: 20 }).default("pending"), // pending | accepted | rejected
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Skills Taxonomy ─────────────────────────────────────────
export const skills = pgTable(
  "skills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    canonicalName: varchar("canonical_name", { length: 255 }).unique().notNull(),
    aliases: jsonb("aliases").$type<string[]>().default([]),
    category: varchar("category", { length: 100 }), // programming | framework | tool | soft | domain
    // embedding stored as real[] since pgvector extension needs to be enabled separately
    // ALTER TABLE skills ADD COLUMN embedding vector(1536);
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("skills_canonical_idx").on(table.canonicalName)]
);

// ─── Scan Versions (before/after re-scan) ────────────────────
export const scanVersions = pgTable("scan_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  resumeId: uuid("resume_id")
    .references(() => resumes.id, { onDelete: "cascade" })
    .notNull(),
  analysisId: uuid("analysis_id").references(() => analyses.id),
  scoreSnapshot: jsonb("score_snapshot"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
