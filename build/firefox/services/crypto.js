// Lightweight crypto utilities for the popup (no external deps)
// Exposes window.cryptoService with async helpers
(function () {
  async function sha256Hex(input) {
    const enc = new TextEncoder();
    const data = enc.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function randomSalt(bytes = 16) {
    const arr = new Uint8Array(bytes);
    crypto.getRandomValues(arr);
    // Base64-url encode
    const b64 = btoa(String.fromCharCode(...arr));
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  async function hashWithSalt(value, salt) {
    return sha256Hex(`${salt}|${value}`);
  }

  function timingSafeEqual(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    if (a.length !== b.length) return false;
    let res = 0;
    for (let i = 0; i < a.length; i++) {
      res |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return res === 0;
  }

  window.cryptoService = { sha256Hex, randomSalt, hashWithSalt, timingSafeEqual };
})();
