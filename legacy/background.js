import './services/scheduler.js';

// Browser compatibility layer
// Cross-browser API compatibility
if (typeof browser === "undefined") {
    var browser = (typeof chrome !== "undefined") ? chrome : {};
}

// Helper: get storage (sync)
function getStorageSettings(cb) {
    if (browser.storage && browser.storage.sync && browser.storage.sync.get) {
        browser.storage.sync.get('settings', (result) => {
            cb(result && result.settings ? result.settings : {});
        });
    } else if (chrome && chrome.storage && chrome.storage.sync && chrome.storage.sync.get) {
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
const DEFAULT_HARAM_KEYWORDS = [
    'porn', 'xxx', 'erotic', 'naked', 'nude', 'nudity', 'lust', 'lewd',
    'nsfw', 'fetish', 'escort', 'hookup', 'camgirl', 'camguy', 'sugarbaby', 'sugardaddy',
    'anal', 'oral', 'bdsm', 'bondage', 'orgasm', 'orgy', 'sensual', 'seductive', 'provocative',
    'pornhub', 'xvideos', 'xhamster', 'xnxx', 'redtube', 'youporn', 'brazzers',
    'bangbros', 'pornstar', 'hentai', 'ecchi', 'jav', 'masturbat',
    'spankbang', 'onlyfans', 'chaturbate', 'cam4', 'bongacams', 'adultfriendfinder', 'tiktokporn',
    'bikini', 'lingerie', 'lingerie-set', 'stocking', 'stockings', 'underwear', 'thong', 'panties', 'bralette',
    'swimsuit', 'microkini', 'topless', 'risque', 'sexy', 'sultry', 'pinup',
    'stripper', 'lapdance', 'burlesque',
    'betting', 'casino', 'gambling', 'poker', 'roulette',
    'liquor', 'vodka', 'whiskey', 'alcohol',
    'riba', 'astrology', 'horoscope', 'pagan'
];
const DEFAULT_HARAM_DOMAINS = [
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
const DEFAULT_SOCIAL_MEDIA_DOMAINS = [
    'facebook.com', 'fb.com', 'messenger.com',
    'twitter.com', 'x.com', 't.co',
    'instagram.com', 'threads.net', 'cdninstagram.com',
    'tiktok.com', 'tiktokporn.com',
    'youtube.com', 'youtu.be', 'ytimg.com', 'ggpht.com',
    'reddit.com', 'redd.it',
    'snapchat.com', 'app.snapchat.com', 'snapcdn.com',
    'pinterest.com', 'pinimg.com',
    'discord.com', 'discord.gg',
    'telegram.org', 't.me',
    'twitch.tv', 'kick.com',
    'whatsapp.com', 'whatsapp.net', 'cdn.whatsapp.net',
    'linkedin.com'
];
const DEFAULT_IMAGE_KEYWORDS = [
    'nude', 'nudity', 'topless', 'lingerie', 'bikini', 'swimsuit', 'microkini',
    'bralette', 'brassiere', 'panties', 'thong', 'g-string', 'underwear',
    'intimates', 'boudoir', 'sensual', 'risque', 'sexy', 'sultry', 'provocative',
    'stocking', 'stockings', 'pinup', 'busty', 'seductive'
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

// Initialize browser safe browsing settings (Chrome only)
function initializeBrowserSafeBrowsing() {
    try {
        if (chrome && chrome.contentSettings && chrome.contentSettings.javascript) {
            // Enable safe browsing if API is available
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
        }
    } catch (e) {
        console.log('Safe Browsing API not available:', e.message);
    }
}

const SOCIAL_BLOCKLIST_RESOURCE = 'data/blocklists/social-domains.json';
let socialDomainCachePromise = null;

function getExtensionUrl(relativePath) {
    try {
        if (browser?.runtime?.getURL) {
            return browser.runtime.getURL(relativePath);
        }
        if (chrome?.runtime?.getURL) {
            return chrome.runtime.getURL(relativePath);
        }
    } catch (e) {
        console.warn('Failed to resolve extension URL for', relativePath, e);
    }
    return null;
}

async function loadDefaultSocialDomains() {
    if (!socialDomainCachePromise) {
        socialDomainCachePromise = (async () => {
            const builtIn = DEFAULT_SOCIAL_MEDIA_DOMAINS.map(normalizeDomain).filter(Boolean);
            const unique = new Set(builtIn);
            try {
                const url = getExtensionUrl(SOCIAL_BLOCKLIST_RESOURCE);
                if (!url) {
                    throw new Error('runtime.getURL unavailable');
                }
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
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
            } catch (e) {
                console.warn('Falling back to built-in social domains:', e);
            }
            return Array.from(unique);
        })();
    }
    return socialDomainCachePromise;
}

function chunkArray(items, size) {
    const chunks = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
}

function hashString(value) {
    const str = String(value || '');
    let hash = 0;
    for (let i = 0; i < str.length; i += 1) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0; // Convert to 32-bit integer
    }
    return hash >>> 0; // Ensure non-negative
}

function fingerprintList(items, options = {}) {
    const {
        normalizer = (item) => item,
        stripWWW = false,
        trim = true,
        toLower = true
    } = options || {};
    if (!Array.isArray(items) || items.length === 0) {
        return 'empty:0';
    }
    const normalized = items
        .map(normalizer)
        .filter(Boolean)
        .map((item) => String(item))
        .map((item) => (trim ? item.trim() : item))
        .filter(Boolean)
        .map((item) => (toLower ? item.toLowerCase() : item))
        .map((item) => (stripWWW ? item.replace(/^www\./, '') : item));
    if (normalized.length === 0) {
        return 'empty:0';
    }
    const unique = Array.from(new Set(normalized)).sort();
    const signature = unique.join('|');
    return `h:${hashString(signature)}:n:${unique.length}`;
}

function normalizeDomain(domain) {
    if (!domain) return null;
    try {
        const normalized = String(domain).trim().toLowerCase();
        if (!normalized) return null;
        return normalized.replace(/^www\./, '');
    } catch (e) {
        console.warn('Failed to normalize domain:', domain, e);
        return null;
    }
}

function getHostnameFromUrl(rawUrl) {
    if (!rawUrl) return null;
    try {
        const { hostname } = new URL(rawUrl);
        return hostname ? hostname.toLowerCase() : null;
    } catch (e) {
        // Some internal browser URLs (e.g., chrome://) will throw here.
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
        console.warn('Failed safe-search redirect evaluation:', e);
    }
    return null;
}

// Rule ID management
const RULE_ID_RANGES = {
    KEYWORDS: { start: 30000, end: 30999 },
    DOMAINS: { start: 31000, end: 37999 },
    ISLAMIC: { start: 38000, end: 38499 },
    CUSTOM: { start: 38500, end: 39499 }
};

const KEYWORD_CHUNK_SIZE = 10; // Number of keywords per rule to stay under memory limits
const DOMAIN_CHUNK_SIZE = 250; // Number of domains per declarativeNetRequest rule
const MAX_DYNAMIC_RULES = 4500; // Chrome limit is ~5000, leave buffer for safety
const MAX_DOMAINS_IN_DYNAMIC_RULES = 500000; // Prioritize most important domains

// Rule ID generator
class RuleIdGenerator {
    constructor() {
        this.currentIds = new Map();
        this.initializeRanges();
    }

    initializeRanges() {
        Object.entries(RULE_ID_RANGES).forEach(([type, range]) => {
            this.currentIds.set(type, range.start);
        });
    }

    nextId(type) {
        const range = RULE_ID_RANGES[type];
        if (!range) throw new Error(`Invalid rule type: ${type}`);

        let currentId = this.currentIds.get(type);
        if (currentId > range.end) {
            // Instead of silently wrapping, we should warn and potentially fail if strict
            // But for now, wrapping is the only way to keep working without crashing.
            // However, we must ensure we don't produce duplicates in the same batch.
            console.warn(`Rule ID range for ${type} exhausted. Wrapping around to ${range.start}.`);
            this.currentIds.set(type, range.start);
            currentId = range.start;
        }

        this.currentIds.set(type, currentId + 1);
        return currentId;
    }

    reset() {
        this.initializeRanges();
    }
}

const ruleIdGenerator = new RuleIdGenerator();

// Track rule IDs we add to avoid duplicates and for cleanup
const currentRuleIds = new Set();

// --- Main Update Logic ---
let isUpdateRunning = false;
let isUpdateQueued = false;
let updateTimer = null; // debounce timer
let rulesInitialized = false;
let lastConfigSignature = null;

function relevantSettingsEqual(a, b) {
    if (!a && !b) return true;
    if (!a || !b) return false;
    const keywordFingerprint = (arr) => fingerprintList(arr, { stripWWW: false, toLower: true, trim: true });
    const domainFingerprint = (arr) => fingerprintList(arr, { stripWWW: true, toLower: true, trim: true, normalizer: normalizeDomain });
    return (
        !!(a.blockHaram !== false) === !!(b.blockHaram !== false) &&
        !!a.blockSocial === !!b.blockSocial &&
        !!(a.safeSearchEnabled !== false) === !!(b.safeSearchEnabled !== false) &&
        // Mode/profile changes affect effective rules
        String(a.islamicMode || 'off') === String(b.islamicMode || 'off') &&
        String(a.profile || 'personal') === String(b.profile || 'personal') &&
        // Compare arrays (custom keywords, social, haram domains) in a stable way
        keywordFingerprint(a?.customKeywords || []) === keywordFingerprint(b?.customKeywords || []) &&
        domainFingerprint(a?.socialDomains || []) === domainFingerprint(b?.socialDomains || []) &&
        // For haramDomains, empty/undefined means use packaged default -> treat both empty as equal but still compare fingerprints
        domainFingerprint(a?.haramDomains || []) === domainFingerprint(b?.haramDomains || [])
    );
}

function debouncedUpdateBlockingRules(reason) {
    // Limit the frequency of heavy rule rebuilds
    if (updateTimer) clearTimeout(updateTimer);
    updateTimer = setTimeout(() => {
        updateTimer = null;
        updateBlockingRules();
    }, 800);
}

async function updateBlockingRules() {
    // If an update is already running, queue another run after it and exit.
    if (isUpdateRunning) {
        isUpdateQueued = true;
        return;
    }

    isUpdateRunning = true;

    try {
        await new Promise((resolve) => {
            getStorageSettings((settings) => {
                (async () => {
                    // Compute effective settings through scheduler (Phase 1)
                    const eff = (self?.AmnShield?.scheduler?.getEffectiveSettings ? self.AmnShield.scheduler.getEffectiveSettings(settings) : settings) || settings;
                    const { blockHaram = true, blockSocial = false, customKeywords = [], haramKeywords, haramDomains, socialDomains, safeSearchEnabled = true } = eff;
                    const haramList = Array.isArray(haramKeywords) && haramKeywords.length > 0 ? haramKeywords : DEFAULT_HARAM_KEYWORDS;

                    // Use built-in small list for dynamic rules; bulk blocking is handled by static rulesets
                    const defaultDomainList = DEFAULT_HARAM_DOMAINS;
                    const defaultSocialDomainList = await loadDefaultSocialDomains();

                    const normalizedHaramDomains = Array.isArray(haramDomains) && haramDomains.length > 0
                        ? Array.from(new Set(haramDomains.map(normalizeDomain).filter(Boolean)))
                        : defaultDomainList;

                    const normalizedSocialDomains = Array.isArray(socialDomains) && socialDomains.length > 0
                        ? Array.from(new Set(socialDomains.map(normalizeDomain).filter(Boolean)))
                        : defaultSocialDomainList;

                    const fingerprints = {
                        haramKeywords: fingerprintList(haramList, { stripWWW: false, toLower: true, trim: true }),
                        customKeywords: fingerprintList(customKeywords, { stripWWW: false, toLower: true, trim: true }),
                        haramDomains: fingerprintList(normalizedHaramDomains, { stripWWW: true, toLower: true, trim: true, normalizer: normalizeDomain }),
                        socialDomains: fingerprintList(normalizedSocialDomains, { stripWWW: true, toLower: true, trim: true, normalizer: normalizeDomain })
                    };

                    // Determine if broad wildcard permission (for keyword rules) is granted.
                    const applyRules = async (hasWildcard) => {
                        // Create a lightweight signature to skip no-op rebuilds
                        const cfg = {
                            blockHaram: !!(blockHaram !== false),
                            blockSocial: !!blockSocial,
                            safeSearchEnabled: !!(safeSearchEnabled !== false),
                            islamicMode: String(settings.islamicMode || 'off'),
                            profile: String(settings.profile || 'personal'),
                            hasWildcard: !!hasWildcard,
                            fingerprints
                        };
                        const signature = JSON.stringify(cfg);
                        if (rulesInitialized && signature === lastConfigSignature) {
                            const rulesHealthy = await verifyRulesHealth({
                                blockHaram: cfg.blockHaram,
                                blockSocial: cfg.blockSocial,
                                safeSearchEnabled: cfg.safeSearchEnabled,
                                hasWildcard: cfg.hasWildcard,
                                fingerprints,
                                expectCustomKeywords: customKeywords
                            });
                            if (rulesHealthy) {
                                // No relevant change and current rules look healthy; skip rebuild but notify listeners
                                try {
                                    chrome.runtime.sendMessage({ action: 'rulesRefreshed', skipped: true }, () => {
                                        if (chrome.runtime.lastError) {
                                            console.debug('rulesRefreshed skipped broadcast had no listener:', chrome.runtime.lastError.message);
                                        }
                                    });
                                } catch (err) {
                                    console.debug('Failed to broadcast skipped rules refresh:', err);
                                }
                                return;
                            }
                            console.warn('Detected unhealthy dynamic rules; forcing rebuild despite matching signature.', {
                                fingerprints,
                                hasWildcard: cfg.hasWildcard
                            });
                        }
                        if (browser.declarativeNetRequest && browser.declarativeNetRequest.updateDynamicRules) {
                            await updateDeclarativeNetRequestRules(blockHaram, blockSocial, customKeywords, haramList, normalizedHaramDomains, normalizedSocialDomains, hasWildcard, safeSearchEnabled);
                        } else {
                            updateWebRequestRules(blockHaram, blockSocial, customKeywords, haramList, normalizedHaramDomains, normalizedSocialDomains, hasWildcard, safeSearchEnabled);
                        }
                        lastConfigSignature = signature;
                        rulesInitialized = true;
                        try {
                            chrome.runtime.sendMessage({ action: 'rulesRefreshed', skipped: false }, () => {
                                if (chrome.runtime.lastError) {
                                    console.debug('rulesRefreshed broadcast had no listener:', chrome.runtime.lastError.message);
                                }
                            });
                        } catch (err) {
                            console.debug('Failed to broadcast rules refresh:', err);
                        }
                    };
                    if (chrome.permissions && chrome.permissions.contains) {
                        chrome.permissions.contains({ origins: ["http://*/*", "https://*/*"] }, async (granted) => {
                            await applyRules(!!granted);
                        });
                    } else {
                        await applyRules(true); // assume granted in legacy fallback
                    }
                })().then(resolve).catch((e) => { console.error('updateBlockingRules inner error:', e); resolve(); });
            });
        });
    } catch (e) {
        console.error('Error in updateBlockingRules:', e);
    } finally {
        isUpdateRunning = false;
        if (isUpdateQueued) {
            isUpdateQueued = false;
            setTimeout(updateBlockingRules, 100);
        }
    }
}

async function updateDeclarativeNetRequestRules(blockHaram, blockSocial, customKeywords, haramList, haramDomainList, socialList, hasWildcard, safeSearchEnabled) {
    let rulesToAdd = [];

    // Reset rule ID generator to start fresh
    ruleIdGenerator.reset();

    // Track all IDs we're about to add to prevent duplicates
    const usedIds = new Set();

    const getUniqueId = (type) => {
        let id = ruleIdGenerator.nextId(type);
        let attempts = 0;
        const maxAttempts = 1000; // Prevent infinite loops
        while (usedIds.has(id)) {
            id = ruleIdGenerator.nextId(type);
            attempts++;
            if (attempts > maxAttempts) {
                console.error(`Failed to generate unique ID for ${type} after ${maxAttempts} attempts.`);
                // Fallback: try to find *any* unused ID in the range
                const range = RULE_ID_RANGES[type];
                for (let i = range.start; i <= range.end; i++) {
                    if (!usedIds.has(i)) {
                        id = i;
                        break;
                    }
                }
                if (usedIds.has(id)) {
                    throw new Error(`No available IDs in range for ${type}`);
                }
                break;
            }
        }
        usedIds.add(id);
        return id;
    };

    // --- KEYWORD RULES (require wildcard host permission for broad matching) ---
    if (blockHaram && hasWildcard && haramList && haramList.length > 0) {
        for (let i = 0; i < haramList.length; i += KEYWORD_CHUNK_SIZE) {
            const chunk = haramList.slice(i, i + KEYWORD_CHUNK_SIZE);
            const escapedKeywords = chunk.map(kw => kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
            const regexString = escapedKeywords.join('|');

            if (regexString) {
                // Use word boundaries (\b) to prevent partial matches (e.g. "interest" matching "interesting")
                // Note: URL regex matching in DNR is case-insensitive by default if isUrlFilterCaseSensitive is false (default)
                // We use \b to ensure we match whole words only.
                const regexFilter = `.*\\b(${regexString})\\b.*`;

                rulesToAdd.push({
                    id: getUniqueId('KEYWORDS'),
                    priority: 2,
                    action: { type: 'redirect', redirect: { extensionPath: '/block.html' } },
                    condition: { regexFilter: regexFilter, resourceTypes: ['main_frame'] }
                });
                rulesToAdd.push({
                    id: getUniqueId('KEYWORDS'),
                    priority: 1,
                    action: { type: 'block' },
                    condition: {
                        regexFilter: regexFilter,
                        resourceTypes: ['sub_frame', 'image', 'xmlhttprequest', 'script', 'stylesheet', 'media', 'object', 'other', 'font', 'ping', 'websocket']
                    }
                });
            }
        }
    }

    if (customKeywords && customKeywords.length > 0 && hasWildcard) {
        for (let i = 0; i < customKeywords.length; i += KEYWORD_CHUNK_SIZE) {
            const chunk = customKeywords.slice(i, i + KEYWORD_CHUNK_SIZE);
            const escapedKeywords = chunk.map(kw => kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
            const regexString = escapedKeywords.join('|');

            if (regexString) {
                const regexFilter = `.*\\b(${regexString})\\b.*`;
                rulesToAdd.push({
                    id: getUniqueId('CUSTOM'),
                    priority: 1,
                    action: { type: 'redirect', redirect: { extensionPath: '/block.html' } },
                    condition: { regexFilter: regexFilter, resourceTypes: ['main_frame'] }
                });
                rulesToAdd.push({
                    id: getUniqueId('CUSTOM'),
                    priority: 1,
                    action: { type: 'block' },
                    condition: {
                        regexFilter: regexFilter,
                        resourceTypes: ['sub_frame', 'image', 'xmlhttprequest', 'script', 'stylesheet', 'media', 'object', 'other', 'font', 'ping', 'websocket']
                    }
                });
            }
        }
    }

    // --- HARAM DOMAIN RULES ---
    let normalizedHaramDomains = [];
    if (blockHaram && Array.isArray(haramDomainList) && haramDomainList.length > 0) {
        normalizedHaramDomains = Array.from(new Set(haramDomainList.map(normalizeDomain).filter(Boolean)));

        // CRITICAL FIX: Limit dynamic rules to stay under Chrome's ~5000 rule limit
        // With 720K+ domains and DOMAIN_CHUNK_SIZE=250, we'd create 5,800+ rules (exceeds limit)
        // Solution: Only add domains that fit within our rule budget
        if (normalizedHaramDomains.length > 0) {
            // Calculate how many rules we'd need (2 per chunk: main_frame + subresources)
            const totalChunks = Math.ceil(normalizedHaramDomains.length / DOMAIN_CHUNK_SIZE);
            const rulesNeeded = totalChunks * 2;
            const currentRuleCount = rulesToAdd.length;
            const remainingBudget = MAX_DYNAMIC_RULES - currentRuleCount;

            if (rulesNeeded > remainingBudget) {
                const maxChunks = Math.floor(remainingBudget / 2);
                const maxDomains = maxChunks * DOMAIN_CHUNK_SIZE;

                console.warn(`⚠️ Adult domain list (${normalizedHaramDomains.length} domains) exceeds Chrome rule limit. Using top ${maxDomains} domains in dynamic rules. Consider using static rulesets for full coverage.`);

                // Prioritize: Keep most important domains (first entries are typically most common)
                normalizedHaramDomains = normalizedHaramDomains.slice(0, maxDomains);
            }

            const domainChunks = chunkArray(normalizedHaramDomains, DOMAIN_CHUNK_SIZE);
            for (const chunk of domainChunks) {
                // Safety check: Stop if we're approaching the limit
                if (rulesToAdd.length >= MAX_DYNAMIC_RULES - 100) {
                    console.warn(`⚠️ Approaching rule limit at ${rulesToAdd.length} rules. Stopping domain rule generation.`);
                    break;
                }

                rulesToAdd.push({
                    id: getUniqueId('DOMAINS'),
                    priority: 2,
                    action: { type: 'redirect', redirect: { extensionPath: '/block.html' } },
                    condition: { requestDomains: chunk, resourceTypes: ['main_frame'] }
                });
                rulesToAdd.push({
                    id: getUniqueId('DOMAINS'),
                    priority: 1,
                    action: { type: 'block' },
                    condition: {
                        requestDomains: chunk,
                        resourceTypes: ['sub_frame', 'image', 'xmlhttprequest', 'script', 'stylesheet', 'media', 'object', 'other', 'font', 'ping', 'websocket']
                    }
                });
            }
        }
    }

    if (safeSearchEnabled) {
        const safeSearchRules = [
            {
                urlFilter: 'https://www.google.',
                params: [
                    { key: 'safe', value: 'active' },
                    { key: 'ssui', value: 'on' }
                ]
            },
            {
                urlFilter: 'https://google.',
                params: [
                    { key: 'safe', value: 'active' },
                    { key: 'ssui', value: 'on' }
                ]
            },
            {
                urlFilter: 'http://www.google.',
                params: [
                    { key: 'safe', value: 'active' },
                    { key: 'ssui', value: 'on' }
                ]
            },
            {
                urlFilter: 'http://google.',
                params: [
                    { key: 'safe', value: 'active' },
                    { key: 'ssui', value: 'on' }
                ]
            },
            {
                urlFilter: 'https://www.bing.com/search',
                params: [{ key: 'adlt', value: 'strict' }]
            },
            {
                urlFilter: 'http://www.bing.com/search',
                params: [{ key: 'adlt', value: 'strict' }]
            },
            {
                urlFilter: 'https://www.yahoo.com/search',
                params: [{ key: 'vm', value: 'r' }]
            },
            {
                urlFilter: 'https://search.yahoo.com/search',
                params: [{ key: 'vm', value: 'r' }]
            },
            {
                urlFilter: 'http://search.yahoo.com/search',
                params: [{ key: 'vm', value: 'r' }]
            },
            {
                urlFilter: 'https://duckduckgo.com/',
                params: [{ key: 'kp', value: '1' }]
            },
            {
                urlFilter: 'http://duckduckgo.com/',
                params: [{ key: 'kp', value: '1' }]
            },
            {
                urlFilter: 'https://www.youtube.com',
                params: [{ key: 'restrict_mode', value: '1' }]
            },
            {
                urlFilter: 'https://youtube.com',
                params: [{ key: 'restrict_mode', value: '1' }]
            },
            {
                urlFilter: 'http://www.youtube.com',
                params: [{ key: 'restrict_mode', value: '1' }]
            },
            {
                urlFilter: 'http://youtube.com',
                params: [{ key: 'restrict_mode', value: '1' }]
            }
        ];

        for (const target of safeSearchRules) {
            rulesToAdd.push({
                id: getUniqueId('ISLAMIC'),
                priority: 1,
                action: {
                    type: 'redirect',
                    redirect: {
                        transform: {
                            queryTransform: {
                                addOrReplaceParams: target.params
                            }
                        }
                    }
                },
                condition: {
                    urlFilter: target.urlFilter,
                    resourceTypes: ['main_frame']
                }
            });
        }
    }

    // --- SOCIAL MEDIA DOMAIN RULES ---
    if (blockSocial && Array.isArray(socialList) && socialList.length > 0) {
        const domains = Array.from(new Set(socialList.map(d => String(d).trim().toLowerCase().replace(/^www\./, ''))));
        if (domains.length > 0) {
            // Redirect top-level navigations to block page for social domains (and subdomains)
            rulesToAdd.push({
                id: getUniqueId('DOMAINS'),
                priority: 1,
                action: { type: 'redirect', redirect: { extensionPath: '/block.html' } },
                condition: { requestDomains: domains, resourceTypes: ['main_frame'] }
            });
            // Block sub-frames silently
            rulesToAdd.push({
                id: getUniqueId('DOMAINS'),
                priority: 1,
                action: { type: 'block' },
                condition: {
                    requestDomains: domains,
                    resourceTypes: ['sub_frame', 'image', 'xmlhttprequest', 'script', 'stylesheet', 'media', 'object', 'other', 'font', 'ping', 'websocket']
                }
            });
        }
    }

    // --- Final safety check: Enforce Chrome's rule limit ---
    if (rulesToAdd.length > MAX_DYNAMIC_RULES) {
        console.error(`🚨 CRITICAL: Attempted to add ${rulesToAdd.length} rules, exceeding Chrome limit of ${MAX_DYNAMIC_RULES}. Truncating to fit.`);
        rulesToAdd = rulesToAdd.slice(0, MAX_DYNAMIC_RULES);
    }

    // --- Update the rules ---
    try {
        const existingRules = await browser.declarativeNetRequest.getDynamicRules();
        const existingIds = existingRules.map(rule => rule.id);

        const BATCH_SIZE = 100; // Chrome allows up to 5000 rule changes at once, but smaller is safer.

        console.log(`📋 Updating rules: Removing ${existingIds.length} existing, Adding ${rulesToAdd.length} new.`);

        // Strategy: Combine removal with the first batch of additions to ensure atomicity.
        // Chrome processes removeRuleIds before addRules in the same call.

        if (rulesToAdd.length === 0) {
            // Just remove existing rules if any
            if (existingIds.length > 0) {
                await browser.declarativeNetRequest.updateDynamicRules({ removeRuleIds: existingIds });
                console.log(`✅ Removed ${existingIds.length} rules (no new rules to add).`);
            }
        } else {
            // Add rules in batches
            for (let i = 0; i < rulesToAdd.length; i += BATCH_SIZE) {
                const batch = rulesToAdd.slice(i, i + BATCH_SIZE);
                const updateOptions = { addRules: batch };

                // In the FIRST batch, include the removal of ALL existing rules
                if (i === 0 && existingIds.length > 0) {
                    updateOptions.removeRuleIds = existingIds;
                }

                try {
                    await browser.declarativeNetRequest.updateDynamicRules(updateOptions);
                } catch (batchError) {
                    console.error(`❌ Failed to update batch ${Math.floor(i / BATCH_SIZE) + 1}:`, batchError);
                    console.error(`   Batch size: ${batch.length}, IDs: ${batch[0]?.id} - ${batch[batch.length - 1]?.id}`);
                    // If the first batch fails, we might have a problem with removal or addition.
                    // But we continue to try to add the rest.
                }
            }
        }

        console.log("✅ Amn Shield rules updated successfully.", {
            added: rulesToAdd.length,
            removed: existingIds.length,
            withinLimit: rulesToAdd.length <= MAX_DYNAMIC_RULES
        });
    } catch (e) {
        console.error("❌ Error updating dynamic rules:", e);
        console.error("Details:", {
            rulesToAddCount: rulesToAdd.length,
            maxAllowed: MAX_DYNAMIC_RULES,
            exceeded: rulesToAdd.length > MAX_DYNAMIC_RULES
        });
    }
}

async function verifyRulesHealth({
    blockHaram,
    blockSocial,
    safeSearchEnabled,
    hasWildcard,
    fingerprints,
    expectCustomKeywords = []
}) {
    if (browser.declarativeNetRequest && browser.declarativeNetRequest.getDynamicRules) {
        try {
            const activeRules = await browser.declarativeNetRequest.getDynamicRules();
            if (!Array.isArray(activeRules) || activeRules.length === 0) {
                return false;
            }

            const hasDomainRule = activeRules.some((rule) => Array.isArray(rule?.condition?.requestDomains) && rule.condition.requestDomains.length > 0);
            const hasKeywordRule = activeRules.some((rule) => typeof rule?.condition?.regexFilter === 'string' && rule.condition.regexFilter.length > 0);
            const hasSafeSearchRule = activeRules.some((rule) => rule?.action?.redirect?.transform?.queryTransform?.addOrReplaceParams);

            if (blockHaram && fingerprints?.haramDomains !== 'empty:0' && !hasDomainRule) {
                return false;
            }
            if (blockSocial && fingerprints?.socialDomains !== 'empty:0' && !hasDomainRule) {
                return false;
            }
            if (hasWildcard && blockHaram && fingerprints?.haramKeywords !== 'empty:0' && !hasKeywordRule) {
                return false;
            }
            if (hasWildcard && fingerprints?.customKeywords !== 'empty:0' && Array.isArray(expectCustomKeywords) && expectCustomKeywords.length > 0 && !hasKeywordRule) {
                return false;
            }
            if (safeSearchEnabled && !hasSafeSearchRule) {
                return false;
            }

            return true;
        } catch (err) {
            console.warn('Failed to verify dynamic rule health:', err);
            return false;
        }
    }

    if (browser.webRequest && browser.webRequest.onBeforeRequest) {
        return browser.webRequest.onBeforeRequest.hasListener(blockRequestHandler);
    }

    // If neither API is available, assume healthy to avoid blocking execution
    return true;
}

// Global variable to store current blocking filters
let currentFilters = {
    blockHaram: true,
    blockSocial: false,
    customKeywords: [],
    socialDomainsNormalized: [],
    haramDomainsNormalized: [],
    safeSearchEnabled: true,
    imageKeywords: DEFAULT_IMAGE_KEYWORDS,
    socialDomainSet: new Set(),
    haramDomainSet: new Set(),
    haramKeywordsNormalized: [],
    customKeywordsNormalized: []
};

function updateWebRequestRules(blockHaram, blockSocial, customKeywords, haramList, haramDomainList, socialList, hasWildcard, safeSearchEnabled) {
    // Store current filters including wildcard availability
    const normalizedSocialDomains = Array.isArray(socialList)
        ? socialList.map(normalizeDomain).filter(Boolean)
        : DEFAULT_SOCIAL_MEDIA_DOMAINS.map(normalizeDomain).filter(Boolean);
    const normalizedHaramDomains = Array.isArray(haramDomainList) && haramDomainList.length > 0
        ? Array.from(new Set(haramDomainList.map(normalizeDomain).filter(Boolean)))
        : DEFAULT_HARAM_DOMAINS.map(normalizeDomain).filter(Boolean);
    const socialDomainSet = createDomainSet(normalizedSocialDomains);
    const haramDomainSet = createDomainSet(normalizedHaramDomains);
    const normalizedHaramKeywords = Array.isArray(haramList)
        ? Array.from(new Set(haramList.map((kw) => String(kw || '').toLowerCase().trim()).filter(Boolean)))
        : Array.from(new Set(DEFAULT_HARAM_KEYWORDS.map((kw) => String(kw || '').toLowerCase().trim()).filter(Boolean)));
    const normalizedCustomKeywords = Array.isArray(customKeywords)
        ? Array.from(new Set(customKeywords.map((kw) => String(kw || '').toLowerCase().trim()).filter(Boolean)))
        : [];

    currentFilters = {
        blockHaram,
        blockSocial,
        customKeywords,
        haramList,
        haramDomains: normalizedHaramDomains,
        socialList,
        hasWildcard,
        socialDomainsNormalized: Array.from(new Set(normalizedSocialDomains)),
        haramDomainsNormalized: Array.from(new Set(normalizedHaramDomains)),
        safeSearchEnabled,
        imageKeywords: DEFAULT_IMAGE_KEYWORDS,
        socialDomainSet,
        haramDomainSet,
        haramKeywordsNormalized: normalizedHaramKeywords,
        customKeywordsNormalized: normalizedCustomKeywords
    };

    if (!hasWildcard && (normalizedHaramKeywords.length > 0 || normalizedCustomKeywords.length > 0)) {
        console.warn('Wildcard host permission not granted; keyword-based blocking will rely on limited fallback checks.');
    }

    // Remove existing listeners
    if (browser.webRequest && browser.webRequest.onBeforeRequest.hasListener(blockRequestHandler)) {
        browser.webRequest.onBeforeRequest.removeListener(blockRequestHandler);
    }

    // Add new listener if any blocking is enabled
    const shouldListen = blockSocial || blockHaram || (hasWildcard && customKeywords && customKeywords.length > 0) || safeSearchEnabled;
    if (shouldListen) {
        browser.webRequest.onBeforeRequest.addListener(
            blockRequestHandler,
            { urls: ["<all_urls>"] },
            ["blocking"]
        );
    }

    console.log("Amn Shield webRequest rules updated.", currentFilters);
}

function blockRequestHandler(details) {
    const url = details.url.toLowerCase();
    let shouldBlock = false;
    const blockHaram = !!currentFilters.blockHaram;
    const blockSocial = !!currentFilters.blockSocial;
    const haramList = currentFilters.haramList || DEFAULT_HARAM_KEYWORDS;
    const normalizedHaramDomains = currentFilters.haramDomainsNormalized && currentFilters.haramDomainsNormalized.length > 0
        ? currentFilters.haramDomainsNormalized
        : DEFAULT_HARAM_DOMAINS.map(normalizeDomain).filter(Boolean);
    const normalizedSocialDomains = currentFilters.socialDomainsNormalized && currentFilters.socialDomainsNormalized.length > 0
        ? currentFilters.socialDomainsNormalized
        : DEFAULT_SOCIAL_MEDIA_DOMAINS.map(normalizeDomain).filter(Boolean);
    const hostname = getHostnameFromUrl(details.url);
    let initiatorHostname = null;
    if (details.initiator) {
        try {
            const { hostname: initHost } = new URL(details.initiator);
            initiatorHostname = normalizeDomain(initHost);
        } catch (err) {
            // ignore malformed initiator URLs
        }
    }

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

    if (!shouldBlock && blockSocial && initiatorHostname && hostnameMatchesSet(initiatorHostname, socialDomainSet)) {
        shouldBlock = true;
    }

    // Check haram keywords
    if (!shouldBlock && currentFilters.blockHaram && currentFilters.hasWildcard) {
        // Use regex with word boundaries for safer matching
        const keywords = haramList.map(kw => kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
        if (keywords) {
            const regex = new RegExp(`\\b(${keywords})\\b`, 'i');
            if (regex.test(url)) {
                shouldBlock = true;
            }
        }
    }

    // Check custom keywords
    if (!shouldBlock && currentFilters.customKeywords && currentFilters.customKeywords.length > 0 && currentFilters.hasWildcard) {
        const keywords = currentFilters.customKeywords.map(kw => kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
        if (keywords) {
            const regex = new RegExp(`\\b(${keywords})\\b`, 'i');
            if (regex.test(url)) {
                shouldBlock = true;
            }
        }
    }

    // Check explicit image content keywords
    if (!shouldBlock && blockHaram && currentFilters.hasWildcard && details.type === 'image') {
        const imageKeywords = currentFilters.imageKeywords || DEFAULT_IMAGE_KEYWORDS;
        const keywords = imageKeywords.map(kw => kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
        if (keywords) {
            const regex = new RegExp(`\\b(${keywords})\\b`, 'i');
            if (regex.test(url)) {
                shouldBlock = true;
            }
        }
    }

    // Limited fallback keyword checks when wildcard permission is missing
    if (!shouldBlock && blockHaram && !currentFilters.hasWildcard && details.type === 'main_frame') {
        try {
            const parsed = new URL(details.url);
            const searchable = [parsed.hostname || '', parsed.pathname || '', parsed.search || '']
                .join(' ')
                .toLowerCase();
            for (const keyword of currentFilters.haramKeywordsNormalized || []) {
                if (searchable.includes(keyword)) {
                    shouldBlock = true;
                    break;
                }
            }
            if (!shouldBlock && Array.isArray(currentFilters.customKeywordsNormalized)) {
                for (const keyword of currentFilters.customKeywordsNormalized) {
                    if (searchable.includes(keyword)) {
                        shouldBlock = true;
                        break;
                    }
                }
            }
        } catch (err) {
            console.debug('Fallback keyword parsing failed for URL:', details.url, err);
        }
    }

    // Enforce safe search redirects on main-frame navigation
    if (!shouldBlock && currentFilters.safeSearchEnabled && details.type === 'main_frame') {
        const safeSearchRedirect = getSafeSearchRedirect(details.url, currentFilters.safeSearchEnabled);
        if (safeSearchRedirect && safeSearchRedirect !== details.url) {
            console.log('Redirecting to safe-search variant:', safeSearchRedirect);
            return { redirectUrl: safeSearchRedirect };
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

// --- Event Listeners ---
// Ensure rules are refreshed shortly after browser startup
if (browser.runtime && browser.runtime.onStartup && browser.runtime.onStartup.addListener) {
    browser.runtime.onStartup.addListener(() => {
        // slight delay to allow storage to warm up
        setTimeout(updateBlockingRules, 200);
        // Initialize browser safe browsing settings
        setTimeout(initializeBrowserSafeBrowsing, 500);
    });
}
// Run when the extension is first installed or updated
chrome.runtime.setUninstallURL('https://alhaq-initiative.org/contact.html');
if (browser.runtime && browser.runtime.onInstalled && browser.runtime.onInstalled.addListener) {
    browser.runtime.onInstalled.addListener(() => {
        // Clear any existing rules on install
        currentRuleIds.clear();
        // Initialize browser safe browsing settings
        initializeBrowserSafeBrowsing();
        try {
            // Show welcome/getting started page on first install
            if (chrome?.runtime?.getURL && chrome?.tabs?.create) {
                const url = chrome.runtime.getURL('welcome.html');
                chrome.tabs.create({ url });
            }
            // Configure uninstall feedback page (must be http/https; extension URLs are invalid)
            if (chrome?.runtime?.setUninstallURL) {
                chrome.runtime.setUninstallURL('https://alhaq-initiative.org/contact.html');
            }
        } catch { }
        getStorageSettings((settings) => {
            if (!settings || Object.keys(settings).length === 0) {
                setStorageSettings({
                    blockHaram: true,
                    blockSocial: false,
                    customKeywords: [],
                    haramKeywords: DEFAULT_HARAM_KEYWORDS,
                    haramDomains: [],
                    socialDomains: DEFAULT_SOCIAL_MEDIA_DOMAINS,
                    safeSearchEnabled: true
                }, updateBlockingRules);
            } else {
                updateBlockingRules();
            }
        });
    });
}

// Run when relevant settings change; debounce to coalesce multiple writes
function onStorageChanged(changes, areaName) {
    if (areaName !== 'sync') return;
    if (!changes || !changes.settings) return;
    const { oldValue, newValue } = changes.settings;
    if (!relevantSettingsEqual(oldValue, newValue)) {
        debouncedUpdateBlockingRules('settings-changed');
    }
}
if (browser.storage && browser.storage.onChanged && browser.storage.onChanged.addListener) {
    browser.storage.onChanged.addListener(onStorageChanged);
} else if (chrome && chrome.storage && chrome.storage.onChanged && chrome.storage.onChanged.addListener) {
    chrome.storage.onChanged.addListener(onStorageChanged);
}

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
        case 'updateIslamicMode': {
            handleIslamicModeUpdate(message.enabled);
            // Fire-and-forget, but respond to close the channel cleanly
            try { sendResponse({ ok: true }); } catch { }
            return false;
        }
        case 'refreshRules': {
            debouncedUpdateBlockingRules('message');
            try { sendResponse({ ok: true }); } catch { }
            return false;
        }
        case 'openOptionsPage': {
            chrome.runtime.openOptionsPage();
            try { sendResponse({ ok: true }); } catch { }
            return false;
        }
        case 'getExtensionStatus': {
            // Synchronous response; no need to return true
            sendResponse({
                version: chrome.runtime.getManifest().version,
                active: true
            });
            return false;
        }
        case 'contentBlocked': {
            handleContentBlocked(message.data, sender.tab);
            try { sendResponse({ ok: true }); } catch { }
            return false;
        }
        default: {
            // No response expected
            return false;
        }
    }
});

// Handle Islamic mode updates
function handleIslamicModeUpdate(enabled) {
    console.log('🕌 Islamic mode updated:', enabled);

    // Get current settings and update blocking rules
    getStorageSettings((settings) => {
        // In Islamic mode, enhance blocking
        if (enabled) {
            settings.blockHaram = true;
            settings.enhancedBlocking = true;
            if (!settings.haramDomains || settings.haramDomains.length === 0) {
                settings.haramDomains = [];
            }
            if (!settings.haramKeywords || settings.haramKeywords.length === 0) {
                settings.haramKeywords = DEFAULT_HARAM_KEYWORDS;
            }
            settings.safeSearchEnabled = true;
        }

        // Save updated settings
        setStorageSettings(settings, () => {
            // Update blocking rules
            updateBlockingRules();
        });
    });
}

// Handle content blocking events
function handleContentBlocked(data, tab) {
    // Send message to content script to update counters
    if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, {
            action: 'contentBlocked',
            data: data
        });
    }

    console.log('🚫 Content blocked by Amn Shield:', data);
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
            updateBlockingRules();
        }
    });
}

/**
 * Initialize time-based enforcement system
 * Uses chrome.alarms API for efficient periodic checks
 */
function initializeTimeEnforcement() {
    console.log('⏰ Initializing time-based enforcement system');

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
    } else {
        console.warn('⚠️ chrome.alarms not available, using setInterval fallback');
        // Fallback for browsers without alarms API
        setInterval(checkScheduleAndRefresh, 60000); // Check every minute
    }

    // Do initial check
    setTimeout(checkScheduleAndRefresh, 1000);
}

// Initialize on extension load
if (chrome.runtime && chrome.runtime.onStartup) {
    chrome.runtime.onStartup.addListener(() => {
        console.log('🚀 Extension started, initializing time enforcement');
        initializeTimeEnforcement();
        updateBlockingRules();
    });
}

// Initialize immediately on script load
initializeTimeEnforcement();

// ========================================
// Blurr Feature: Keyboard Commands
// ========================================

/**
 * Handle keyboard commands for Blurr feature
 */
if (chrome.commands && chrome.commands.onCommand) {
    chrome.commands.onCommand.addListener((command) => {
        if (command === "toggle_blur_status") {
            // Send message to active tab to toggle blur
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, { message: "reverse_status" }).catch((err) => {
                        console.debug('Blur toggle message error:', err);
                    });
                }
            });
        } else if (command === "toggle_selected_blur") {
            // Send message to active tab to toggle selected element blur
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
 * Initialize Blurr settings on install
 */
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
        // Open welcome page on install
        chrome.tabs.create({ url: "welcome.html" });

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

        browser.storage.sync.set({ blurrSettings: defaultBlurrSettings }, () => {
            console.log('✅ Default Blurr settings initialized');
        });
    } else if (details.reason === "update") {
        // Check if blurrSettings exist, if not, create them
        browser.storage.sync.get(['blurrSettings'], (result) => {
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

                browser.storage.sync.set({ blurrSettings: defaultBlurrSettings }, () => {
                    console.log('✅ Blurr settings added during update');
                });
            }
        });
    }

    // Initialize blocking rules on install/update
    console.log('🔄 Extension installed/updated, initializing blocking rules');
    setTimeout(() => {
        updateBlockingRules();
    }, 500);
});

// ========================================
// Storage Change Listener for Settings Updates
// ========================================
let settingsUpdateTimer = null;

if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'sync') return;
        if (!changes || !changes.settings) return;

        console.log('⚙️ Settings changed, updating blocking rules');

        // Debounce updates to avoid rapid rebuilds
        if (settingsUpdateTimer) clearTimeout(settingsUpdateTimer);
        settingsUpdateTimer = setTimeout(() => {
            settingsUpdateTimer = null;
            updateBlockingRules();
        }, 800);
    });
}

// ========================================
// Initialize blocking on script load
// ========================================
console.log('🚀 Amn Shield MV3 background script loaded');
updateBlockingRules();
console.log('✅ Blocking rules initialization started');

// ========================================
// HaramBlur Integration (REMOVED)
// ========================================
// The HaramBlur integration has been replaced by SafeGaze.
// Previous code for hb-settings and offscreen document creation has been removed.

// ========================================
// DNS-Based Blocking (KahfGuard Integration)
// ========================================
// Note: SafeGaze background script (sg-background.js) handles DNS lookups and blocking.
// We rely on its implementation to avoid redundancy and conflicts.

