import assert from "assert";
import { evaluate } from "../src/core/blocker";
import { parseLocation } from "../src/lib/url";
import { getSafeSearchRedirect } from "../src/lib/safeSearch";
import type { Settings } from "../src/lib/types";

// Helper to create empty settings
const createBaseSettings = (custom: Partial<Settings> = {}): Settings => ({
  groups: [],
  focusGroups: [],
  harmfulContentEnabled: false,
  adultContentEnabled: false,
  safeSearchEnabled: false,
  ...custom
});

// Helper for standard test inputs
const baseEvalInput = (url: string, settings: Settings) => {
  const loc = parseLocation(url);
  if (!loc) throw new Error(`Invalid test URL: ${url}`);
  return {
    location: loc,
    settings,
    focus: null,
    todayUsage: {},
    weekday: 1,
    nowMinutes: 600,
    now: Date.now(),
    grants: {},
    proceeds: {}
  };
};

console.log("⏳ Bismillah - Running Content Blocker Tests...");

// -------------------------------------------------------------
// 1. ADULT CONTENT BLOCKER TESTS
// -------------------------------------------------------------
console.log("Testing Adult/NSFW Content Blocker...");
{
  const settingsEnabled = createBaseSettings({ adultContentEnabled: true });
  const settingsDisabled = createBaseSettings({ adultContentEnabled: false });

  // Domain checks
  const p1 = evaluate(baseEvalInput("https://pornhub.com", settingsEnabled));
  assert.strictEqual(p1.blocked, true, "pornhub.com should be blocked");
  assert.strictEqual(p1.groupId, "adult-content", "Blocked group should be adult-content");
  assert.strictEqual(p1.canProceed, false, "Should not be able to bypass adult block");

  const p2 = evaluate(baseEvalInput("https://pornhub.com", settingsDisabled));
  assert.strictEqual(p2.blocked, false, "pornhub.com should pass if adult blocker is disabled");

  // Newly expanded domain checks
  assert.strictEqual(evaluate(baseEvalInput("https://stripchat.com", settingsEnabled)).blocked, true, "stripchat.com should be blocked");
  assert.strictEqual(evaluate(baseEvalInput("https://nhentai.net", settingsEnabled)).blocked, true, "nhentai.net should be blocked");
  assert.strictEqual(evaluate(baseEvalInput("https://fansly.com", settingsEnabled)).blocked, true, "fansly.com should be blocked");

  // Keyword checks (e.g. "xxx" or "porn" in path/subdomain)
  const p3 = evaluate(baseEvalInput("https://some-clean-domain.com/nude-photos", settingsEnabled));
  assert.strictEqual(p3.blocked, true, "URL with adult keyword in path should be blocked");
  
  const p4 = evaluate(baseEvalInput("https://clean-site.com", settingsEnabled));
  assert.strictEqual(p4.blocked, false, "Clean site should not be blocked");
}

// -------------------------------------------------------------
// 2. HARMFUL CONTENT BLOCKER TESTS
// -------------------------------------------------------------
console.log("Testing Harmful Content Blocker...");
{
  const settingsEnabled = createBaseSettings({ harmfulContentEnabled: true });
  const settingsDisabled = createBaseSettings({ harmfulContentEnabled: false });

  // Harmful keyword checks (gambling, interest/riba, liquor, paganism)
  const h1 = evaluate(baseEvalInput("https://casino-online.com", settingsEnabled));
  assert.strictEqual(h1.blocked, true, "casino-online.com should be blocked");
  assert.strictEqual(h1.groupId, "harmful-content", "Blocked group should be harmful-content");
  assert.strictEqual(h1.canProceed, false, "Should not be able to bypass harmful content");

  const h2 = evaluate(baseEvalInput("https://casino-online.com", settingsDisabled));
  assert.strictEqual(h2.blocked, false, "casino should pass if harmful blocker is disabled");

  const h3 = evaluate(baseEvalInput("https://some-interest-bank.com/riba", settingsEnabled));
  assert.strictEqual(h3.blocked, true, "riba keyword in path should be blocked");

  const h4 = evaluate(baseEvalInput("https://horoscopes-weekly.com", settingsEnabled));
  assert.strictEqual(h4.blocked, true, "horoscope should be blocked");

  const h5 = evaluate(baseEvalInput("https://halal-investing-guide.com", settingsEnabled));
  assert.strictEqual(h5.blocked, false, "Clean halal investing site should pass");
}

// -------------------------------------------------------------
// 3. STRICT SAFE SEARCH TESTS
// -------------------------------------------------------------
console.log("Testing Strict Safe Search Redirects...");
{
  // Google
  const g1 = getSafeSearchRedirect("https://www.google.com/search?q=islam", true);
  assert.ok(g1?.includes("safe=active"), "Google search should append safe=active");
  assert.ok(g1?.includes("ssui=on"), "Google search should append ssui=on");

  // Google already safe
  const g2 = getSafeSearchRedirect("https://www.google.com/search?q=islam&safe=active&ssui=on", true);
  assert.strictEqual(g2, null, "Google search should not redirect if already safe");

  // Bing
  const b1 = getSafeSearchRedirect("https://www.bing.com/search?q=quran", true);
  assert.ok(b1?.includes("adlt=strict"), "Bing search should append adlt=strict");

  // DuckDuckGo
  const d1 = getSafeSearchRedirect("https://duckduckgo.com/?q=hadith", true);
  assert.ok(d1?.includes("kp=1"), "DuckDuckGo search should append kp=1");

  // Yahoo
  const y1 = getSafeSearchRedirect("https://search.yahoo.com/search?p=prayer", true);
  assert.ok(y1?.includes("vm=r"), "Yahoo search should append vm=r");

  // Safe search disabled
  const disabled = getSafeSearchRedirect("https://www.google.com/search?q=islam", false);
  assert.strictEqual(disabled, null, "Should not redirect if safe search is disabled");
}

console.log("🚀 Alhamdulillah - All Content Blocker and Safe Search tests passed successfully!");
