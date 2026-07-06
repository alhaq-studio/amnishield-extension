document.addEventListener('DOMContentLoaded', () => {
    const api = (typeof chrome !== 'undefined') ? chrome : browser;

    // ── Element refs ─────────────────────────────────────────────────────────
    const openSettingsBtn   = document.getElementById('openSettingsBtn');
    const helpBtn           = document.getElementById('helpBtn');
    const privacyBtn        = document.getElementById('privacyBtn');
    const contactBtn        = document.getElementById('contactBtn');
    const donateBtn         = document.getElementById('donateBtn');
    const userGuideBtn      = document.getElementById('userGuideBtn');

    const quickBlurToggle   = document.getElementById('quickBlurToggle');
    const quickDeenTabToggle= document.getElementById('quickDeenTabToggle');
    const blockingStatus    = document.getElementById('blockingStatus');
    const blurStatus        = document.getElementById('blurStatus');
    const blockedCount      = document.getElementById('blockedCount');

    const hbStatusToggle    = document.getElementById('hbStatus');
    const hbSettingsPanel   = document.getElementById('hbSettingsPanel');
    const sgBlurLevel       = document.getElementById('sgBlurLevel');
    const sgVideoBlur       = document.getElementById('sgVideoBlur');
    const sgBlockMen        = document.getElementById('sgBlockMen');
    const sgBlockWomen      = document.getElementById('sgBlockWomen');
    const sgBlurMode        = document.getElementById('sgBlurMode');
    const sgGenderScope     = document.getElementById('sgGenderScope');
    const sgStrictness      = document.getElementById('sgStrictness');

    const DEFAULT_HB_SETTINGS = {
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
        strictness: 0.4,
        scoreThreshold: 0.4,
        useSolidColor: false,
        solidColor: "#808080",
        whitelist: [],
        blurMode: "BLUR",
        genderScope: "EXCEPT_FACE"
    };

    let hbSyncSettings = { ...DEFAULT_HB_SETTINGS };

    // ── Appearance ────────────────────────────────────────────────────────────
    function applyPopupPrefs(prefs) {
        if (!prefs) return;
        document.body.classList.toggle('popup-wide',    prefs.popupWidth   === 'wide');
        document.body.classList.toggle('popup-narrow',  prefs.popupWidth   === 'narrow');
        document.body.classList.toggle('popup-compact', prefs.popupDensity === 'compact');
        const dark = prefs.popupTheme === 'dark' ||
            (prefs.popupTheme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        document.body.classList.toggle('popup-dark', !!dark);
    }
    try { api.storage.sync.get(['deenTabPopupPrefs'], r => applyPopupPrefs(r.deenTabPopupPrefs || {})); } catch {}

    function applyAppearancePreview(s) {
        const body = document.body; if (!body) return;
        const ui = s.uiStyle || 'classic';
        const bg = s.bgStyle || 'default';
        body.classList.toggle('ui-liquid',  ui === 'liquid');
        body.classList.toggle('ui-classic', ui !== 'liquid');
        ['bg-default','bg-light','bg-dark','bg-pattern','bg-custom','bg-image'].forEach(c => body.classList.remove(c));
        const chosen = ['light','dark','pattern','custom','image'].includes(bg) ? bg : 'default';
        body.classList.add('bg-' + chosen);
        document.documentElement.style.setProperty('--bg-custom', s.bgCustom || '#174a3c');
    }
    try {
        api.storage.sync.get(['settings','deenTabSettings'], res => {
            const s = res.settings || {}; const dt = res.deenTabSettings || {};
            applyAppearancePreview({
                uiStyle: s.uiStyle || dt.uiStyle || 'classic',
                bgStyle: s.bgStyle || dt.bgStyle || 'default',
                bgCustom: s.bgCustom || dt.bgCustom || '#174a3c',
            });
        });
    } catch {}

    // ── Navigation ────────────────────────────────────────────────────────────
    function openSettingsWindow() {
        try {
            const url = api.runtime.getURL('settings.html');
            if (api?.windows?.create) api.windows.create({ url, type: 'popup', width: 520, height: 740 });
            else window.open(url, '_blank', 'width=520,height=740');
        } catch { window.open('settings.html', '_blank'); }
    }
    if (openSettingsBtn) openSettingsBtn.addEventListener('click', openSettingsWindow);
    if (helpBtn)         helpBtn.addEventListener('click', () => { try { window.open(api.runtime.getURL('help.html'), '_blank'); } catch {} });
    if (privacyBtn)      privacyBtn.addEventListener('click', () => { try { window.open(api.runtime.getURL('privacy.html'), '_blank'); } catch {} });
    if (contactBtn)      contactBtn.addEventListener('click', () => { try { window.open('https://alhaq-initiative.org/contact.html', '_blank'); } catch {} });
    if (donateBtn)       donateBtn.addEventListener('click', () => { try { window.open('https://buy.stripe.com/28E3cwea897i8vkh2l14400', '_blank'); } catch {} });
    if (userGuideBtn)    userGuideBtn.addEventListener('click', () => { try { window.open(api.runtime.getURL('guide.html'), '_blank'); } catch {} });

    // ── Status loader ─────────────────────────────────────────────────────────
    function loadPopupStatus() {
        api.storage.sync.get(['settings', 'blurrSettings', 'hb-settings'], (res) => {
            const s  = res.settings     || {};
            const bs = res.blurrSettings || { status: false };
            const hb = { ...DEFAULT_HB_SETTINGS, ...(res['hb-settings'] || {}) };

            if (blockingStatus) {
                const active = s.blockHaram || s.blockSocial;
                blockingStatus.textContent = active ? 'Active' : 'Inactive';
                blockingStatus.classList.toggle('inactive', !active);
            }
            if (blurStatus && quickBlurToggle) {
                // Full blur is active only when blurrSettings.status=true AND hb is off
                const isBlurring = bs.status === true && !hb.status;
                blurStatus.textContent = isBlurring ? 'Active' : 'Off';
                blurStatus.classList.toggle('inactive', !isBlurring);
                quickBlurToggle.checked = isBlurring;
            }
            if (quickDeenTabToggle) quickDeenTabToggle.checked = !!s.quranTabEnabled;

            // Restore HB settings
            hbSyncSettings = hb;
            if (hbStatusToggle) {
                hbStatusToggle.checked = !!hb.status;
                toggleHBPanel(!!hb.status);
            }
            if (sgBlurLevel  && hb.blurAmount != null) sgBlurLevel.value   = hb.blurAmount;
            if (sgVideoBlur)  sgVideoBlur.checked  = !!hb.blurVideos;
            if (sgBlockMen)   sgBlockMen.checked   = !!hb.blurMale;
            if (sgBlockWomen) sgBlockWomen.checked = !!hb.blurFemale;
            if (sgBlurMode) {
                sgBlurMode.value = hb.blurMode || (hb.useSolidColor ? "VEIL" : "BLUR");
            }
            if (sgGenderScope) {
                sgGenderScope.value = hb.genderScope || (hb.specificBlur ? "EXCEPT_FACE" : "FULL");
            }
            if (sgStrictness && hb.strictness != null) sgStrictness.value = hb.strictness;
        });

        api.storage.local.get(['blockedToday', 'lastBlockedDate'], (res) => {
            const today = new Date().toDateString();
            const count = res.lastBlockedDate === today ? (res.blockedToday || 0) : 0;
            if (blockedCount) blockedCount.textContent = count;
        });
    }

    // ── Full Blur toggle ──────────────────────────────────────────────────────
    function toggleBlur() {
        const enabling = quickBlurToggle.checked;
        api.storage.sync.get(['blurrSettings', 'hb-settings'], (res) => {
            const bs = res.blurrSettings || { status: false, images: true, videos: true, iframes: true, bgImages: true, blurAmt: 20, grayscale: true, ignoredDomains: [] };
            bs.status = enabling;
            const storageUpdate = { blurrSettings: bs };

            // Mutual exclusivity: Full Blur ON → AI Shield OFF
            const hbWasOn = res['hb-settings']?.status;
            if (enabling && hbWasOn) {
                const hbOff = { ...(res['hb-settings'] || {}), status: false };
                storageUpdate['hb-settings'] = hbOff;
                hbSyncSettings = hbOff;
                if (hbStatusToggle) hbStatusToggle.checked = false;
                toggleHBPanel(false);
            }

            api.storage.sync.set(storageUpdate, () => {
                if (blurStatus) {
                    blurStatus.textContent = enabling ? 'Active' : 'Off';
                    blurStatus.classList.toggle('inactive', !enabling);
                }
                broadcastToTabs(tab => {
                    api.tabs.sendMessage(tab.id, { message: 'updateBlurSettings', settings: bs }).catch(() => {});
                    if (enabling) {
                        api.tabs.sendMessage(tab.id, { type: 'fullBlurEnabled' }).catch(() => {});
                        if (hbWasOn) api.tabs.sendMessage(tab.id, { type: 'updateHaramBlurSettings', settings: hbSyncSettings }).catch(() => {});
                    }
                });
            });
        });
    }

    // ── DeenTab toggle ────────────────────────────────────────────────────────
    function toggleDeenTab() {
        const enabled = quickDeenTabToggle.checked;
        api.storage.sync.get(['settings'], res => {
            const s = res.settings || {};
            s.quranTabEnabled = enabled;
            api.storage.sync.set({ settings: s });
        });
    }

    // ── HaramBlur panel ───────────────────────────────────────────────────────
    function toggleHBPanel(show) {
        if (hbSettingsPanel) hbSettingsPanel.classList.toggle('hidden', !show);
    }

    function saveHBSettings() {
        api.storage.sync.set({ 'hb-settings': hbSyncSettings }, () => {
            broadcastToTabs(tab => {
                api.tabs.sendMessage(tab.id, { type: 'updateHaramBlurSettings', settings: hbSyncSettings }).catch(() => {});
            });
        });
    }

    function addHBListeners() {
        if (hbStatusToggle) {
            hbStatusToggle.addEventListener('change', () => {
                const enabling = hbStatusToggle.checked;
                hbSyncSettings = { ...hbSyncSettings, status: enabling };

                if (enabling) {
                    // Mutual exclusivity: AI Shield ON → Full Blur OFF
                    api.storage.sync.get(['blurrSettings'], res => {
                        const bs = res.blurrSettings || {};
                        const wasBlurring = bs.status;
                        bs.status = false;
                        const storageUpdate = { 'hb-settings': hbSyncSettings };
                        if (wasBlurring) storageUpdate.blurrSettings = bs;

                        api.storage.sync.set(storageUpdate, () => {
                            if (quickBlurToggle) quickBlurToggle.checked = false;
                            if (blurStatus) { blurStatus.textContent = 'Off'; blurStatus.classList.add('inactive'); }
                            broadcastToTabs(tab => {
                                api.tabs.sendMessage(tab.id, { type: 'updateHaramBlurSettings', settings: hbSyncSettings }).catch(() => {});
                                if (wasBlurring) {
                                    api.tabs.sendMessage(tab.id, { message: 'updateBlurSettings', settings: bs }).catch(() => {});
                                    api.tabs.sendMessage(tab.id, { type: 'hbShieldEnabled' }).catch(() => {});
                                }
                            });
                        });
                    });
                } else {
                    saveHBSettings();
                }
                toggleHBPanel(enabling);
            });
        }

        if (sgBlurLevel)  sgBlurLevel.addEventListener('change',  () => { hbSyncSettings.blurAmount  = parseInt(sgBlurLevel.value); saveHBSettings(); });
        if (sgVideoBlur)  sgVideoBlur.addEventListener('change',  () => { hbSyncSettings.blurVideos  = sgVideoBlur.checked;        saveHBSettings(); });
        if (sgBlockMen)   sgBlockMen.addEventListener('change',   () => { hbSyncSettings.blurMale    = sgBlockMen.checked;         saveHBSettings(); });
        if (sgBlockWomen) sgBlockWomen.addEventListener('change', () => { hbSyncSettings.blurFemale  = sgBlockWomen.checked;       saveHBSettings(); });
        if (sgBlurMode)   sgBlurMode.addEventListener('change',   () => { 
            hbSyncSettings.blurMode = sgBlurMode.value; 
            hbSyncSettings.useSolidColor = (sgBlurMode.value === "VEIL");
            saveHBSettings(); 
        });
        if (sgGenderScope)sgGenderScope.addEventListener('change',() => { 
            hbSyncSettings.genderScope = sgGenderScope.value; 
            hbSyncSettings.specificBlur = (sgGenderScope.value === "EXCEPT_FACE");
            saveHBSettings(); 
        });
        if (sgStrictness) sgStrictness.addEventListener('change', () => { hbSyncSettings.strictness  = parseFloat(sgStrictness.value); saveHBSettings(); });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    function broadcastToTabs(fn) {
        api.tabs.query({}, tabs => tabs.forEach(fn));
    }

    // ── Init ──────────────────────────────────────────────────────────────────
    loadPopupStatus();
    addHBListeners();

    if (quickBlurToggle)    quickBlurToggle.addEventListener('change', toggleBlur);
    if (quickDeenTabToggle) quickDeenTabToggle.addEventListener('change', toggleDeenTab);
});
