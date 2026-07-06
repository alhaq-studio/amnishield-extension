(function(){
  try {
    const v = chrome?.runtime?.getManifest?.().version || browser?.runtime?.getManifest?.().version || '';
    if (v) {
      const el = document.getElementById('ver');
      if (el) el.textContent = v;
    }
  } catch {}
  const btn = document.getElementById('openSettings');
  if (btn) btn.addEventListener('click', () => {
    try {
      const url = chrome.runtime.getURL('settings.html');
      if (chrome?.windows?.create) chrome.windows.create({ url, type: 'popup', width: 520, height: 740 });
      else window.open(url, '_blank', 'width=520,height=740');
    } catch { window.open('settings.html', '_blank'); }
  });
})();
