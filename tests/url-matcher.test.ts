import assert from "assert";
import { matchKeyword, groupMatches } from "../src/lib/match";
import { parseLocation, domainMatches } from "../src/lib/url";

console.log("⏳ Bismillah - Running URL & Keyword Matcher Tests...");

// 1. Exact Domain Matching
{
  const loc = parseLocation("https://instagram.com/reels")!;
  assert.strictEqual(matchKeyword(loc, "instagram.com"), true, "Should match exact domain");
  assert.strictEqual(matchKeyword(loc, "www.instagram.com"), true, "Should match www normalized domain");
  assert.strictEqual(matchKeyword(loc, "facebook.com"), false, "Should not match different domain");
}

// 2. Subdomain & Wildcard Matching
{
  const loc = parseLocation("https://sub.m.youtube.com/watch")!;
  assert.strictEqual(matchKeyword(loc, "youtube.com"), true, "Should match root domain with subdomains");
  assert.strictEqual(matchKeyword(loc, "*.youtube.com"), true, "Should match wildcard subdomain");
  assert.strictEqual(matchKeyword(loc, "sub.*.youtube.com"), true, "Should match nested wildcard");
}

// 3. Path Matching
{
  const loc = parseLocation("https://youtube.com/shorts/12345")!;
  assert.strictEqual(matchKeyword(loc, "/shorts"), true, "Should match global path /shorts");
  assert.strictEqual(matchKeyword(loc, "youtube.com/shorts"), true, "Should match specific domain + path");
  assert.strictEqual(matchKeyword(loc, "tiktok.com/shorts"), false, "Should not match different domain with same path");
}

// 4. Regex Pattern Matching (r:...)
{
  const loc1 = parseLocation("https://tiktok.com/@user/video/123")!;
  const loc2 = parseLocation("https://instagram.com/reels/feed")!;
  const loc3 = parseLocation("https://wikipedia.org/wiki/Science")!;

  assert.strictEqual(matchKeyword(loc1, "r:shorts|reels|video"), true, "Regex should match video in path");
  assert.strictEqual(matchKeyword(loc2, "r:shorts|reels|video"), true, "Regex should match reels in path");
  assert.strictEqual(matchKeyword(loc3, "r:shorts|reels|video"), false, "Regex should not match unrelated page");
}

// 5. Word Matching in Domain
{
  const loc = parseLocation("https://some-casino-portal.com/games")!;
  assert.strictEqual(matchKeyword(loc, "casino-portal"), true, "Should match domain part");
}

// 6. Group Matching
{
  const loc = parseLocation("https://reddit.com/r/all")!;
  const blocklist = ["twitter.com", "reddit.com", "facebook.com"];
  const safelist = ["wikipedia.org", "khanacademy.org"];

  assert.strictEqual(groupMatches(loc, blocklist), true, "Should match list of domains");
  assert.strictEqual(groupMatches(loc, safelist), false, "Should not match safe domains");
}

console.log("🚀 Alhamdulillah - All URL & Keyword Matcher tests passed successfully!");
