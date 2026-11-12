import type { SiteLocation } from "../lib/url";
import { domainMatches } from "../lib/url";
import { groupMatches, matchKeyword } from "../lib/match";
import type {
  BlockDecision,
  BlockGroup,
  BlockReason,
  DayUsage,
  FocusSession,
  PolicyScheduleRule,
  ProceedRecord,
  ReelBlockerConfig,
  Settings,
  TimeRange,
  WarningScreen,
} from "../lib/types";
import {
  DEFAULT_HARMFUL_KEYWORDS,
  DEFAULT_ADULT_KEYWORDS,
  DEFAULT_ADULT_DOMAINS,
  DEFAULT_GAMBLING_DOMAINS,
  DEFAULT_GAMBLING_KEYWORDS,
  DEFAULT_SOCIAL_DOMAINS,
  DEFAULT_DATING_DOMAINS,
  DEFAULT_DATING_KEYWORDS,
} from "./blocklists";

export interface EvalInput {
  location: SiteLocation;
  settings: Settings;
  focus: FocusSession | null;
  todayUsage: DayUsage;
  weekday: number;
  nowMinutes: number;
  now: number;
  grants: Record<string, number>;
  proceeds: Record<string, ProceedRecord>;
  guardianDomains?: string[];
  socialPackActive?: boolean;
}

export const PASS: BlockDecision = {
  blocked: false,
  source: "group",
  groupId: "",
  groupName: "",
  reason: "",
  message: "",
  warning: null,
  canProceed: false,
  focusExitable: false,
};

function inRange(minutes: number, range: TimeRange): boolean {
  if (range.start <= range.end) return minutes >= range.start && minutes < range.end;
  return minutes >= range.start || minutes < range.end;
}

function focusBlocks(location: SiteLocation, focus: FocusSession): boolean {
  const listed = groupMatches(location, focus.domains);
  return focus.mode === "only-these" ? listed : !listed;
}

function blockReason(group: BlockGroup, todayUsage: DayUsage, weekday: number, nowMin: number): BlockReason {
  if (group.mode === "on-open") return "on-open";

  const cfg = group.schedule.days[weekday];
  if (!cfg || !cfg.active) return "";

  if (group.mode === "time") {
    const allowed = cfg.ranges.some((r) => inRange(nowMin, r));
    return allowed ? "" : "time";
  }

  const spent = sumGroupUsage(group.matchers, todayUsage);
  return spent >= cfg.limitMinutes * 60_000 ? "usage" : "";
}

function sumGroupUsage(matchers: string[], todayUsage: DayUsage): number {
  let total = 0;
  for (const [domain, du] of Object.entries(todayUsage)) {
    for (const [path, ms] of Object.entries(du.paths)) {
      if (groupMatches({ domain, path }, matchers)) total += ms;
    }
  }
  return total;
}

function canProceed(
  warning: WarningScreen,
  record: ProceedRecord | undefined,
  now: number,
  strictLocked: boolean,
): boolean {
  if (strictLocked) return false;
  if (warning.challenge === "never") return false;
  if (warning.proceedLimit <= 0) return true;
  if (!record) return true;
  const fresh = now - record.windowStart < warning.proceedWindowMinutes * 60_000;
  if (!fresh) return true;
  return record.count < warning.proceedLimit;
}

function defaultMessage(group: BlockGroup, reason: BlockReason): string {
  if (group.warning.customMessage.trim()) return group.warning.customMessage.trim();
  if (reason === "usage") return `You've used your time on ${group.name} today. Let's come back to it tomorrow.`;
  if (reason === "time") return `This is your quiet time away from ${group.name}. I'll keep it closed for now.`;
  return `Take a breath before you open ${group.name}.`;
}

let harmfulRegex: RegExp | null = null;
let adultRegex: RegExp | null = null;
let gamblingRegex: RegExp | null = null;
let datingRegex: RegExp | null = null;

const STRICT_BOUNDARIES = new Set(["anal", "oral", "jav", "xxx", "lust"]);

function buildRegex(keywords: string[]): RegExp {
  const parts = keywords.map((kw) => {
    if (STRICT_BOUNDARIES.has(kw)) {
      return `\\b${kw}\\b`;
    }
    return `\\b${kw}`;
  });
  return new RegExp(parts.join("|"), "i");
}

function getHarmfulRegex() {
  if (!harmfulRegex) {
    harmfulRegex = buildRegex(DEFAULT_HARMFUL_KEYWORDS);
  }
  return harmfulRegex;
}

function getAdultRegex() {
  if (!adultRegex) {
    adultRegex = buildRegex(DEFAULT_ADULT_KEYWORDS);
  }
  return adultRegex;
}

function getGamblingRegex() {
  if (!gamblingRegex) {
    gamblingRegex = buildRegex(DEFAULT_GAMBLING_KEYWORDS);
  }
  return gamblingRegex;
}

function getDatingRegex() {
  if (!datingRegex) {
    datingRegex = buildRegex(DEFAULT_DATING_KEYWORDS);
  }
  return datingRegex;
}

const STRING_DAY_MAP: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
};

/**
 * Normalizes `selectedDays` from PolicyPayload v2 (1=Sun..7=Sat) or fallback
 * 0-based (0=Sun..6=Sat) or string day names into JS weekday numbers (0=Sun..6=Sat).
 */
export function normalizeScheduleDays(selectedDays?: Array<number | string>): number[] {
  if (!Array.isArray(selectedDays) || selectedDays.length === 0) {
    return [0, 1, 2, 3, 4, 5, 6];
  }

  const numericValues: number[] = [];
  const resolvedDays = new Set<number>();

  for (const item of selectedDays) {
    if (typeof item === "string") {
      const clean = item.trim().toLowerCase();
      if (clean in STRING_DAY_MAP) {
        resolvedDays.add(STRING_DAY_MAP[clean]);
        continue;
      }
      const parsed = Number(clean);
      if (!Number.isNaN(parsed)) {
        numericValues.push(parsed);
      }
    } else if (typeof item === "number" && !Number.isNaN(item)) {
      numericValues.push(item);
    }
  }

  if (numericValues.length > 0) {
    // If 0 is present and 7 is not present, treat numeric values as 0-based (0=Sun..6=Sat)
    const isZeroBased = numericValues.includes(0) && !numericValues.includes(7);
    for (const n of numericValues) {
      if (isZeroBased) {
        if (n >= 0 && n <= 6) resolvedDays.add(n);
      } else {
        // Canonical PolicyPayload v2: 1=Sun .. 7=Sat
        if (n >= 1 && n <= 7) resolvedDays.add(n - 1);
        else if (n === 0) resolvedDays.add(0);
      }
    }
  }

  return resolvedDays.size > 0 ? Array.from(resolvedDays) : [0, 1, 2, 3, 4, 5, 6];
}

/**
 * Evaluates whether a PolicyPayload v2 schedule rule is active at the given JS weekday (0..6) and minute of day (0..1439).
 */
export function isPolicyScheduleActive(rule: PolicyScheduleRule, weekday: number, nowMinutes: number): boolean {
  if (!rule || !rule.isEnabled) return false;

  if (rule.recurrence !== "DAILY" && Array.isArray(rule.selectedDays) && rule.selectedDays.length > 0) {
    const activeDays = normalizeScheduleDays(rule.selectedDays);
    if (!activeDays.includes(weekday)) return false;
  }

  const start = Number(rule.startMinute ?? 0);
  const end = Number(rule.endMinute ?? 0);
  if (start === end) return true;
  if (start < end) {
    return nowMinutes >= start && nowMinutes < end;
  }
  // Overnight window (e.g. 22:00 to 06:00)
  return nowMinutes >= start || nowMinutes < end;
}

/**
 * Detects whether a URL location is a short-form video (Reels / Shorts / TikTok) target.
 */
export function isShortFormVideoLocation(
  location: SiteLocation,
  config?: Partial<ReelBlockerConfig>,
): boolean {
  const d = location.domain.toLowerCase();
  const p = (location.path || "/").toLowerCase();

  const checkYoutube = config ? Boolean(config.browser || config.youtube) : true;
  const checkInstagram = config ? Boolean(config.browser || config.instagram) : true;
  const checkTiktok = config ? Boolean(config.browser || config.tiktok) : true;
  const checkGenericBrowser = config ? Boolean(config.browser) : true;

  if (checkYoutube && (domainMatches(d, "youtube.com") || domainMatches(d, "youtu.be")) && p.startsWith("/shorts")) {
    return true;
  }
  if (checkInstagram && domainMatches(d, "instagram.com") && (p.startsWith("/reels") || p.startsWith("/reel/"))) {
    return true;
  }
  if (checkTiktok && domainMatches(d, "tiktok.com")) {
    return true;
  }
  if (checkGenericBrowser && (p.startsWith("/shorts") || p.startsWith("/reels") || p.startsWith("/reel/"))) {
    return true;
  }
  return false;
}

function sumShortFormUsage(todayUsage: DayUsage, config?: Partial<ReelBlockerConfig>): number {
  let total = 0;
  for (const [domain, du] of Object.entries(todayUsage)) {
    for (const [path, ms] of Object.entries(du.paths)) {
      if (isShortFormVideoLocation({ domain, path }, config)) {
        total += ms;
      }
    }
  }
  return total;
}

function matchesKeywordPolicy(location: SiteLocation, rawKeyword: string): boolean {
  const kw = rawKeyword.trim().toLowerCase();
  if (!kw) return false;
  if (matchKeyword(location, kw)) return true;
  const fullUrl = `${location.domain}${location.path}`.toLowerCase();
  const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^a-z0-9])${escaped}`, "i").test(fullUrl);
}

export function evaluate(input: EvalInput): BlockDecision {
  const {
    location,
    settings,
    focus,
    todayUsage,
    weekday,
    nowMinutes,
    now,
    grants,
    proceeds,
    guardianDomains,
    socialPackActive,
  } = input;

  const fullUrl = `${location.domain}${location.path}`;
  const isStrictLocked =
    Boolean(settings.strictMode) ||
    settings.allowUnblur === false ||
    (settings.focusModePolicy?.strictness ?? 0) >= 1 ||
    settings.focusModePolicy?.allow_early_stop === false;

  const categories = new Set(
    (settings.blockedCategories ?? []).map((c) => c.trim().toLowerCase()).filter(Boolean),
  );

  // Pre-evaluate active CHEAT schedules from PolicyPayload v2
  const schedules = Array.isArray(settings.policySchedules) ? settings.policySchedules : [];
  const activeSchedules = schedules.filter((r) => isPolicyScheduleActive(r, weekday, nowMinutes));
  const activeCheatSchedules = activeSchedules.filter((r) => r.type === "CHEAT");
  const activeBlockSchedules = activeSchedules.filter((r) => r.type !== "CHEAT");

  const hasWebsiteCheat = activeCheatSchedules.some((r) => {
    if (r.blockerType !== "WEBSITE") return false;
    const targets = [...(r.targetWebsites ?? []), ...(r.targets ?? [])].filter(Boolean);
    if (targets.length === 0 || targets.includes("all") || targets.includes("*")) return true;
    return groupMatches(location, targets);
  });

  const hasKeywordCheat = activeCheatSchedules.some((r) => {
    if (r.blockerType !== "KEYWORD") return false;
    const targets = [...(r.targetKeywords ?? []), ...(r.targets ?? [])].filter(Boolean);
    if (targets.length === 0 || targets.includes("all") || targets.includes("*")) return true;
    return targets.some((kw) => matchesKeywordPolicy(location, kw));
  });

  const hasReelsCheat = activeCheatSchedules.some((r) => r.blockerType === "REELS");

  // 0. Synced Windows Guardian & Cloud Blocked Domains (highest priority system block)
  if (!hasWebsiteCheat && guardianDomains && guardianDomains.length > 0) {
    const cleanDomain = location.domain.toLowerCase().replace(/^www\./, "");
    const isGuardianBlocked = guardianDomains.some((d) => {
      const cleanD = d.toLowerCase().trim().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
      return Boolean(cleanD) && (cleanDomain === cleanD || cleanDomain.endsWith("." + cleanD));
    });
    if (isGuardianBlocked) {
      return {
        blocked: true,
        source: "group",
        groupId: "guardian-policy",
        groupName: "AmniShield System Policy",
        reason: "on-open",
        message: `Blocked by AmniShield Policy (${location.domain}).`,
        warning: null,
        canProceed: false,
        focusExitable: false,
      };
    }
  }

  // 1. Adult/NSFW content protection (highest priority, cannot proceed/bypass)
  const enforceAdult = settings.adultContentEnabled || categories.has("adult") || categories.has("porn") || categories.has("nsfw");
  if (enforceAdult) {
    const isAdultDomain = DEFAULT_ADULT_DOMAINS.some(
      (d) => location.domain === d || location.domain.endsWith("." + d),
    );
    if (isAdultDomain || getAdultRegex().test(fullUrl)) {
      return {
        blocked: true,
        source: "group",
        groupId: "adult-content",
        groupName: "Adult/NSFW Content",
        reason: "on-open",
        message: "Blocked by AmniShield's Adult/NSFW Content Protection.",
        warning: null,
        canProceed: false,
        focusExitable: false,
      };
    }
  }

  // 2. Harmful content protection (gambling, interest, paganism, etc.)
  const enforceHarmful = settings.harmfulContentEnabled || categories.has("harmful");
  if (enforceHarmful) {
    if (getHarmfulRegex().test(fullUrl)) {
      return {
        blocked: true,
        source: "group",
        groupId: "harmful-content",
        groupName: "Harmful Content",
        reason: "on-open",
        message: "Blocked by AmniShield's Harmful Content Protection.",
        warning: null,
        canProceed: false,
        focusExitable: false,
      };
    }
  }

  // 2b. Additional PolicyPayload v2 Categories: gambling, dating, social, shorts
  if (categories.has("gambling")) {
    const isGamblingDomain = DEFAULT_GAMBLING_DOMAINS.some(
      (d) => location.domain === d || location.domain.endsWith("." + d),
    );
    if (isGamblingDomain || getGamblingRegex().test(fullUrl)) {
      return {
        blocked: true,
        source: "group",
        groupId: "category-gambling",
        groupName: "Gambling Category Block",
        reason: "on-open",
        message: "Blocked by AmniShield Gambling Category Protection.",
        warning: null,
        canProceed: false,
        focusExitable: false,
      };
    }
  }

  if (categories.has("dating")) {
    const isDatingDomain = DEFAULT_DATING_DOMAINS.some(
      (d) => location.domain === d || location.domain.endsWith("." + d),
    );
    if (isDatingDomain || getDatingRegex().test(fullUrl)) {
      return {
        blocked: true,
        source: "group",
        groupId: "category-dating",
        groupName: "Dating Category Block",
        reason: "on-open",
        message: "Blocked by AmniShield Dating Category Protection.",
        warning: null,
        canProceed: false,
        focusExitable: false,
      };
    }
  }

  if (!hasWebsiteCheat && (categories.has("social") || socialPackActive)) {
    const isSocialDomain = DEFAULT_SOCIAL_DOMAINS.some(
      (d) => location.domain === d || location.domain.endsWith("." + d),
    );
    if (isSocialDomain) {
      return {
        blocked: true,
        source: "group",
        groupId: "category-social",
        groupName: "Social Media Pack",
        reason: "on-open",
        message: `Blocked by AmniShield Social Media Protection (${location.domain}).`,
        warning: null,
        canProceed: false,
        focusExitable: false,
      };
    }
  }

  // 3. Dedicated Blocked Keywords (PolicyPayload v2 `blocked_keywords`, strictly separate from `blocked_domains`)
  if (!hasKeywordCheat && Array.isArray(settings.blockedKeywords) && settings.blockedKeywords.length > 0) {
    const matchedKw = settings.blockedKeywords.find((kw) => matchesKeywordPolicy(location, kw));
    if (matchedKw) {
      return {
        blocked: true,
        source: "group",
        groupId: "policy-keywords",
        groupName: "Keyword Filter Policy",
        reason: "on-open",
        message: `Blocked by AmniShield Keyword Policy ("${matchedKw}").`,
        warning: null,
        canProceed: false,
        focusExitable: false,
      };
    }
  }

  // 4. Short-Form Video / Reel Blocker (`reel_blocker` & `"shorts"` category)
  const reelCfg = settings.reelBlocker;
  const enforceReels =
    !hasReelsCheat &&
    (categories.has("shorts") ||
      categories.has("reels") ||
      (reelCfg?.enabled && (reelCfg.browser || reelCfg.youtube || reelCfg.instagram || reelCfg.tiktok)));

  if (enforceReels && isShortFormVideoLocation(location, reelCfg)) {
    if (reelCfg?.enabled && reelCfg.mode === 1 && (reelCfg.daily_limit_minutes ?? 0) > 0 && !categories.has("shorts")) {
      const spentMs = sumShortFormUsage(todayUsage, reelCfg);
      if (spentMs >= reelCfg.daily_limit_minutes * 60_000) {
        return {
          blocked: true,
          source: "group",
          groupId: "reel-blocker",
          groupName: "Short-Form Video Limit",
          reason: "usage",
          message: `You've reached your daily ${reelCfg.daily_limit_minutes}m limit for short-form videos today.`,
          warning: null,
          canProceed: false,
          focusExitable: false,
        };
      }
    } else {
      return {
        blocked: true,
        source: "group",
        groupId: "reel-blocker",
        groupName: "Short-Form Video Blocker",
        reason: "on-open",
        message: "Short-form videos (Reels, Shorts & TikTok) are blocked by AmniShield.",
        warning: null,
        canProceed: false,
        focusExitable: false,
      };
    }
  }

  // 5. PolicyPayload v2 Active Schedules (`WEBSITE`, `KEYWORD`, `REELS`, `FOCUS_MODE`)
  for (const sched of activeBlockSchedules) {
    if ((grants[sched.id] ?? 0) > now) continue;

    if (sched.blockerType === "FOCUS_MODE") {
      const targets = [...(sched.targetWebsites ?? []), ...(sched.targets ?? [])].filter(
        (t) => t && t !== "all" && t !== "*",
      );
      const whitelist = settings.focusModePolicy?.always_whitelisted_apps ?? [];
      const isWhitelisted = whitelist.length > 0 && groupMatches(location, whitelist);
      if (isWhitelisted) continue;

      const shouldBlock = targets.length > 0 ? groupMatches(location, targets) : true;
      if (shouldBlock) {
        return {
          blocked: true,
          source: "focus",
          groupId: sched.id || "scheduled-focus",
          groupName: sched.title || "Scheduled Focus Mode",
          reason: "focus",
          message: `Scheduled Focus Mode "${sched.title || "Focus"}" is active right now.`,
          warning: null,
          canProceed: false,
          focusExitable: !isStrictLocked,
        };
      }
    } else if (sched.blockerType === "REELS" && !hasReelsCheat) {
      if (isShortFormVideoLocation(location)) {
        return {
          blocked: true,
          source: "group",
          groupId: sched.id || "scheduled-reels",
          groupName: sched.title || "Scheduled Reels Block",
          reason: "time",
          message: `Short-form videos are paused during "${sched.title || "Scheduled Block"}".`,
          warning: null,
          canProceed: false,
          focusExitable: false,
        };
      }
    } else if (sched.blockerType === "WEBSITE" && !hasWebsiteCheat) {
      const targets = [...(sched.targetWebsites ?? []), ...(sched.targets ?? [])].filter(Boolean);
      const matchesAll = targets.includes("all") || targets.includes("*");
      if (matchesAll || groupMatches(location, targets)) {
        return {
          blocked: true,
          source: "group",
          groupId: sched.id || "scheduled-website",
          groupName: sched.title || "Scheduled Website Block",
          reason: "time",
          message: `${location.domain} is paused during "${sched.title || "Scheduled Block"}".`,
          warning: null,
          canProceed: false,
          focusExitable: false,
        };
      }
    } else if (sched.blockerType === "KEYWORD" && !hasKeywordCheat) {
      const targets = [...(sched.targetKeywords ?? []), ...(sched.targets ?? [])].filter(Boolean);
      const matchesAll =
        (targets.includes("all") || targets.includes("*")) &&
        (settings.blockedKeywords ?? []).some((kw) => matchesKeywordPolicy(location, kw));
      if (matchesAll || targets.some((kw) => matchesKeywordPolicy(location, kw))) {
        return {
          blocked: true,
          source: "group",
          groupId: sched.id || "scheduled-keyword",
          groupName: sched.title || "Scheduled Keyword Block",
          reason: "time",
          message: `Blocked by active schedule "${sched.title || "Scheduled Keyword Block"}".`,
          warning: null,
          canProceed: false,
          focusExitable: false,
        };
      }
    }
  }

  // 6. Active Manual Focus Session
  if (focus && focusBlocks(location, focus)) {
    return {
      blocked: true,
      source: "focus",
      groupId: focus.groupId,
      groupName: focus.name,
      reason: "focus",
      message: `I'm holding your focus right now. ${focus.name} stays paused until you're done.`,
      warning: null,
      canProceed: false,
      focusExitable: isStrictLocked ? false : focus.exitable,
    };
  }

  // 7. Local Extension Block Groups
  for (const group of settings.groups) {
    if (!group.enabled) continue;
    if (!groupMatches(location, group.matchers)) continue;

    const reason = blockReason(group, todayUsage, weekday, nowMinutes);
    if (!reason) continue;

    if (!isStrictLocked && (grants[group.id] ?? 0) > now) continue;

    return {
      blocked: true,
      source: "group",
      groupId: group.id,
      groupName: group.name,
      reason,
      message: defaultMessage(group, reason),
      warning: isStrictLocked ? { ...group.warning, challenge: "never" } : group.warning,
      canProceed: canProceed(group.warning, proceeds[group.id], now, isStrictLocked),
      focusExitable: false,
    };
  }

  return PASS;
}

// Exposed so the background can clear "on each open" grants on real navigations.
export function matchingOnOpenGroups(location: SiteLocation, settings: Settings): string[] {
  return settings.groups
    .filter((g) => g.enabled && g.mode === "on-open" && groupMatches(location, g.matchers))
    .map((g) => g.id);
}
