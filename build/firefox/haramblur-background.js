/**
 * haramblur-background.js
 * AI content blur background manager adapted from AmnShield.
 */

const SETTINGS_KEY = "hb-settings";

// Default Settings
const DEFAULT_SETTINGS = {
    status: false,
    blurryStartMode: false,
    blurAmount: 30,
    blurImages: true,
    blurVideos: true,
    blurMale: false,
    blurFemale: true,
    specificBlur: true,
    unblurImages: false,
    unblurVideos: false,
    gray: false,
    useSolidColor: false,
    solidColor: "#808080",
    strictness: 0.4,
    whitelist: [],
    detectionModel: "vZNq2WHrFm7b",
    scoreThreshold: 0.4,
    hideVideoToggle: false,
    passwordProtectionEnabled: false,
    uninstallPreventionEnabled: false,
    preventIncognitoGuestEnabled: false,
    protectionMode: "free"
};

let creatingOffscreen = null;

// Initialize settings
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.get([SETTINGS_KEY], (res) => {
        if (!res[SETTINGS_KEY]) {
            chrome.storage.sync.set({ [SETTINGS_KEY]: DEFAULT_SETTINGS });
        } else {
            // Merge defaults for new keys
            const merged = { ...DEFAULT_SETTINGS, ...res[SETTINGS_KEY] };
            chrome.storage.sync.set({ [SETTINGS_KEY]: merged });
        }
    });
});

// Create/manage offscreen document
async function ensureOffscreenDocument() {
    try {
        const hasDoc = await chrome.offscreen.hasDocument();
        if (hasDoc) return;

        if (creatingOffscreen) {
            await creatingOffscreen;
            return;
        }

        creatingOffscreen = chrome.offscreen.createDocument({
            url: chrome.runtime.getURL("offscreen.html"),
            reasons: ["DOM_PARSER", "IFRAME_SCRIPTING"],
            justification: "Process Images and Firebase Authentication"
        });

        await creatingOffscreen;
        console.log("[HB-BG] Offscreen document created.");
    } catch (err) {
        if (!err.message.includes("single")) {
            console.error("[HB-BG] Error creating offscreen document:", err);
        }
    } finally {
        creatingOffscreen = null;
    }
}

// Recreate offscreen document helper
async function recreateOffscreen() {
    try {
        const hasDoc = await chrome.offscreen.hasDocument();
        if (hasDoc) {
            await chrome.offscreen.closeDocument();
        }
    } catch (e) {}
    setTimeout(() => {
        ensureOffscreenDocument();
    }, 1000);
}

// Watch settings changes and broadcast to tabs/offscreen
chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync" || !changes[SETTINGS_KEY]) return;

    const oldValue = changes[SETTINGS_KEY].oldValue || {};
    const newValue = changes[SETTINGS_KEY].newValue || {};

    // Check if status is changed to true
    if (newValue.status && !oldValue.status) {
        ensureOffscreenDocument();
    } else if (!newValue.status && oldValue.status) {
        // Close if disabled
        chrome.offscreen.hasDocument().then(hasDoc => {
            if (hasDoc) chrome.offscreen.closeDocument();
        }).catch(() => {});
    }

    // Broadcast incremental updates (updateSettings) to all tabs and extension runtimes
    for (let key in newValue) {
        if (newValue[key] !== oldValue[key]) {
            const updateMsg = {
                type: "updateSettings",
                newSetting: { key: key, value: newValue[key] }
            };
            
            // Broadcast to tabs
            chrome.tabs.query({}, (tabs) => {
                tabs.forEach((tab) => {
                    try {
                        chrome.tabs.sendMessage(tab.id, updateMsg).catch(() => {});
                    } catch (e) {}
                });
            });

            // Broadcast to offscreen
            try {
                chrome.runtime.sendMessage(updateMsg).catch(() => {});
            } catch (e) {}
        }
    }
});

// Setup context menus
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.remove("report-image", () => {
        const err = chrome.runtime.lastError; // silence errors
        chrome.contextMenus.create({
            id: "report-image",
            title: "AmnShield - Report Image",
            contexts: ["image"],
            enabled: true
        });
    });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "report-image") {
        // Send a request to get image details from content script
        chrome.tabs.sendMessage(tab.id, {
            type: "get-reported-image-info",
            url: info.srcUrl
        }, (response) => {
            const originalSrc = response?.originalSrc;
            injectReportModal(tab.id, info.srcUrl, tab.url, originalSrc);
        });
    }
});

// Function to inject report modal
function injectReportModal(tabId, srcUrl, pageUrl, originalSrc) {
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: (src, page, origSrc, extUrl) => {
            let existing = document.getElementById("hb-report-modal");
            if (existing) existing.remove();

            const html = `
            <div class="hb-report-modal" dir="ltr">
              <div class="hb-modal-content">
                <div class="hb-modal-header">
                  <div class="hb-header-title">
                    <img src="${extUrl}src/assets/hb-icon-48.png" width="24" height="24" alt="AmnShield">
                    <h3>Report Image</h3>
                  </div>
                  <button class="hb-close-button">&times;</button>
                </div>
                <div class="hb-modal-body">
                  <p class="hb-description">Help us improve our detection by reporting any issues.</p>
                  <div class="hb-image-section">
                    <button class="hb-toggle-image hb-button hb-button-secondary">
                      <span class="hb-toggle-text">Show Image</span>
                      <span class="hb-toggle-arrow">▶</span>
                    </button>
                    <div class="hb-image-preview" style="display: none;">
                      <img src="${src}" alt="Content preview">
                    </div>
                  </div>
                  <div class="hb-report-options">
                    <p class="hb-label">What's wrong with this detection?</p>
                    <label class="hb-radio-label">
                      <input type="radio" name="report-type" value="false-positive">
                      <span>False Positive - Content was wrongly blurred</span>
                    </label>
                    <label class="hb-radio-label">
                      <input type="radio" name="report-type" value="false-negative">
                      <span>False Negative - Inappropriate content wasn't blurred</span>
                    </label>
                  </div>
                </div>
                <div class="hb-modal-footer">
                  <button class="hb-button hb-button-secondary hb-cancel-button">Cancel</button>
                  <button class="hb-button hb-button-primary hb-submit-button" disabled>Send Report</button>
                </div>
              </div>
            </div>
            `;

            const container = document.createElement("div");
            container.id = "hb-report-modal";
            const shadow = container.attachShadow({ mode: "closed" });

            const style = document.createElement("style");
            style.textContent = `
            :host { all: initial; display: block; }
            * { margin: 0; padding: 0; box-sizing: border-box; font-family: system-ui, sans-serif; }
            .hb-report-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 999999; }
            .hb-modal-content { background: white; border-radius: 8px; width: 90%; max-width: 500px; max-height: 90vh; overflow: auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1); color: #333; }
            .hb-modal-header { padding: 16px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
            .hb-header-title { display: flex; align-items: center; gap: 8px; }
            .hb-header-title h3 { margin: 0; font-size: 18px; font-weight: 600; }
            .hb-close-button { border: none; background: none; font-size: 24px; cursor: pointer; opacity: 0.6; }
            .hb-close-button:hover { opacity: 1; }
            .hb-modal-body { padding: 16px; }
            .hb-description { margin: 0 0 16px; opacity: 0.7; font-size: 14px; }
            .hb-radio-label { display: flex; align-items: flex-start; padding: 8px 0; cursor: pointer; gap: 12px; }
            .hb-radio-label input[type="radio"] { margin-top: 3px; }
            .hb-radio-label span { font-size: 14px; color: #444; }
            .hb-report-options { margin-bottom: 20px; display: flex; flex-direction: column; gap: 8px; }
            .hb-label { font-weight: 500; margin-bottom: 8px; font-size: 14px; }
            .hb-image-section { margin-bottom: 16px; }
            .hb-toggle-image { width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; font-size: 14px; margin-bottom: 8px; }
            .hb-toggle-arrow { font-size: 12px; transition: transform 0.2s ease; }
            .hb-toggle-image.expanded .hb-toggle-arrow { transform: rotate(90deg); }
            .hb-image-preview { background: #f5f5f5; border-radius: 4px; text-align: center; padding: 8px; }
            .hb-image-preview img { max-width: 100%; max-height: 300px; object-fit: contain; }
            .hb-modal-footer { padding: 16px; border-top: 1px solid #eee; display: flex; justify-content: flex-end; gap: 8px; }
            .hb-button { padding: 8px 16px; border-radius: 4px; border: none; font-weight: 500; cursor: pointer; font-size: 14px; }
            .hb-button:disabled { opacity: 0.5; cursor: not-allowed; }
            .hb-button-primary { background: #2196f3; color: white; }
            .hb-button-primary:not(:disabled):hover { background: #1976d2; }
            .hb-button-secondary { background: #f5f5f5; color: #333; }
            .hb-button-secondary:hover { background: #e5e5e5; }
            .hb-success-message { text-align: center; padding: 32px 16px; }
            .hb-success-message h3 { color: #4caf50; margin: 0 0 8px; }
            `;

            shadow.innerHTML = html;
            shadow.prepend(style);
            document.body.appendChild(container);

            const modal = shadow.querySelector(".hb-report-modal");
            const closeBtn = shadow.querySelector(".hb-close-button");
            const cancelBtn = shadow.querySelector(".hb-cancel-button");
            const submitBtn = shadow.querySelector(".hb-submit-button");
            const radios = shadow.querySelectorAll('input[name="report-type"]');
            const content = shadow.querySelector(".hb-modal-content");
            const toggleBtn = shadow.querySelector(".hb-toggle-image");
            const preview = shadow.querySelector(".hb-image-preview");
            const toggleText = shadow.querySelector(".hb-toggle-text");

            const close = () => container.remove();

            toggleBtn.addEventListener("click", () => {
                const isExpanded = toggleBtn.classList.contains("expanded");
                toggleBtn.classList.toggle("expanded");
                preview.style.display = isExpanded ? "none" : "block";
                toggleText.textContent = isExpanded ? "Show Image" : "Hide Image";
            });

            closeBtn.addEventListener("click", close);
            cancelBtn.addEventListener("click", close);
            modal.addEventListener("click", (e) => { if (e.target === modal) close(); });

            radios.forEach(r => r.addEventListener("change", () => { submitBtn.disabled = false; }));

            submitBtn.addEventListener("click", async () => {
                const type = shadow.querySelector('input[name="report-type"]:checked').value;
                submitBtn.disabled = true;
                submitBtn.textContent = "Sending...";

                const settings = await chrome.storage.sync.get(SETTINGS_KEY);
                const gFormUrl = "https://docs.google.com/forms/u/0/d/e/1FAIpQLSfHbTsJaydX__sCbv7aGf0RiVBxTcbBSzv5LU-VALJm1TFnlg/formResponse";
                
                const formData = new URLSearchParams({
                    "entry.625186413": type,
                    "entry.1528363305": src,
                    "entry.928202137": origSrc || "",
                    "entry.2049916266": page,
                    "entry.2050137681": JSON.stringify(settings[SETTINGS_KEY] || {})
                });

                try {
                    if (type === "false-negative") {
                        chrome.runtime.sendMessage({ type: "relay-false-negative", tabId: tabId, imageUrl: src });
                    } else if (type === "false-positive") {
                        chrome.runtime.sendMessage({ type: "relay-false-positive", tabId: tabId, imageUrl: src });
                    }

                    await fetch(gFormUrl, { method: "POST", mode: "no-cors", body: formData });
                    content.innerHTML = `
                    <div class="hb-success-message">
                      <h3>Thank You!</h3>
                      <p>Your report has been submitted successfully.<br>We appreciate your help in improving AmnShield.</p>
                    </div>
                    `;
                    setTimeout(close, 2000);
                } catch (err) {
                    console.error("Report failed:", err);
                    submitBtn.textContent = "Send Report";
                    submitBtn.disabled = false;
                }
            });
        },
        args: [srcUrl, pageUrl, originalSrc, chrome.runtime.getURL("")]
    });
}

// Handle messaging routing & lifecycle
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "hb-getSettings") {
        chrome.storage.sync.get([SETTINGS_KEY], (res) => {
            sendResponse(res[SETTINGS_KEY] || DEFAULT_SETTINGS);
        });
        return true;
    }

    if (request.type === "ensureOffscreenDocument") {
        ensureOffscreenDocument().then(() => sendResponse({ success: true }));
        return true;
    }

    if (request.type === "recreateOffscreen") {
        recreateOffscreen();
        sendResponse({ success: true });
        return true;
    }

    if (request.type === "updateSettings") {
        const { key, value } = request.newSetting;
        chrome.storage.sync.get([SETTINGS_KEY], (res) => {
            const config = res[SETTINGS_KEY] || { ...DEFAULT_SETTINGS };
            config[key] = value;
            chrome.storage.sync.set({ [SETTINGS_KEY]: config }, () => {
                sendResponse({ success: true });
            });
        });
        return true;
    }

    if (request.type === "relay-false-negative") {
        chrome.tabs.sendMessage(request.tabId, {
            type: "process-false-negative",
            imageUrl: request.imageUrl
        }).catch(() => {});
        sendResponse({ success: true });
        return true;
    }

    if (request.type === "relay-false-positive") {
        chrome.tabs.sendMessage(request.tabId, {
            type: "process-false-positive",
            imageUrl: request.imageUrl
        }).catch(() => {});
        sendResponse({ success: true });
        return true;
    }
});

// Auto-manage offscreen document on start
chrome.storage.sync.get([SETTINGS_KEY], (res) => {
    const config = res[SETTINGS_KEY] || DEFAULT_SETTINGS;
    if (config.status) {
        ensureOffscreenDocument();
    }
});
