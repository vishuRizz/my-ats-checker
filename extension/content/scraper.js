// ============================================================
// ATS Checker Extension - Content Script Scraper v2
// Resilient DOM Extraction + LinkedIn Auto-Expand + Clean Text + X-Ray DOM target
// ============================================================

(function () {
  const SELECTORS = {
    linkedin: {
      title: [
        ".job-details-jobs-unified-top-card__job-title",
        ".jobs-unified-top-card__job-title",
        "h1.topcard__title",
        "h2.topcard__title",
      ],
      company: [
        ".job-details-jobs-unified-top-card__company-name",
        ".jobs-unified-top-card__company-name",
        ".topcard__org-name-link",
      ],
      jd: [
        "#job-details",
        ".jobs-description__content",
        ".jobs-box__html-content",
        ".show-more-less-html__markup",
      ],
      expandBtn: [
        ".show-more-less-html__button--more",
        ".jobs-description__footer-button",
        "button[aria-label*='Show more']",
        ".artdeco-card button",
      ],
    },
    indeed: {
      title: [
        ".jobsearch-JobInfoHeader-title",
        "h1.jobTitle",
        "h2.jobTitle",
      ],
      company: [
        "[data-company-name='true']",
        ".jobsearch-CompanyInfoContainer",
      ],
      jd: [
        "#jobDescriptionText",
        ".jobsearch-jobDescriptionText",
      ],
      expandBtn: [],
    },
    greenhouse: {
      title: [".app-title", "#header h1", "h1.heading"],
      company: [".company-name", "#header .company"],
      jd: ["#content", "#main", ".job-description"],
      expandBtn: [],
    },
    lever: {
      title: [".posting-headline h2", "h2"],
      company: [".main-header-logo img", ".posting-headline .company"],
      jd: [".posting-page", ".content", ".section-wrapper"],
      expandBtn: [],
    },
    ashby: {
      title: ["h1", "._title_"],
      company: ["header a", "._company_"],
      jd: ["[data-qa='job-description']", "._description_", ".ashby-job-posting-description"],
      expandBtn: [],
    },
    workday: {
      title: ["[data-automation-id='jobPostingHeader']", "h1"],
      company: ["[data-automation-id='companyName']", "h2"],
      jd: ["[data-automation-id='jobPostingDescription']", ".job-description"],
      expandBtn: [],
    },
  };

  function queryFirst(selectors) {
    if (!selectors) return null;
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el && el.innerText.trim()) return el;
      } catch {
        // ignore invalid selector
      }
    }
    return null;
  }

  function getPlatform() {
    const host = window.location.hostname.toLowerCase();
    if (host.includes("linkedin.com")) return "linkedin";
    if (host.includes("indeed.com")) return "indeed";
    if (host.includes("greenhouse.io")) return "greenhouse";
    if (host.includes("lever.co")) return "lever";
    if (host.includes("ashbyhq.com")) return "ashby";
    if (host.includes("myworkdayjobs.com")) return "workday";
    return "generic";
  }

  // Auto-expand LinkedIn "Show More" buttons
  function autoExpandCollapsedText(platform) {
    if (platform === "linkedin") {
      for (const sel of SELECTORS.linkedin.expandBtn) {
        try {
          const btn = document.querySelector(sel);
          if (btn && btn.offsetParent !== null && !btn.dataset.atsAutoExpanded) {
            btn.dataset.atsAutoExpanded = "true";
            btn.click();
            break;
          }
        } catch {
          // ignore
        }
      }
    }
  }

  function cleanJobText(raw) {
    return raw
      .replace(/\bShow less\b/gi, "")
      .replace(/\bReport this job\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function extractGeneric() {
    const candidates = document.querySelectorAll("article, main, .content, .description, body");
    let bestText = "";
    let bestEl = null;

    for (const el of candidates) {
      const text = el.innerText || "";
      if (text.length > bestText.length && text.length < 25000) {
        bestText = text;
        bestEl = el;
      }
    }

    return {
      title: document.title.split(/[-|–]/)[0]?.trim() || "Job Opportunity",
      company: window.location.hostname.replace(/^www\./, "").split(".")[0],
      jdText: cleanJobText(bestText),
      jdElement: bestEl,
    };
  }

  function extractJobData() {
    const platform = getPlatform();
    autoExpandCollapsedText(platform);

    const config = SELECTORS[platform];

    if (!config) {
      const generic = extractGeneric();
      return {
        platform,
        jobUrl: window.location.href,
        ...generic,
      };
    }

    const titleEl = queryFirst(config.title);
    const companyEl = queryFirst(config.company);
    const jdEl = queryFirst(config.jd);

    const title = titleEl ? titleEl.innerText.trim() : document.title.split(/[-|–]/)[0]?.trim() || "Target Role";
    const company = companyEl
      ? companyEl.getAttribute("alt") || companyEl.innerText.trim()
      : "Company";
    const jdText = jdEl ? cleanJobText(jdEl.innerText) : "";

    return {
      platform,
      jobUrl: window.location.href,
      title,
      company,
      jdText,
      jdElement: jdEl,
    };
  }

  // Observe page mutations (e.g. LinkedIn / Indeed single-page job card clicks)
  let lastExtractedJd = "";
  const listeners = [];

  function initObserver() {
    let timeout = null;
    const observer = new MutationObserver(() => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const data = extractJobData();
        if (data.jdText && data.jdText.length > 50 && data.jdText !== lastExtractedJd) {
          lastExtractedJd = data.jdText;
          listeners.forEach((fn) => fn(data));
        }
      }, 400);
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  window.ATS_SCRAPER = {
    getPlatform,
    extractJobData,
    onJobChange: (callback) => {
      listeners.push(callback);
      const initial = extractJobData();
      if (initial.jdText && initial.jdText.length > 50) {
        lastExtractedJd = initial.jdText;
        callback(initial);
      }
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initObserver);
  } else {
    initObserver();
  }
})();
