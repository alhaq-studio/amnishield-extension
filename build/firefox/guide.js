// Browser compatibility
if (typeof browser === 'undefined') { var browser = chrome; }

// Display version
try {
  const manifest = chrome.runtime.getManifest();
  const verEl = document.getElementById('ver');
  if (verEl) {
    verEl.textContent = manifest.version || '-';
  }
} catch (e) {}

// Open settings function
window.openSettings = function() {
  try {
    const url = chrome.runtime.getURL('settings.html');
    window.open(url, '_blank');
  } catch (e) {
    alert('Please click the extension icon and select Settings');
  }
};

// Smooth scroll for anchor links
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
});
