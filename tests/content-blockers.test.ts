import assert from "assert";
import { evaluate, isPolicyScheduleActive, normalizeScheduleDays } from "../src/core/blocker";
import { parseLocation } from "../src/lib/url";
import { getSafeSearchRedirect } from "../src/lib/safeSearch";
import { defaultReelBlocker, newGroup, type PolicyScheduleRule, type Settings } from "../src/lib/types";

// Helper to create empty settings
const createBaseSettings = (custom: Partial<Settings> = {}): Settings => ({
  groups: [],
  focusGroups: [],
  harmfulContentEnabled: false,
  adultContentEnabled: false,
  safeSearchEnabled: false,
  ...custom,
});

// Helper for standard test inputs
const baseEvalInput = (url: string, settings: Settings, overrides: Record<string, any> = {}) => {
  const loc = parseLocation(url);
  if (!loc) throw new Error(`Invalid test URL: ${url}`);
  return {
    location: loc,
    settings,
    focus: null,
    todayUsage: {},
    weekday: 1, // Monday in JS (0=Sun, 1=Mon)
    nowMinutes: 600, // 10:00 AM
    now: Date.now(),
    grants: {},
    proceeds: {},
    ...overrides,
  };
};

console.log("Bismillah - Running Content Blocker & PolicyPayload v2 Tests...");

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
  assert.strictEqual(
    evaluate(baseEvalInput("https://stripchat.com", settingsEnabled)).blocked,
    true,
    "stripchat.com should be blocked",
  );
  assert.strictEqual(
    evaluate(baseEvalInput("https://nhentai.net", settingsEnabled)).blocked,
    true,
    "nhentai.net should be blocked",
  );
  assert.strictEqual(
    evaluate(baseEvalInput("https://fansly.com", settingsEnabled)).blocked,
    true,
    "fansly.com should be blocked",
  );

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

// -------------------------------------------------------------
// 4. POLICY PAYLOAD V2: DOMAIN vs KEYWORD vs CATEGORY SEPARATION
// -------------------------------------------------------------
console.log("Testing PolicyPayload v2 Domain, Keyword & Category separation...");
{
  const kwSettings = createBaseSettings({
    blockedKeywords: ["lootbox", "crypto-bet"],
    blockedCategories: ["gambling", "dating"],
  });

  const kwRes = evaluate(baseEvalInput("https://games.example.com/shop/lootbox-deals", kwSettings));
  assert.strictEqual(kwRes.blocked, true, "blockedKeywords should block matching URL path");
  assert.strictEqual(kwRes.groupId, "policy-keywords", "Should identify policy-keywords group");

  const catGambling = evaluate(baseEvalInput("https://draftkings.com", kwSettings));
  assert.strictEqual(catGambling.blocked, true, "gambling category should block draftkings.com");
  assert.strictEqual(catGambling.groupId, "category-gambling");

  const catDating = evaluate(baseEvalInput("https://tinder.com", kwSettings));
  assert.strictEqual(catDating.blocked, true, "dating category should block tinder.com");
  assert.strictEqual(catDating.groupId, "category-dating");
}

// -------------------------------------------------------------
// 5. POLICY PAYLOAD V2: SHORT-FORM VIDEO (REEL BLOCKER) & STRICT MODE
// -------------------------------------------------------------
console.log("Testing Short-Form Video (Reel Blocker) & Strict Mode...");
{
  const reelImmediate = createBaseSettings({
    reelBlocker: {
      ...defaultReelBlocker(),
      enabled: true,
      mode: 0,
      browser: true,
    },
  });

  assert.strictEqual(
    evaluate(baseEvalInput("https://www.youtube.com/shorts/abc123", reelImmediate)).blocked,
    true,
    "YouTube Shorts should be blocked when reelBlocker is enabled",
  );
  assert.strictEqual(
    evaluate(baseEvalInput("https://www.youtube.com/watch?v=abc123", reelImmediate)).blocked,
    false,
    "Normal YouTube watch videos should NOT be blocked by reelBlocker",
  );
  assert.strictEqual(
    evaluate(baseEvalInput("https://www.instagram.com/reels/xyz", reelImmediate)).blocked,
    true,
    "Instagram Reels should be blocked when reelBlocker is enabled",
  );
  assert.strictEqual(
    evaluate(baseEvalInput("https://www.tiktok.com/@creator/video/123", reelImmediate)).blocked,
    true,
    "TikTok should be blocked when reelBlocker is enabled",
  );

  // Strict Mode & allowUnblur = false
  const g = newGroup("Distractions");
  g.mode = "on-open";
  g.matchers = ["news.ycombinator.com"];
  const strictSettings = createBaseSettings({
    groups: [g],
    strictMode: true,
    allowUnblur: false,
  });
  const strictDecision = evaluate(baseEvalInput("https://news.ycombinator.com", strictSettings));
  assert.strictEqual(strictDecision.blocked, true);
  assert.strictEqual(strictDecision.canProceed, false, "Strict mode should disallow proceeding past warning screen");
}

// -------------------------------------------------------------
// 6. POLICY PAYLOAD V2: SCHEDULES (1=Sun..7=Sat, 0-based & string fallback, CHEAT vs BLOCK)
// -------------------------------------------------------------
console.log("Testing PolicyPayload v2 Multi-Blocker Schedules...");
{
  // 1=Sun..7=Sat: [2, 3, 4, 5, 6] => Mon..Fri => JS days [1, 2, 3, 4, 5]
  assert.deepStrictEqual(normalizeScheduleDays([2, 3, 4, 5, 6]).sort(), [1, 2, 3, 4, 5]);
  // 0-based fallback when 0 is present: [0, 6] => Sun, Sat => JS days [0, 6]
  assert.deepStrictEqual(normalizeScheduleDays([0, 6]).sort(), [0, 6]);
  // String day names fallback
  assert.deepStrictEqual(normalizeScheduleDays(["MON", "WED", "FRI"]).sort(), [1, 3, 5]);

  const workSchedule: PolicyScheduleRule = {
    id: "sched-work-web",
    groupId: "work",
    title: "Deep Work Website Block",
    blockerType: "WEBSITE",
    targets: [],
    targetWebsites: ["reddit.com", "twitter.com"],
    targetKeywords: [],
    type: "BLOCK",
    recurrence: "WEEKLY",
    startMinute: 9 * 60, // 540 (09:00)
    endMinute: 17 * 60, // 1020 (17:00)
    selectedDays: [2, 3, 4, 5, 6], // Mon..Fri (1=Sun..7=Sat)
    isEnabled: true,
  };

  assert.strictEqual(isPolicyScheduleActive(workSchedule, 1, 600), true, "Active on Monday at 10:00");
  assert.strictEqual(isPolicyScheduleActive(workSchedule, 0, 600), false, "Inactive on Sunday at 10:00");
  assert.strictEqual(isPolicyScheduleActive(workSchedule, 1, 1100), false, "Inactive on Monday at 18:20");

  const schedSettings = createBaseSettings({
    policySchedules: [workSchedule],
  });

  const blockedDuringWork = evaluate(baseEvalInput("https://reddit.com/r/programming", schedSettings, { weekday: 1, nowMinutes: 600 }));
  assert.strictEqual(blockedDuringWork.blocked, true, "reddit.com should be blocked during active schedule");
  assert.strictEqual(blockedDuringWork.groupId, "sched-work-web");

  const allowedOnSunday = evaluate(baseEvalInput("https://reddit.com/r/programming", schedSettings, { weekday: 0, nowMinutes: 600 }));
  assert.strictEqual(allowedOnSunday.blocked, false, "reddit.com should pass on Sunday outside schedule");

  // CHEAT schedule overrides BLOCK schedule during cheat window
  const lunchCheat: PolicyScheduleRule = {
    id: "sched-lunch-cheat",
    title: "Lunch Break",
    blockerType: "WEBSITE",
    targets: ["reddit.com"],
    targetWebsites: ["reddit.com"],
    targetKeywords: [],
    type: "CHEAT",
    recurrence: "WEEKLY",
    startMinute: 12 * 60, // 720 (12:00)
    endMinute: 13 * 60, // 780 (13:00)
    selectedDays: [2, 3, 4, 5, 6],
    isEnabled: true,
  };

  const cheatSettings = createBaseSettings({
    policySchedules: [workSchedule, lunchCheat],
  });
  const allowedDuringLunch = evaluate(baseEvalInput("https://reddit.com/r/programming", cheatSettings, { weekday: 1, nowMinutes: 750 }));
  assert.strictEqual(allowedDuringLunch.blocked, false, "CHEAT schedule should allow reddit.com during lunch window");
}

// -------------------------------------------------------------
// 7. CLOUD SYNC: MERGE vs FORCE_REPLACE, SNAPSHOT BACKUP/RESTORE & V1/V2 SCHEDULES
// -------------------------------------------------------------
console.log("Testing CloudSync PolicyPayload v2 MERGE, FORCE_REPLACE & Pre-Sync Snapshot...");
await (async () => {
  const mod = await import("node:module");
  if (typeof mod.registerHooks === "function") {
    const mockBrowserCode = `
      const store = {};
      export const browser = {
        storage: {
          local: {
            async get(key) { return typeof key === "string" ? { [key]: store[key] } : { ...store }; },
            async set(obj) { Object.assign(store, obj); }
          },
          onChanged: { addListener() {}, removeListener() {} }
        }
      };
    `;
    mod.registerHooks({
      resolve(specifier, context, nextResolve) {
        if (specifier === "#imports") {
          return {
            url: "data:text/javascript," + encodeURIComponent(mockBrowserCode),
            shortCircuit: true,
          };
        }
        return nextResolve(specifier, context);
      },
    });
  }

  const {
    applyPolicyPayload,
    exportLocalPolicyPayload,
    getPreSyncRuleSnapshot,
    parsePolicySchedules,
    restorePreSyncRuleSnapshot,
  } = await import("../src/lib/cloudSync");
  const { get, set } = await import("../src/lib/storage");

  // Seed initial local rules
  await set("blockedDomains", ["local-only.com"]);
  const s0 = await get("settings");
  await set("settings", { ...s0, blockedKeywords: ["local-kw"] });

  // Test MERGE mode
  const mergeSummary = await applyPolicyPayload(
    {
      schema_version: 2,
      blocked_domains: ["remote.com"],
      blocked_keywords: ["remote-kw"],
      blocked_categories: ["adult", "gambling"],
      strict_mode: true,
      allow_unblur: false,
      reel_blocker: {
        enabled: true,
        mode: 0,
        daily_limit_minutes: 20,
        youtube: true,
        instagram: true,
        tiktok: true,
        browser: true,
      },
      schedules: [
        {
          id: "s1",
          groupId: "g1",
          title: "Study",
          blockerType: "WEBSITE",
          targets: [],
          targetWebsites: ["reddit.com"],
          targetKeywords: [],
          type: "BLOCK",
          recurrence: "WEEKLY",
          startMinute: 540,
          endMinute: 1020,
          selectedDays: [2, 3, 4, 5, 6],
          isEnabled: true,
        },
      ],
    },
    "MERGE",
  );

  assert.strictEqual(mergeSummary.success, true);
  assert.deepStrictEqual((await get("blockedDomains")).sort(), ["local-only.com", "remote.com"]);
  assert.deepStrictEqual(((await get("settings")).blockedKeywords ?? []).sort(), ["local-kw", "remote-kw"]);
  assert.strictEqual((await get("settings")).strictMode, true);
  assert.strictEqual((await get("settings")).allowUnblur, false);

  // Legacy v1 schedule parsing check
  const v1Enabled = parsePolicySchedules({ enabled: true, start: "08:30", end: "16:00", days: [2, 3, 4, 5, 6] });
  assert.strictEqual(v1Enabled.rules.length, 1);
  assert.strictEqual(v1Enabled.rules[0].id, "cloud_sync_schedule");
  assert.strictEqual(v1Enabled.rules[0].startMinute, 510);

  const v1Disabled = parsePolicySchedules({ enabled: false });
  assert.strictEqual(v1Disabled.isV1Disabled, true);

  // Test FORCE_REPLACE mode (saves snapshot first and replaces local rules)
  const forceSummary = await applyPolicyPayload(
    {
      schema_version: 2,
      blocked_domains: ["forced-only.com"],
      blocked_keywords: ["forced-kw"],
      blocked_categories: ["harmful"],
      strict_mode: false,
      allow_unblur: true,
      schedules: { enabled: false },
    },
    "FORCE_REPLACE",
  );

  assert.strictEqual(forceSummary.success, true);
  assert.deepStrictEqual(await get("blockedDomains"), ["forced-only.com"]);
  assert.deepStrictEqual((await get("settings")).blockedKeywords, ["forced-kw"]);
  const snap = await getPreSyncRuleSnapshot();
  assert.ok(snap && snap.timestamp > 0, "Pre-sync snapshot should be created before FORCE_REPLACE");

  // Restore snapshot
  const restored = await restorePreSyncRuleSnapshot();
  assert.strictEqual(restored, true, "Should restore pre-sync snapshot");
  assert.deepStrictEqual((await get("blockedDomains")).sort(), ["local-only.com", "remote.com"]);

  // Export canonical PolicyPayload v2
  const exported = await exportLocalPolicyPayload();
  assert.strictEqual(exported.schema_version, 2);
  assert.ok(exported.blocked_domains?.includes("remote.com"));
  assert.ok(exported.blocked_keywords?.includes("remote-kw"));
})();

console.log("Alhamdulillah - All Content Blocker, Safe Search & PolicyPayload v2 tests passed successfully!");
