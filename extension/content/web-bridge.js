// ============================================================
// ATS Checker Extension - Web App 0-Click Auth Bridge
// Automatically pairs web session with the browser sidecar
// Runs on: localhost:3000, vercel.app, railway.app
// ============================================================

(function () {
  console.log("[ATS-Checker] Web auth bridge initialized.");

  let hasSynced = false;

  function notifyPageOfExtension(synced = false, activeResume = null) {
    window.postMessage(
      {
        type: "ATS_EXTENSION_PONG",
        version: "1.0.0",
        installed: true,
        synced: synced,
        activeResume: activeResume || null,
      },
      "*"
    );
  }

  // Attempt sync using credentials
  function syncWithBackground(clerkId, email) {
    if (!clerkId && !email) return;

    chrome.runtime.sendMessage(
      {
        action: "SYNC_PROFILE",
        payload: { clerkId, email },
      },
      (res) => {
        if (chrome.runtime.lastError) {
          console.warn("[ATS-Checker Bridge] Sync error:", chrome.runtime.lastError.message);
          return;
        }

        if (res && res.success && res.data?.authenticated) {
          hasSynced = true;
          console.log("[ATS-Checker Bridge] Seamless 0-click sync successful for:", email || clerkId);

          const bridgeEl = document.getElementById("ats-web-auth-bridge");
          if (bridgeEl) {
            bridgeEl.setAttribute("data-extension-synced", "true");
            bridgeEl.setAttribute(
              "data-active-resume",
              res.data.activeResume ? JSON.stringify(res.data.activeResume) : ""
            );
          }

          notifyPageOfExtension(true, res.data.activeResume);
        }
      }
    );
  }

  // Check DOM bridge element
  function checkDomBridge() {
    const el = document.getElementById("ats-web-auth-bridge");
    if (el) {
      const clerkId = el.getAttribute("data-clerk-id");
      const email = el.getAttribute("data-email");
      if (clerkId || email) {
        syncWithBackground(clerkId, email);
      }
    }
  }

  // Listen to window postMessage from Web App React components
  window.addEventListener("message", (event) => {
    // Only accept messages from same origin
    if (event.source !== window) return;

    if (event.data?.type === "ATS_PING_EXTENSION") {
      chrome.runtime.sendMessage({ action: "GET_SETTINGS" }, (res) => {
        const isSynced = Boolean(res?.data?.clerkId || res?.data?.userEmail);
        notifyPageOfExtension(isSynced, res?.data?.activeResume);
      });
    }

    if (event.data?.type === "ATS_WEB_AUTH_DATA") {
      const { clerkId, email } = event.data;
      if (clerkId || email) {
        syncWithBackground(clerkId, email);
      }
    }
  });

  // Watch for dynamic DOM insertion (e.g. Next.js hydration)
  const observer = new MutationObserver(() => {
    if (!hasSynced) {
      checkDomBridge();
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["data-clerk-id", "data-email"],
  });

  // Initial check on load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      checkDomBridge();
      notifyPageOfExtension();
    });
  } else {
    checkDomBridge();
    notifyPageOfExtension();
  }
})();
