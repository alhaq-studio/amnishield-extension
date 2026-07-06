// Background script for Manifest V2 (Firefox and older browsers)
// Cross-browser API compatibility
if (typeof browser === "undefined") {
    var browser = (typeof chrome !== "undefined") ? chrome : {};
}

// Load scheduler into global namespace for effective settings computation
try { importScripts('services/scheduler.js'); } catch (e) { }

// Helper: get storage (sync)
function getStorageSettings(cb) {
    if (browser.storage && browser.storage.sync && browser.storage.sync.get) {
        // Firefox/Chrome/Edge new API
        browser.storage.sync.get('settings', (result) => {
            cb(result && result.settings ? result.settings : {});
        });
    } else if (chrome && chrome.storage && chrome.storage.sync && chrome.storage.sync.get) {
        // Chrome/Edge legacy
        chrome.storage.sync.get('settings', (result) => {
            cb(result && result.settings ? result.settings : {});
        });
    } else {
        cb({});
    }
}

// Helper: set storage (sync)
function setStorageSettings(settings, cb) {
    if (browser.storage && browser.storage.sync && browser.storage.sync.set) {
        browser.storage.sync.set({ settings }, cb);
    } else if (chrome && chrome.storage && chrome.storage.sync && chrome.storage.sync.set) {
        chrome.storage.sync.set({ settings }, cb);
    } else if (cb) {
        cb();
    }
}

// --- Default Blocklists ---
const HARAM_KEYWORDS = [
    'porn', 'sex', 'xxx', 'adult', 'erotic', 'naked', 'nude', 'nudity', 'lust', 'lewd',
    'nsfw', 'fetish', 'escort', 'hookup', 'camgirl', 'camguy', 'sugarbaby', 'sugardaddy',
    'anal', 'oral', 'bdsm', 'bondage', 'orgasm', 'orgy', 'sensual', 'seductive', 'provocative',
    'pornhub', 'xvideos', 'xhamster', 'xnxx', 'redtube', 'youporn', 'brazzers',
    'bangbros', 'pornstar', 'hentai', 'ecchi', 'jav', 'masturbat',
    'spankbang', 'onlyfans', 'chaturbate', 'cam4', 'bongacams', 'adultfriendfinder',
    'bikini', 'lingerie', 'lingerie-set', 'stocking', 'stockings', 'underwear', 'thong', 'panties', 'bra', 'bralette',
    'swimsuit', 'microkini', 'topless', 'risque', 'sexy', 'sultry', 'pinup',
    'stripper', 'lapdance', 'burlesque', 'stockphoto', 'stockphotos', 'stockimage', 'stockimages', 'stockphotography',
    'betting', 'casino', 'gambling', 'poker', 'roulette', 'slots',
    'liquor', 'vodka', 'whiskey', 'beer', 'wine', 'alcohol',
    'interest', 'riba', 'idol', 'statue', 'astrology', 'horoscope', 'pagan'
];

const HARAM_DOMAINS = [
    'pornhub.com',
    'xvideos.com',
    'xhamster.com',
    'xnxx.com',
    'redtube.com',
    'youporn.com',
    'brazzers.com',
    'bangbros.com',
    'spankbang.com',
    'porn.com',
    'sex.com',
    'onlyfans.com',
    'chaturbate.com',
    'cam4.com',
    'bongacams.com',
    'nudestars.com',
    'adultfriendfinder.com'
];

const SOCIAL_MEDIA_DOMAINS = [
    'facebook.com', 'twitter.com', 'instagram.com', 'tiktok.com', 'youtube.com',
    'reddit.com', 'pinterest.com', 'linkedin.com', 'snapchat.com', 'discord.com'
];

const SOCIAL_BLOCKLIST_RESOURCE = 'data/blocklists/social-domains.json';
let socialDomainCachePromise = null;

async function loadDefaultSocialDomains() {
    if (!socialDomainCachePromise) {
        socialDomainCachePromise = (async () => {
            const builtIn = SOCIAL_MEDIA_DOMAINS.map(normalizeDomain).filter(Boolean);
            const unique = new Set(builtIn);
            try {
                const url = getExtensionUrl(SOCIAL_BLOCKLIST_RESOURCE);
                if (!url) {
                    console.warn(`Skipping ${SOCIAL_BLOCKLIST_RESOURCE}: runtime.getURL unavailable`);
                    return Array.from(unique);
                }
                const response = await fetch(url);
                if (!response.ok) {
                    console.warn(`Skipping ${SOCIAL_BLOCKLIST_RESOURCE}: HTTP ${response.status}`);
                    return Array.from(unique);
                }
                const data = await response.json();
                if (Array.isArray(data)) {
                    data.forEach((domain) => {
                        const normalized = normalizeDomain(domain);
                        if (normalized) {
                            unique.add(normalized);
                        }
                    });
                }
                console.log(`✅ Loaded ${data.length} social media domains from ${SOCIAL_BLOCKLIST_RESOURCE}`);
            } catch (e) {
                console.warn('Falling back to built-in social domains:', e);
            }
            console.log(`📊 Total unique social media domains loaded: ${unique.size}`);
            return Array.from(unique);
        })();
    }
    return socialDomainCachePromise;
}

const IMAGE_KEYWORDS = [
    'nude', 'nudity', 'topless', 'lingerie', 'bikini', 'swimsuit', 'microkini',
    'bra', 'bralette', 'brassiere', 'panties', 'thong', 'g-string', 'underwear',
    'intimates', 'boudoir', 'sensual', 'risque', 'sexy', 'sultry', 'provocative',
    'stocking', 'stockings', 'pinup', 'busty', 'seductive',
    'stockphoto', 'stockphotos', 'stockimage', 'stockimages', 'stockphotography'
];

const SAFE_SEARCH_TARGETS = [
    {
        hostnameRegex: /(^|\.)google\./i,
        pathPrefixes: ['/search', '/imgres'],
        params: [
            { key: 'safe', value: 'active' },
            { key: 'ssui', value: 'on' }
        ]
    },
    {
        hostnameRegex: /(^|\.)bing\.com$/i,
        pathPrefixes: ['/search'],
        params: [{ key: 'adlt', value: 'strict' }]
    },
    {
        hostnameRegex: /(^|\.)search\.yahoo\.com$/i,
        pathPrefixes: ['/search'],
        params: [{ key: 'vm', value: 'r' }]
    },
    {
        hostnameRegex: /(^|\.)duckduckgo\.com$/i,
        pathPrefixes: ['/'],
        params: [{ key: 'kp', value: '1' }]
    },
    {
        // YouTube Restricted Mode
        hostnameRegex: /(^|\.)youtube\.com$/i,
        pathPrefixes: ['/'],
        params: [{ key: 'restrict_mode', value: '1' }]
    }
];

// Initialize browser safe browsing settings (Chrome only - Firefox doesn't support contentSettings API)
function initializeBrowserSafeBrowsing() {
    try {
        // contentSettings API is Chrome-only, not supported in Firefox
        if (typeof chrome !== 'undefined' && chrome.contentSettings && chrome.contentSettings.javascript) {
            // Enable safe browsing if API is available (Chrome only)
            if (chrome.contentSettings.safeBrowsing) {
                chrome.contentSettings.safeBrowsing.set({
                    primaryPattern: '<all_urls>',
                    setting: 'enabled'
                }, function () {
                    if (chrome.runtime.lastError) {
                        console.log('Safe Browsing setting note:', chrome.runtime.lastError.message);
                    } else {
                        console.log('✅ Browser Safe Browsing enabled');
                    }
                });
            }
        } else {
            console.log('ℹ️ contentSettings API not available (Firefox uses built-in protections)');
        }
    } catch (e) {
        console.log('Safe Browsing API not available:', e.message);
    }
}

const ADULT_BLOCKLIST_PARTS = [
    'data/blocklists/adult-domains-part1.json',
    'data/blocklists/adult-domains-part2.json',
    'data/blocklists/adult-domains-part3.json',
    'data/blocklists/adult-domains-part4.json'
];
let haramDomainCachePromise = null;

function getExtensionUrl(relativePath) {
    try {
        if (browser?.runtime?.getURL) {
            return browser.runtime.getURL(relativePath);
        }
        if (chrome?.runtime?.getURL) {
            return chrome.runtime.getURL(relativePath);
        }
    } catch (e) {
        console.warn('Failed to resolve extension URL for MV2 background:', relativePath, e);
    }
    return null;
}

async function loadDefaultHaramDomains() {
    if (!haramDomainCachePromise) {
        haramDomainCachePromise = (async () => {
            const builtIn = HARAM_DOMAINS.map(normalizeDomain).filter(Boolean);
            const unique = new Set(builtIn);
            try {
                // Load all adult blocklist parts
                for (const part of ADULT_BLOCKLIST_PARTS) {
                    const url = getExtensionUrl(part);
                    if (!url) {
                        console.warn(`Skipping ${part}: runtime.getURL unavailable`);
                        continue;
                    }
                    try {
                        const response = await fetch(url);
                        if (!response.ok) {
                            console.warn(`Skipping ${part}: HTTP ${response.status}`);
                            continue;
                        }
                        const data = await response.json();
                        if (Array.isArray(data)) {
                            data.forEach((domain) => {
                                const normalized = normalizeDomain(domain);
                                if (normalized) {
                                    unique.add(normalized);
                                }
                            });
                        }
                        console.log(`✅ Loaded ${data.length} domains from ${part}`);
                    } catch (partError) {
                        console.warn(`Error loading ${part}:`, partError);
                    }
                }
            } catch (e) {
                console.warn('Falling back to built-in MV2 haram domains:', e);
            }
            console.log(`📊 Total unique haram domains loaded: ${unique.size}`);
            return Array.from(unique);
        })();
    }
    return haramDomainCachePromise;
}

function normalizeDomain(domain) {
    if (!domain) return null;
    try {
        const normalized = String(domain).trim().toLowerCase();
        if (!normalized) return null;
        return normalized.replace(/^www\./, '');
    } catch (e) {
        console.warn('Failed to normalize domain (MV2):', domain, e);
        return null;
    }
}

function getHostnameFromUrl(rawUrl) {
    if (!rawUrl) return null;
    try {
        const { hostname } = new URL(rawUrl);
        return hostname ? hostname.toLowerCase() : null;
    } catch (e) {
        return null;
    }
}

function hostnameMatchesDomain(hostname, domain) {
    if (!hostname || !domain) return false;
    if (hostname === domain) return true;
    return hostname.endsWith(`.${domain}`);
}

function createDomainSet(domains) {
    const set = new Set();
    if (Array.isArray(domains)) {
        domains.forEach((domain) => {
            if (domain) {
                set.add(domain);
            }
        });
    }
    return set;
}

function hostnameMatchesSet(hostname, domainSet) {
    if (!hostname || !domainSet || domainSet.size === 0) {
        return false;
    }
    let candidate = hostname;
    while (candidate) {
        if (domainSet.has(candidate)) {
            return true;
        }
        const dotIndex = candidate.indexOf('.');
        if (dotIndex === -1) {
            break;
        }
        candidate = candidate.slice(dotIndex + 1);
    }
    return false;
}

function getSafeSearchRedirect(rawUrl, safeSearchEnabled) {
    if (!safeSearchEnabled || !rawUrl) return null;
    try {
        const parsed = new URL(rawUrl);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return null;
        }

        const hostname = parsed.hostname.toLowerCase();
        const pathname = parsed.pathname;
        for (const target of SAFE_SEARCH_TARGETS) {
            if (!target.hostnameRegex.test(hostname)) {
                continue;
            }
            if (target.pathPrefixes && !target.pathPrefixes.some(prefix => pathname.startsWith(prefix))) {
                continue;
            }

            let updated = false;
            for (const { key, value } of target.params) {
                if (parsed.searchParams.get(key) !== value) {
                    parsed.searchParams.set(key, value);
                    updated = true;
                }
            }

            if (updated) {
                return parsed.toString();
            }
            break;
        }
    } catch (e) {
        console.warn('Failed safe-search redirect evaluation (MV2):', e);
    }
    return null;
}

// Global variable to store current blocking filters
let currentFilters = {
    blockHaram: true,
    blockSocial: false,
    customKeywords: [],
    socialDomainsNormalized: [],
    haramDomainsNormalized: [],
    safeSearchEnabled: true,
    imageKeywords: IMAGE_KEYWORDS,
    socialDomainSet: new Set(),
    haramDomainSet: new Set()
};

// Lock to prevent overlapping updates
let isUpdateRunning = false;
let updateQueued = false;

function updateWebRequestRules() {
    // If an update is already running, queue another run after it
    if (isUpdateRunning) {
        updateQueued = true;
        return;
    }
    isUpdateRunning = true;
    (async () => {
        try {
            await new Promise(resolve => {
                getStorageSettings((settings) => {
                    (async () => {
                        const eff = (self?.AmnShield?.scheduler?.getEffectiveSettings ? self.AmnShield.scheduler.getEffectiveSettings(settings) : settings) || settings;
                        const { blockHaram = true, blockSocial = false, customKeywords = [], socialDomains, haramDomains, safeSearchEnabled = true } = eff;

                        // Load default social domains from JSON file
                        const defaultSocialDomains = await loadDefaultSocialDomains();
                        const socialList = Array.isArray(socialDomains) && socialDomains.length > 0 ? socialDomains : defaultSocialDomains;
                        const normalizedSocialDomains = socialList.map(normalizeDomain).filter(Boolean);

                        // Load default haram domains from JSON files
                        const defaultDomains = await loadDefaultHaramDomains();
                        const normalizedHaramDomains = Array.isArray(haramDomains) && haramDomains.length > 0
                            ? Array.from(new Set(haramDomains.map(normalizeDomain).filter(Boolean)))
                            : defaultDomains;
                        const socialDomainSet = createDomainSet(normalizedSocialDomains);
                        const haramDomainSet = createDomainSet(normalizedHaramDomains);

                        currentFilters = {
                            blockHaram,
                            blockSocial,
                            customKeywords,
                            socialList,
                            haramDomains: normalizedHaramDomains,
                            socialDomainsNormalized: Array.from(new Set(normalizedSocialDomains)),
                            haramDomainsNormalized: Array.from(new Set(normalizedHaramDomains)),
                            safeSearchEnabled,
                            imageKeywords: IMAGE_KEYWORDS,
                            socialDomainSet,
                            haramDomainSet
                        };

                        // Remove existing listeners (cross-browser)
                        try {
                            if (browser.webRequest && browser.webRequest.onBeforeRequest && browser.webRequest.onBeforeRequest.hasListener && browser.webRequest.onBeforeRequest.removeListener) {
                                if (browser.webRequest.onBeforeRequest.hasListener(blockRequestHandler)) {
                                    browser.webRequest.onBeforeRequest.removeListener(blockRequestHandler);
                                }
                            }
                        } catch (e) {
                            console.warn('Error removing webRequest listener:', e);
                        }

                        // Add new listener if any blocking is enabled
                        if ((blockHaram || blockSocial || (customKeywords && customKeywords.length > 0) || safeSearchEnabled) && browser.webRequest && browser.webRequest.onBeforeRequest && browser.webRequest.onBeforeRequest.addListener) {
                            try {
                                browser.webRequest.onBeforeRequest.addListener(
                                    blockRequestHandler,
                                    { urls: ["<all_urls>"] },
                                    ["blocking"]
                                );
                            } catch (e) {
                                console.warn('Error adding webRequest listener:', e);
                            }
                        }
                        console.log("Amn Shield webRequest rules updated.", currentFilters);
                    })().then(resolve).catch((err) => {
                        console.error('Failed to refresh MV2 rules:', err);
                        resolve();
                    });
                });
            });
        } catch (e) {
            console.error('Error in updateWebRequestRules:', e);
        } finally {
            isUpdateRunning = false;
            if (updateQueued) {
                updateQueued = false;
                // Add a small delay before processing queued update to prevent rapid loops
                setTimeout(updateWebRequestRules, 100);
            }
        }
    })();
}

function blockRequestHandler(details) {
    const url = details.url.toLowerCase();
    let shouldBlock = false;
    const blockHaram = !!currentFilters.blockHaram;
    const blockSocial = !!currentFilters.blockSocial;
    const haramList = HARAM_KEYWORDS;
    const normalizedHaramDomains = currentFilters.haramDomainsNormalized && currentFilters.haramDomainsNormalized.length > 0
        ? currentFilters.haramDomainsNormalized
        : HARAM_DOMAINS.map(normalizeDomain).filter(Boolean);
    const normalizedSocialDomains = currentFilters.socialDomainsNormalized && currentFilters.socialDomainsNormalized.length > 0
        ? currentFilters.socialDomainsNormalized
        : SOCIAL_MEDIA_DOMAINS.map(normalizeDomain).filter(Boolean);
    const hostname = getHostnameFromUrl(details.url);

    // Check explicit haram domains
    const haramDomainSet = currentFilters.haramDomainSet && currentFilters.haramDomainSet.size > 0
        ? currentFilters.haramDomainSet
        : createDomainSet(normalizedHaramDomains);
    if (blockHaram && hostname && hostnameMatchesSet(hostname, haramDomainSet)) {
        shouldBlock = true;
    }

    // Check social media domains
    const socialDomainSet = currentFilters.socialDomainSet && currentFilters.socialDomainSet.size > 0
        ? currentFilters.socialDomainSet
        : createDomainSet(normalizedSocialDomains);
    if (!shouldBlock && blockSocial && hostname && hostnameMatchesSet(hostname, socialDomainSet)) {
        shouldBlock = true;
    }

    // Check haram keywords
    if (!shouldBlock && blockHaram) {
        for (const keyword of haramList) {
            if (url.includes(keyword)) {
                shouldBlock = true;
                break;
            }
        }
    }

    // Check custom keywords
    if (!shouldBlock && currentFilters.customKeywords && currentFilters.customKeywords.length > 0) {
        for (const keyword of currentFilters.customKeywords) {
            if (url.includes(keyword.toLowerCase())) {
                shouldBlock = true;
                break;
            }
        }
    }

    // Check explicit image content keywords
    if (!shouldBlock && blockHaram && details.type === 'image') {
        const imageKeywords = currentFilters.imageKeywords || IMAGE_KEYWORDS;
        for (const keyword of imageKeywords) {
            if (url.includes(keyword)) {
                shouldBlock = true;
                break;
            }
        }
    }

    // Enforce safe search
    if (!shouldBlock && currentFilters.safeSearchEnabled && details.type === 'main_frame') {
        const safeRedirect = getSafeSearchRedirect(details.url, currentFilters.safeSearchEnabled);
        if (safeRedirect && safeRedirect !== details.url) {
            console.log('Redirecting to safe-search variant (MV2):', safeRedirect);
            return { redirectUrl: safeRedirect };
        }
    }

    if (shouldBlock) {
        // Try to redirect to block.html (must be web_accessible_resource in manifest)
        const redirectUrl = browser.runtime.getURL ? browser.runtime.getURL('block.html') : (chrome && chrome.runtime && chrome.runtime.getURL ? chrome.runtime.getURL('block.html') : null);
        if (redirectUrl && details.type === 'main_frame') {
            console.log('Redirecting to block page:', redirectUrl);
            return { redirectUrl };
        } else {
            console.log('Blocked (cancelled):', url);
            return { cancel: true };
        }
    }
    return {};
}

// Initialize on startup (cross-browser)
if (browser.runtime && browser.runtime.onStartup && browser.runtime.onStartup.addListener) {
    browser.runtime.onStartup.addListener(() => {
        updateWebRequestRules();
        // Initialize browser safe browsing settings
        setTimeout(initializeBrowserSafeBrowsing, 500);
    });
}

// Run when the extension is first installed or updated
if (browser.runtime && browser.runtime.onInstalled && browser.runtime.onInstalled.addListener) {
    browser.runtime.onInstalled.addListener((details) => {
        // Initialize browser safe browsing settings
        initializeBrowserSafeBrowsing();
        // On first install, open Welcome and set Uninstall feedback page
        try {
            if (details && details.reason === 'install') {
                const getURL = (browser && browser.runtime && browser.runtime.getURL) ? browser.runtime.getURL
                    : (chrome && chrome.runtime && chrome.runtime.getURL) ? chrome.runtime.getURL
                        : null;
                const openTab = (browser && browser.tabs && browser.tabs.create) ? browser.tabs.create
                    : (chrome && chrome.tabs && chrome.tabs.create) ? chrome.tabs.create
                        : null;
                if (getURL && openTab) {
                    const welcomeUrl = getURL('welcome.html');
                    openTab({ url: welcomeUrl });
                }
                const setUninstall = (browser && browser.runtime && browser.runtime.setUninstallURL) ? browser.runtime.setUninstallURL
                    : (chrome && chrome.runtime && chrome.runtime.setUninstallURL) ? chrome.runtime.setUninstallURL
                        : null;
                if (setUninstall) {
                    // Must be an external URL
                    setUninstall('https://alhaq-initiative.org/contact');
                }
            }
        } catch (e) {
            console.warn('Install/uninstall hooks (MV2) could not be set:', e);
        }
        getStorageSettings((settings) => {
            if (!settings || Object.keys(settings).length === 0) {
                setStorageSettings({
                    blockHaram: true,
                    blockSocial: false,
                    customKeywords: [],
                    haramDomains: [],
                    safeSearchEnabled: true
                }, updateWebRequestRules);
            } else {
                updateWebRequestRules();
            }
        });
    });
}

// Run whenever a setting is changed
// Debounced settings change handling to avoid frequent heavy rebuilds
let mv2UpdateTimer = null;
let mv2RulesInitialized = false;
let mv2LastConfigSignature = null;

function mv2RelevantSettingsEqual(a, b) {
    if (!a && !b) return true;
    if (!a || !b) return false;
    const normArr = (arr) => Array.isArray(arr) ? Array.from(new Set(arr.map(d => String(d).trim().toLowerCase().replace(/^www\./, '')))).sort() : [];
    return (
        !!(a.blockHaram !== false) === !!(b.blockHaram !== false) &&
        !!a.blockSocial === !!b.blockSocial &&
        !!(a.safeSearchEnabled !== false) === !!(b.safeSearchEnabled !== false) &&
        JSON.stringify((a.customKeywords || []).map(k => String(k).toLowerCase()).sort()) === JSON.stringify((b.customKeywords || []).map(k => String(k).toLowerCase()).sort()) &&
        JSON.stringify(normArr(a.socialDomains)) === JSON.stringify(normArr(b.socialDomains)) &&
        JSON.stringify(normArr(a.haramDomains || [])) === JSON.stringify(normArr(b.haramDomains || []))
    );
}

function onMv2StorageChanged(changes, areaName) {
    if (areaName !== 'sync') return;
    if (!changes || !changes.settings) return;
    const { oldValue, newValue } = changes.settings;
    if (!mv2RelevantSettingsEqual(oldValue, newValue)) {
        if (mv2UpdateTimer) clearTimeout(mv2UpdateTimer);
        mv2UpdateTimer = setTimeout(() => {
            mv2UpdateTimer = null;
            updateWebRequestRules();
        }, 800);
    }
}

if (browser.storage && browser.storage.onChanged && browser.storage.onChanged.addListener) {
    browser.storage.onChanged.addListener(onMv2StorageChanged);
} else if (chrome && chrome.storage && chrome.storage.onChanged && chrome.storage.onChanged.addListener) {
    chrome.storage.onChanged.addListener(onMv2StorageChanged);
}

// ========================================
// Phase 2: Time-Based Category Enforcement
// ========================================

let lastActiveCategories = [];

/**
 * Check if active categories have changed and refresh rules if needed
 */
function checkScheduleAndRefresh() {
    getStorageSettings((settings) => {
        // Use scheduler to get effective settings with time-based categories
        const scheduler = self.AmnShield?.scheduler;
        if (!scheduler) {
            console.warn('⚠️ Scheduler not loaded, skipping time check');
            return;
        }

        const effectiveSettings = scheduler.getEffectiveSettings(settings, new Date());
        const currentActiveCategories = effectiveSettings.activeCategories || [];

        // Check if categories changed
        const categoriesChanged =
            lastActiveCategories.length !== currentActiveCategories.length ||
            !lastActiveCategories.every(cat => currentActiveCategories.includes(cat));

        if (categoriesChanged) {
            console.log('⏰ Active categories changed:', {
                previous: lastActiveCategories,
                current: currentActiveCategories
            });

            lastActiveCategories = [...currentActiveCategories];

            // Refresh blocking rules with new categories
            updateWebRequestRules();
        }
    });
}

/**
 * Initialize time-based enforcement system
 * Uses chrome.alarms API for efficient periodic checks
 */
function initializeTimeEnforcement() {
    console.log('⏰ Initializing time-based enforcement system (Firefox)');

    // Create alarm to check every minute
    if (chrome.alarms) {
        chrome.alarms.create('scheduleCheck', {
            periodInMinutes: 1
        });

        // Listen for alarm
        chrome.alarms.onAlarm.addListener((alarm) => {
            if (alarm.name === 'scheduleCheck') {
                checkScheduleAndRefresh();
            }
        });
    } else if (browser.alarms) {
        browser.alarms.create('scheduleCheck', {
            periodInMinutes: 1
        });

        browser.alarms.onAlarm.addListener((alarm) => {
            if (alarm.name === 'scheduleCheck') {
                checkScheduleAndRefresh();
            }
        });
    } else {
        console.warn('⚠️ Alarms API not available, using setInterval fallback');
        // Fallback for browsers without alarms API
        setInterval(checkScheduleAndRefresh, 60000); // Check every minute
    }

    // Do initial check
    setTimeout(checkScheduleAndRefresh, 1000);
}

// Initialize immediately on script load
initializeTimeEnforcement();

// ========================================
// Blurr Feature: Keyboard Commands (Firefox)
// ========================================

/**
 * Handle keyboard commands for Blurr feature
 */
if (browser.commands && browser.commands.onCommand) {
    browser.commands.onCommand.addListener((command) => {
        if (command === "toggle_blur_status") {
            // Send message to active tab to toggle blur
            browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
                if (tabs[0]) {
                    browser.tabs.sendMessage(tabs[0].id, { message: "reverse_status" }).catch((err) => {
                        console.debug('Blur toggle message error:', err);
                    });
                }
            });
        } else if (command === "toggle_selected_blur") {
            // Send message to active tab to toggle selected element blur
            browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
                if (tabs[0]) {
                    browser.tabs.sendMessage(tabs[0].id, { message: "toggle_selected" }).catch((err) => {
                        console.debug('Blur toggle selected message error:', err);
                    });
                }
            });
        }
    });
} else if (chrome.commands && chrome.commands.onCommand) {
    chrome.commands.onCommand.addListener((command) => {
        if (command === "toggle_blur_status") {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, { message: "reverse_status" }).catch((err) => {
                        console.debug('Blur toggle message error:', err);
                    });
                }
            });
        } else if (command === "toggle_selected_blur") {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, { message: "toggle_selected" }).catch((err) => {
                        console.debug('Blur toggle selected message error:', err);
                    });
                }
            });
        }
    });
}

/**
 * Initialize Blurr settings on install (Firefox)
 */
browser.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
        // Set default Blurr settings on first install
        const defaultBlurrSettings = {
            status: false,
            images: true,
            videos: true,
            iframes: true,
            bgImages: true,
            blurAmt: 20,
            grayscale: true,
            ignoredDomains: []
        };

        browser.storage.sync.set({ blurrSettings: defaultBlurrSettings }).then(() => {
            console.log('✅ Default Blurr settings initialized (Firefox)');
        });
    } else if (details.reason === "update") {
        // Check if blurrSettings exist, if not, create them
        browser.storage.sync.get(['blurrSettings']).then((result) => {
            if (!result.blurrSettings) {
                const defaultBlurrSettings = {
                    status: false,
                    images: true,
                    videos: true,
                    iframes: true,
                    bgImages: true,
                    blurAmt: 20,
                    grayscale: true,
                    ignoredDomains: []
                };

                browser.storage.sync.set({ blurrSettings: defaultBlurrSettings }).then(() => {
                    console.log('✅ Blurr settings added during update (Firefox)');
                });
            }
        });
    }
});

// ========================================
// Initialize blocking on script load
// ========================================
console.log('🚀 Amn Shield MV2 background script loaded');
updateWebRequestRules();
console.log('✅ WebRequest blocking rules initialized');
