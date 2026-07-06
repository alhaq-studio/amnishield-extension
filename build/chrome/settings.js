// Reuse popup.js logic but without the main popup cards; this file focuses on settings only.
// For maintainability, we import most of the same logic and IDs used in popup.html.

(function () {
  if (typeof browser === 'undefined') { var browser = chrome; }

  const byId = (id) => document.getElementById(id);

  const settingsView = byId('settings-view');
  const lockedView = byId('locked-view');
  const recoveryView = byId('recovery-view');

  const quranTabToggle = byId('quranTabToggle');
  const quranTabStatus = byId('quranTabStatus');

  const blockHaramToggle = byId('blockHaram');
  const blockSocialToggle = byId('blockSocial');
  const permissionStatus = byId('permissionStatus');
  const grantWildcardBtn = byId('grantWildcardBtn');

  const keywordInput = byId('keywordInput');
  const addKeywordBtn = byId('addKeywordBtn');
  const keywordList = byId('keywordList');
  const exportBlocklistBtn = byId('exportBlocklistBtn');

  const optUiStyle = byId('optUiStyle');
  const optBgStyle = byId('optBgStyle');
  const bgCustomColorGroup = byId('bgCustomColorGroup');
  const optBgCustom = byId('optBgCustom');
  const bgImageGroup = byId('bgImageGroup');
  const optBgImageUrl = byId('optBgImageUrl');
  const bgImageFileGroup = byId('bgImageFileGroup');
  const optBgImageFile = byId('optBgImageFile');
  const btnClearBgImage = byId('btnClearBgImage');

  // New: Islamic Mode & Profile selectors
  const islamicModeSelect = byId('islamicModeSelect');
  const profileSelect = byId('profileSelect');

  // Blurr settings elements
  const blurrStatusToggle = byId('blurrStatusToggle');
  const blurrImagesToggle = byId('blurrImagesToggle');
  const blurrVideosToggle = byId('blurrVideosToggle');
  const blurrIframesToggle = byId('blurrIframesToggle');
  const blurrBgImagesToggle = byId('blurrBgImagesToggle');
  const blurrGrayscaleToggle = byId('blurrGrayscaleToggle');
  const blurrAmountSlider = byId('blurrAmountSlider');
  const blurrAmountValue = byId('blurrAmountValue');
  const blurrDomainInput = byId('blurrDomainInput');
  const addBlurrDomainBtn = byId('addBlurrDomainBtn');
  const blurrDomainList = byId('blurrDomainList');
  const blurrOptions = byId('blurrOptions');

  const passwordInput = byId('passwordInput');
  const togglePasswordVis = byId('togglePasswordVis');
  const setPasswordBtn = byId('setPasswordBtn');
  const passwordStrength = byId('passwordStrength');
  const securityQuestionsDiv = byId('security-questions');
  const toggleSecurityBtn = byId('toggleSecurityBtn');
  const securityQuestion = byId('securityQuestion');
  const securityAnswer = byId('securityAnswer');
  const saveSecurityBtn = byId('saveSecurityBtn');

  const unlockPasswordInput = byId('unlockPasswordInput');
  const toggleUnlockVis = byId('toggleUnlockVis');
  const unlockBtn = byId('unlockBtn');

  const forgotPasswordLink = byId('forgotPasswordLink');
  const securityRecovery = byId('security-recovery');
  const recoveryQuestion = byId('recoveryQuestion');
  const recoveryAnswer = byId('recoveryAnswer');
  const verifyAnswerBtn = byId('verifyAnswerBtn');
  const newPasswordSection = byId('new-password-section');
  const newPasswordInput = byId('newPasswordInput');
  const resetPasswordBtn = byId('resetPasswordBtn');
  const emergencyResetBtn = byId('emergencyResetBtn');
  const backToLoginBtn = byId('backToLoginBtn');

  const saveChangesBtn = byId('saveChangesBtn');
  const unsavedIndicator = byId('unsavedIndicator');
  const savingIndicator = byId('savingIndicator');
  const effectiveStatus = byId('effectiveStatus');

  const helpBtn = byId('helpBtn');
  const helpBtnLocked = byId('helpBtnLocked');
  const privacyBtn = byId('privacyBtn');
  const privacyBtnLocked = byId('privacyBtnLocked');
  const contactBtn = byId('contactBtn');
  const contactBtnLocked = byId('contactBtnLocked');
  const scheduleEnabledToggle = byId('scheduleEnabledToggle');
  const viewScheduleBtn = byId('viewScheduleBtn');
  const scheduleModal = byId('scheduleModal');
  const scheduleBackdrop = byId('scheduleBackdrop');
  const closeScheduleBtn = byId('closeScheduleBtn');
  const closeScheduleBtnBottom = byId('closeScheduleBtnBottom');
  const scheduleContent = byId('scheduleContent');
  const scheduleDisabledNotice = byId('scheduleDisabledNotice');
  const copyScheduleJsonBtn = byId('copyScheduleJsonBtn');
  const exportScheduleBtn = byId('exportScheduleBtn');
  const importJsonBtn = byId('importJsonBtn');
  const importJsonFile = byId('importJsonFile');

  const show = (el) => { if (!el) return; el.classList.remove('hidden'); el.style.display = ''; if (getComputedStyle(el).display === 'none') el.style.display = 'block'; };
  const hide = (el) => { if (!el) return; el.classList.add('hidden'); el.style.display = 'none'; };

  let pendingChanges = {};
  let customKeywords = [];
  let hasUnsavedChanges = false;
  let settingsWrite = Promise.resolve();
  function writeSettingsMerge(update) {
    return (settingsWrite = settingsWrite.then(() => new Promise((resolve) => {
      browser.storage.sync.get(['settings'], (res) => {
        const settings = res.settings || {};
        Object.assign(settings, update);
        browser.storage.sync.set({ settings }, () => resolve(settings));
      });
    })));
  }

  function markUnsavedChanges() {
    hasUnsavedChanges = true;
    updateSaveButton();
  }
  function updateSaveButton() {
    if (!saveChangesBtn) return;
    if (hasUnsavedChanges) {
      saveChangesBtn.disabled = false;
      show(unsavedIndicator);
      hide(savingIndicator);
    }
    else {
      saveChangesBtn.disabled = true;
      hide(unsavedIndicator);
      hide(savingIndicator);
    }
  }

  function updateEffectiveStatusText(mode, profile) {
    if (!effectiveStatus) return;
    // Map internal values to friendly text
    const modeMap = { off: 'Off', flexible: 'Flexible', full: 'Full Protection' };
    const profileMap = { personal: 'Personal', work: 'Work', school: 'School', custom: 'Custom' };
    const a = modeMap[String(mode || 'off')] || 'Off';
    const b = profileMap[String(profile || 'personal')] || 'Personal';
    effectiveStatus.textContent = `Effective: ${a} + ${b}`;
  }

  function beginSavingUI() {
    saveChangesBtn.disabled = true;
    hide(unsavedIndicator);
    show(savingIndicator);
  }

  function endSavingUI() {
    hide(unsavedIndicator);
    hide(savingIndicator);
    saveChangesBtn.disabled = true;
  }

  // Permission status updater (wildcard optional host permission)
  function updatePermissionStatus() {
    if (!permissionStatus) return;
    try {
      if (!chrome?.permissions?.contains) {
        permissionStatus.textContent = 'Full keyword blocking available.';
        if (grantWildcardBtn) grantWildcardBtn.classList.add('hidden');
        return;
      }
      chrome.permissions.contains({ origins: ["http://*/*", "https://*/*"] }, (granted) => {
        if (granted) {
          permissionStatus.textContent = '✅ Full keyword & custom blocking active.';
          if (grantWildcardBtn) grantWildcardBtn.classList.add('hidden');
        } else {
          permissionStatus.textContent = 'ℹ️ Domain blocking works. Grant extra permission to enable keyword & custom blocking everywhere.';
          if (grantWildcardBtn) grantWildcardBtn.classList.remove('hidden');
        }
      });
    } catch (e) {
      // Fallback silent
    }
  }

  function showMessage(message, type = 'info') {
    // Minimal toast
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;left:10px;right:10px;top:10px;padding:12px;border-radius:6px;font-size:13px;font-weight:600;text-align:center;z-index:1000;opacity:0;transition:opacity .2s';
    const styles = {
      success: ['#d4edda', '#155724', '#c3e6cb'],
      error: ['#f8d7da', '#721c24', '#f5c6cb'],
      warning: ['#fff3cd', '#856404', '#ffeaa7'],
      info: ['#d1ecf1', '#0c5460', '#bee5eb']
    };
    const [bg, fg, bd] = (styles[type] || styles.info);
    el.style.backgroundColor = bg; el.style.color = fg; el.style.border = `1px solid ${bd}`;
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.style.opacity = '1', 50);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 250); }, 2200);
  }

  function renderKeywords() {
    keywordList.innerHTML = '';
    customKeywords.forEach((keyword, index) => {
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.textContent = keyword;
      const closeBtn = document.createElement('span');
      closeBtn.className = 'close';
      closeBtn.textContent = '×';
      closeBtn.onclick = () => removeKeyword(index);
      chip.appendChild(closeBtn);
      keywordList.appendChild(chip);
    });
  }

  function addKeyword() {
    const keyword = keywordInput.value.trim().toLowerCase();
    if (keyword && !customKeywords.includes(keyword)) {
      customKeywords.push(keyword);
      keywordInput.value = '';
      renderKeywords();
      pendingChanges.customKeywords = [...customKeywords];
      markUnsavedChanges();
      // Defer rules refresh until user explicitly saves to avoid frequent rebuilds
    }
  }
  function removeKeyword(index) {
    customKeywords.splice(index, 1);
    renderKeywords();
    pendingChanges.customKeywords = [...customKeywords];
    markUnsavedChanges();
  }

  function updateAppearanceControls(bgStyleValue) {
    if (!bgStyleValue) return;
    hide(bgCustomColorGroup); hide(bgImageGroup); hide(bgImageFileGroup);
    if (bgStyleValue === 'custom') show(bgCustomColorGroup);
    else if (bgStyleValue === 'image') { show(bgImageGroup); show(bgImageFileGroup); }
  }

  function applyAppearancePreview(settings) {
    const body = document.body; if (!body) return;
    const ui = settings.uiStyle || 'classic';
    const bg = settings.bgStyle || 'default';
    const custom = settings.bgCustom || '#174a3c';
    let bgImage = settings.bgImage || '';
    if (bgImage === '__local__') { try { bgImage = localStorage.getItem('deenTabBgImageLocal') || ''; } catch { } }
    body.classList.toggle('ui-liquid', ui === 'liquid');
    body.classList.toggle('ui-classic', ui !== 'liquid');
    ['bg-default', 'bg-light', 'bg-dark', 'bg-pattern', 'bg-custom', 'bg-image'].forEach(c => body.classList.remove(c));
    const chosen = (bg === 'light' || bg === 'dark' || bg === 'pattern' || bg === 'custom' || bg === 'image') ? bg : 'default';
    body.classList.add('bg-' + chosen);
    document.documentElement.style.setProperty('--bg-custom', custom);
    if (chosen === 'image' && bgImage) document.documentElement.style.setProperty('--bg-image', `url('${bgImage}')`);
    else document.documentElement.style.removeProperty('--bg-image');
  }

  function reflectPasswordState(settings) {
    const hasPassword = !!(settings && (settings.passwordHash && settings.passwordSalt));
    if (hasPassword) { if (passwordInput) { passwordInput.value = ''; passwordInput.disabled = true; passwordInput.placeholder = 'Password is set'; } if (setPasswordBtn) { setPasswordBtn.disabled = true; setPasswordBtn.textContent = 'Password Set'; setPasswordBtn.title = 'Use Forgot Password to reset'; } }
    else { if (passwordInput) { passwordInput.disabled = false; passwordInput.placeholder = 'Set a password (min 4 chars)'; } if (setPasswordBtn) { setPasswordBtn.disabled = false; setPasswordBtn.textContent = 'Set Password'; setPasswordBtn.title = ''; } }
  }

  // Load both global settings and DeenTab-specific settings so appearance fields fallback correctly
  browser.storage.sync.get(['settings', 'deenTabSettings', 'deenTabPopupPrefs', 'blurrSettings'], (result) => {
    const settings = result.settings || {};
    const deenTabSettings = result.deenTabSettings || {};
    const blurrSettings = result.blurrSettings || {
      status: false,
      images: true,
      videos: true,
      iframes: true,
      bgImages: true,
      blurAmt: 20,
      grayscale: true,
      ignoredDomains: []
    };

    // Gate: if a password is set, require unlock before showing settings
    const hasPassword = !!(settings.passwordHash && settings.passwordSalt);
    if (hasPassword) { hide(settingsView); show(lockedView); hide(recoveryView); }
    else { show(settingsView); hide(lockedView); hide(recoveryView); }
    if (quranTabToggle) {
      quranTabToggle.checked = !!settings.quranTabEnabled;
      if (quranTabStatus) quranTabStatus.textContent = settings.quranTabEnabled ? 'Quran Home Tab is enabled as your new tab.' : 'Quran Home Tab is disabled.';
    }
    blockHaramToggle.checked = settings.blockHaram !== false;
    blockSocialToggle.checked = settings.blockSocial === true;
    customKeywords = settings.customKeywords || [];
    renderKeywords();
    reflectPasswordState(settings);

    // Load Blurr settings
    loadBlurrSettings(blurrSettings);

    // Initialize new selectors with defaults if missing
    if (islamicModeSelect) islamicModeSelect.value = settings.islamicMode || 'off';
    if (profileSelect) profileSelect.value = settings.profile || 'personal';
    updateEffectiveStatusText(islamicModeSelect?.value, profileSelect?.value);

    // Reflect schedule enabled state (default true if undefined)
    if (scheduleEnabledToggle) scheduleEnabledToggle.checked = settings.scheduleEnabled !== false;

    // Prefer per-extension settings; fallback to DeenTab appearance if not set
    const uiStyle = settings.uiStyle || deenTabSettings.uiStyle || 'classic';
    const bgStyle = settings.bgStyle || deenTabSettings.bgStyle || 'default';
    const bgCustom = settings.bgCustom || deenTabSettings.bgCustom || '#174a3c';
    const bgImage = settings.bgImage || deenTabSettings.bgImage || '';

    if (optUiStyle) optUiStyle.value = uiStyle;
    if (optBgStyle) optBgStyle.value = bgStyle;
    if (optBgCustom) optBgCustom.value = bgCustom;
    if (optBgImageUrl) optBgImageUrl.value = (bgStyle === 'image' && typeof bgImage === 'string' && bgImage !== '__local__') ? bgImage : '';
    updateAppearanceControls(bgStyle);
    // Apply current appearance to the extension settings page immediately
    applyAppearancePreview({ uiStyle, bgStyle, bgCustom, bgImage });

    pendingChanges = {}; hasUnsavedChanges = false; updateSaveButton();
  });

  if (quranTabToggle) quranTabToggle.addEventListener('change', () => { writeSettingsMerge({ quranTabEnabled: quranTabToggle.checked }); });
  blockHaramToggle.addEventListener('change', () => { pendingChanges.blockHaram = blockHaramToggle.checked; markUnsavedChanges(); });
  blockSocialToggle.addEventListener('change', () => { pendingChanges.blockSocial = blockSocialToggle.checked; markUnsavedChanges(); });
  // Request host permission when user enables either blocking feature if not already granted
  function ensureHostPermission(cb) {
    if (!chrome.permissions || !chrome.permissions.contains) { cb && cb(true); return; }
    chrome.permissions.contains({ origins: ["http://*/*", "https://*/*"] }, (granted) => {
      if (granted) { cb && cb(true); return; }
      const wantsBlocking = (blockHaramToggle && blockHaramToggle.checked) || (blockSocialToggle && blockSocialToggle.checked);
      if (!wantsBlocking) { cb && cb(false); return; }
      chrome.permissions.request({ origins: ["http://*/*", "https://*/*"] }, (gr) => {
        if (!gr) {
          showMessage('Permission denied: blocking will be inactive until granted.', 'warning');
          if (blockHaramToggle) blockHaramToggle.checked = false;
          if (blockSocialToggle) blockSocialToggle.checked = false;
          pendingChanges.blockHaram = blockHaramToggle.checked;
          pendingChanges.blockSocial = blockSocialToggle.checked;
          markUnsavedChanges();
          cb && cb(false);
        } else {
          showMessage('Permission granted. Blocking activated.', 'success');
          // Do not rebuild rules immediately; they'll be refreshed on save
          cb && cb(true);
        }
      });
    });
  }
  if (blockHaramToggle) blockHaramToggle.addEventListener('change', () => ensureHostPermission());
  if (blockSocialToggle) blockSocialToggle.addEventListener('change', () => ensureHostPermission());
  if (grantWildcardBtn) grantWildcardBtn.addEventListener('click', () => ensureHostPermission(() => updatePermissionStatus()));
  updatePermissionStatus();

  addKeywordBtn.addEventListener('click', addKeyword);
  keywordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addKeyword(); });

  // Export blocklist (custom keywords + haram domains)
  if (exportBlocklistBtn) exportBlocklistBtn.addEventListener('click', () => {
    try {
      browser.storage.sync.get(['settings'], (res) => {
        const s = res.settings || {};
        const keywords = s.customKeywords || [];
        const domains = s.haramDomains || [];
        const combined = [...keywords, ...domains];
        if (combined.length === 0) {
          showMessage('No custom blocklist to export.', 'warning');
          return;
        }
        const payload = JSON.stringify(combined, null, 2);
        const blob = new Blob([payload], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'amnshield-blocklist.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showMessage('Blocklist exported.', 'success');
      });
    } catch {
      showMessage('Export failed.', 'error');
    }
  });

  if (optUiStyle) optUiStyle.addEventListener('change', () => { markUnsavedChanges(); applyAppearancePreview({ uiStyle: optUiStyle.value, bgStyle: optBgStyle?.value, bgCustom: optBgCustom?.value, bgImage: optBgImageUrl?.value }); });
  if (islamicModeSelect) islamicModeSelect.addEventListener('change', () => { pendingChanges.islamicMode = islamicModeSelect.value; updateEffectiveStatusText(islamicModeSelect.value, profileSelect?.value); markUnsavedChanges(); });
  if (profileSelect) profileSelect.addEventListener('change', () => { pendingChanges.profile = profileSelect.value; updateEffectiveStatusText(islamicModeSelect?.value, profileSelect.value); markUnsavedChanges(); });
  if (scheduleEnabledToggle) scheduleEnabledToggle.addEventListener('change', () => { pendingChanges.scheduleEnabled = !!scheduleEnabledToggle.checked; markUnsavedChanges(); });
  if (optBgStyle) optBgStyle.addEventListener('change', () => { updateAppearanceControls(optBgStyle.value); markUnsavedChanges(); applyAppearancePreview({ uiStyle: optUiStyle?.value, bgStyle: optBgStyle.value, bgCustom: optBgCustom?.value, bgImage: optBgImageUrl?.value }); });
  if (optBgCustom) optBgCustom.addEventListener('input', () => { markUnsavedChanges(); applyAppearancePreview({ uiStyle: optUiStyle?.value, bgStyle: optBgStyle?.value, bgCustom: optBgCustom.value, bgImage: optBgImageUrl?.value }); });
  if (optBgImageUrl) optBgImageUrl.addEventListener('input', () => { markUnsavedChanges(); applyAppearancePreview({ uiStyle: optUiStyle?.value, bgStyle: optBgStyle?.value, bgCustom: optBgCustom?.value, bgImage: optBgImageUrl.value }); });
  if (optBgImageFile) optBgImageFile.addEventListener('change', () => {
    const file = optBgImageFile.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result; if (typeof dataUrl === 'string') {
        try { localStorage.setItem('deenTabBgImageLocal', dataUrl); if (optBgImageUrl) { optBgImageUrl.value = ''; optBgImageUrl.placeholder = 'Using uploaded image (saved locally)'; } pendingChanges.bgImage = '__local__'; markUnsavedChanges(); } catch { }
      }
    };
    reader.readAsDataURL(file);
  });
  if (btnClearBgImage) btnClearBgImage.addEventListener('click', () => { try { localStorage.removeItem('deenTabBgImageLocal'); if (optBgImageUrl) { optBgImageUrl.value = ''; optBgImageUrl.placeholder = 'https://example.com/image.png'; } pendingChanges.bgImage = ''; markUnsavedChanges(); } catch { } });

  // Helper to mirror appearance settings to DeenTab's own settings bucket
  function syncDeenTabAppearance(updateAppearance) {
    const keys = ['uiStyle', 'bgStyle', 'bgCustom', 'bgImage'];
    const hasAny = keys.some(k => updateAppearance[k] !== undefined);
    if (!hasAny) return Promise.resolve();
    return new Promise((resolve) => {
      browser.storage.sync.get(['deenTabSettings'], (res) => {
        const dt = res.deenTabSettings || {};
        const next = { ...dt };
        keys.forEach(k => { if (updateAppearance[k] !== undefined) next[k] = updateAppearance[k]; });
        browser.storage.sync.set({ deenTabSettings: next }, () => resolve());
      });
    });
  }

  if (saveChangesBtn) saveChangesBtn.addEventListener('click', () => {
    if (!hasUnsavedChanges) return;
    beginSavingUI();
    const update = { ...pendingChanges };
    if (pendingChanges.customKeywords !== undefined) update.customKeywords = customKeywords;
    if (optUiStyle) update.uiStyle = optUiStyle.value;
    if (optBgStyle) update.bgStyle = optBgStyle.value;
    if (optBgCustom) update.bgCustom = optBgCustom.value;
    if (optBgImageUrl && update.bgStyle === 'image') {
      const url = optBgImageUrl.value.trim();
      if (url) {
        update.bgImage = url;
        try { localStorage.removeItem('deenTabBgImageLocal'); } catch { }
      } else if (pendingChanges.bgImage === '__local__') {
        update.bgImage = '__local__';
      } else {
        update.bgImage = '';
      }
    }
    // Ensure the new selectors are included even if unchanged during this session
    if (islamicModeSelect && update.islamicMode === undefined) update.islamicMode = islamicModeSelect.value;
    if (profileSelect && update.profile === undefined) update.profile = profileSelect.value;
    if (scheduleEnabledToggle && update.scheduleEnabled === undefined) update.scheduleEnabled = !!scheduleEnabledToggle.checked;
    writeSettingsMerge(update).then(() => syncDeenTabAppearance(update)).then(() => {
      pendingChanges = {}; hasUnsavedChanges = false; updateSaveButton();
      // Trigger a debounced rules refresh once after settings commit
      try {
        chrome.runtime.sendMessage({ action: 'refreshRules' }, () => {
          if (chrome.runtime.lastError) {
            console.warn('Background script not ready:', chrome.runtime.lastError.message);
          }
        });
      } catch (e) {
        console.warn('Failed to send refresh message:', e);
      }
    });
  });

  // Listen for background confirmation that rules were refreshed or skipped
  try {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message && message.action === 'rulesRefreshed') {
        endSavingUI();
        showMessage(message.skipped ? 'Settings saved.' : 'Settings saved and applied.', 'success');
      }
      return false; // Indicate we're not sending an async response
    });
  } catch (e) {
    console.warn('Could not set up message listener:', e);
  }

  // Password logic
  if (togglePasswordVis && passwordInput) togglePasswordVis.addEventListener('click', () => { passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password'; });
  if (toggleUnlockVis && unlockPasswordInput) toggleUnlockVis.addEventListener('click', () => { unlockPasswordInput.type = unlockPasswordInput.type === 'password' ? 'text' : 'password'; });

  if (setPasswordBtn) setPasswordBtn.addEventListener('click', async () => {
    const pass = passwordInput.value; if (!pass) return;
    if (pass.length < 4) { alert('Password should be at least 4 characters long.'); return; }
    const salt = window.cryptoService.randomSalt();
    const passwordHash = await window.cryptoService.hashWithSalt(pass, salt);
    await writeSettingsMerge({ passwordHash, passwordSalt: salt });
    passwordInput.value = ''; reflectPasswordState({ passwordHash, passwordSalt: salt });
    if (toggleSecurityBtn) show(toggleSecurityBtn);
    if (securityQuestionsDiv) show(securityQuestionsDiv);
    showMessage('Password set. Consider adding a security question.', 'success');
  });

  if (unlockBtn) unlockBtn.addEventListener('click', async () => {
    browser.storage.sync.get(['settings'], async (result) => {
      const s = result.settings || {}; const { passwordHash, passwordSalt } = s;
      const candidate = await window.cryptoService.hashWithSalt(unlockPasswordInput.value, passwordSalt || '');
      if (passwordHash && passwordSalt && window.cryptoService.timingSafeEqual(candidate, passwordHash)) { show(settingsView); hide(lockedView); hide(recoveryView); unlockPasswordInput.value = ''; }
      else { alert('Incorrect password.'); unlockPasswordInput.value = ''; }
    });
  });

  // Security questions UI
  if (toggleSecurityBtn) toggleSecurityBtn.addEventListener('click', () => { if (securityQuestionsDiv) { if (securityQuestionsDiv.classList.contains('hidden')) show(securityQuestionsDiv); else hide(securityQuestionsDiv); } });
  if (saveSecurityBtn) saveSecurityBtn.addEventListener('click', async () => {
    const question = (securityQuestion && securityQuestion.value) || '';
    const answer = (securityAnswer && securityAnswer.value.trim()) || '';
    if (!question || !answer) { showMessage('Select a question and answer it.', 'warning'); return; }
    const salt = window.cryptoService.randomSalt();
    const answerHash = await window.cryptoService.hashWithSalt(answer.toLowerCase(), salt);
    await writeSettingsMerge({ securityQuestion: question, securityAnswerHash: answerHash, securityAnswerSalt: salt });
    showMessage('Security question saved.', 'success');
    if (securityQuestionsDiv) hide(securityQuestionsDiv);
    if (toggleSecurityBtn) hide(toggleSecurityBtn);
  });

  // Forgot password & recovery
  if (forgotPasswordLink) forgotPasswordLink.addEventListener('click', () => {
    browser.storage.sync.get(['settings'], (res) => {
      const s = res.settings || {};
      if (!(s.securityQuestion && s.securityAnswerHash && s.securityAnswerSalt)) {
        showMessage('No security question set. Use Emergency Reset.', 'warning');
        return;
      }
      hide(settingsView); hide(lockedView); show(recoveryView);
      const map = {
        mother: "What is your mother's maiden name?",
        birthplace: 'What city were you born in?',
        school: 'What was the name of your first school?',
        pet: 'What was your first pet\'s name?',
        book: 'What is your favorite Islamic book?',
        masjid: 'What is the name of your local masjid?',
        teacher: 'Who was your favorite teacher?'
      };
      if (recoveryQuestion) recoveryQuestion.textContent = map[s.securityQuestion] || 'Security Question';
      if (securityRecovery) show(securityRecovery);
    });
  });
  if (verifyAnswerBtn) verifyAnswerBtn.addEventListener('click', () => {
    browser.storage.sync.get(['settings'], async (res) => {
      const s = res.settings || {};
      const user = (recoveryAnswer && recoveryAnswer.value || '').trim().toLowerCase();
      const candidate = await window.cryptoService.hashWithSalt(user, s.securityAnswerSalt || '');
      if (s.securityAnswerHash && s.securityAnswerSalt && window.cryptoService.timingSafeEqual(candidate, s.securityAnswerHash)) {
        if (securityRecovery) hide(securityRecovery);
        if (newPasswordSection) show(newPasswordSection);
        showMessage('Answer correct. Set a new password.', 'success');
      } else {
        showMessage('Incorrect answer.', 'error');
        if (recoveryAnswer) recoveryAnswer.value = '';
      }
    });
  });
  if (resetPasswordBtn) resetPasswordBtn.addEventListener('click', async () => {
    const np = (newPasswordInput && newPasswordInput.value) || '';
    if (np.length < 4) { showMessage('Password must be at least 4 characters.', 'warning'); return; }
    const salt = window.cryptoService.randomSalt();
    const passwordHash = await window.cryptoService.hashWithSalt(np, salt);
    await writeSettingsMerge({ passwordHash, passwordSalt: salt });
    showMessage('Password reset.', 'success');
    setTimeout(() => { hide(settingsView); show(lockedView); hide(recoveryView); if (newPasswordInput) newPasswordInput.value = ''; if (recoveryAnswer) recoveryAnswer.value = ''; if (newPasswordSection) hide(newPasswordSection); }, 1200);
  });
  if (emergencyResetBtn) emergencyResetBtn.addEventListener('click', () => {
    if (!confirm('Emergency Reset will remove all passwords and security questions. Continue?')) return;
    if (!confirm('Final confirmation: proceed with Emergency Reset?')) return;
    browser.storage.sync.get(['settings'], (res) => {
      const s = res.settings || {};
      delete s.password; delete s.passwordHash; delete s.passwordSalt;
      delete s.securityQuestion; delete s.securityAnswer; delete s.securityAnswerHash; delete s.securityAnswerSalt;
      browser.storage.sync.set({ settings: s }, () => { showMessage('Emergency reset completed.', 'success'); show(settingsView); hide(lockedView); hide(recoveryView); });
    });
  });
  if (backToLoginBtn) backToLoginBtn.addEventListener('click', () => {
    browser.storage.sync.get(['settings'], (res) => {
      const s = res.settings || {};
      const shouldLock = !!(s.passwordHash && s.passwordSalt && s.securityQuestion && s.securityAnswerHash && s.securityAnswerSalt);
      if (shouldLock) { hide(settingsView); show(lockedView); } else { show(settingsView); hide(lockedView); }
      hide(recoveryView); if (recoveryAnswer) recoveryAnswer.value = ''; if (newPasswordInput) newPasswordInput.value = ''; if (newPasswordSection) hide(newPasswordSection);
    });
  });

  // Help/Privacy/Contact
  function openHelp() { try { window.open(chrome.runtime.getURL('help.html'), '_blank'); } catch { } }
  function openExternal(url) { try { window.open(url, '_blank'); } catch { } }
  if (helpBtn) helpBtn.addEventListener('click', openHelp);
  if (helpBtnLocked) helpBtnLocked.addEventListener('click', openHelp);
  function openPrivacy() { try { window.open(chrome.runtime.getURL('privacy.html'), '_blank'); } catch { openExternal(chrome.runtime.getURL('privacy.html')); } }
  if (privacyBtn) privacyBtn.addEventListener('click', openPrivacy);
  if (privacyBtnLocked) privacyBtnLocked.addEventListener('click', openPrivacy);
  if (contactBtn) contactBtn.addEventListener('click', () => openExternal('https://alhaq-initiative.org/contact.html'));
  if (contactBtnLocked) contactBtnLocked.addEventListener('click', () => openExternal('https://alhaq-initiative.org/contact.html'));

  // Schedule modal logic (read-only)
  // Phase 2: Interactive Timetable Editor
  let timetableEditor = null;

  function initializeTimetableEditor() {
    if (timetableEditor) return timetableEditor;

    if (window.AmnShield && window.AmnShield.TimetableEditor) {
      timetableEditor = new window.AmnShield.TimetableEditor();

      // Initialize grid
      const grid = document.getElementById('timetableGrid');
      if (grid) {
        timetableEditor.initializeGrid(grid);
      }

      // Setup event listeners
      const applyBtn = document.getElementById('applyRangeBtn');
      const deleteBtn = document.getElementById('deleteRangeBtn');
      const saveBtn = document.getElementById('saveScheduleBtn');
      const resetBtn = document.getElementById('resetScheduleBtn');
      const importBtn = document.getElementById('importScheduleBtn');
      const fileInput = document.getElementById('importScheduleFileInput');

      if (applyBtn) {
        applyBtn.addEventListener('click', () => {
          timetableEditor.applyCategories();
        });
      }

      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
          if (confirm('Delete this time range?')) {
            timetableEditor.deleteRange();
          }
        });
      }

      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          saveTimetableSchedule();
        });
      }

      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          const profile = pendingChanges.profile || profileSelect?.value || 'personal';
          if (confirm(`Reset schedule to ${profile} template?`)) {
            timetableEditor.resetSchedule(profile);
          }
        });
      }

      if (importBtn && fileInput) {
        importBtn.addEventListener('click', () => {
          fileInput.click();
        });

        fileInput.addEventListener('change', async (e) => {
          const file = e.target.files[0];
          if (!file) return;

          try {
            await timetableEditor.importSchedule(file);
            showMessage('Schedule imported successfully', 'success');
          } catch (error) {
            showMessage('Failed to import schedule: ' + error.message, 'error');
          }

          // Clear file input
          fileInput.value = '';
        });
      }

      // Export button already handled below with new editor
    }

    return timetableEditor;
  }

  function saveTimetableSchedule() {
    if (!timetableEditor) return;

    const schedule = timetableEditor.getSchedule();

    // Save to pending changes
    pendingChanges.weeklySchedule = schedule;

    // Save to storage
    browser.storage.sync.get(['settings'], (res) => {
      const s = res.settings || {};
      s.weeklySchedule = schedule;

      browser.storage.sync.set({ settings: s }, () => {
        showMessage('Schedule saved successfully!', 'success');

        // Notify background to refresh rules
        try {
          browser.runtime.sendMessage({ action: 'refreshRules' }, () => {
            if (browser.runtime.lastError) {
              console.warn('Background script not ready:', browser.runtime.lastError.message);
            }
          });
        } catch (e) {
          console.warn('Failed to send refresh message:', e);
        }
      });
    });
  }

  function openScheduleModal() {
    if (!scheduleModal) return;

    try {
      browser.storage.sync.get(['settings'], (res) => {
        const s = res.settings || {};

        // Check if schedule is enabled
        if (scheduleDisabledNotice) {
          (s.scheduleEnabled === false) ? show(scheduleDisabledNotice) : hide(scheduleDisabledNotice);
        }

        // Initialize timetable editor
        const editor = initializeTimetableEditor();
        if (editor) {
          editor.loadSchedule(s);
        }

        show(scheduleModal);
      });
    } catch (error) {
      console.error('Failed to open schedule modal:', error);
      showMessage('Failed to load schedule', 'error');
    }
  }
  function closeScheduleModal() { if (scheduleModal) hide(scheduleModal); }
  function renderWeeklyScheduleHtml(weekly) {
    // weekly.days: [{ day: number 0-6, ranges: [{start,end}] }]
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const map = new Map();
    (weekly.days || []).forEach(d => map.set(d.day, d.ranges || []));
    let html = '<table style="width:100%;border-collapse:collapse;">\n<thead><tr>' + daysOfWeek.map(d => `<th style="border-bottom:1px solid #e6e6e6;text-align:left;padding:8px;">${d}</th>`).join('') + '</tr></thead><tbody><tr>';
    for (let i = 0; i < 7; i++) {
      const ranges = map.get(i) || [];
      const items = ranges.map(r => {
        const fmt = (m) => {
          const hh = Math.floor(m / 60), mm = m % 60; return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
        };
        return `<div style="margin:6px 0;padding:6px 8px;border:1px solid #e6e6e6;border-radius:6px;background:#f8faf9;">${fmt(r.start)} → ${fmt(r.end)}</div>`;
      }).join('') || '<div style="color:#888">—</div>';
      html += `<td style="vertical-align:top;padding:8px;">${items}</td>`;
    }
    html += '</tr></tbody></table>';
    if (weekly.categories && weekly.categories.length) {
      html += `<div style="margin-top:10px;color:#333;"><strong>Categories:</strong> ${weekly.categories.join(', ')}</div>`;
    }
    return html;
  }
  if (viewScheduleBtn) viewScheduleBtn.addEventListener('click', openScheduleModal);
  if (closeScheduleBtn) closeScheduleBtn.addEventListener('click', closeScheduleModal);
  if (closeScheduleBtnBottom) closeScheduleBtnBottom.addEventListener('click', closeScheduleModal);
  if (scheduleBackdrop) scheduleBackdrop.addEventListener('click', closeScheduleModal);
  if (copyScheduleJsonBtn) copyScheduleJsonBtn.addEventListener('click', () => {
    try {
      browser.storage.sync.get(['settings'], (res) => {
        const s = res.settings || {};
        const eff = (window?.AmnShield?.scheduler?.getEffectiveSettings ? window.AmnShield.scheduler.getEffectiveSettings(s) : s) || s;
        const wk = eff.weeklySchedule || { days: [] };
        const payload = JSON.stringify(wk, null, 2);
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(payload).then(() => showMessage('Schedule JSON copied.', 'success')).catch(() => fallbackCopy(payload));
        } else {
          fallbackCopy(payload);
        }
      });
    } catch {
      showMessage('Copy failed.', 'error');
    }
  });
  function fallbackCopy(text) {
    try { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); showMessage('Schedule JSON copied.', 'success'); } catch { showMessage('Copy failed.', 'error'); }
  }

  // Export schedule to file (Phase 2: Use timetable editor if available)
  if (exportScheduleBtn) exportScheduleBtn.addEventListener('click', () => {
    if (timetableEditor) {
      // Use new editor export
      timetableEditor.exportSchedule();
      return;
    }

    // Fallback to old method
    try {
      browser.storage.sync.get(['settings'], (res) => {
        const s = res.settings || {};
        const eff = (window?.AmnShield?.scheduler?.getEffectiveSettings ? window.AmnShield.scheduler.getEffectiveSettings(s) : s) || s;
        const wk = eff.weeklySchedule || { days: [], categories: [] };
        const payload = JSON.stringify(wk, null, 2);
        const blob = new Blob([payload], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'amnshield-schedule.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showMessage('Schedule exported.', 'success');
      });
    } catch {
      showMessage('Export failed.', 'error');
    }
  });

  // Import JSON: auto-detect blocklist or schedule
  if (importJsonBtn && importJsonFile) {
    importJsonBtn.addEventListener('click', () => {
      importJsonFile.click();
    });
    importJsonFile.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const text = ev.target?.result;
          const imported = JSON.parse(text);

          // Auto-detect type
          if (Array.isArray(imported)) {
            // Blocklist: array of domain strings or keyword strings
            importBlocklist(imported);
          } else if (imported && typeof imported === 'object') {
            if (imported.days !== undefined || imported.categories !== undefined) {
              // Schedule object
              importSchedule(imported);
            } else {
              showMessage('Unrecognized JSON structure.', 'error');
            }
          } else {
            showMessage('Invalid JSON format.', 'error');
          }
        } catch {
          showMessage('Failed to parse JSON.', 'error');
        }
        importJsonFile.value = '';
      };
      reader.readAsText(file);
    });
  }

  function importSchedule(scheduleObj) {
    // Validate schedule structure
    if (!scheduleObj || typeof scheduleObj !== 'object') {
      showMessage('Invalid schedule structure.', 'error');
      return;
    }
    browser.storage.sync.get(['settings'], (res) => {
      const s = res.settings || {};
      s.weeklySchedule = scheduleObj;
      browser.storage.sync.set({ settings: s }, () => {
        showMessage('Schedule imported and saved.', 'success');
        // Refresh modal if open
        if (scheduleModal && !scheduleModal.classList.contains('hidden')) {
          openScheduleModal();
        }
      });
    });
  }

  function importBlocklist(domainArray) {
    // Validate array of strings
    if (!Array.isArray(domainArray) || domainArray.length === 0) {
      showMessage('Invalid blocklist format.', 'error');
      return;
    }
    const validDomains = domainArray.filter(d => typeof d === 'string' && d.trim().length > 0).map(d => d.trim().toLowerCase());
    if (validDomains.length === 0) {
      showMessage('No valid domains/keywords found.', 'error');
      return;
    }

    browser.storage.sync.get(['settings'], (res) => {
      const s = res.settings || {};
      // Detect if these look like domains or keywords
      const hasDots = validDomains.some(d => d.includes('.'));
      if (hasDots) {
        // Merge into custom blocked domains (for haram or custom lists)
        const existing = new Set(s.haramDomains || []);
        validDomains.forEach(d => existing.add(d));
        s.haramDomains = Array.from(existing);
        showMessage(`Imported ${validDomains.length} domain(s) to blocklist.`, 'success');
      } else {
        // Merge into custom keywords
        const existing = new Set(s.customKeywords || []);
        validDomains.forEach(k => existing.add(k));
        s.customKeywords = Array.from(existing);
        showMessage(`Imported ${validDomains.length} keyword(s) to blocklist.`, 'success');
      }
      browser.storage.sync.set({ settings: s }, () => {
        // Trigger rules refresh
        try {
          chrome.runtime.sendMessage({ action: 'refreshRules' }, () => {
            if (chrome.runtime.lastError) {
              console.warn('Background script not ready:', chrome.runtime.lastError.message);
            }
          });
        } catch (e) {
          console.warn('Failed to send refresh message:', e);
        }
      });
    });
  }

  // ========================================
  // HaramBlur AI Blur Settings Functions
  // ========================================

  const HB_SETTINGS_KEY = "hb-settings";
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

  // New Elements
  const blurModeSelect = byId('blurModeSelect');
  const blurAreaSelect = byId('blurAreaSelect');
  const strictnessSelect = byId('strictnessSelect');

  function loadBlurrSettings() {
    browser.storage.sync.get([HB_SETTINGS_KEY], (result) => {
      const config = result[HB_SETTINGS_KEY] || DEFAULT_HB_SETTINGS;

      if (blurrStatusToggle) blurrStatusToggle.checked = config.status;
      if (blurrVideosToggle) blurrVideosToggle.checked = config.blurVideos;

      if (blurModeSelect) {
        const mode = config.blurMode || (config.useSolidColor ? "VEIL" : "BLUR");
        blurModeSelect.value = mode;
      }

      if (blurAreaSelect) {
        const isExceptFace = config.genderScope === "EXCEPT_FACE" || (config.genderScope === undefined && config.specificBlur === true);
        if (isExceptFace) {
          blurAreaSelect.value = "EXPOSED_SKIN";
        } else {
          blurAreaSelect.value = "FULL_BODY";
        }
      }

      if (strictnessSelect) {
        strictnessSelect.value = (config.strictness != null) ? String(config.strictness) : "0.4";
      }

      if (blurrAmountSlider) {
        blurrAmountSlider.value = config.blurAmount || 30;
        if (blurrAmountValue) blurrAmountValue.textContent = config.blurAmount || 30;
      }

      updateBlurrOptionsVisibility(config.status);
    });
  }

  function updateBlurrOptionsVisibility(enabled) {
    if (!blurrOptions) return;
    if (enabled) {
      blurrOptions.style.display = 'block';
    } else {
      blurrOptions.style.display = 'none';
    }
  }

  function saveBlurrSettings() {
    let genderScope = "FULL";
    let specificBlur = false;
    if (blurAreaSelect && (blurAreaSelect.value === "EXPOSED_SKIN" || blurAreaSelect.value === "EXPOSED_SKIN_HEAD")) {
      genderScope = "EXCEPT_FACE";
      specificBlur = true;
    }

    const useSolidColor = blurModeSelect ? (blurModeSelect.value === "VEIL") : false;

    const newSettings = {
      status: blurrStatusToggle ? blurrStatusToggle.checked : false,
      blurVideos: blurrVideosToggle ? blurrVideosToggle.checked : true,
      blurAmount: blurrAmountSlider ? parseInt(blurrAmountSlider.value) : 30,
      blurMode: blurModeSelect ? blurModeSelect.value : "BLUR",
      useSolidColor: useSolidColor,
      genderScope: genderScope,
      specificBlur: specificBlur,
      strictness: strictnessSelect ? parseFloat(strictnessSelect.value) : 0.4
    };

    browser.storage.sync.get([HB_SETTINGS_KEY], (result) => {
      const existing = result[HB_SETTINGS_KEY] || DEFAULT_HB_SETTINGS;
      const merged = { ...existing, ...newSettings };

      browser.storage.sync.set({ [HB_SETTINGS_KEY]: merged }, () => {
        showMessage('HaramBlur AI Shield settings saved!', 'success');

        // Notify background and active tabs
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {
              type: 'updateHaramBlurSettings',
              settings: merged
            }).catch(() => { });
          });
        });
      });
    });
  }

  // Event listeners for Blurr settings
  if (blurrStatusToggle) {
    blurrStatusToggle.addEventListener('change', () => {
      updateBlurrOptionsVisibility(blurrStatusToggle.checked);
      saveBlurrSettings();
    });
  }

  if (blurrVideosToggle) blurrVideosToggle.addEventListener('change', saveBlurrSettings);
  if (blurAreaSelect) blurAreaSelect.addEventListener('change', saveBlurrSettings);
  if (blurModeSelect) blurModeSelect.addEventListener('change', saveBlurrSettings);

  if (blurrAmountSlider) {
    blurrAmountSlider.addEventListener('input', () => {
      if (blurrAmountValue) {
        blurrAmountValue.textContent = blurrAmountSlider.value;
      }
    });
    blurrAmountSlider.addEventListener('change', saveBlurrSettings);
  }

  // Initial Load
  loadBlurrSettings();
})();
