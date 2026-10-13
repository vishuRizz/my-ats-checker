// ============================================================
// ATS Checker Extension - Toolbar Popup Logic
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {
  const authStatusEl = document.getElementById("auth-status");
  const userEmailEl = document.getElementById("user-email");
  const syncInputEl = document.getElementById("sync-input");
  const syncBtn = document.getElementById("sync-btn");
  const resumeScoreEl = document.getElementById("resume-score");
  const resumeFilenameEl = document.getElementById("resume-filename");
  const resumeSkillsEl = document.getElementById("resume-skills");
  const resumeSelect = document.getElementById("resume-select");
  const apiUrlInput = document.getElementById("api-url-input");
  const saveApiBtn = document.getElementById("save-api-btn");
  const manualScanBtn = document.getElementById("manual-scan-btn");

  // Load Initial Settings
  chrome.runtime.sendMessage({ action: "GET_SETTINGS" }, (res) => {
    if (!res || !res.success || !res.data) return;
    const { apiUrl, clerkId, userEmail, activeResume, allResumes } = res.data;

    if (apiUrl) apiUrlInput.value = apiUrl;

    if (userEmail || clerkId) {
      authStatusEl.innerText = "✓ Synced";
      authStatusEl.className = "status-indicator connected";
      userEmailEl.innerText = userEmail || clerkId;
      syncInputEl.value = userEmail || clerkId;
    } else {
      authStatusEl.innerText = "Not Synced";
      authStatusEl.className = "status-indicator disconnected";
    }

    if (activeResume) {
      resumeFilenameEl.innerText = activeResume.filename;
      resumeScoreEl.innerText = activeResume.overallScore ? `${activeResume.overallScore}%` : "Ready";
      resumeSkillsEl.innerText = activeResume.skills?.length
        ? `Skills: ${activeResume.skills.slice(0, 6).join(", ")}...`
        : "Parsed resume active in sidecar.";
    }

    if (Array.isArray(allResumes) && allResumes.length > 1) {
      resumeSelect.style.display = "block";
      resumeSelect.innerHTML = allResumes
        .map(
          (r) =>
            `<option value="${r.id}" ${activeResume?.id === r.id ? "selected" : ""}>${r.filename} (${r.overallScore || 0}%)</option>`
        )
        .join("");

      resumeSelect.addEventListener("change", async (e) => {
        const selectedId = e.target.value;
        const target = allResumes.find((r) => r.id === selectedId);
        if (target) {
          await chrome.storage.local.set({ activeResume: target });
          resumeFilenameEl.innerText = target.filename;
          resumeScoreEl.innerText = `${target.overallScore || 0}%`;
        }
      });
    }
  });

  // Sync Account
  syncBtn.addEventListener("click", () => {
    const val = syncInputEl.value.trim();
    if (!val) return;

    syncBtn.innerText = "Syncing...";
    syncBtn.disabled = true;

    const payload = val.includes("@") ? { email: val } : { clerkId: val };

    chrome.runtime.sendMessage({ action: "SYNC_PROFILE", payload }, (res) => {
      syncBtn.innerText = "Sync Profile";
      syncBtn.disabled = false;

      if (res && res.success && res.data?.authenticated) {
        authStatusEl.innerText = "✓ Synced";
        authStatusEl.className = "status-indicator connected";
        userEmailEl.innerText = res.data.user.email || res.data.user.clerkId;

        if (res.data.activeResume) {
          resumeFilenameEl.innerText = res.data.activeResume.filename;
          resumeScoreEl.innerText = `${res.data.activeResume.overallScore || 0}%`;
          resumeSkillsEl.innerText = `Skills: ${res.data.activeResume.skills.slice(0, 6).join(", ")}`;
        }
      } else {
        alert("Could not find account. Please verify your email or sign in on the web app first.");
      }
    });
  });

  // Save API URL
  saveApiBtn.addEventListener("save-api-btn", async () => {
    const url = apiUrlInput.value.trim();
    if (url) {
      await chrome.storage.local.set({ apiUrl: url });
      saveApiBtn.innerText = "✓ Saved";
      setTimeout(() => (saveApiBtn.innerText = "Save URL"), 1500);
    }
  });

  // Manual Scan
  manualScanBtn.addEventListener("click", async () => {
    manualScanBtn.innerText = "Analyzing Tab...";
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "TRIGGER_SCAN" }, () => {
          manualScanBtn.innerText = "✓ Scanned";
          setTimeout(() => (manualScanBtn.innerText = "⚡ Scan Current Tab"), 1500);
        });
      }
    });
  });
});
