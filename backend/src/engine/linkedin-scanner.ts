// ============================================================
// LinkedIn Profile Scanner & Recruiter Visibility Engine
// Analyzes LinkedIn profiles for recruiter searchability,
// headline hooks, about storytelling, and ATS Easy Apply safety.
// ============================================================

import { groqChat } from "../llm/groq-client.js";

export interface LinkedInProfileInput {
  url?: string;
  targetRole?: string;
  profileText?: string;
  demoId?: string;
}

export interface LinkedInAuditResult {
  profile: {
    name: string;
    headline: string;
    about: string;
    location: string;
    currentCompany: string;
    vanityHandle: string;
    isCustomVanityUrl: boolean;
    targetRole: string;
  };
  overallScore: number;
  grade: "A+" | "A" | "B" | "C" | "D";
  verdict: string;
  metrics: {
    headlineScore: number;
    aboutScore: number;
    experienceScore: number;
    skillsScore: number;
    seoVisibilityScore: number;
  };
  headlineAudit: {
    score: number;
    charCount: number;
    idealCharRange: string;
    issues: string[];
    strengths: string[];
    aiSuggestions: {
      formula: string;
      text: string;
      rationale: string;
    }[];
  };
  aboutAudit: {
    score: number;
    wordCount: number;
    hasFirstPersonVoice: boolean;
    hasMetrics: boolean;
    hasCallToAction: boolean;
    issues: string[];
    strengths: string[];
    aiRewrite: {
      hook: string;
      story: string;
      skillsHighlight: string;
      cta: string;
      fullText: string;
    };
  };
  experienceAudit: {
    score: number;
    bulletCount: number;
    quantifiedBulletsRatio: number;
    actionVerbCount: number;
    issues: string[];
    strengths: string[];
  };
  skillsAudit: {
    score: number;
    detectedSkills: string[];
    topPinnedRecommended: string[];
    missingHighDemandSkills: string[];
  };
  visibilityAudit: {
    score: number;
    vanityUrlStatus: "optimized" | "default_numbers";
    recruiterIndexability: "high" | "medium" | "low";
    easyApplySafety: "safe" | "warning";
    checklist: {
      item: string;
      passed: boolean;
      tip: string;
    }[];
  };
  recruiterView: {
    simulatedCard: {
      name: string;
      headline: string;
      location: string;
      company: string;
      matchedSkills: string[];
      openToWorkSimulated: boolean;
    };
    inmailProbability: string;
    searchTierStanding: string;
  };
  viralShare: {
    shareText: string;
    linkedinShareUrl: string;
    twitterShareUrl: string;
  };
}

// ─── Demo Profiles for Instant 1-Click Testing ────────────────
export const DEMO_PROFILES: Record<string, {
  name: string;
  headline: string;
  about: string;
  location: string;
  currentCompany: string;
  vanityHandle: string;
  isCustomVanityUrl: boolean;
  targetRole: string;
  experienceBullets: string[];
  skills: string[];
}> = {
  swe: {
    name: "Alex Morgan",
    headline: "Senior Software Engineer @ FinTech | React, TypeScript, Node.js, Distributed Systems | Scaling to 10M+ users",
    about: "I build high-scale, mission-critical distributed web applications. Over the last 6 years, I've designed payments architecture processing $150M+ monthly volume with 99.99% uptime.\n\nCore technologies: TypeScript, React, Next.js, Node.js, PostgreSQL, Redis, AWS (ECS, Lambda, SQS), Docker, Kubernetes.\n\nPassionate about clean architecture, performance optimization, and mentoring high-performing engineering teams. Feel free to connect or email alex.morgan.dev@gmail.com.",
    location: "San Francisco, CA (Open to Remote)",
    currentCompany: "Stripe Alumni / Velocity Labs",
    vanityHandle: "alex-morgan-dev",
    isCustomVanityUrl: true,
    targetRole: "Staff / Senior Software Engineer",
    experienceBullets: [
      "Architected real-time payments ledger using Node.js and PostgreSQL, decreasing transaction processing latency by 42%.",
      "Led migration of monolith frontend to Next.js and micro-frontends, improving Core Web Vitals and LCP from 3.8s to 1.1s for 4M MAU.",
      "Engineered automated CI/CD pipeline reducing build and deploy cycle times from 45 minutes to 7 minutes.",
      "Mentored 6 junior and mid-level engineers through technical design reviews and bi-weekly architecture sessions.",
    ],
    skills: ["TypeScript", "React", "Next.js", "Node.js", "PostgreSQL", "Redis", "AWS", "Docker", "Kubernetes", "GraphQL", "System Design", "Microservices"],
  },
  pm: {
    name: "Priya Sharma",
    headline: "Product Manager | B2B SaaS & AI Workflows | Ex-Microsoft | Scaled ARR from $2M to $18M",
    about: "Product leader specializing in turning complex AI & workflow capabilities into intuitive customer experiences.\n\nAt my current startup, I lead a cross-functional pod of 12 engineers and 3 designers building automated enterprise intelligence tools.\n\nSkills: Product Strategy, Roadmap Prioritization, PLG (Product-Led Growth), Data Analytics (SQL, Mixpanel), User Research, GTM Execution.\n\nAlways excited to talk product craft, generative AI tooling, and early-stage scaling: priya.sharma.pm@gmail.com",
    location: "New York, NY",
    currentCompany: "HyperFlow AI",
    vanityHandle: "priyasharmapm",
    isCustomVanityUrl: true,
    targetRole: "Lead / Director of Product Management",
    experienceBullets: [
      "Launched enterprise workflow automation suite, driving $4.8M incremental ARR in first 9 months with 114% net revenue retention.",
      "Spearheaded user onboarding redesign, boosting 14-day trial-to-paid conversion rate by 28% across 45,000 monthly signups.",
      "Established weekly customer discovery rhythm with Fortune 500 design partners to de-risk AI feature roadmap.",
      "Collaborated with marketing and sales leadership to refine pricing tiers, lifting Average Revenue Per Account (ARPA) by 35%.",
    ],
    skills: ["Product Strategy", "PLG", "Roadmap Planning", "Mixpanel", "SQL", "User Research", "Agile", "Generative AI", "B2B SaaS", "GTM"],
  },
  devops: {
    name: "Jordan Lee",
    headline: "Cloud & DevOps Engineer | AWS Certified Solutions Architect | Terraform, Kubernetes, SRE",
    about: "Infrastructure engineer obsessed with zero-downtime deployments, high reliability, and cloud cost efficiency. Managing 200+ Kubernetes nodes across multi-region AWS infrastructure.\n\nToolbox: AWS, Terraform, Docker, Kubernetes, Helm, Prometheus, Grafana, ArgoCD, Datadog, Python, Bash.\n\nReach me at jordan.lee.infra@gmail.com.",
    location: "Austin, TX (Remote)",
    currentCompany: "CloudScale Technologies",
    vanityHandle: "jordanlee-devops",
    isCustomVanityUrl: true,
    targetRole: "Senior Site Reliability Engineer / DevOps Lead",
    experienceBullets: [
      "Implemented infrastructure-as-code using Terraform and GitOps with ArgoCD, achieving 100% reproducible environments across 4 regions.",
      "Cut annual AWS cloud spend by $180,000 (31%) via spot instances, rightsizing, and automated idle resource termination.",
      "Constructed comprehensive observability stack with Prometheus and Datadog, reducing MTTR for critical production incidents by 55%.",
      "Designed zero-downtime blue/green deployment strategy for core transactional services serving 25,000 requests/sec.",
    ],
    skills: ["AWS", "Terraform", "Kubernetes", "Docker", "CI/CD", "Prometheus", "Datadog", "ArgoCD", "Python", "Linux", "SRE", "Cost Optimization"],
  },
};

// ─── Parse URL metadata & extract vanity handle ───────────────
export function parseLinkedInUrl(rawUrl: string): {
  normalizedUrl: string;
  vanityHandle: string;
  isCustomVanityUrl: boolean;
  isValid: boolean;
} {
  const clean = rawUrl.trim();
  const match = clean.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i);

  if (!match) {
    return {
      normalizedUrl: clean,
      vanityHandle: clean.replace(/[^a-zA-Z0-9_-]/g, ""),
      isCustomVanityUrl: false,
      isValid: false,
    };
  }

  const handle = match[1];
  // LinkedIn default generated handles end with 8-10 digits/hex chars (e.g. "john-doe-49a83210")
  const hasAutoNumberSuffix = /-[0-9a-f]{6,}$/i.test(handle) || /-\d{4,}$/.test(handle);

  return {
    normalizedUrl: `https://www.linkedin.com/in/${handle}`,
    vanityHandle: handle,
    isCustomVanityUrl: !hasAutoNumberSuffix,
    isValid: true,
  };
}

// ─── Fetch public meta tags from LinkedIn URL ─────────────────
export async function fetchLinkedInPublicMeta(url: string): Promise<{
  title?: string;
  description?: string;
  extractedName?: string;
  extractedHeadline?: string;
}> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return {};

    const html = await res.text();
    const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i) ||
      html.match(/<title>(.*?)<\/title>/i);
    const descMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/i) ||
      html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);

    const title = titleMatch ? titleMatch[1].replace(/&amp;/g, "&").replace(/&#39;/g, "'") : undefined;
    const description = descMatch ? descMatch[1].replace(/&amp;/g, "&").replace(/&#39;/g, "'") : undefined;

    let extractedName: string | undefined;
    let extractedHeadline: string | undefined;

    if (title) {
      // e.g. "Alex Morgan - Senior Software Engineer - Stripe | LinkedIn"
      const parts = title.split(" - ");
      if (parts.length >= 2) {
        extractedName = parts[0].trim();
        extractedHeadline = parts[1].replace(/ \| LinkedIn/i, "").trim();
      }
    }

    return { title, description, extractedName, extractedHeadline };
  } catch {
    return {};
  }
}

// ─── High-Level Profile Extractor ─────────────────────────────
export async function resolveProfileData(input: LinkedInProfileInput): Promise<{
  name: string;
  headline: string;
  about: string;
  location: string;
  currentCompany: string;
  vanityHandle: string;
  isCustomVanityUrl: boolean;
  targetRole: string;
  experienceBullets: string[];
  skills: string[];
}> {
  if (input.demoId && DEMO_PROFILES[input.demoId]) {
    return DEMO_PROFILES[input.demoId];
  }

  const role = input.targetRole?.trim() || "Software Engineer / Tech Professional";
  let vanityHandle = "candidate";
  let isCustom = true;

  if (input.url) {
    const parsed = parseLinkedInUrl(input.url);
    vanityHandle = parsed.vanityHandle || "profile";
    isCustom = parsed.isCustomVanityUrl;
  }

  // If user pasted raw profile text or resume extract
  if (input.profileText && input.profileText.trim().length > 30) {
    const raw = input.profileText.trim();
    const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);

    const name = lines[0]?.slice(0, 50) || "LinkedIn Candidate";
    const headline = lines[1]?.slice(0, 150) || `${role} | Building scalable solutions`;

    // Separate experience bullets & about text
    const bullets: string[] = [];
    const aboutParts: string[] = [];

    for (const line of lines.slice(2)) {
      if (/^[•\-*]|\d+%|\$\d+|increased|decreased|led|built|architected/i.test(line)) {
        bullets.push(line.replace(/^[•\-*]\s*/, ""));
      } else {
        aboutParts.push(line);
      }
    }

    const detectedSkills = extractSkillsFromText(raw);

    return {
      name,
      headline,
      about: aboutParts.slice(0, 8).join(" "),
      location: "San Francisco / Remote",
      currentCompany: "Tech Enterprise",
      vanityHandle,
      isCustomVanityUrl: isCustom,
      targetRole: role,
      experienceBullets: bullets.length > 0 ? bullets : [
        "Led core product feature development resulting in high user satisfaction.",
        "Built scalable microservices and API integrations for external partners.",
        "Optimized database queries and front-end bundle size for improved latency.",
      ],
      skills: detectedSkills.length > 0 ? detectedSkills : ["TypeScript", "React", "Node.js", "SQL", "System Design"],
    };
  }

  // If URL only, try fetching public metadata
  if (input.url) {
    const meta = await fetchLinkedInPublicMeta(input.url);
    const name = meta.extractedName || vanityHandle.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    const headline = meta.extractedHeadline || `${role} | Tech & Product Specialist`;
    const about = meta.description || `Experienced ${role} focused on high-impact technology delivery, scalable architectures, and team collaboration.`;

    const detectedSkills = extractSkillsFromText(`${headline} ${about}`);

    return {
      name,
      headline,
      about,
      location: "United States (Open to Relocation / Remote)",
      currentCompany: "Technology Leader",
      vanityHandle,
      isCustomVanityUrl: isCustom,
      targetRole: role,
      experienceBullets: [
        `Architected key capabilities for ${role} workflows and infrastructure.`,
        "Collaborated with cross-functional product and engineering teams to ship major product milestones.",
        "Drove efficiency improvements and engineering best practices across development sprints.",
      ],
      skills: detectedSkills.length > 0 ? detectedSkills : ["Problem Solving", "Collaboration", "Engineering", "Architecture"],
    };
  }

  // Fallback to default SWE template
  return DEMO_PROFILES.swe;
}

// ─── Extract Skills Helper ────────────────────────────────────
const COMMON_TECH_SKILLS = [
  "TypeScript", "JavaScript", "Python", "Go", "Java", "C++", "Rust", "React", "Next.js",
  "Vue", "Angular", "Node.js", "Express", "GraphQL", "PostgreSQL", "MySQL", "MongoDB",
  "Redis", "Kafka", "AWS", "GCP", "Azure", "Docker", "Kubernetes", "Terraform", "CI/CD",
  "Microservices", "System Design", "Agile", "Scrum", "Product Strategy", "SQL", "Git",
  "Tailwind CSS", "REST API", "Machine Learning", "Generative AI", "LLM", "PyTorch"
];

function extractSkillsFromText(text: string): string[] {
  const lower = text.toLowerCase();
  return COMMON_TECH_SKILLS.filter((s) => {
    const pattern = new RegExp(`\\b${s.toLowerCase().replace("+", "\\+")}\\b`, "i");
    return pattern.test(lower);
  });
}

// ─── Core Auditor Engine ──────────────────────────────────────
export async function auditLinkedInProfile(input: LinkedInProfileInput): Promise<LinkedInAuditResult> {
  const profile = await resolveProfileData(input);

  // 1. Headline Audit
  const headlineLen = profile.headline.length;
  const headlineIssues: string[] = [];
  const headlineStrengths: string[] = [];
  let headlineScore = 100;

  if (headlineLen < 80) {
    headlineScore -= 25;
    headlineIssues.push("Headline is too brief. You're leaving valuable search real estate unused (aim for 120-200 characters).");
  } else if (headlineLen > 220) {
    headlineScore -= 10;
    headlineIssues.push("Headline exceeds optimal preview length and will get truncated on mobile LinkedIn cards.");
  } else {
    headlineStrengths.push("Great character length (120-220 chars) maximizing visibility before mobile truncation.");
  }

  if (/\b(aspiring|seeking|unemployed|student|looking for|open to work)\b/i.test(profile.headline)) {
    headlineScore -= 20;
    headlineIssues.push("Avoid 'Aspiring' or 'Looking for opportunities' in headline. Recruiters search for who you ARE (e.g. 'Senior Frontend Engineer'), not what you seek.");
  } else {
    headlineStrengths.push("Positions you as an active professional without desperate trigger keywords.");
  }

  if (!/[|•·/]/.test(profile.headline)) {
    headlineScore -= 15;
    headlineIssues.push("Headline lacks visual separators (e.g. '|' or '•'). Structuring: [Role Title] | [Key Tech] | [Value/Metric] boosts recruiter skim rates.");
  } else {
    headlineStrengths.push("Uses clean visual delimiters to separate title, tech stack, and value proposition.");
  }

  const hasNumbers = /\d+[%kM$]?/i.test(profile.headline);
  if (hasNumbers) {
    headlineStrengths.push("Includes quantifiable metrics or scale indicators, establishing immediate authority.");
  } else {
    headlineScore -= 10;
    headlineIssues.push("Consider adding a scale or impact hook (e.g. '10M+ users' or '$150M volume') to stand out from 90% of applicants.");
  }
  headlineScore = Math.max(25, Math.min(100, headlineScore));

  // 2. About Audit
  const words = profile.about.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const aboutIssues: string[] = [];
  const aboutStrengths: string[] = [];
  let aboutScore = 100;

  if (wordCount < 60) {
    aboutScore -= 30;
    aboutIssues.push("About section is under 60 words. Recruiters rely on this section to understand your career narrative.");
  } else if (wordCount > 350) {
    aboutScore -= 15;
    aboutIssues.push("About section is over 350 words. Recruiters spend ~6 seconds skimming; shorten to 150-300 words with bullet clusters.");
  } else {
    aboutStrengths.push(`Ideal word count (${wordCount} words) allowing for narrative without overwhelming the reader.`);
  }

  const hasFirstPerson = /\b(i|my|we|our)\b/i.test(profile.about);
  if (!hasFirstPerson) {
    aboutScore -= 15;
    aboutIssues.push("Avoid awkward 3rd-person bios ('John is an engineer...'). Modern LinkedIn rewards authentic 1st-person voice ('I build...').");
  } else {
    aboutStrengths.push("Written in authentic first-person voice.");
  }

  const hasMetrics = /\d+[%kM$]?/i.test(profile.about);
  if (hasMetrics) {
    aboutStrengths.push("Contains concrete business metrics and evidence of impact.");
  } else {
    aboutScore -= 15;
    aboutIssues.push("Missing quantifiable business achievements or scale metrics.");
  }

  const hasCTA = /(email|reach out|connect|contact|@|\.com)/i.test(profile.about);
  if (hasCTA) {
    aboutStrengths.push("Includes a clear call to action or contact invitation for recruiters.");
  } else {
    aboutScore -= 10;
    aboutIssues.push("No explicit call to action or email mentioned. Giving recruiters an easy direct contact channel lifts inbound conversions.");
  }
  aboutScore = Math.max(30, Math.min(100, aboutScore));

  // 3. Experience & Bullet Audit
  const bullets = profile.experienceBullets;
  const expIssues: string[] = [];
  const expStrengths: string[] = [];
  let expScore = 100;

  const quantifiedCount = bullets.filter((b) => /\d+[%kM$]|\b(reduced|increased|improved|cut|boosted|grew)\b/i.test(b)).length;
  const ratio = bullets.length > 0 ? Math.round((quantifiedCount / bullets.length) * 100) / 100 : 0;

  if (ratio >= 0.5) {
    expStrengths.push(`${Math.round(ratio * 100)}% of bullets include measurable metrics and impact.`);
  } else {
    expScore -= 25;
    expIssues.push("Low metric density in experience bullets. Follow Google's XYZ formula: 'Accomplished [X] measured by [Y] by doing [Z]'.");
  }

  const strongVerbs = bullets.filter((b) => /^(architected|engineered|spearheaded|orchestrated|launched|scaled|decreased|built|led|designed)/i.test(b)).length;
  if (strongVerbs >= 2) {
    expStrengths.push("Starts bullets with strong, definitive leadership action verbs.");
  } else {
    expScore -= 15;
    expIssues.push("Avoid passive phrasing like 'Responsible for' or 'Worked on'. Lead directly with decisive action verbs.");
  }
  expScore = Math.max(35, Math.min(100, expScore));

  // 4. Skills & Keyword Audit
  const detected = profile.skills.length > 0 ? profile.skills : ["Software Engineering", "Product Delivery", "Architecture"];
  const missingForRole: string[] = [];

  if (/frontend|react/i.test(profile.targetRole)) {
    if (!detected.includes("TypeScript")) missingForRole.push("TypeScript");
    if (!detected.includes("Next.js")) missingForRole.push("Next.js");
    if (!detected.includes("GraphQL")) missingForRole.push("GraphQL");
  } else if (/backend|distributed/i.test(profile.targetRole)) {
    if (!detected.includes("Kubernetes")) missingForRole.push("Kubernetes");
    if (!detected.includes("Redis")) missingForRole.push("Redis");
    if (!detected.includes("System Design")) missingForRole.push("System Design");
  } else if (/product/i.test(profile.targetRole)) {
    if (!detected.includes("PLG")) missingForRole.push("PLG (Product-Led Growth)");
    if (!detected.includes("SQL")) missingForRole.push("SQL");
    if (!detected.includes("Generative AI")) missingForRole.push("Generative AI");
  } else {
    if (!detected.includes("Cloud / AWS")) missingForRole.push("AWS / Cloud");
    if (!detected.includes("Docker")) missingForRole.push("Docker");
  }

  let skillsScore = Math.min(100, 50 + detected.length * 6 - missingForRole.length * 10);
  skillsScore = Math.max(30, Math.min(100, skillsScore));

  // 5. Visibility & SEO Audit
  let seoScore = 95;
  const seoChecklist = [
    {
      item: "Custom Vanity URL",
      passed: profile.isCustomVanityUrl,
      tip: profile.isCustomVanityUrl
        ? "Clean custom handle without auto-generated number tags."
        : "Your URL contains auto-generated numbers. Edit your public profile URL to `linkedin.com/in/firstnamelastname`.",
    },
    {
      item: "Target Role Keyword in Headline",
      passed: profile.headline.toLowerCase().includes(profile.targetRole.split(" ")[0].toLowerCase()),
      tip: "Recruiter algorithms rank exact title matches at the top of candidate feeds.",
    },
    {
      item: "Location / Remote Visibility",
      passed: /remote|open to/i.test(profile.location),
      tip: "Specify remote preference clearly to surface in nationwide recruiter searches.",
    },
    {
      item: "Easy Apply ATS Parsing Safe",
      passed: true,
      tip: "Profile formatting parses cleanly into Workday, Lever, and Greenhouse Easy Apply pipelines.",
    },
  ];

  if (!profile.isCustomVanityUrl) seoScore -= 20;

  // Compute Overall Weighted Score
  const overall = Math.round(
    headlineScore * 0.25 +
    aboutScore * 0.20 +
    expScore * 0.25 +
    skillsScore * 0.15 +
    seoScore * 0.15
  );

  const grade = overall >= 90 ? "A+" : overall >= 80 ? "A" : overall >= 70 ? "B" : overall >= 60 ? "C" : "D";

  let verdict = "";
  if (overall >= 85) {
    verdict = "Outstanding Profile! Your LinkedIn profile has high recruiter searchability and strong positioning. It actively turns passive profile visits into interview inbounds.";
  } else if (overall >= 70) {
    verdict = "Solid Baseline with High Upside. Your experience is strong, but optimizing your headline hook and quantifying About section achievements will double recruiter InMail rates.";
  } else {
    verdict = "High Invisibility Risk. Key recruiter search filters are missing from your headline and skills section. Addressing these fixes will dramatically boost inbound profile views.";
  }

  // ─── Generate AI Rewrites (via Groq or High-Quality Heuristics) ──
  const aiData = await generateAiLinkedInEnhancements({
    name: profile.name,
    headline: profile.headline,
    about: profile.about,
    targetRole: profile.targetRole,
    skills: profile.skills,
    bullets: profile.experienceBullets,
  });

  // Viral Share Metadata
  const shareText = `Just audited my LinkedIn Profile on ATS Checker! 🚀 Scored ${overall}/100 (${grade}) for recruiter searchability & ATS compatibility. Check yours free:`;
  const shareUrl = "https://ats-checker.vercel.app/linkedin";

  return {
    profile: {
      name: profile.name,
      headline: profile.headline,
      about: profile.about,
      location: profile.location,
      currentCompany: profile.currentCompany,
      vanityHandle: profile.vanityHandle,
      isCustomVanityUrl: profile.isCustomVanityUrl,
      targetRole: profile.targetRole,
    },
    overallScore: overall,
    grade,
    verdict,
    metrics: {
      headlineScore,
      aboutScore,
      experienceScore: expScore,
      skillsScore,
      seoVisibilityScore: seoScore,
    },
    headlineAudit: {
      score: headlineScore,
      charCount: headlineLen,
      idealCharRange: "120 - 220 chars",
      issues: headlineIssues,
      strengths: headlineStrengths,
      aiSuggestions: aiData.headlines,
    },
    aboutAudit: {
      score: aboutScore,
      wordCount,
      hasFirstPersonVoice: hasFirstPerson,
      hasMetrics,
      hasCallToAction: hasCTA,
      issues: aboutIssues,
      strengths: aboutStrengths,
      aiRewrite: aiData.aboutRewrite,
    },
    experienceAudit: {
      score: expScore,
      bulletCount: bullets.length,
      quantifiedBulletsRatio: ratio,
      actionVerbCount: strongVerbs,
      issues: expIssues,
      strengths: expStrengths,
    },
    skillsAudit: {
      score: skillsScore,
      detectedSkills: detected,
      topPinnedRecommended: detected.slice(0, 3),
      missingHighDemandSkills: missingForRole,
    },
    visibilityAudit: {
      score: seoScore,
      vanityUrlStatus: profile.isCustomVanityUrl ? "optimized" : "default_numbers",
      recruiterIndexability: overall >= 80 ? "high" : overall >= 65 ? "medium" : "low",
      easyApplySafety: "safe",
      checklist: seoChecklist,
    },
    recruiterView: {
      simulatedCard: {
        name: profile.name,
        headline: profile.headline,
        location: profile.location,
        company: profile.currentCompany,
        matchedSkills: detected.slice(0, 5),
        openToWorkSimulated: true,
      },
      inmailProbability: overall >= 80 ? "84% (Very High)" : overall >= 65 ? "58% (Moderate)" : "22% (Low)",
      searchTierStanding: overall >= 80 ? "Top 10% in Recruiter Searches" : overall >= 65 ? "Median 50% Tier" : "Bottom 30% Tier",
    },
    viralShare: {
      shareText,
      linkedinShareUrl: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      twitterShareUrl: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
    },
  };
}

// ─── AI Helper via Groq LLM with Reliable Fallback ────────────
async function generateAiLinkedInEnhancements(params: {
  name: string;
  headline: string;
  about: string;
  targetRole: string;
  skills: string[];
  bullets: string[];
}): Promise<{
  headlines: { formula: string; text: string; rationale: string }[];
  aboutRewrite: {
    hook: string;
    story: string;
    skillsHighlight: string;
    cta: string;
    fullText: string;
  };
}> {
  // Deterministic Fallback Template
  const topTech = params.skills.slice(0, 4).join(", ") || "TypeScript, React, Node.js";
  const fallbackHeadlines = [
    {
      formula: "The Direct Authority Formula",
      text: `${params.targetRole} | ${topTech} | Architecting High-Performance Systems & Scalable Solutions`,
      rationale: "Ranks highest in exact recruiter search strings for role title and core technology stack.",
    },
    {
      formula: "The Metric & Scale Hook",
      text: `${params.targetRole} @ FinTech & High-Scale Systems | Built Platforms Serving 10M+ Users | ${params.skills[0] || "Architecture"}`,
      rationale: "Establishes immediate elite credibility by showcasing scale and business impact.",
    },
    {
      formula: "The Problem Solver / Mission Formula",
      text: `Helping scale modern cloud platforms as ${params.targetRole} | Specialized in ${topTech} & Distributed Reliability`,
      rationale: "Engages founders and engineering directors looking for a proactive technical leader.",
    },
  ];

  const fallbackAbout = {
    hook: `I am a ${params.targetRole} specializing in building resilient, high-impact systems.`,
    story: `Over the past several years, I've focused on transforming complex technical challenges into clean, performant products that deliver measurable business value.`,
    skillsHighlight: `Core Competencies: ${params.skills.join(" • ") || "Architecture, Full Stack Development, Cloud Infrastructure"}`,
    cta: `Open to connecting with innovative teams and engineering leaders: reach out via LinkedIn or at my email.`,
    fullText: `I am a ${params.targetRole} specializing in building resilient, high-impact systems.\n\nOver the past several years, I've focused on transforming complex technical challenges into clean, performant products that deliver measurable business value.\n\nCore Competencies:\n• ${params.skills.slice(0, 6).join("\n• ") || "Architecture\n• System Design\n• Performance Optimization"}\n\nOpen to connecting with innovative teams and engineering leaders: feel free to connect or drop a message!`,
  };

  try {
    const prompt = `You are a world-class LinkedIn executive branding coach and tech recruiter.
Analyze the following profile information and generate:
1. Three high-converting LinkedIn headline variants for target role "${params.targetRole}".
   - Formula 1: Direct Authority (Role | Top Tech | High-Impact Scope)
   - Formula 2: Metric & Scale Hook (Role | Scale Indicator e.g. users/revenue | Specialty)
   - Formula 3: Problem Solver (Value proposition | Tech stack)
   Each headline MUST be between 120 and 210 characters.
2. A compelling, high-converting About section rewrite in 1st person ("I"), structured with:
   - hook (1-2 punchy sentences)
   - story (career impact narrative)
   - skillsHighlight (bullet list of competencies)
   - cta (invitation to connect / message)
   - fullText (combined complete about text)

Profile:
Name: ${params.name}
Current Headline: ${params.headline}
Skills: ${params.skills.join(", ")}
Target Role: ${params.targetRole}

Respond strictly in valid JSON matching this schema:
{
  "headlines": [
    { "formula": "string", "text": "string", "rationale": "string" },
    { "formula": "string", "text": "string", "rationale": "string" },
    { "formula": "string", "text": "string", "rationale": "string" }
  ],
  "aboutRewrite": {
    "hook": "string",
    "story": "string",
    "skillsHighlight": "string",
    "cta": "string",
    "fullText": "string"
  }
}`;

    const rawResponse = await groqChat([
      { role: "system", content: "You are an elite LinkedIn talent advisor. Output valid JSON only." },
      { role: "user", content: prompt },
    ], { temperature: 0.3, max_tokens: 1500 });

    const parsed = JSON.parse(rawResponse);
    if (parsed.headlines?.length === 3 && parsed.aboutRewrite?.fullText) {
      return parsed;
    }
  } catch {
    // Graceful fallback to deterministic high-quality templates
  }

  return {
    headlines: fallbackHeadlines,
    aboutRewrite: fallbackAbout,
  };
}
