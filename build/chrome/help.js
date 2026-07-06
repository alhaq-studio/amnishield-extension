(function(){
  try {
    var v = '';
    if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getManifest === 'function') {
      v = chrome.runtime.getManifest().version || '';
    } else if (typeof browser !== 'undefined' && browser.runtime && typeof browser.runtime.getManifest === 'function') {
      v = browser.runtime.getManifest().version || '';
    }
    if (v) {
      var el = document.getElementById('ver');
      if (el) el.textContent = v;
    }
  } catch (e) {
    // swallow
  }
})();
