// ============================================================
// ATS Checker Extension - Background Service Worker (Manifest V3)
// Handles API communication, storage sync, and badge updates
// ============================================================

const DEFAULT_API_URL = "http://localhost:3001";

// Initialize default settings on install
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get(["apiUrl", "clerkId", "activeResume"]);
  if (!data.apiUrl) {
    await chrome.storage.local.set({ apiUrl: DEFAULT_API_URL });
  }
  console.log("[ATS-Checker] Background service worker initialized.");
});

// Message Listener for Content Scripts & Popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "MATCH_JOB") {
    handleMatchJob(request.payload)
      .then((res) => {
        // Update badge with score if available
        if (sender.tab?.id && res?.overallScore) {
          const score = res.overallScore;
          chrome.action.setBadgeText({ tabId: sender.tab.id, text: `${score}` });
          const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
          chrome.action.setBadgeBackgroundColor({ tabId: sender.tab.id, color });
        }
        sendResponse({ success: true, data: res });
      })
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open for async response
  }

  if (request.action === "QUICK_TAILOR") {
    handleQuickTailor(request.payload)
      .then((res) => sendResponse({ success: true, data: res }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === "SYNC_PROFILE") {
    handleSyncProfile(request.payload)
      .then((res) => sendResponse({ success: true, data: res }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === "GET_SETTINGS") {
    chrome.storage.local
      .get(["apiUrl", "clerkId", "userEmail", "activeResume", "allResumes"])
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

async function getApiUrl() {
  const { apiUrl } = await chrome.storage.local.get("apiUrl");
  let url = (apiUrl || DEFAULT_API_URL).trim();
  if (url.endsWith("/")) url = url.slice(0, -1);
  return url;
}

async function handleMatchJob(payload) {
  const apiUrl = await getApiUrl();
  const { clerkId, activeResume } = await chrome.storage.local.get(["clerkId", "activeResume"]);

  const body = {
    clerkId: clerkId || undefined,
    resumeId: activeResume?.id || undefined,
    resumeText: payload.resumeText || undefined,
    jobTitle: payload.jobTitle || undefined,
    company: payload.company || undefined,
    jobUrl: payload.jobUrl || undefined,
    jdText: payload.jdText,
  };

  const res = await fetch(`${apiUrl}/api/extension/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to analyze job match.");
  }

  return await res.json();
}

async function handleQuickTailor(payload) {
  const apiUrl = await getApiUrl();
  const { clerkId, activeResume } = await chrome.storage.local.get(["clerkId", "activeResume"]);

  const body = {
    clerkId: clerkId || undefined,
    resumeId: activeResume?.id || undefined,
    resumeText: payload.resumeText || undefined,
    jobTitle: payload.jobTitle || undefined,
    jdText: payload.jdText,
  };

  const res = await fetch(`${apiUrl}/api/extension/quick-tailor`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to generate tailored bullets.");
  }

  return await res.json();
}

async function handleSyncProfile(payload) {
  const apiUrl = await getApiUrl();
  const clerkId = payload.clerkId;
  const email = payload.email;

  const params = new URLSearchParams();
  if (clerkId) params.append("clerkId", clerkId);
  if (email) params.append("email", email);

  const res = await fetch(`${apiUrl}/api/extension/sync?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to sync profile from ATS Checker.");

  const json = await res.json();
  if (json.authenticated) {
    await chrome.storage.local.set({
      clerkId: json.user.clerkId,
      userEmail: json.user.email,
      activeResume: json.activeResume,
      allResumes: json.allResumes,
    });
  }

  return json;
}
