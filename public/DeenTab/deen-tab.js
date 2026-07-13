(function(){
  const api = (typeof browser !== 'undefined') ? browser : chrome;

  function applyAppearance(settings){
    const body = document.body;
    if (!body) return;
    const ui = settings.uiStyle || 'classic';
    const bg = settings.bgStyle || 'default';
    const custom = settings.bgCustom || '#174a3c';
    let bgImage = settings.bgImage || '';
    if (bgImage === '__local__') {
      try { bgImage = localStorage.getItem('deenTabBgImageLocal') || ''; } catch {}
    }

    // UI style
    body.classList.toggle('ui-liquid', ui === 'liquid');
    body.classList.toggle('ui-classic', ui !== 'liquid');

    // Background
    const bgClasses = ['bg-default','bg-light','bg-dark','bg-pattern','bg-custom','bg-image'];
    bgClasses.forEach(c => body.classList.remove(c));
    const chosen = (bg === 'light' || bg === 'dark' || bg === 'pattern' || bg === 'custom' || bg === 'image') ? bg : 'default';
    body.classList.add('bg-' + chosen);
    // Set variables
    document.documentElement.style.setProperty('--bg-custom', custom);
    if (chosen === 'image' && bgImage) {
      document.documentElement.style.setProperty('--bg-image', `url('${bgImage}')`);
    } else {
      document.documentElement.style.removeProperty('--bg-image');
    }
  }

  function loadAndApply(){
    try {
      api.storage.sync.get(['settings'], (res) => {
        applyAppearance(res.settings || {});
      });
    } catch {}
  }

  document.addEventListener('DOMContentLoaded', loadAndApply);

  // Live update when settings change
  try {
    (api.storage && api.storage.onChanged && api.storage.onChanged.addListener) &&
      api.storage.onChanged.addListener((changes, area) => {
        if (area !== 'sync') return;
        if (changes.settings) {
          const newSettings = changes.settings.newValue || {};
          applyAppearance(newSettings);
        }
      });
  } catch {}

  // Optional: toggle via floating dark mode button while on page
  document.addEventListener('click', (e) => {
    const target = e.target;
    if (target && target.id === 'btn-darkmode') {
      try {
        api.storage.sync.get(['settings'], (res) => {
          const s = res.settings || {};
          let next = 'dark';
          const current = s.bgStyle || 'default';
          if (current === 'dark') next = 'light';
          else if (current === 'light') next = 'default';
          else next = 'dark';
          s.bgStyle = next;
          api.storage.sync.set({ settings: s });
        });
      } catch {}
    }
  });
})();
// DeenTab JS (interactive backend)
(function() {
  const els = {
    clock: document.getElementById('clock'),
    ampm: document.getElementById('ampm'),
    hijri: document.getElementById('hijri-date'),
    greg: document.getElementById('gregorian-date'),
    arabic: document.getElementById('ayah-arabic'),
    trans: document.getElementById('ayah-translation'),
    ref: document.getElementById('ayah-ref'),
    btnFav: document.getElementById('btn-fav'),
    btnPrev: document.getElementById('btn-prev'),
    btnPlay: document.getElementById('btn-play'),
    btnNext: document.getElementById('btn-next'),
    btnNotes: document.getElementById('btn-notes'),
    btnCopy: document.getElementById('btn-copy'),
    btnQuickLinks: document.getElementById('btn-quick-links'),
    btnAdhkar: document.getElementById('btn-adhkar'),
  // Legacy panels removed (handled by dropdowns now)
  panelQuick: null,
  panelAdhkar: null,
    btnSettings: document.getElementById('btn-settings'),
    modalSettings: document.getElementById('settings-modal'),
    formSettings: document.getElementById('settings-form'),
    optTts: document.getElementById('opt-tts'),
    optTabMode: document.getElementById('opt-tab-mode'),
    optTranslation: document.getElementById('opt-translation'),
    optTicker: document.getElementById('opt-ticker'),
    optLocation: document.getElementById('opt-location'),
  optMethod: document.getElementById('opt-method'),
  optMadhab: document.getElementById('opt-madhab'),
  optReciter: document.getElementById('opt-reciter'),
  optUiStyle: document.getElementById('opt-ui-style'),
  optWidgetsLayout: document.getElementById('opt-widgets-layout'),
  optBgStyle: document.getElementById('opt-bg-style'),
  optBgCustom: document.getElementById('opt-bg-custom'),
  optBgImageUrl: document.getElementById('opt-bg-image-url'),
  optBgImageFile: document.getElementById('opt-bg-image-file'),
  btnClearBgImage: document.getElementById('btn-clear-bg-image'),
    ticker: document.getElementById('ticker'),
    btnFavorites: document.getElementById('btn-favorites'),
    drawerFavs: document.getElementById('favorites-drawer'),
    listFavs: document.getElementById('favorites-list'),
    btnExport: document.getElementById('btn-export'),
    btnImport: document.getElementById('btn-import'),
    btnClearFavs: document.getElementById('btn-clear-favs'),
    btnSound: document.getElementById('btn-sound'),
    btnLocation: document.getElementById('btn-location'),
    currentLocation: document.getElementById('current-location'),
    toast: document.getElementById('toast')
  };

  // State & storage helpers
  const store = {
    async get(key, def) {
      try {
        const d = await (chrome?.storage?.sync?.get?.(key) ?? Promise.resolve({}));
        return (d && (key in d)) ? d[key] : def;
      } catch { return def; }
    },
    async set(obj) {
      try { await chrome?.storage?.sync?.set?.(obj); } catch { /* noop */ }
    }
  };

  const defaultSettings = {
    tts: false,
    showTranslation: false,
    showTicker: false,
    isDark: false,
  location: '',
  method: 3, // MWL
  madhab: 0,  // Shafi default
  reciter: 'abdul_basit_murattal', // Default reciter
  uiStyle: 'classic', // 'classic' | 'liquid'
  widgetsLayout: 'default', // 'default' | 'quran-centered'
  bgStyle: 'default',
  bgCustom: '#174a3c',
  bgImage: '',
  tabMode: 'minimal'
  };

  let settings = { ...defaultSettings };
  let state = {
    index: 0, // 0-based global verse index across all 6236 ayat
    playing: false,
    continuousMode: false,
    favorites: []
  };

  // Quran data containers
  const quran = {
    // flattened arrays for fast index -> verse mapping
    ar: [], // array of arabic ayah strings length 6236
    total: 0,
    // translation mapping "sura:aya" -> { t }
    enMap: {},
  };

  function verseKeyFromIndex(idx) {
    // Use QuranData.Sura table to find sura and aya by global index
    // QuranData.Sura entries: [start, ayas, order, rukus, name, tname, ename, type]
    // Starts from index 1; entry 0 is []
    const suraTable = (window.QuranData && Array.isArray(window.QuranData.Sura)) ? window.QuranData.Sura : null;
  if (!suraTable) return { sura: 1, aya: 1, nameTn: 'Al-Faatiha', nameEn: 'The Opening', nameAr: 'الفاتحة' };
    // Binary search over sura starts
    let lo = 1, hi = suraTable.length - 2; // ignore last sentinel [6236,1]
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const [start, ayas] = suraTable[mid];
      if (idx < start) { hi = mid - 1; }
      else if (idx >= start + ayas) { lo = mid + 1; }
      else {
    const aya = idx - start + 1;
    return { sura: mid, aya, nameTn: suraTable[mid][5], nameEn: suraTable[mid][6], nameAr: suraTable[mid][4] };
      }
    }
    // Fallback to last sura
    const last = suraTable.length - 2;
    const [start] = suraTable[last];
  return { sura: last, aya: Math.max(1, idx - start + 1), nameTn: suraTable[last][5], nameEn: suraTable[last][6], nameAr: suraTable[last][4] };
  }

  // UI helpers
  function toast(msg, timeout = 2000) {
    if (!els.toast) return;
    els.toast.textContent = msg;
    els.toast.hidden = false;
    setTimeout(() => { els.toast.hidden = true; }, timeout);
  }

  function renderAyah() {
    if (!quran.total) return;
    const idx = ((state.index % quran.total) + quran.total) % quran.total; // clamp
  const { sura, aya, nameTn } = verseKeyFromIndex(idx);
    const key = `${sura}:${aya}`;
    const ar = quran.ar[idx] || '';
    const en = quran.enMap[key]?.t || '';
    els.arabic.textContent = ar;
    els.trans.textContent = en;
    els.trans.hidden = !settings.showTranslation || !en;
  els.ref.textContent = `${nameTn} (${sura}:${aya})`;
    // Update fullscreen content if overlay is open
    const fs = document.getElementById('quran-fullscreen');
    if (fs && !fs.classList.contains('hidden')) {
      const fsAr = document.getElementById('fs-ayah-arabic');
      const fsTr = document.getElementById('fs-ayah-translation');
      const fsRef = document.getElementById('fs-ayah-ref');
      if (fsAr) fsAr.textContent = ar;
      if (fsTr) { fsTr.textContent = en; fsTr.hidden = !settings.showTranslation || !en; }
      if (fsRef) fsRef.textContent = `${nameTn} (${sura}:${aya})`;
    }
    const isFav = state.favorites.some(f => f.key === key);
    els.btnFav.setAttribute('aria-pressed', String(isFav));
  }

  function updateClock() {
    const now = new Date();
    let h = now.getHours();
    let m = now.getMinutes();
    let ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    els.clock.textContent = `${h}:${m.toString().padStart(2, '0')}`;
    els.ampm.textContent = ampm;
  }

  // Hijri date calculation using Tabular Islamic calendar (approx.)
  // Based on Kuwaiti algorithm adaptation; no external deps.
  function gregorianToHijri(date = new Date()) {
    // Convert Gregorian to Julian Day Number
    const gy = date.getFullYear();
    const gm = date.getMonth() + 1;
    const gd = date.getDate();
    let a = Math.floor((14 - gm) / 12);
    let y = gy + 4800 - a;
    let m = gm + 12 * a - 3;
    let jdn = gd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
    // Islamic date from JDN
    const l = jdn - 1948439.5; // base epoch for Hijri (astronomical)
    const n = Math.floor((l - 1) / 10631);
    const r = l - 10631 * n;
    const q = Math.floor((r - 1) / 354.36667);
    const aq = r - Math.floor(354.36667 * q);
    const hy = 30 * n + q + 1;
    const hm = Math.min(12, Math.floor((aq - 1) / 29.5) + 1);
    const hd = Math.max(1, Math.round(aq - Math.floor(29.5 * (hm - 1))));
    return { hy, hm, hd };
  }

  const hijriMonthNames = ['Muharram', 'Safar', "Rabi' al-awwal", "Rabi' al-thani", 'Jumada al-ula', 'Jumada al-akhirah', 'Rajab', 'Sha’ban', 'Ramadan', 'Shawwal', 'Dhul-Qa’dah', 'Dhul-Hijjah'];

  function updateDates() {
    const now = new Date();
    // Gregorian
    els.greg.textContent = now.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
    // Hijri: prefer Intl with umalqura, fallback to tabular
    try {
      const fmt = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' });
      const parts = fmt.formatToParts(now);
      const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
      const day = map.day; const month = map.month; const year = map.year;
      if (day && month && year) {
        els.hijri.textContent = `${month} ${day}, ${year} AH`;
        return;
      }
    } catch {}
    // Fallback (approx.)
    const { hy, hm, hd } = gregorianToHijri(now);
    const hName = hijriMonthNames[(hm - 1 + 12) % 12];
    els.hijri.textContent = `${hName} ${hd}, ${hy} AH`;
  }

  // Prayer times widget
  const prayer = {
    lastKey: '',
    timings: null,
    nextName: '--',
    nextTime: null,
    timer: null
  };

  function parseTimeToDate(timeStr, baseDate = new Date()) {
    // timeStr like "05:06" or "05:06 (EAT)"; extract HH:mm
    const m = (timeStr || '').match(/(\d{1,2}):(\d{2})/);
    if (!m) return null;
    const d = new Date(baseDate);
    d.setHours(parseInt(m[1], 10), parseInt(m[2], 10), 0, 0);
    return d;
  }

  function renderPrayerWidget() {
    const list = document.getElementById('prayer-list');
    const nextEl = document.getElementById('next-prayer');
    const noteEl = document.getElementById('prayer-note');
    if (!list || !nextEl) return;
    list.innerHTML = '';
    if (!prayer.timings) {
      nextEl.textContent = 'Next: --';
      noteEl && (noteEl.hidden = false);
      return;
    }
    noteEl && (noteEl.hidden = true);
    const order = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    const now = new Date();
    let soonest = null;
    let soonestName = '--';
    order.forEach(name => {
      const t = prayer.timings[name];
      const dt = parseTimeToDate(t, now);
      const li = document.createElement('li');
      li.innerHTML = `<span class="prayer-name">${name}</span><span class="prayer-time">${t || '--'}</span>`;
      if (dt && dt > now && (!soonest || dt < soonest)) { soonest = dt; soonestName = name; }
      list.appendChild(li);
    });
    // If day finished, next is Fajr next day
    if (!soonest) {
      const t = prayer.timings['Fajr'];
      const dt = parseTimeToDate(t, new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
      soonest = dt; soonestName = 'Fajr';
    }
    prayer.nextName = soonestName; prayer.nextTime = soonest;
    updateNextPrayerCountdown();
  }

  function updateNextPrayerCountdown() {
    const nextEl = document.getElementById('next-prayer');
    const list = document.getElementById('prayer-list');
    if (!nextEl) return;
    // Mark next in list
    if (list) {
      Array.from(list.children).forEach(li => li.classList.remove('next'));
      const idxMap = { Fajr: 0, Dhuhr: 1, Asr: 2, Maghrib: 3, Isha: 4 };
      const i = idxMap[prayer.nextName];
      if (Number.isInteger(i) && list.children[i]) list.children[i].classList.add('next');
    }
    if (!prayer.nextTime) { nextEl.textContent = 'Next: --'; return; }
    const now = new Date();
    let diff = Math.max(0, prayer.nextTime - now);
    const h = Math.floor(diff / 3600000); diff -= h * 3600000;
    const m = Math.floor(diff / 60000); diff -= m * 60000;
    const s = Math.floor(diff / 1000);
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    const timeLabel = prayer.nextTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    nextEl.textContent = `Next: ${prayer.nextName} at ${timeLabel} (${hh}:${mm}:${ss})`;
  }

  // Palestine ticker updater (since May 15, 1948)
  const TICKER_ANCHOR = new Date('1948-05-15T00:00:00Z');
  function updateTicker() {
    const t = els.ticker;
    if (!t || t.classList.contains('hidden')) return;
    const now = new Date();
    // Years since anchor (anniversary-aware)
    let years = now.getFullYear() - TICKER_ANCHOR.getUTCFullYear();
    const baseMonth = TICKER_ANCHOR.getUTCMonth();
    const baseDay = TICKER_ANCHOR.getUTCDate();
    const annivThisYear = new Date(now.getFullYear(), baseMonth, baseDay);
    if (now < annivThisYear) years -= 1;
    const yearStart = new Date(TICKER_ANCHOR.getUTCFullYear() + years, baseMonth, baseDay);
    // Months since last anniversary
    let months = (now.getFullYear() - yearStart.getFullYear()) * 12 + (now.getMonth() - yearStart.getMonth());
    if (now.getDate() < baseDay) months -= 1;
    if (months < 0) months = 0;
    const monthStart = new Date(yearStart.getFullYear(), yearStart.getMonth() + months, baseDay);
    // Days since monthStart
    let days = Math.floor((now - monthStart) / 86400000);
    if (days < 0) days = 0;
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    t.textContent = `Since May 15, 1948 — ${years}y ${months % 12}m ${days}d ${hh}:${mm}:${ss}`;
  }

  async function fetchPrayerTimesIfNeeded() {
    // Requires settings.location in form "City" or "City, Country"; default to city only.
    const loc = (settings.location || '').trim();
    const widget = document.getElementById('prayer-widget');
    if (!widget) return;
    if (!loc) { prayer.timings = null; renderPrayerWidget(); return; }
    // Build key per day + location
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const key = `prayer:${loc}:${y}-${m}-${d}`;
    if (prayer.lastKey === key && prayer.timings) { renderPrayerWidget(); return; }
    // Try cache
    const cached = await store.get(key, null);
    if (cached && cached.timings) {
      prayer.lastKey = key; prayer.timings = cached.timings; renderPrayerWidget(); return;
    }
    // Fetch from AlAdhan API (no key required)
    let city = loc, country = '';
    if (loc.includes(',')) { const parts = loc.split(','); city = parts[0].trim(); country = parts.slice(1).join(',').trim(); }
  const params = new URLSearchParams({ city, country });
  // Method and madhab from settings
  const method = Number(settings.method) || 3; // default MWL
  params.set('method', String(method));
  const madhab = Number(settings.madhab) || 0; // 0 Shafi, 1 Hanafi
  if (madhab === 1) params.set('school', '1'); else params.set('school', '0');
    try {
      const res = await fetch(`https://api.aladhan.com/v1/timingsByCity?${params.toString()}`);
      const json = await res.json();
      if (json?.code === 200 && json?.data?.timings) {
        // Normalize needed fields and 24h -> local format left as-is
        const t = json.data.timings;
        const pick = { Fajr: t.Fajr, Dhuhr: t.Dhuhr, Asr: t.Asr, Maghrib: t.Maghrib, Isha: t.Isha };
        prayer.lastKey = key; prayer.timings = pick;
        await store.set({ [key]: { timings: pick } });
        renderPrayerWidget();
      } else {
        prayer.timings = null; renderPrayerWidget();
      }
    } catch (e) {
      console.warn('Prayer API failed', e);
      prayer.timings = null; renderPrayerWidget();
    }
  }

  function toggle(el, show) {
    el?.classList?.toggle('hidden', !show);
  }

  // Favorites list rendering
  function renderFavorites() {
    if (!els.listFavs) return;
    els.listFavs.innerHTML = '';
    state.favorites.forEach((a, idx) => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${a.ref}</span>`;
      const btns = document.createElement('div');
  const btnGo = document.createElement('button');
  btnGo.textContent = 'Open';
  btnGo.className = 'primary';
      btnGo.onclick = async () => {
        if (!a?.key) return;
        const [s, ay] = a.key.split(':').map(n => parseInt(n, 10));
        const idx = indexFromKey(s, ay);
        if (idx >= 0) { state.index = idx; await store.set({ deenTabLastIndex: state.index }); renderAyah(); }
      };
  const btnDel = document.createElement('button');
  btnDel.textContent = 'Remove';
  btnDel.className = 'danger';
      btnDel.onclick = async () => {
        state.favorites.splice(idx, 1);
        await store.set({ deenTabFavorites: state.favorites });
        renderFavorites();
        toast('Removed from favorites');
      };
      btns.append(btnGo, btnDel);
      li.appendChild(btns);
      els.listFavs.appendChild(li);
    });
  }

  // Audio with reciters
  let currentAudio = null;

  // Reciter mappings to EveryAyah.com identifiers
  const reciters = {
  'abdul_basit_murattal': { id: 'Abdul_Basit_Murattal_64kbps', name: 'Abdul Basit (Murattal)' },
  'mishary_rashid_alafasy': { id: 'Alafasy_64kbps', name: 'Mishary Rashid Alafasy' },
  'saad_al_ghamdi': { id: 'Ghamadi_40kbps', name: 'Saad Al Ghamdi' },
  'sudais': { id: 'Abdurrahmaan_As-Sudais_64kbps', name: 'Abdul Rahman Al-Sudais' },
  'maher_al_mueaqly': { id: 'Maher_AlMuaiqly_64kbps', name: 'Maher Al Mueaqly' },
  'yasser_al_dosari': { id: 'Yasser_Ad-Dussary_128kbps', name: 'Yasser Al Dossary' },
  'muhammad_ayyoub': { id: 'Muhammad_Ayyoub_64kbps', name: 'Muhammad Ayyoub' },
  'ali_hajjaj_alsouasi': { id: 'Ali_Hajjaj_AlSuesy_128kbps', name: 'Ali Hajjaj Al Suesy' },
  'nasser_al_qatami': { id: 'Nasser_Alqatami_128kbps', name: 'Nasser Al Qatami' },
  'hani_ar_rifai': { id: 'Hani_Rifai_64kbps', name: 'Hani Ar Rifai' }
  };

  function getAudioUrl(sura, aya, reciterId) {
    // EveryAyah.com format: http://www.everyayah.com/data/{reciter}/{sura:3d}{aya:3d}.mp3
    const suraStr = String(sura).padStart(3, '0');
    const ayaStr = String(aya).padStart(3, '0');
  return `https://www.everyayah.com/data/${reciterId}/${suraStr}${ayaStr}.mp3`;
  }

  function stopAllAudio() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    state.playing = false;
    state.continuousMode = false;
    updatePlayButtons();
  }

  function updatePlayButtons() {
    if (els.btnPlay) {
      els.btnPlay.innerHTML = state.continuousMode ? '&#9632;' : '&#9654;';
      els.btnPlay.style.background = state.continuousMode ? '#d32f2f' : '#388e3c';
    }
  }

  function playNextVerse() {
    if (state.continuousMode && quran.total) {
      state.index = (state.index + 1) % quran.total;
      store.set({ deenTabLastIndex: state.index });
      renderAyah();
      const ar = quran.ar[state.index];
      if (ar) {
        speak(ar, true); // true indicates continuous mode
      }
    }
  }

  function speak(text, isContinuous = false) {
    if (!settings.tts) {
      state.continuousMode = false;
      updatePlayButtons();
      return;
    }
    // Use reciter audio if enabled, fallback to TTS
    // if (settings.tts) {
      const { sura, aya } = verseKeyFromIndex(state.index);
      const reciterKey = settings.reciter || 'abdul_basit_murattal';
      const reciter = reciters[reciterKey];
      
      if (reciter && sura && aya) {
        // Stop any current audio
        if (currentAudio) {
          currentAudio.pause();
          currentAudio = null;
        }
        
        const audioUrl = getAudioUrl(sura, aya, reciter.id);
        currentAudio = new Audio(audioUrl);
        
        currentAudio.addEventListener('loadstart', () => {
          state.playing = true;
          updatePlayButtons();
        });
        
        currentAudio.addEventListener('ended', () => {
          state.playing = false;
          currentAudio = null;
          updatePlayButtons();
          
          if (isContinuous && state.continuousMode) {
            // Auto-advance to next verse in continuous mode
            setTimeout(() => playNextVerse(), 500);
          }
        });
        
        currentAudio.addEventListener('error', () => {
          // Fallback to TTS on audio error
          console.warn('Audio failed, using TTS fallback');
          speakWithTTS(text, isContinuous);
        });
        
        currentAudio.play().catch(() => {
          // Fallback to TTS on play error
          speakWithTTS(text, isContinuous);
        });
      } else if (window.speechSynthesis) {
        // Fallback to TTS
        speakWithTTS(text, isContinuous);
      }
    // }
  }

  function speakWithTTS(text, isContinuous = false) {
    if (window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ar';
      window.speechSynthesis.cancel();
      
      state.playing = true;
      updatePlayButtons();
      
      u.onend = () => {
        state.playing = false;
        updatePlayButtons();
        
        if (isContinuous && state.continuousMode) {
          // Auto-advance to next verse in continuous mode
          setTimeout(() => playNextVerse(), 500);
        }
      };
      
      u.onerror = () => {
        state.playing = false;
        updatePlayButtons();
      };
      
      window.speechSynthesis.speak(u);
    }
  }

  // Event wiring
  function wire() {
    // Dark mode toggle
    const btnDarkmode = document.getElementById('btn-darkmode');
    if (btnDarkmode) {
      btnDarkmode.addEventListener('click', () => {
        settings.isDark = !settings.isDark;
        store.set({ deenTabSettings: settings });
        applySettingsToUI();
      });
    }
    // Clock
  setInterval(() => { updateClock(); updateNextPrayerCountdown(); updateTicker(); }, 1000); updateClock(); updateTicker();
    // Dates
    updateDates();
    // Midnight refresh for dates/prayer cache
    const scheduleMidnightRefresh = () => {
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 2);
      const ms = midnight - now;
      setTimeout(() => { updateDates(); fetchPrayerTimesIfNeeded(); scheduleMidnightRefresh(); }, Math.max(1000, ms));
    };
    scheduleMidnightRefresh();

    // Dropdowns: Quick Links & Adhkar
    function closeAllDropdowns() {
      document.querySelectorAll('.dropdown.open').forEach(dd => {
        dd.classList.remove('open');
        const toggle = dd.querySelector('.dropdown-toggle');
        toggle?.setAttribute('aria-expanded', 'false');
      });
    }
    function setupDropdown(btnId, dropdownId) {
      const btn = document.getElementById(btnId);
      const dropdown = document.getElementById(dropdownId);
      if (!btn || !dropdown) return;
  // Prevent clicks inside the dropdown from bubbling to the document handler
  dropdown.addEventListener('click', (e) => e.stopPropagation());
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isCurrentlyOpen = dropdown.classList.contains('open');
        closeAllDropdowns();
        const willOpen = !isCurrentlyOpen;
        dropdown.classList.toggle('open', willOpen);
        btn.setAttribute('aria-expanded', String(willOpen));
      });
    }
    setupDropdown('btn-quick-links', 'quick-links-dropdown');
    setupDropdown('btn-adhkar', 'adhkar-dropdown');
    document.addEventListener('click', () => closeAllDropdowns());
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAllDropdowns(); });

  // Floating Adhkar widget removed in favor of the Adhkar Counter widget

    // Panels: removed legacy panel toggles; dropdowns now manage visibility.
    document.querySelectorAll('.panel-close').forEach(b => b.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-close');
      const target = document.getElementById(id);
      toggle(target, false);
    }));

    // Ayah actions
    els.btnPrev?.addEventListener('click', async () => {
      if (!quran.total) return; state.index = (state.index - 1 + quran.total) % quran.total; await store.set({ deenTabLastIndex: state.index }); renderAyah();
    });
    els.btnNext?.addEventListener('click', async () => {
      if (!quran.total) return; state.index = (state.index + 1) % quran.total; await store.set({ deenTabLastIndex: state.index }); renderAyah();
    });
    els.btnPlay?.addEventListener('click', () => {
      if (!settings.tts) { toast('Audio is off'); return; }
      if (state.continuousMode) {
        // Stop continuous mode
        stopAllAudio();
      } else {
        // Start continuous mode
        state.continuousMode = true;
        updatePlayButtons();
        const idx = state.index; 
        const ar = quran.ar[idx]; 
        if (ar) speak(ar, true); // true indicates continuous mode
      }
    });
    els.btnCopy?.addEventListener('click', async () => {
  const { sura, aya, nameTn } = verseKeyFromIndex(state.index);
      const key = `${sura}:${aya}`;
      const ar = quran.ar[state.index] || '';
      const en = quran.enMap[key]?.t || '';
  const ref = `${nameTn} (${sura}:${aya})`;
      const text = `${ref}\n${ar}\n${settings.showTranslation && en ? en : ''}`.trim();
      try { await navigator.clipboard.writeText(text); toast('Copied'); } catch { toast('Copy failed'); }
    });
    els.btnNotes?.addEventListener('click', () => {
      settings.showTranslation = !settings.showTranslation;
      els.optTranslation && (els.optTranslation.checked = settings.showTranslation);
      renderAyah();
      store.set({ deenTabSettings: settings });
    });
    els.btnFav?.addEventListener('click', async () => {
      if (!quran.total) return;
  const { sura, aya, nameTn } = verseKeyFromIndex(state.index);
      const key = `${sura}:${aya}`;
      const ar = quran.ar[state.index] || '';
      const en = quran.enMap[key]?.t || '';
  const ref = `${nameTn} (${sura}:${aya})`;
      const exists = state.favorites.some(f => f.key === key);
      if (exists) {
        state.favorites = state.favorites.filter(f => f.key !== key);
        toast('Removed from favorites');
      } else {
        state.favorites.push({ key, ref, ar, en });
        toast('Added to favorites');
      }
      await store.set({ deenTabFavorites: state.favorites });
      renderAyah();
      renderFavorites();
    });

    // Quran fullscreen open/close
    const btnFs = document.getElementById('btn-ayah-fullscreen');
    const fsOverlay = document.getElementById('quran-fullscreen');
    const btnFsClose = document.getElementById('btn-close-quran-fullscreen');
    if (btnFs && fsOverlay) {
      btnFs.addEventListener('click', () => {
        const { sura, aya, nameTn } = verseKeyFromIndex(state.index);
        const key = `${sura}:${aya}`;
        const ar = quran.ar[state.index] || '';
        const en = quran.enMap[key]?.t || '';
        const fsAr = document.getElementById('fs-ayah-arabic');
        const fsTr = document.getElementById('fs-ayah-translation');
        const fsRef = document.getElementById('fs-ayah-ref');
        if (fsAr) fsAr.textContent = ar;
        if (fsTr) { fsTr.textContent = en; fsTr.hidden = !settings.showTranslation || !en; }
        if (fsRef) fsRef.textContent = `${nameTn} (${sura}:${aya})`;
        fsOverlay.classList.remove('hidden');
      });
    }
    if (btnFsClose && fsOverlay) {
      btnFsClose.addEventListener('click', () => fsOverlay.classList.add('hidden'));
    }
    // Close on backdrop click
    if (fsOverlay) {
      fsOverlay.addEventListener('click', (e) => {
        if (e.target === fsOverlay) fsOverlay.classList.add('hidden');
      });
    }
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && fsOverlay && !fsOverlay.classList.contains('hidden')) {
        fsOverlay.classList.add('hidden');
      }
    });

    // Favorites drawer
  els.btnFavorites?.addEventListener('click', () => toggle(els.drawerFavs, els.drawerFavs.classList.contains('hidden')));

    // Settings
  els.btnSettings?.addEventListener('click', async () => {
      if (els.optTabMode) els.optTabMode.value = settings.tabMode || 'deen';
      els.optTts.checked = !!settings.tts;
      els.optTranslation.checked = !!settings.showTranslation;
      els.optTicker.checked = !!settings.showTicker;
      els.optLocation.value = settings.location || '';
      if (els.optMethod) els.optMethod.value = String(settings.method ?? 3);
      if (els.optMadhab) els.optMadhab.value = String(settings.madhab ?? 0);
      if (els.optReciter) els.optReciter.value = settings.reciter || 'abdul_basit_murattal';
  if (els.optUiStyle) els.optUiStyle.value = settings.uiStyle || 'classic';
  if (els.optWidgetsLayout) els.optWidgetsLayout.value = settings.widgetsLayout || 'default';
      if (els.optBgStyle) els.optBgStyle.value = settings.bgStyle || 'default';
      if (els.optBgCustom) els.optBgCustom.value = settings.bgCustom || '#174a3c';
      // Show/hide background controls via parent class
      const bgField = els.optBgStyle?.closest('.field');
      if (bgField) {
        // Custom color visibility
        if (els.optBgStyle && els.optBgCustom) {
          els.optBgCustom.classList.toggle('hidden', els.optBgStyle.value !== 'custom');
        }
        // Image controls visibility and prefill
        if (els.optBgStyle && els.optBgImageUrl && els.optBgImageFile && els.btnClearBgImage) {
          const isImg = els.optBgStyle.value === 'image';
          bgField.classList.toggle('bg-image-controls', isImg);
          [els.optBgImageUrl, els.optBgImageFile, els.btnClearBgImage].forEach(el => el.classList.toggle('hidden', !isImg));
          if (isImg) {
            if (settings.bgImage === '__local__') {
              els.optBgImageUrl.value = '';
              els.optBgImageUrl.placeholder = 'Using uploaded image (saved locally)';
            } else {
              els.optBgImageUrl.value = settings.bgImage || '';
              els.optBgImageUrl.placeholder = 'https://example.com/wallpaper.jpg';
            }
          }
        }
      }
      toggle(els.modalSettings, true);
    });

    els.formSettings?.addEventListener('submit', async (e) => {
      e.preventDefault();
      settings.tabMode = els.optTabMode?.value || 'deen';
      settings.tts = !!els.optTts.checked;
      settings.showTranslation = !!els.optTranslation.checked;
      settings.showTicker = !!els.optTicker.checked;
      settings.location = (els.optLocation.value || '').trim();
      settings.method = Number(els.optMethod?.value ?? settings.method ?? 3) || 3;
      settings.madhab = Number(els.optMadhab?.value ?? settings.madhab ?? 0) || 0;
      settings.reciter = els.optReciter?.value || settings.reciter || 'abdul_basit_murattal';
  settings.uiStyle = els.optUiStyle?.value || 'classic';
  settings.widgetsLayout = els.optWidgetsLayout?.value || 'default';
      settings.bgStyle = els.optBgStyle?.value || 'default';
      if (settings.bgStyle === 'custom' && els.optBgCustom) {
        settings.bgCustom = els.optBgCustom.value || '#174a3c';
      }
      if (settings.bgStyle === 'image') {
        const url = (els.optBgImageUrl?.value || '').trim();
        if (url) {
          settings.bgImage = url;
          try { if (localStorage.getItem('deenTabBgImageLocal')) localStorage.removeItem('deenTabBgImageLocal'); } catch {}
        } else {
          try {
            const local = localStorage.getItem('deenTabBgImageLocal');
            settings.bgImage = local ? '__local__' : '';
          } catch {
            settings.bgImage = '';
          }
        }
      }
      await store.set({ deenTabSettings: settings });
      applySettingsToUI();
      // Refresh prayer times for new location
      fetchPrayerTimesIfNeeded();
      toggle(els.modalSettings, false);
      toast('Settings saved');
    });

    // Background live behaviors
    if (els.optBgStyle) {
      els.optBgStyle.addEventListener('change', () => {
        const v = els.optBgStyle.value;
        if (els.optBgCustom) els.optBgCustom.classList.toggle('hidden', v !== 'custom');
        const isImg = v === 'image';
        const bgField = els.optBgStyle?.closest('.field');
        if (bgField) bgField.classList.toggle('bg-image-controls', isImg);
        [els.optBgImageUrl, els.optBgImageFile, els.btnClearBgImage].forEach(el => el && el.classList.toggle('hidden', !isImg));
        if (isImg && els.optBgImageUrl) {
          if (settings.bgImage === '__local__') {
            els.optBgImageUrl.value = '';
            els.optBgImageUrl.placeholder = 'Using uploaded image (saved locally)';
          } else {
            els.optBgImageUrl.placeholder = 'https://example.com/wallpaper.jpg';
          }
        }
      });
    }
    if (els.optBgCustom) {
      els.optBgCustom.addEventListener('input', () => {
        if (els.optBgStyle?.value === 'custom') {
          document.body.style.setProperty('--bg-custom', els.optBgCustom.value);
        }
      });
    }
    if (els.optBgImageUrl) {
      els.optBgImageUrl.addEventListener('input', async () => {
        const url = (els.optBgImageUrl.value || '').trim();
        if (url) {
          settings.bgImage = url;
          try { if (localStorage.getItem('deenTabBgImageLocal')) localStorage.removeItem('deenTabBgImageLocal'); } catch {}
          document.body.style.setProperty('--bg-image', `url('${url}')`);
          await store.set({ deenTabSettings: settings });
        }
      });
    }
    if (els.optBgImageFile) {
      els.optBgImageFile.addEventListener('change', () => {
        const file = els.optBgImageFile.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
          const dataUrl = e.target?.result;
          if (typeof dataUrl === 'string') {
            try { localStorage.setItem('deenTabBgImageLocal', dataUrl); } catch {}
            settings.bgImage = '__local__';
            if (els.optBgImageUrl) {
              els.optBgImageUrl.value = '';
              els.optBgImageUrl.placeholder = 'Using uploaded image (saved locally)';
            }
            document.body.style.setProperty('--bg-image', `url('${dataUrl}')`);
            await store.set({ deenTabSettings: settings });
          }
        };
        reader.readAsDataURL(file);
      });
    }
    if (els.btnClearBgImage) {
      els.btnClearBgImage.addEventListener('click', async () => {
        settings.bgImage = '';
        if (els.optBgImageUrl) {
          els.optBgImageUrl.value = '';
          els.optBgImageUrl.placeholder = 'https://example.com/wallpaper.jpg';
        }
        try { localStorage.removeItem('deenTabBgImageLocal'); } catch {}
        document.body.style.removeProperty('--bg-image');
        await store.set({ deenTabSettings: settings });
      });
    }

    els.btnExport?.addEventListener('click', async () => {
      const data = { settings, favorites: state.favorites };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'deentab-export.json'; a.click(); URL.revokeObjectURL(url);
    });
    els.btnImport?.addEventListener('click', async () => {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'application/json';
      input.onchange = async () => {
        const file = input.files?.[0]; if (!file) return;
        try {
          const text = await file.text();
          const data = JSON.parse(text);
          settings = { ...settings, ...(data.settings || {}) };
          state.favorites = Array.isArray(data.favorites) ? data.favorites : state.favorites;
          await store.set({ deenTabSettings: settings, deenTabFavorites: state.favorites });
          applySettingsToUI(); renderFavorites(); toast('Imported');
        } catch { toast('Invalid file'); }
      };
      input.click();
    });
    els.btnClearFavs?.addEventListener('click', async () => {
      state.favorites = []; await store.set({ deenTabFavorites: [] }); renderFavorites(); toast('Favorites cleared');
    });

    els.btnSound?.addEventListener('click', () => {
      settings.tts = !settings.tts; store.set({ deenTabSettings: settings });
      els.btnSound.setAttribute('aria-pressed', String(settings.tts));
      if (!settings.tts) stopAllAudio();
      toast(settings.tts ? 'Audio on' : 'Audio off');
    });

  // Removed obsolete DeenTab popup open buttons and handlers

    els.btnLocation?.addEventListener('click', async () => {
      const name = prompt('Enter your city');
      if (name != null) {
        settings.location = name.trim();
        await store.set({ deenTabSettings: settings });
        applySettingsToUI();
        fetchPrayerTimesIfNeeded();
      }
    });

    // Prayer widget refresh
    document.getElementById('btn-refresh-prayer')?.addEventListener('click', async () => {
      // Bust today's cache
      const loc = (settings.location || '').trim();
      if (!loc) { toast('Set your location in Settings'); return; }
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      const key = `prayer:${loc}:${y}-${m}-${d}`;
      await store.set({ [key]: null });
      prayer.lastKey = ''; prayer.timings = null;
      await fetchPrayerTimesIfNeeded();
      toast('Prayer times refreshed');
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') els.btnNext?.click();
      else if (e.key === 'ArrowLeft') els.btnPrev?.click();
      else if (e.key === ' '){ e.preventDefault(); els.btnPlay?.click(); }
      else if ((e.key === 'f' || e.key === 'F') && e.altKey) { e.preventDefault(); els.btnFav?.click(); }
    });

    // Fullscreen action buttons mirror the main actions
    const mapFsToMain = [
      ['fs-btn-fav', 'btn-fav'],
      ['fs-btn-prev', 'btn-prev'],
      ['fs-btn-play', 'btn-play'],
      ['fs-btn-next', 'btn-next'],
      ['fs-btn-notes', 'btn-notes'],
      ['fs-btn-copy', 'btn-copy']
    ];
    mapFsToMain.forEach(([fsId, mainId]) => {
      const fsBtn = document.getElementById(fsId);
      const mainBtn = document.getElementById(mainId);
      if (fsBtn && mainBtn) fsBtn.addEventListener('click', () => mainBtn.click());
    });

    // Movable widgets (drag & drop between columns)
    initMovableWidgets();

    // Adhkar Counter widget
    initAdhkarCounter();
    
    // Adhkaar dropdown with authentic content
    initAdhkaarDropdown();
  }

  // Drag/drop positioning for movable widgets
  function initMovableWidgets() {
  const left = document.querySelector('.left-column');
  const center = document.querySelector('.center-column');
  const right = document.querySelector('.right-column');
  if (!left || !center || !right) return;

    // Attach drag handlers to widgets
    document.querySelectorAll('.movable-widget').forEach(w => {
      w.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', w.id);
        w.classList.add('dragging');
      });
      w.addEventListener('dragend', () => w.classList.remove('dragging'));
    });

  [left, center, right].forEach(zone => {
      zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drop-active'); });
      zone.addEventListener('dragleave', () => zone.classList.remove('drop-active'));
      zone.addEventListener('drop', (e) => {
        e.preventDefault(); zone.classList.remove('drop-active');
        const id = e.dataTransfer.getData('text/plain');
        const el = document.getElementById(id);
        if (el) {
          zone.appendChild(el);
          saveWidgetPositions();
        }
      });
    });

    // Apply saved layout
    applySavedWidgetPositions();
  }

  function saveWidgetPositions() {
  const left = Array.from(document.querySelectorAll('.left-column .movable-widget')).map(el => el.id);
  const center = Array.from(document.querySelectorAll('.center-column .movable-widget')).map(el => el.id);
  const right = Array.from(document.querySelectorAll('.right-column .movable-widget')).map(el => el.id);
  store.set({ deenTabWidgetPositions: { left, center, right } });
  }

  async function applySavedWidgetPositions() {
    const layout = await store.get('deenTabWidgetPositions', null);
  const leftCol = document.querySelector('.left-column');
  const centerCol = document.querySelector('.center-column');
  const rightCol = document.querySelector('.right-column');
  if (!layout || !leftCol || !centerCol || !rightCol) return;
  (layout.left || []).forEach(id => { const el = document.getElementById(id); if (el) leftCol.appendChild(el); });
  (layout.center || []).forEach(id => { const el = document.getElementById(id); if (el) centerCol.appendChild(el); });
  (layout.right || []).forEach(id => { const el = document.getElementById(id); if (el) rightCol.appendChild(el); });
  }

  // Enhanced Adhkar Counter logic with progress and celebration
  function initAdhkarCounter() {
    const phraseEl = document.getElementById('adhkar-phrase');
    const phraseArEl = document.getElementById('adhkar-phrase-ar');
    const countEl = document.getElementById('adhkar-count');
    const targetEl = document.getElementById('adhkar-target');
    const progressEl = document.getElementById('adhkar-progress');
    const presetSel = document.getElementById('adhkar-preset');
    const btnPlus = document.getElementById('adhkar-plus');
    const btnMinus = document.getElementById('adhkar-minus');
    const btnReset = document.getElementById('adhkar-reset');
    const btnClose = document.getElementById('adhkar-counter-close');
    if (!phraseEl || !countEl || !targetEl || !presetSel) return;

    const load = async () => {
      const saved = await store.get('deenTabAdhkarCounter', { 
        phraseAr: 'سُبْحَانَ اللَّهِ', 
        phrase: 'SubhanAllah', 
        target: 33, 
        count: 0 
      });
      updateUI(saved);
    };
    const save = (data) => store.set({ deenTabAdhkarCounter: data });

    function updateUI({ phraseAr, phrase, target, count }) {
      if (phraseArEl) phraseArEl.textContent = phraseAr || phrase;
      phraseEl.textContent = phrase;
      targetEl.textContent = `/${Number(target) || 0}`;
      countEl.textContent = String(Number(count) || 0);
      
      // Update progress bar
      const progress = target > 0 ? Math.min(100, (count / target) * 100) : 0;
      if (progressEl) progressEl.style.width = `${progress}%`;
      
      // Celebration animation when target reached
      if (count > 0 && count === target) {
        celebrateCompletion();
      }
      
      // Update preset select if matches known presets
      const val = `${phraseAr}|${phrase}|${target}`;
      const found = Array.from(presetSel.options).some(o => o.value === val);
      if (found) presetSel.value = val; else presetSel.value = 'Custom|Custom|0';
    }

    function celebrateCompletion() {
      // Visual celebration
      const widget = document.getElementById('adhkar-counter-widget');
      if (widget) {
        widget.style.animation = 'none';
        setTimeout(() => {
          widget.style.animation = 'celebrate 0.6s ease-out';
        }, 10);
      }
      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100, 50, 200]);
      }
      toast('🎉 Alhamdulillah! Target completed! 🎉', 3000);
    }

    presetSel.addEventListener('change', async () => {
      const parts = (presetSel.value || 'سُبْحَانَ اللَّهِ|SubhanAllah|33').split('|');
      let phraseAr = parts[0] || 'سُبْحَانَ اللَّهِ';
      let phrase = parts[1] || 'SubhanAllah';
      let target = parseInt(parts[2], 10) || 0;
      let count = 0;
      
      if (phrase === 'Custom') {
        const customPhraseAr = prompt('Enter Arabic dhikr (optional)', 'سُبْحَانَ اللَّهِ') || 'سُبْحَانَ اللَّهِ';
        const customPhrase = prompt('Enter transliteration', 'SubhanAllah') || 'SubhanAllah';
        const customTarget = parseInt(prompt('Target count', '33') || '33', 10) || 0;
        phraseAr = customPhraseAr;
        phrase = customPhrase;
        target = customTarget;
        count = 0;
      }
      const data = { phraseAr, phrase, target, count };
      updateUI(data);
      await store.set({ deenTabAdhkarCounter: data });
    });

    btnPlus?.addEventListener('click', async () => {
      const saved = await store.get('deenTabAdhkarCounter', { 
        phraseAr: 'سُبْحَانَ اللَّهِ', 
        phrase: 'SubhanAllah', 
        target: 33, 
        count: 0 
      });
      const next = { ...saved, count: (saved.count || 0) + 1 };
      updateUI(next);
      await save(next);
    });
    
    btnMinus?.addEventListener('click', async () => {
      const saved = await store.get('deenTabAdhkarCounter', { 
        phraseAr: 'سُبْحَانَ اللَّهِ', 
        phrase: 'SubhanAllah', 
        target: 33, 
        count: 0 
      });
      const next = { ...saved, count: Math.max(0, (saved.count || 0) - 1) };
      updateUI(next);
      await save(next);
    });
    
    btnReset?.addEventListener('click', async () => {
      const saved = await store.get('deenTabAdhkarCounter', { 
        phraseAr: 'سُبْحَانَ اللَّهِ', 
        phrase: 'SubhanAllah', 
        target: 33, 
        count: 0 
      });
      const next = { ...saved, count: 0 };
      updateUI(next);
      await save(next);
    });

    // Space bar shortcut for quick counting
    document.addEventListener('keydown', (e) => {
      const widget = document.getElementById('adhkar-counter-widget');
      if (widget && !widget.classList.contains('hidden') && e.code === 'Space' && !e.target.matches('input, textarea, select')) {
        e.preventDefault();
        btnPlus?.click();
      }
    });

    // Close button
    btnClose?.addEventListener('click', () => {
      const widget = document.getElementById('adhkar-counter-widget');
      if (widget) widget.style.display = 'none';
    });

    load();
  }

  // Initialize Adhkaar dropdown with authentic content
  function initAdhkaarDropdown() {
    if (!window.ADHKAAR_COLLECTION) return;
    
    const adhkarListContent = document.getElementById('adhkar-list-content');
    const categoryBtns = document.querySelectorAll('.adhkar-cat-btn');
    
    if (!adhkarListContent) return;

    // Render adhkaar by category
    function renderAdhkaar(category = 'general') {
      const adhkaar = window.ADHKAAR_COLLECTION[category] || [];
      adhkarListContent.innerHTML = '';
      
      if (adhkaar.length === 0) {
        adhkarListContent.innerHTML = '<div style="padding: 20px; text-align: center; color: rgba(255,255,255,0.6);">No adhkaar in this category</div>';
        return;
      }

      adhkaar.forEach(dhikr => {
        const item = document.createElement('div');
        item.className = 'adhkar-item';
        item.innerHTML = `
          <div class="adhkar-item-arabic">${dhikr.arabic}</div>
          <div class="adhkar-item-transliteration">${dhikr.transliteration}</div>
          <div class="adhkar-item-translation">${dhikr.translation}</div>
          <div class="adhkar-item-meta">
            <span class="adhkar-item-reference">${dhikr.reference}</span>
            <span class="adhkar-item-count">×${dhikr.count}</span>
          </div>
        `;
        adhkarListContent.appendChild(item);
      });
    }

    // Category button handlers
    categoryBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        categoryBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const category = btn.dataset.category;
        renderAdhkaar(category);
      });
    });

    // Initial render
    renderAdhkaar('general');
  }

  function applySettingsToUI() {
    const isMinimal = settings.tabMode === 'minimal';
    
    // Toggle body classes
    document.body.classList.toggle('tab-mode-minimal', isMinimal);
    document.body.classList.toggle('tab-mode-deen', !isMinimal);
    
    // Set Main title
    const mainTitleEl = document.querySelector('.main-title');
    if (mainTitleEl) {
      mainTitleEl.textContent = isMinimal ? '🛡️ Amn Shield' : '☪ DeenHub - Quran Home';
    }

    // Toggle specific elements
    const hijriEl = document.getElementById('hijri-date');
    if (hijriEl) hijriEl.classList.toggle('hidden', isMinimal);
    
    const adhkarDrop = document.getElementById('adhkar-dropdown');
    if (adhkarDrop) adhkarDrop.classList.toggle('hidden', isMinimal);

    const prayerWidget = document.getElementById('prayer-widget');
    if (prayerWidget) prayerWidget.classList.toggle('hidden', isMinimal);

    const dhikrWidget = document.getElementById('adhkar-counter-widget');
    if (dhikrWidget) dhikrWidget.classList.toggle('hidden', isMinimal);

    const ayahCard = document.getElementById('ayah-card');
    if (ayahCard) ayahCard.classList.toggle('hidden', isMinimal);

    // Custom Focus Card for Minimalist mode
    let focusCard = document.getElementById('focus-goal-card');
    if (isMinimal) {
      if (!focusCard) {
        focusCard = document.createElement('div');
        focusCard.id = 'focus-goal-card';
        focusCard.className = 'ayah-card card'; // inherit beautiful glass/card styles!
        focusCard.innerHTML = `
          <div class="focus-title" style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem; opacity: 0.85;">What is your main focus today?</div>
          <input type="text" id="focus-goal-input" placeholder="Type your daily goal and press Enter..." style="width: 100%; padding: 0.75rem; border: none; border-bottom: 2px solid rgba(255,255,255,0.2); background: transparent; color: inherit; text-align: center; font-size: 1.2rem; outline: none; transition: border-color 0.2s;" />
          <div id="focus-goal-display" class="hidden" style="font-size: 1.6rem; font-weight: 500; padding: 0.5rem 0; cursor: pointer; text-align: center; color: var(--islamic-gold, #d4af37);"></div>
        `;
        const centerCol = document.querySelector('.center-column');
        if (centerCol) {
          centerCol.appendChild(focusCard);
        }
        
        const input = focusCard.querySelector('#focus-goal-input');
        const display = focusCard.querySelector('#focus-goal-display');
        
        const saveGoal = (val) => {
          localStorage.setItem('amnShieldDailyFocusGoal', val);
          if (val) {
            display.textContent = val;
            display.classList.remove('hidden');
            input.classList.add('hidden');
          } else {
            display.classList.add('hidden');
            input.classList.remove('hidden');
            input.value = '';
            setTimeout(() => input.focus(), 50);
          }
        };

        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            saveGoal(input.value.trim());
          }
        });

        display.addEventListener('click', () => {
          saveGoal('');
        });

        const saved = localStorage.getItem('amnShieldDailyFocusGoal');
        if (saved) {
          saveGoal(saved);
        }
      } else {
        focusCard.classList.remove('hidden');
      }
    } else {
      if (focusCard) focusCard.classList.add('hidden');
    }

    const btnSound = document.getElementById('btn-sound');
    if (btnSound) btnSound.classList.toggle('hidden', isMinimal);

    const btnFavs = document.getElementById('btn-favorites');
    if (btnFavs) btnFavs.classList.toggle('hidden', isMinimal);
    
    // Toggle settings fields visibility based on mode
    const ttsToggle = els.optTts?.closest('.toggle');
    if (ttsToggle) ttsToggle.classList.toggle('hidden', isMinimal);
    
    const transToggle = els.optTranslation?.closest('.toggle');
    if (transToggle) transToggle.classList.toggle('hidden', isMinimal);
    
    const locationField = els.optLocation?.closest('.field');
    if (locationField) locationField.classList.toggle('hidden', isMinimal);
    
    const methodField = els.optMethod?.closest('.field');
    if (methodField) methodField.classList.toggle('hidden', isMinimal);

    const madhabField = els.optMadhab?.closest('.field');
    if (madhabField) madhabField.classList.toggle('hidden', isMinimal);

    const reciterField = els.optReciter?.closest('.field');
    if (reciterField) reciterField.classList.toggle('hidden', isMinimal);

    const widgetsField = els.optWidgetsLayout?.closest('.field');
    if (widgetsField) widgetsField.classList.toggle('hidden', isMinimal);

    toggle(els.ticker, !isMinimal && !!settings.showTicker);
    updateTicker();
    els.currentLocation.textContent = (!isMinimal && settings.location) ? `· ${settings.location}` : '';
    els.btnSound?.setAttribute('aria-pressed', String(!!settings.tts));
    document.body.classList.toggle('dark-mode', !!settings.isDark);
    
    document.body.classList.toggle('ui-liquid', settings.uiStyle === 'liquid');
    document.body.classList.toggle('ui-classic', settings.uiStyle !== 'liquid');
    document.body.classList.toggle('layout-quran-centered', !isMinimal && settings.widgetsLayout === 'quran-centered');
    
    document.body.classList.remove('bg-light', 'bg-dark', 'bg-custom', 'bg-pattern', 'bg-image');
    if (settings.bgStyle === 'light') document.body.classList.add('bg-light');
    else if (settings.bgStyle === 'dark') document.body.classList.add('bg-dark');
    else if (settings.bgStyle === 'custom') {
      document.body.classList.add('bg-custom');
      document.body.style.setProperty('--bg-custom', settings.bgCustom || '#174a3c');
    } else if (settings.bgStyle === 'pattern') document.body.classList.add('bg-pattern');
    else if (settings.bgStyle === 'image') {
      document.body.classList.add('bg-image');
      let img = settings.bgImage || '';
      if (img === '__local__') {
        try { img = localStorage.getItem('deenTabBgImageLocal') || ''; } catch {}
      }
      if (img) document.body.style.setProperty('--bg-image', `url('${img}')`);
      else document.body.style.removeProperty('--bg-image');
    } else document.body.style.setProperty('--bg-custom', settings.bgCustom || '#174a3c');
    
    if (els.optBgCustom) els.optBgCustom.value = settings.bgCustom || '#174a3c';
    const btnDarkmode = document.getElementById('btn-darkmode');
    if(btnDarkmode) {
      btnDarkmode.classList.toggle('active', !!settings.isDark);
      btnDarkmode.innerHTML = settings.isDark ? '&#9728;' : '&#9790;';
    }
    if (!isMinimal) {
      renderAyah();
    }
  }

  function indexFromKey(sura, aya) {
    const suraTable = window.QuranData?.Sura;
    if (!Array.isArray(suraTable) || !Number.isFinite(sura) || !Number.isFinite(aya)) return -1;
    const [start, ayas] = suraTable[sura] || [0, 0];
    if (!ayas || aya < 1 || aya > ayas) return -1;
    const idx = start + (aya - 1);
    if (quran.total && (idx < 0 || idx >= quran.total)) return -1;
    return idx;
  }

  async function loadQuranArabic() {
    try {
      const res = await fetch('Quran_Data/Quran.txt');
      const txt = await res.text();
      // Each line: sura|aya|text
      const lines = txt.split(/\r?\n/).filter(Boolean);
      // Pre-size array length from Metadata if available
      const suraTable = window.QuranData?.Sura;
      let total = 0;
      if (Array.isArray(suraTable) && suraTable.length > 2) {
        const lastIdx = suraTable.length - 2;
        const [start, ayas] = suraTable[lastIdx];
        total = start + ayas;
      }
      const ar = total ? new Array(total) : [];
      for (const line of lines) {
        const firstSep = line.indexOf('|');
        const secondSep = line.indexOf('|', firstSep + 1);
        if (firstSep === -1 || secondSep === -1) continue;
        const sura = parseInt(line.slice(0, firstSep), 10);
        const aya = parseInt(line.slice(firstSep + 1, secondSep), 10);
        const text = line.slice(secondSep + 1).trim();
        if (!Number.isFinite(sura) || !Number.isFinite(aya)) continue;
        const [start] = window.QuranData?.Sura?.[sura] || [0];
        const idx = start + (aya - 1);
        if (idx >= 0) ar[idx] = text;
      }
      // Remove any holes if total wasn't known
      const filled = ar.filter(v => typeof v === 'string');
      quran.ar = (total && filled.length === total) ? ar : filled;
      quran.total = quran.ar.length;
    } catch (e) {
      console.error('Failed loading Quran.txt', e);
    }
  }

  async function loadQuranEnglish() {
    try {
      const res = await fetch('Quran_Data/en-maulana-wahiduddin-khan-inline-footnotes.json');
      const json = await res.json();
      quran.enMap = json || {};
    } catch (e) {
      console.warn('Failed loading English translation JSON', e);
      quran.enMap = {};
    }
  }

  function migrateFavoritesShape(favs) {
    // Old shape: { ref, ar, en } without stable key. New shape adds key sura:aya.
    if (!Array.isArray(favs)) return [];
    return favs.map(item => {
      if (item && item.key) return item;
      // Try to parse sura:aya from ref like "Al-Baqara (2:19)" or "Al-Baqara 2:19"
      const m = (item?.ref || '').match(/\((\d+):(\d+)\)|\b(\d+):(\d+)\b/);
      const sura = parseInt(m?.[1] || m?.[3] || '1', 10);
      const aya = parseInt(m?.[2] || m?.[4] || '1', 10);
      const key = `${sura}:${aya}`;
      return { key, ref: item?.ref || key, ar: item?.ar || '', en: item?.en || '' };
    });
  }

  async function init() {
    // Load persisted settings and favorites
    const [s, favs, lastIdx] = await Promise.all([
      store.get('deenTabSettings', defaultSettings),
      store.get('deenTabFavorites', []),
      store.get('deenTabLastIndex', 0)
    ]);
    settings = { ...defaultSettings, ...(s || {}) };
    state.favorites = migrateFavoritesShape(Array.isArray(favs) ? favs : []);
    // Load Quran data in parallel
    await Promise.all([loadQuranArabic(), loadQuranEnglish()]);
    // Restore index and clamp within total
    state.index = Number.isFinite(lastIdx) ? lastIdx : 0;
    if (quran.total) state.index = ((state.index % quran.total) + quran.total) % quran.total;
    wire();
    applySettingsToUI();
    renderFavorites();
  // Initial prayer fetch
  fetchPrayerTimesIfNeeded();
  // Persist last-visited verse after initial render
  await store.set({ deenTabLastIndex: state.index });
    // Live apply changes coming from popup (storage sync)
    if (chrome?.storage?.onChanged?.addListener) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync' && changes.deenTabSettings) {
          settings = { ...settings, ...(changes.deenTabSettings.newValue || {}) };
          applySettingsToUI();
        }
      });
    }
    // Allow opening settings modal via URL param
    try {
      const sp = new URLSearchParams(location.search);
      if (sp.get('openSettings') === '1') {
        toggle(els.modalSettings, true);
      }
    } catch {}

    // React to settings changes from other extension surfaces (e.g., popup)
    try {
      chrome?.storage?.onChanged?.addListener?.((changes, area) => {
        if (area !== 'sync') return;
        if (changes.deenTabSettings) {
          const prev = changes.deenTabSettings.oldValue || {};
          const next = changes.deenTabSettings.newValue || {};
          settings = { ...settings, ...next };
          applySettingsToUI();
          // If prayer parameters changed, refresh widget
          if (prev.location !== next.location || prev.method !== next.method || prev.madhab !== next.madhab) {
            fetchPrayerTimesIfNeeded();
          }
        }
      });
    } catch {}

    // If opened with ?openSettings=1 from popup, show settings modal
    try {
      const params = new URLSearchParams(location.search);
      if (params.get('openSettings') === '1') {
        const btn = document.getElementById('btn-settings');
        if (btn) btn.click();
      }
    } catch {}
  }

  init();
})();
