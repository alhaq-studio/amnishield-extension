import type { SiteLocation } from "../lib/url";
import { groupMatches } from "../lib/match";
import type {
  BlockDecision,
  BlockGroup,
  BlockReason,
  DayUsage,
  FocusSession,
  ProceedRecord,
  Settings,
  TimeRange,
  WarningScreen,
} from "../lib/types";

interface EvalInput {
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

function canProceed(warning: WarningScreen, record: ProceedRecord | undefined, now: number): boolean {
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

import { DEFAULT_HARMFUL_KEYWORDS, DEFAULT_ADULT_KEYWORDS, DEFAULT_ADULT_DOMAINS } from "./blocklists";

let harmfulRegex: RegExp | null = null;
let adultRegex: RegExp | null = null;

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

export function evaluate(input: EvalInput): BlockDecision {
  const { location, settings, focus, todayUsage, weekday, nowMinutes, now, grants, proceeds, guardianDomains } = input;

  const fullUrl = `${location.domain}${location.path}`;

  // 0. Synced Windows Guardian domains (highest priority system block)
  if (guardianDomains && guardianDomains.length > 0) {
    const cleanDomain = location.domain.toLowerCase().replace(/^www\./, "");
    const isGuardianBlocked = guardianDomains.some((d) => {
      const cleanD = d.toLowerCase().replace(/^www\./, "");
      return cleanDomain === cleanD || cleanDomain.endsWith("." + cleanD);
    });
    if (isGuardianBlocked) {
      return {
        blocked: true,
        source: "group",
        groupId: "guardian-policy",
        groupName: "AmniShield System Policy",
        reason: "on-open",
        message: `Blocked by AmniShield Guardian Policy (${location.domain}).`,
        warning: null,
        canProceed: false,
        focusExitable: false,
      };
    }
  }

  // 1. Adult/NSFW content protection (highest priority, cannot proceed/bypass)
  if (settings.adultContentEnabled) {
    const isAdultDomain = DEFAULT_ADULT_DOMAINS.some((d) =>
      location.domain === d || location.domain.endsWith("." + d)
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
  if (settings.harmfulContentEnabled) {
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
      focusExitable: focus.exitable,
    };
  }

  for (const group of settings.groups) {
    if (!group.enabled) continue;
    if (!groupMatches(location, group.matchers)) continue;

    const reason = blockReason(group, todayUsage, weekday, nowMinutes);
    if (!reason) continue;

    if ((grants[group.id] ?? 0) > now) continue;

    return {
      blocked: true,
      source: "group",
      groupId: group.id,
      groupName: group.name,
      reason,
      message: defaultMessage(group, reason),
      warning: group.warning,
      canProceed: canProceed(group.warning, proceeds[group.id], now),
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
