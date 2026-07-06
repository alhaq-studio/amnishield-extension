(function(){
  try {
    // Prevent embedding in frames (since frame-ancestors in <meta> is ignored)
    if (window.top !== window.self) {
      try { window.top.location = window.location; } catch {}
    }
  } catch {}

  try {
    const v = (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getManifest === 'function')
      ? (chrome.runtime.getManifest().version || '')
      : (typeof browser !== 'undefined' && browser.runtime && typeof browser.runtime.getManifest === 'function')
        ? (browser.runtime.getManifest().version || '')
        : '';
    if (v) {
      const el = document.getElementById('ver');
      if (el) el.textContent = v;
    }
  } catch {}
})();
