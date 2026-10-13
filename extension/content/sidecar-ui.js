// ============================================================
// ATS Checker Extension - In-Page Sidecar UI v2 (Shadow DOM)
// Features: Draggable Pill, X-Ray In-Page Highlighting, Job Tracker, Keyboard Shortcuts
// ============================================================

(function () {
  if (document.getElementById("ats-checker-extension-host")) return;

  const hostEl = document.createElement("div");
  hostEl.id = "ats-checker-extension-host";
  document.body.appendChild(hostEl);

  const shadow = hostEl.attachShadow({ mode: "open" });

  // Load isolated styles
  const styleLink = document.createElement("link");
  styleLink.rel = "stylesheet";
  styleLink.href = chrome.runtime.getURL("content/sidecar.css");
  shadow.appendChild(styleLink);

  // ─── Floating Pill Badge (Draggable) ──────────────────────────
  const pill = document.createElement("div");
  pill.className = "ats-pill-badge";
  pill.id = "ats-draggable-pill";
  pill.innerHTML = `
    <div class="ats-pill-status-dot" id="ats-dot"></div>
    <span class="ats-pill-score" id="ats-pill-score">--</span>
    <span class="ats-pill-label" id="ats-pill-label">ATS Match</span>
  `;
  shadow.appendChild(pill);

  // Restore saved pill position
  const savedPos = localStorage.getItem("ats_pill_pos");
  if (savedPos) {
    try {
      const pos = JSON.parse(savedPos);
      if (pos.bottom !== undefined) pill.style.bottom = `${pos.bottom}px`;
      if (pos.right !== undefined) pill.style.right = `${pos.right}px`;
      if (pos.top !== undefined) pill.style.top = `${pos.top}px`;
      if (pos.left !== undefined) pill.style.left = `${pos.left}px`;
    } catch {
      // ignore
    }
  }

  // Draggable logic
  let isDragging = false;
  let dragMoved = false;
  let startX = 0;
  let startY = 0;
  let initLeft = 0;
  let initTop = 0;

  pill.addEventListener("mousedown", (e) => {
    isDragging = true;
    dragMoved = false;
    startX = e.clientX;
    startY = e.clientY;
    const rect = pill.getBoundingClientRect();
    initLeft = rect.left;
    initTop = rect.top;
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      dragMoved = true;
      pill.style.left = `${initLeft + dx}px`;
      pill.style.top = `${initTop + dy}px`;
      pill.style.right = "auto";
      pill.style.bottom = "auto";
    }
  });

  window.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      if (dragMoved) {
        const rect = pill.getBoundingClientRect();
        localStorage.setItem(
          "ats_pill_pos",
          JSON.stringify({ left: Math.round(rect.left), top: Math.round(rect.top) })
        );
      }
    }
  });

  // ─── Slide-Over Drawer ───────────────────────────────────────
  const drawer = document.createElement("div");
  drawer.className = "ats-drawer";
  drawer.innerHTML = `
    <div class="ats-drawer-header">
      <div>
        <h3 class="ats-drawer-title" id="ats-job-title">Job Match Analysis</h3>
        <div class="ats-drawer-sub">
          <span id="ats-company-name">Detecting Job...</span>
          <span>·</span>
          <span id="ats-vendor-badge" style="color: #818cf8; font-weight: 700;">Scanning</span>
        </div>
      </div>
      <div class="ats-header-actions">
        <button class="ats-xray-toggle-btn" id="ats-xray-toggle" title="Highlight keywords directly on job page">
          👁️ X-Ray
        </button>
        <button class="ats-close-btn" id="ats-close">✕</button>
      </div>
    </div>

    <div class="ats-drawer-body">
      <!-- Match Card -->
      <div class="ats-match-card">
        <div>
          <span style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; font-weight: 700;">ATS Compatibility</span>
          <div class="ats-score-number" id="ats-score-display" style="color: #6366f1;">--%</div>
        </div>
        <span class="ats-score-badge" id="ats-tier-badge" style="background: rgba(99,102,241,0.2); color: #818cf8;">
          Ready
        </span>
      </div>

      <!-- Job Tracker Bar -->
      <div class="ats-tracker-bar">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="font-size: 0.8rem;">📌</span>
          <select class="ats-status-select" id="ats-job-status-select">
            <option value="wishlist">Wishlist</option>
            <option value="applied">Applied</option>
            <option value="interview">Interviewing</option>
          </select>
        </div>
        <button class="ats-save-job-btn" id="ats-save-job-btn">Save Job</button>
      </div>

      <!-- Vendor Tip Box -->
      <div class="ats-vendor-box" id="ats-vendor-box">
        <span class="ats-vendor-tag" id="ats-vendor-name">ATS Rule:</span>
        <span id="ats-vendor-tip">Click any job posting on this page to analyze keyword match.</span>
      </div>

      <!-- Matched Keywords -->
      <div>
        <span class="ats-section-label">Matched Skills (<span id="ats-matched-count">0</span>)</span>
        <div class="ats-chips-wrap" id="ats-matched-chips">
          <span style="font-size: 0.75rem; color: #64748b;">No matches yet</span>
        </div>
      </div>

      <!-- Missing Required Keywords -->
      <div>
        <span class="ats-section-label">Missing Required Skills (<span id="ats-missing-count">0</span>)</span>
        <div class="ats-chips-wrap" id="ats-missing-chips">
          <span style="font-size: 0.75rem; color: #64748b;">All key skills satisfied</span>
        </div>
      </div>

      <!-- AI Tailored Bullets Area -->
      <div class="ats-tailor-box">
        <span class="ats-section-label">1-Click AI Resume Tailoring</span>
        <button class="ats-tailor-btn" id="ats-tailor-btn">
          ✨ Generate 2 Tailored Bullets for This Job
        </button>
        <div id="ats-tailored-results"></div>
      </div>
    </div>

    <div class="ats-drawer-footer">
      <a class="ats-web-btn" id="ats-web-link" href="http://localhost:3000/ats" target="_blank">
        Launch Full ATS Report in Web App →
      </a>
      <span class="ats-shortcut-hint">Shortcut: Cmd + Shift + A (Mac) / Ctrl + Shift + A</span>
    </div>
  `;
  shadow.appendChild(drawer);

  // ─── State Management ────────────────────────────────────────
  let isDrawerOpen = false;
  let currentJobData = null;
  let currentAnalysis = null;
  let isXrayActive = false;
  let originalJdHTML = null;

  const toggleDrawer = (open) => {
    isDrawerOpen = typeof open === "boolean" ? open : !isDrawerOpen;
    if (isDrawerOpen) drawer.classList.add("open");
    else drawer.classList.remove("open");
  };

  pill.addEventListener("click", () => {
    if (!dragMoved) toggleDrawer();
  });

  drawer.querySelector("#ats-close").addEventListener("click", () => toggleDrawer(false));

  // Keyboard shortcut: Cmd+Shift+A / Ctrl+Shift+A
  window.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === "KeyA") {
      e.preventDefault();
      toggleDrawer();
    }
  });

  // Listen for manual trigger scans from popup or keyboard
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "TRIGGER_SCAN") {
      if (window.ATS_SCRAPER) {
        const freshJob = window.ATS_SCRAPER.extractJobData();
        if (freshJob && freshJob.jdText) {
          revertXrayHighlight();
          currentJobData = freshJob;
          analyzeActiveJob(freshJob);
          toggleDrawer(true);
          sendResponse({ success: true });
          return true;
        }
      }
      sendResponse({ success: false, reason: "No job description found on tab." });
      return true;
    }
  });

  // ─── Scraper Hook ────────────────────────────────────────────
  if (window.ATS_SCRAPER) {
    window.ATS_SCRAPER.onJobChange((jobData) => {
      // Revert previous X-ray if active on job switch
      revertXrayHighlight();
      currentJobData = jobData;
      analyzeActiveJob(jobData);
    });
  }

  function getScoreColor(val) {
    return val >= 78 ? "#10b981" : val >= 55 ? "#f59e0b" : "#ef4444";
  }

  function analyzeActiveJob(jobData) {
    const pillScoreEl = shadow.querySelector("#ats-pill-score");
    const dotEl = shadow.querySelector("#ats-dot");
    pillScoreEl.innerText = "...";
    dotEl.style.background = "#f59e0b";

    chrome.runtime.sendMessage(
      {
        action: "MATCH_JOB",
        payload: {
          jobTitle: jobData.title,
          company: jobData.company,
          jobUrl: jobData.jobUrl,
          jdText: jobData.jdText,
        },
      },
      (response) => {
        if (!response || !response.success || !response.data) {
          pillScoreEl.innerText = "?";
          dotEl.style.background = "#ef4444";
          return;
        }

        currentAnalysis = response.data;
        renderAnalysis(currentAnalysis, jobData);
      }
    );
  }

  function renderAnalysis(data, jobData) {
    const scoreColor = getScoreColor(data.overallScore);

    // Update Pill
    shadow.querySelector("#ats-pill-score").innerText = `${data.overallScore}%`;
    shadow.querySelector("#ats-pill-score").style.color = scoreColor;
    shadow.querySelector("#ats-dot").style.background = scoreColor;
    shadow.querySelector("#ats-pill-label").innerText =
      data.matchTier === "strong" ? "Strong Fit" : data.matchTier === "moderate" ? "Moderate" : "Low Match";

    // Update Drawer Header & Score
    shadow.querySelector("#ats-job-title").innerText = jobData.title;
    shadow.querySelector("#ats-company-name").innerText = jobData.company;
    shadow.querySelector("#ats-vendor-badge").innerText = data.vendor.badge;

    const scoreDisplay = shadow.querySelector("#ats-score-display");
    scoreDisplay.innerText = `${data.overallScore}%`;
    scoreDisplay.style.color = scoreColor;

    const tierBadge = shadow.querySelector("#ats-tier-badge");
    tierBadge.innerText = `${data.matchTier.toUpperCase()} MATCH`;
    tierBadge.style.color = scoreColor;
    tierBadge.style.background = `${scoreColor}22`;

    // Vendor Tip Box
    shadow.querySelector("#ats-vendor-name").innerText = `${data.vendor.name}:`;
    shadow.querySelector("#ats-vendor-tip").innerText = data.vendor.tip;

    // Matched Chips
    const matchedWrap = shadow.querySelector("#ats-matched-chips");
    shadow.querySelector("#ats-matched-count").innerText = `${data.matchedCount}`;
    if (data.matchedKeywords.length > 0) {
      matchedWrap.innerHTML = data.matchedKeywords
        .map((k) => `<span class="ats-chip ats-chip-matched">✓ ${k.keyword}</span>`)
        .join("");
    } else {
      matchedWrap.innerHTML = '<span style="font-size: 0.75rem; color: #64748b;">No direct skill matches</span>';
    }

    // Missing Chips
    const missingWrap = shadow.querySelector("#ats-missing-chips");
    shadow.querySelector("#ats-missing-count").innerText = `${data.missingCount}`;
    if (data.missingKeywords.length > 0) {
      missingWrap.innerHTML = data.missingKeywords
        .map(
          (k) =>
            `<span class="ats-chip ats-chip-missing" title="Click to copy skill" data-skill="${k.keyword}">+ ${k.keyword}</span>`
        )
        .join("");

      missingWrap.querySelectorAll(".ats-chip-missing").forEach((chip) => {
        chip.addEventListener("click", () => {
          const skill = chip.getAttribute("data-skill");
          navigator.clipboard.writeText(skill);
          chip.innerText = "✓ Copied!";
          setTimeout(() => (chip.innerText = `+ ${skill}`), 1500);
        });
      });
    } else {
      missingWrap.innerHTML = '<span style="font-size: 0.75rem; color: #10b981;">✓ All key skills satisfied!</span>';
    }
  }

  // ─── In-Page Keyword X-Ray Highlighting ──────────────────────
  const xrayBtn = shadow.querySelector("#ats-xray-toggle");

  xrayBtn.addEventListener("click", () => {
    isXrayActive = !isXrayActive;
    if (isXrayActive) {
      xrayBtn.classList.add("active");
      xrayBtn.innerText = "👁️ X-Ray: ON";
      applyXrayHighlight();
    } else {
      xrayBtn.classList.remove("active");
      xrayBtn.innerText = "👁️ X-Ray";
      revertXrayHighlight();
    }
  });

  function applyXrayHighlight() {
    if (!currentJobData?.jdElement || !currentAnalysis) return;
    const el = currentJobData.jdElement;

    if (!originalJdHTML) {
      originalJdHTML = el.innerHTML;
    }

    let html = originalJdHTML;
    const matched = currentAnalysis.matchedKeywords || [];
    const missing = currentAnalysis.missingKeywords || [];

    // Highlight matched in green
    matched.forEach((k) => {
      const reg = new RegExp(`\\b(${escapeRegex(k.keyword)})\\b`, "gi");
      html = html.replace(
        reg,
        `<mark style="background: rgba(16, 185, 129, 0.28); color: #047857; font-weight: bold; border-radius: 4px; padding: 1px 4px;">$1</mark>`
      );
    });

    // Highlight missing in yellow/amber
    missing.forEach((k) => {
      const reg = new RegExp(`\\b(${escapeRegex(k.keyword)})\\b`, "gi");
      html = html.replace(
        reg,
        `<mark style="background: rgba(245, 158, 11, 0.28); color: #b45309; font-weight: bold; border-radius: 4px; padding: 1px 4px;">$1</mark>`
      );
    });

    el.innerHTML = html;
  }

  function revertXrayHighlight() {
    if (originalJdHTML && currentJobData?.jdElement) {
      currentJobData.jdElement.innerHTML = originalJdHTML;
      originalJdHTML = null;
    }
    isXrayActive = false;
    xrayBtn.classList.remove("active");
    xrayBtn.innerText = "👁️ X-Ray";
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // ─── 1-Click Save Job Tracker ────────────────────────────────
  const saveJobBtn = shadow.querySelector("#ats-save-job-btn");
  const statusSelect = shadow.querySelector("#ats-job-status-select");

  saveJobBtn.addEventListener("click", () => {
    if (!currentJobData) return;

    saveJobBtn.innerText = "Saving...";
    saveJobBtn.disabled = true;

    chrome.runtime.sendMessage(
      {
        action: "SAVE_JOB",
        payload: {
          company: currentJobData.company,
          jobTitle: currentJobData.title,
          jobUrl: currentJobData.jobUrl,
          platform: currentJobData.platform,
          status: statusSelect.value,
          matchScore: currentAnalysis?.overallScore || null,
        },
      },
      (res) => {
        saveJobBtn.disabled = false;
        if (res && res.success) {
          saveJobBtn.innerText = "✓ Saved!";
          saveJobBtn.style.background = "#10b981";
          setTimeout(() => {
            saveJobBtn.innerText = "Save Job";
            saveJobBtn.style.background = "#3b82f6";
          }, 2500);
        } else {
          saveJobBtn.innerText = "Error";
          setTimeout(() => (saveJobBtn.innerText = "Save Job"), 1500);
        }
      }
    );
  });

  // ─── AI Tailor Button ────────────────────────────────────────
  const tailorBtn = shadow.querySelector("#ats-tailor-btn");
  const tailorResults = shadow.querySelector("#ats-tailored-results");

  tailorBtn.addEventListener("click", () => {
    if (!currentJobData || !currentJobData.jdText) return;

    tailorBtn.innerText = "✨ Drafting tailored bullets with Groq LLM...";
    tailorBtn.disabled = true;

    chrome.runtime.sendMessage(
      {
        action: "QUICK_TAILOR",
        payload: {
          jobTitle: currentJobData.title,
          jdText: currentJobData.jdText,
        },
      },
      (res) => {
        tailorBtn.innerText = "✨ Generate 2 Tailored Bullets for This Job";
        tailorBtn.disabled = false;

        if (res && res.success && res.data?.tailored) {
          tailorResults.innerHTML = res.data.tailored
            .map(
              (t, i) => `
              <div class="ats-tailored-item">
                <span style="font-size: 0.7rem; color: #818cf8; font-weight: 700; text-transform: uppercase;">
                  Bullet #${i + 1} (${t.targetedRequirement || "Targeted"})
                </span>
                <p style="margin: 4px 0 0 0;">${t.bullet}</p>
                <button class="ats-copy-bullet-btn" data-bullet="${encodeURIComponent(t.bullet)}">
                  📋 Copy Bullet
                </button>
              </div>
            `
            )
            .join("");

          tailorResults.querySelectorAll(".ats-copy-bullet-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
              const text = decodeURIComponent(btn.getAttribute("data-bullet"));
              navigator.clipboard.writeText(text);
              btn.innerText = "✓ Copied to Clipboard!";
              setTimeout(() => (btn.innerText = "📋 Copy Bullet"), 2000);
            });
          });
        }
      }
    );
  });
})();
