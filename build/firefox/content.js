// Content script for Amn Shield - App Integration
// This script enables communication between the extension and the AmnShield productivity app

// Browser compatibility
if (typeof browser === "undefined") {
    var browser = chrome;
}

// Extension status and data
let extensionData = {
    version: chrome.runtime.getManifest().version,
    isActive: true,
    blockedToday: 0,
    lastSync: new Date().toISOString()
};

// Initialize extension integration
function initializeAppIntegration() {
    // Inject extension detection marker
    injectExtensionMarker();

    // Set up global extension object
    setupGlobalExtensionObject();

    // Listen for messages from the productivity app
    setupMessageListener();

    // Load blocked count from storage
    loadBlockedCount();

    console.log('🔗 Amn Shield extension integration initialized');
}

// Inject DOM marker for extension detection
function injectExtensionMarker() {
    const marker = document.createElement('div');
    marker.setAttribute('data-amn-shield-extension', 'true');
    marker.setAttribute('data-version', extensionData.version);
    marker.setAttribute('data-blocked-today', extensionData.blockedToday.toString());
    marker.style.display = 'none';

    // Ensure head exists before appending
    if (document.head) {
        document.head.appendChild(marker);
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            document.head.appendChild(marker);
        });
    }
}

// Set up global extension object for app communication
function setupGlobalExtensionObject() {
    window.AmnShieldExtension = {
        version: extensionData.version,
        isActive: extensionData.isActive,
        getBlockedCount: () => extensionData.blockedToday,
        getStatus: () => ({
            installed: true,
            active: extensionData.isActive,
            version: extensionData.version,
            blockedToday: extensionData.blockedToday,
            lastSync: extensionData.lastSync
        })
    };

    // Dispatch detection event
    const event = new CustomEvent('amnShieldExtensionDetected', {
        detail: window.AmnShieldExtension.getStatus()
    });
    window.dispatchEvent(event);
}

// Set up message listener for app communication
function setupMessageListener() {
    window.addEventListener('message', (event) => {
        // Only accept messages from same origin
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'AMN_SHIELD_APP_MESSAGE') {
            handleAppMessage(event.data.payload);
        }
    });
}

// Handle messages from the productivity app
function handleAppMessage(payload) {
    switch (payload.action) {
        case 'getStatus':
            sendStatusUpdate();
            break;

        case 'syncSettings':
            handleSettingsSync(payload.data);
            break;

        case 'toggleIslamicMode':
            handleIslamicModeToggle(payload.data);
            break;

        case 'updateSchedule':
            handleScheduleUpdate(payload.data);
            break;

        case 'registerApp':
            handleAppRegistration();
            break;

        case 'openSettings':
            openExtensionSettings();
            break;

        default:
            console.log('Unknown app message:', payload.action);
    }
}

// Send status update to the app
function sendStatusUpdate() {
    const statusData = {
        installed: true,
        active: extensionData.isActive,
        version: extensionData.version,
        blockedToday: extensionData.blockedToday,
        lastSync: extensionData.lastSync
    };

    postMessageToApp('statusUpdate', statusData);
}

// Handle app registration
function handleAppRegistration() {
    console.log('📱 AmnShield app registered with extension');
    sendStatusUpdate();
}

// Handle settings synchronization
function handleSettingsSync(data) {
    console.log('🔄 Syncing settings with app:', data);

    // Store prayer times and location for Islamic mode
    if (data.prayerTimes) {
        browser.storage.sync.set({ appPrayerTimes: data.prayerTimes });
    }

    if (data.location) {
        browser.storage.sync.set({ appLocation: data.location });
    }

    // Update Islamic mode if provided
    if (typeof data.islamicMode !== 'undefined') {
        updateIslamicMode(data.islamicMode);
    }

    extensionData.lastSync = new Date().toISOString();
    updateExtensionMarker();
}

// Handle Islamic mode toggle
function handleIslamicModeToggle(data) {
    console.log('🕌 Islamic mode toggle:', data.enabled);
    updateIslamicMode(data.enabled);
}

// Handle protection schedule update
function handleScheduleUpdate(data) {
    console.log('📅 Protection schedule updated:', data);
    browser.storage.sync.set({ protectionSchedule: data });
}

// Update Islamic mode
function updateIslamicMode(enabled) {
    browser.storage.sync.set({ islamicMode: enabled }, () => {
        // Send message to background script to update blocking rules
        try {
            chrome.runtime.sendMessage({
                action: 'updateIslamicMode',
                enabled: enabled
            }, () => {
                if (chrome.runtime.lastError) {
                    console.debug('updateIslamicMode message had no listener:', chrome.runtime.lastError.message);
                }
            });
        } catch (err) {
            console.warn('Failed to send updateIslamicMode message:', err);
        }

        // Notify app of the change
        postMessageToApp('islamicModeUpdate', { enabled: enabled });
    });
}

// Open extension settings
function openExtensionSettings() {
    try {
        chrome.runtime.sendMessage({ action: 'openOptionsPage' }, () => {
            if (chrome.runtime.lastError) {
                console.debug('openOptionsPage message had no listener:', chrome.runtime.lastError.message);
            }
        });
    } catch (err) {
        console.warn('Failed to send openOptionsPage message:', err);
    }
}

// Post message to the app
function postMessageToApp(action, data) {
    window.postMessage({
        type: 'AMN_SHIELD_EXTENSION_UPDATE',
        payload: {
            action: action,
            data: data
        }
    }, window.location.origin);
}

// Load blocked count from storage
function loadBlockedCount() {
    browser.storage.local.get(['blockedToday', 'lastBlockedDate'], (result) => {
        const today = new Date().toDateString();

        if (result.lastBlockedDate === today) {
            extensionData.blockedToday = result.blockedToday || 0;
        } else {
            // Reset count for new day
            extensionData.blockedToday = 0;
            browser.storage.local.set({
                blockedToday: 0,
                lastBlockedDate: today
            });
        }

        updateExtensionMarker();
    });
}

// Update the extension marker with current data
function updateExtensionMarker() {
    const marker = document.querySelector('[data-amn-shield-extension]');
    if (marker) {
        marker.setAttribute('data-blocked-today', extensionData.blockedToday.toString());
        marker.setAttribute('data-last-sync', extensionData.lastSync);
    }

    // Update global object
    if (window.AmnShieldExtension) {
        window.AmnShieldExtension.getBlockedCount = () => extensionData.blockedToday;
    }
}

// Listen for blocking events from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'contentBlocked') {
        handleContentBlocked(message.data);
    } else if (message.action === 'getExtensionData') {
        sendResponse(extensionData);
    }
});

// Handle content blocking event
function handleContentBlocked(data) {
    extensionData.blockedToday++;

    // Update storage
    browser.storage.local.set({
        blockedToday: extensionData.blockedToday,
        lastBlockedDate: new Date().toDateString()
    });

    // Update marker
    updateExtensionMarker();

    // Notify app of blocking event
    postMessageToApp('blockingEvent', {
        domain: data.domain,
        url: data.url,
        category: data.category,
        timestamp: Date.now(),
        totalBlocked: extensionData.blockedToday
    });

    console.log('🚫 Content blocked:', data.domain, 'Total today:', extensionData.blockedToday);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAppIntegration);
} else {
    initializeAppIntegration();
}
