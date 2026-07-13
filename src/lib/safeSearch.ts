export const SAFE_SEARCH_TARGETS = [
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
  }
];

export function getSafeSearchRedirect(rawUrl: string, safeSearchEnabled: boolean): string | null {
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
