import { get, set, type CloudAuthSession } from "./storage";
import {
  defaultFocusModePolicy,
  defaultReelBlocker,
  type LegacyScheduleObject,
  type PolicyPayloadV2,
  type PolicyScheduleRule,
  type PreSyncRuleSnapshot,
  type Settings,
  type UserProfileConfig,
} from "./types";
import { normalizeScheduleDays } from "../core/blocker";
import { activateLicenseKey } from "./license";

export const SUPABASE_URL = "https://jrgpmcomvibgklmvnxud.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyZ3BtY29tdmliZ2tsbXZueHVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4NzE0MjQsImV4cCI6MjA5OTQ0NzQyNH0.JvPyt8ye2OCBsLXMBUoIOXUz1E5UHDHOY55oDH6Ce10";

export type ApplyMode = "MERGE" | "FORCE_REPLACE";

export type CloudPolicyPayload = PolicyPayloadV2;

export interface SyncSummary {
  success: boolean;
  mode: ApplyMode;
  source: "device" | "account" | "cache" | "none";
  domainsCount: number;
  keywordsCount: number;
  categoriesCount: number;
  schedulesCount: number;
  appsCount: number;
  launchLimitsCount: number;
  strictMode: boolean;
  reelBlockerEnabled: boolean;
  timestamp: number;
  message: string;
}

export interface CloudSyncStatus {
  mode: "standalone" | "personal_cloud" | "console_managed";
  isLoggedIn: boolean;
  isPairedWithConsole: boolean;
  isConsoleManaged: boolean;
  userEmail?: string;
  userId?: string;
  deviceId?: string;
  deviceName?: string;
  lastSyncedAt?: number;
  syncError?: string;
  hasPreSyncSnapshot: boolean;
  preSyncSnapshotTimestamp?: number;
}

export interface PairingResult {
  success: boolean;
  deviceId?: string;
  ownerId?: string;
  isManaged: boolean;
  policyPayload?: PolicyPayloadV2 | null;
  message: string;
}

function cleanDomainEntry(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .trim();
}

function parseClockMinutes(clock: string | undefined, fallback: number): number {
  if (!clock || typeof clock !== "string") return fallback;
  const parts = clock.trim().split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1] ?? 0);
  if (Number.isNaN(h) || Number.isNaN(m)) return fallback;
  return Math.max(0, Math.min(1439, h * 60 + m));
}

/**
 * Converts JS 0-based weekday array (0=Sun..6=Sat) or mixed input into canonical PolicyPayload v2 1-based days (1=Sun..7=Sat).
 */
export function toCanonicalOneBasedDays(rawDays?: Array<number | string>): number[] {
  if (!Array.isArray(rawDays) || rawDays.length === 0) {
    return [1, 2, 3, 4, 5, 6, 7];
  }
  const jsDays = normalizeScheduleDays(rawDays);
  return Array.from(new Set(jsDays.map((d) => d + 1))).sort((a, b) => a - b);
}

/**
 * Parses `schedules` from PolicyPayload v2 (array of rules) or legacy v1 object (`{ enabled, start, end, days }`).
 */
export function parsePolicySchedules(rawSchedules: PolicyPayloadV2["schedules"]): {
  rules: PolicyScheduleRule[];
  isV1Disabled: boolean;
} {
  if (!rawSchedules) {
    return { rules: [], isV1Disabled: false };
  }

  // PolicyPayload v2 array format
  if (Array.isArray(rawSchedules)) {
    const rules: PolicyScheduleRule[] = rawSchedules
      .filter((item): item is PolicyScheduleRule => Boolean(item && typeof item === "object"))
      .map((item, idx) => {
        const blockerTypeRaw = String(item.blockerType || "WEBSITE").toUpperCase();
        const validBlockerTypes = ["APP", "WEBSITE", "KEYWORD", "REELS", "FOCUS_MODE"] as const;
        const blockerType = (validBlockerTypes as readonly string[]).includes(blockerTypeRaw)
          ? (blockerTypeRaw as PolicyScheduleRule["blockerType"])
          : "WEBSITE";

        const typeRaw = String(item.type || "BLOCK").toUpperCase();
        const type: "BLOCK" | "CHEAT" = typeRaw === "CHEAT" ? "CHEAT" : "BLOCK";

        const recurrenceRaw = String(item.recurrence || "WEEKLY").toUpperCase();
        const recurrence: "DAILY" | "WEEKLY" = recurrenceRaw === "DAILY" ? "DAILY" : "WEEKLY";

        const targets = Array.isArray(item.targets) ? item.targets.map(String) : [];
        const targetWebsites = Array.isArray(item.targetWebsites) ? item.targetWebsites.map(String) : [];
        const targetKeywords = Array.isArray(item.targetKeywords) ? item.targetKeywords.map(String) : [];

        return {
          id: String(item.id || `cloud-schedule-${idx + 1}`),
          groupId: item.groupId ? String(item.groupId) : "cloud-policy",
          title: String(item.title || `Cloud Schedule ${idx + 1}`),
          packageName: item.packageName ? String(item.packageName) : "all",
          blockerType,
          targets,
          targetWebsites,
          targetKeywords,
          type,
          recurrence,
          startMinute: typeof item.startMinute === "number" ? item.startMinute : 540,
          endMinute: typeof item.endMinute === "number" ? item.endMinute : 1020,
          selectedDays: toCanonicalOneBasedDays(item.selectedDays),
          isEnabled: item.isEnabled !== false,
        };
      });
    return { rules, isV1Disabled: false };
  }

  // Legacy PolicyPayload v1 object format: { enabled, start, end, days }
  if (typeof rawSchedules === "object") {
    const legacy = rawSchedules as LegacyScheduleObject;
    if (legacy.enabled === false) {
      return { rules: [], isV1Disabled: true };
    }
    if (legacy.enabled === true) {
      const startMinute = parseClockMinutes(legacy.start, 9 * 60);
      const endMinute = parseClockMinutes(legacy.end, 17 * 60);
      const selectedDays = Array.isArray(legacy.days) && legacy.days.length > 0
        ? toCanonicalOneBasedDays(legacy.days)
        : [2, 3, 4, 5, 6];

      return {
        rules: [
          {
            id: "cloud_sync_schedule",
            groupId: "cloud_sync_schedule",
            title: "Cloud Sync Schedule",
            packageName: "all",
            blockerType: "WEBSITE",
            targets: ["all"],
            targetWebsites: ["all"],
            targetKeywords: [],
            type: "BLOCK",
            recurrence: "WEEKLY",
            startMinute,
            endMinute,
            selectedDays,
            isEnabled: true,
          },
        ],
        isV1Disabled: false,
      };
    }
  }

  return { rules: [], isV1Disabled: false };
}

/**
 * Saves a local recovery snapshot of current rules and settings before a Force Apply overwrite.
 */
export async function savePreSyncRuleSnapshot(): Promise<PreSyncRuleSnapshot> {
  const [settings, blockedDomains, guardianCustomDomains, adultPackActive, socialPackActive] = await Promise.all([
    get("settings"),
    get("blockedDomains"),
    get("guardianCustomDomains"),
    get("adultPackActive"),
    get("socialPackActive"),
  ]);

  const snapshot: PreSyncRuleSnapshot = {
    timestamp: Date.now(),
    settings: JSON.parse(JSON.stringify(settings)),
    blockedDomains: [...(blockedDomains ?? [])],
    guardianCustomDomains: [...(guardianCustomDomains ?? [])],
    adultPackActive: Boolean(adultPackActive),
    socialPackActive: Boolean(socialPackActive),
  };

  await set("preSyncSnapshot", snapshot);
  return snapshot;
}

export async function getPreSyncRuleSnapshot(): Promise<PreSyncRuleSnapshot | null> {
  return await get("preSyncSnapshot");
}

/**
 * Restores local settings and rules from the pre-sync backup snapshot.
 */
export async function restorePreSyncRuleSnapshot(): Promise<boolean> {
  const snapshot = await get("preSyncSnapshot");
  if (!snapshot || !snapshot.settings) return false;

  await Promise.all([
    set("settings", snapshot.settings),
    set("blockedDomains", snapshot.blockedDomains ?? []),
    set("guardianCustomDomains", snapshot.guardianCustomDomains ?? []),
    set("adultPackActive", Boolean(snapshot.adultPackActive)),
    set("socialPackActive", Boolean(snapshot.socialPackActive)),
  ]);
  return true;
}

/**
 * Applies a PolicyPayload v2 object to local extension storage using either MERGE or FORCE_REPLACE mode.
 */
export async function applyPolicyPayload(
  payload: PolicyPayloadV2,
  mode: ApplyMode = "MERGE",
  source: SyncSummary["source"] = "device",
): Promise<SyncSummary> {
  if (mode === "FORCE_REPLACE") {
    await savePreSyncRuleSnapshot();
  }

  const [currentSettings, currentBlockedDomains, currentGuardianCustom, currentSocialPack] = await Promise.all([
    get("settings"),
    get("blockedDomains"),
    get("guardianCustomDomains"),
    get("socialPackActive"),
  ]);

  const nextSettings: Settings = JSON.parse(JSON.stringify(currentSettings));

  // 1. Blocked Domains (strictly separate from blocked_keywords)
  const remoteDomains = Array.isArray(payload.blocked_domains)
    ? payload.blocked_domains.map(cleanDomainEntry).filter(Boolean)
    : [];

  let finalDomains: string[];
  let finalGuardianCustom: string[];
  if (mode === "FORCE_REPLACE") {
    finalDomains = Array.from(new Set(remoteDomains));
    finalGuardianCustom = Array.from(new Set(remoteDomains));
  } else {
    finalDomains = Array.from(new Set([...(currentBlockedDomains ?? []), ...remoteDomains]));
    finalGuardianCustom = Array.from(new Set([...(currentGuardianCustom ?? []), ...remoteDomains]));
  }

  // 2. Blocked Keywords (strictly separate from blocked_domains)
  const remoteKeywords = Array.isArray(payload.blocked_keywords)
    ? payload.blocked_keywords.map((k) => String(k).trim().toLowerCase()).filter(Boolean)
    : [];

  if (mode === "FORCE_REPLACE") {
    nextSettings.blockedKeywords = Array.from(new Set(remoteKeywords));
  } else {
    nextSettings.blockedKeywords = Array.from(
      new Set([...(nextSettings.blockedKeywords ?? []), ...remoteKeywords]),
    );
  }

  // 3. Blocked Categories
  const remoteCategories = Array.isArray(payload.blocked_categories)
    ? payload.blocked_categories.map((c) => String(c).trim().toLowerCase()).filter(Boolean)
    : [];

  if (mode === "FORCE_REPLACE") {
    if (Array.isArray(payload.blocked_categories)) {
      nextSettings.blockedCategories = Array.from(new Set(remoteCategories));
    }
  } else if (remoteCategories.length > 0) {
    nextSettings.blockedCategories = Array.from(
      new Set([...(nextSettings.blockedCategories ?? []), ...remoteCategories]),
    );
  }

  const activeCats = new Set(nextSettings.blockedCategories ?? []);
  const hasAdultCat = activeCats.has("adult") || activeCats.has("porn") || activeCats.has("nsfw");
  const hasHarmfulCat = activeCats.has("harmful") || activeCats.has("gambling");
  const hasSocialCat = activeCats.has("social");

  if (mode === "FORCE_REPLACE") {
    if (Array.isArray(payload.blocked_categories)) {
      nextSettings.adultContentEnabled = hasAdultCat || payload.allow_unblur === false;
      nextSettings.harmfulContentEnabled = hasHarmfulCat;
    } else if (typeof payload.allow_unblur === "boolean") {
      nextSettings.adultContentEnabled = !payload.allow_unblur;
    }
  } else {
    if (hasAdultCat || payload.allow_unblur === false) {
      nextSettings.adultContentEnabled = true;
    }
    if (hasHarmfulCat) {
      nextSettings.harmfulContentEnabled = true;
    }
  }

  const nextSocialPack = mode === "FORCE_REPLACE" ? hasSocialCat : Boolean(currentSocialPack || hasSocialCat);

  // 4. Strict Mode & Allow Unblur & Focus Mode Policy
  if (typeof payload.strict_mode === "boolean") {
    nextSettings.strictMode = payload.strict_mode;
  } else if (mode === "FORCE_REPLACE") {
    nextSettings.strictMode = false;
  }

  if (typeof payload.allow_unblur === "boolean") {
    nextSettings.allowUnblur = payload.allow_unblur;
  } else if (mode === "FORCE_REPLACE") {
    nextSettings.allowUnblur = true;
  }

  const baseFocusPolicy = nextSettings.focusModePolicy ?? defaultFocusModePolicy();
  if (payload.focus_mode && typeof payload.focus_mode === "object") {
    nextSettings.focusModePolicy = {
      strictness:
        typeof payload.focus_mode.strictness === "number"
          ? payload.focus_mode.strictness
          : nextSettings.strictMode
          ? 1
          : baseFocusPolicy.strictness,
      allow_early_stop:
        typeof payload.focus_mode.allow_early_stop === "boolean"
          ? payload.focus_mode.allow_early_stop
          : nextSettings.strictMode
          ? false
          : baseFocusPolicy.allow_early_stop,
      always_whitelisted_apps: Array.isArray(payload.focus_mode.always_whitelisted_apps)
        ? payload.focus_mode.always_whitelisted_apps.map(String)
        : mode === "FORCE_REPLACE"
        ? []
        : baseFocusPolicy.always_whitelisted_apps,
    };
  } else if (typeof payload.strict_mode === "boolean") {
    nextSettings.focusModePolicy = {
      ...baseFocusPolicy,
      strictness: payload.strict_mode ? 1 : 0,
      allow_early_stop: !payload.strict_mode,
    };
  }

  // 5. Reel / Short-Form Video Blocker (`reel_blocker`)
  const baseReel = nextSettings.reelBlocker ?? defaultReelBlocker();
  if (payload.reel_blocker && typeof payload.reel_blocker === "object") {
    nextSettings.reelBlocker = {
      enabled:
        typeof payload.reel_blocker.enabled === "boolean" ? payload.reel_blocker.enabled : baseReel.enabled,
      mode: typeof payload.reel_blocker.mode === "number" ? payload.reel_blocker.mode : baseReel.mode,
      daily_limit_minutes:
        typeof payload.reel_blocker.daily_limit_minutes === "number"
          ? payload.reel_blocker.daily_limit_minutes
          : baseReel.daily_limit_minutes,
      youtube:
        typeof payload.reel_blocker.youtube === "boolean" ? payload.reel_blocker.youtube : baseReel.youtube,
      instagram:
        typeof payload.reel_blocker.instagram === "boolean"
          ? payload.reel_blocker.instagram
          : baseReel.instagram,
      tiktok: typeof payload.reel_blocker.tiktok === "boolean" ? payload.reel_blocker.tiktok : baseReel.tiktok,
      browser:
        typeof payload.reel_blocker.browser === "boolean" ? payload.reel_blocker.browser : baseReel.browser,
    };
  } else if (mode === "FORCE_REPLACE") {
    nextSettings.reelBlocker = defaultReelBlocker();
  }

  // 6. Schedules (PolicyPayload v2 array + legacy v1 object support)
  if ("schedules" in payload && payload.schedules !== undefined) {
    const { rules: remoteSchedules, isV1Disabled } = parsePolicySchedules(payload.schedules);
    if (mode === "FORCE_REPLACE") {
      nextSettings.policySchedules = remoteSchedules;
    } else {
      const existing = [...(nextSettings.policySchedules ?? [])];
      const byId = new Map<string, PolicyScheduleRule>();
      for (const r of existing) {
        if (isV1Disabled && r.id === "cloud_sync_schedule") continue;
        byId.set(r.id, r);
      }
      for (const r of remoteSchedules) {
        byId.set(r.id, r);
      }
      nextSettings.policySchedules = Array.from(byId.values());
    }
  } else if (mode === "FORCE_REPLACE") {
    nextSettings.policySchedules = [];
  }

  // 7. Cross-platform Android fields preserved for round-trip fidelity
  if (Array.isArray(payload.blocked_apps)) {
    nextSettings.blockedApps =
      mode === "FORCE_REPLACE"
        ? payload.blocked_apps.map(String)
        : Array.from(new Set([...(nextSettings.blockedApps ?? []), ...payload.blocked_apps.map(String)]));
  } else if (mode === "FORCE_REPLACE") {
    nextSettings.blockedApps = [];
  }

  if (payload.named_block_lists && typeof payload.named_block_lists === "object") {
    nextSettings.namedBlockLists =
      mode === "FORCE_REPLACE"
        ? { ...payload.named_block_lists }
        : { ...(nextSettings.namedBlockLists ?? {}), ...payload.named_block_lists };
  }

  if (Array.isArray(payload.launch_limits)) {
    nextSettings.launchLimits =
      mode === "FORCE_REPLACE"
        ? payload.launch_limits
        : [
            ...(nextSettings.launchLimits ?? []).filter(
              (l) => !payload.launch_limits!.some((r) => r.packageName === l.packageName),
            ),
            ...payload.launch_limits,
          ];
  } else if (mode === "FORCE_REPLACE") {
    nextSettings.launchLimits = [];
  }

  const nowTs = Date.now();
  await Promise.all([
    set("settings", nextSettings),
    set("blockedDomains", finalDomains),
    set("guardianCustomDomains", finalGuardianCustom),
    set("adultPackActive", Boolean(nextSettings.adultContentEnabled || nextSettings.strictMode)),
    set("socialPackActive", nextSocialPack),
    set("cachedPolicyPayload", payload),
    set("lastPolicySyncTimestamp", nowTs),
    set("lastSyncError", ""),
  ]);

  const domainsCount = finalDomains.length;
  const keywordsCount = (nextSettings.blockedKeywords ?? []).length;
  const categoriesCount = (nextSettings.blockedCategories ?? []).length;
  const schedulesCount = (nextSettings.policySchedules ?? []).length;
  const appsCount = (nextSettings.blockedApps ?? []).length;
  const launchLimitsCount = (nextSettings.launchLimits ?? []).length;

  return {
    success: true,
    mode,
    source,
    domainsCount,
    keywordsCount,
    categoriesCount,
    schedulesCount,
    appsCount,
    launchLimitsCount,
    strictMode: Boolean(nextSettings.strictMode),
    reelBlockerEnabled: Boolean(nextSettings.reelBlocker?.enabled),
    timestamp: nowTs,
    message:
      mode === "FORCE_REPLACE"
        ? `Force-applied remote policy (${domainsCount} domains, ${keywordsCount} keywords, ${schedulesCount} schedules). Pre-sync backup saved.`
        : `Merged remote policy (${domainsCount} domains, ${keywordsCount} keywords, ${schedulesCount} schedules).`,
  };
}

/**
 * Exports current local Extension rules, categories, keywords, reels settings, and schedules into a canonical PolicyPayload v2 object.
 */
export async function exportLocalPolicyPayload(): Promise<PolicyPayloadV2> {
  const [settings, blockedDomains, guardianCustomDomains, socialPackActive] = await Promise.all([
    get("settings"),
    get("blockedDomains"),
    get("guardianCustomDomains"),
    get("socialPackActive"),
  ]);

  const allDomains = Array.from(
    new Set([...(blockedDomains ?? []), ...(guardianCustomDomains ?? [])].map(cleanDomainEntry).filter(Boolean)),
  );
  const allKeywords = Array.from(
    new Set((settings.blockedKeywords ?? []).map((k) => k.trim().toLowerCase()).filter(Boolean)),
  );

  const cats = new Set<string>((settings.blockedCategories ?? []).map((c) => c.toLowerCase()));
  if (settings.adultContentEnabled) cats.add("adult");
  if (settings.harmfulContentEnabled) cats.add("harmful");
  if (socialPackActive) cats.add("social");

  const reelBlocker = settings.reelBlocker ?? defaultReelBlocker();
  const focusMode = settings.focusModePolicy ?? {
    strictness: settings.strictMode ? 1 : 0,
    allow_early_stop: !settings.strictMode,
    always_whitelisted_apps: [],
  };

  // Combine policySchedules with any time-based local BlockGroups not yet in policySchedules
  const scheduleMap = new Map<string, PolicyScheduleRule>();
  for (const s of settings.policySchedules ?? []) {
    scheduleMap.set(s.id, s);
  }
  for (const g of settings.groups ?? []) {
    if (g.mode === "time" && !scheduleMap.has(g.id)) {
      const activeJsDays: number[] = [];
      let startMinute = 9 * 60;
      let endMinute = 17 * 60;
      g.schedule.days.forEach((d, idx) => {
        if (d.active) {
          activeJsDays.push(idx + 1); // 1=Sun..7=Sat
          if (d.ranges.length > 0) {
            startMinute = d.ranges[0].start;
            endMinute = d.ranges[0].end;
          }
        }
      });
      scheduleMap.set(g.id, {
        id: g.id,
        groupId: g.id,
        title: g.name,
        packageName: "all",
        blockerType: "WEBSITE",
        targets: g.matchers,
        targetWebsites: g.matchers,
        targetKeywords: [],
        type: "BLOCK",
        recurrence: activeJsDays.length === 7 ? "DAILY" : "WEEKLY",
        startMinute,
        endMinute,
        selectedDays: activeJsDays.length > 0 ? activeJsDays : [1, 2, 3, 4, 5, 6, 7],
        isEnabled: g.enabled,
      });
    }
  }

  return {
    schema_version: 2,
    updated_at: new Date().toISOString(),
    strict_mode: Boolean(settings.strictMode),
    allow_unblur: settings.allowUnblur !== false,
    blocked_apps: settings.blockedApps ?? [],
    named_block_lists: settings.namedBlockLists ?? {},
    blocked_domains: allDomains,
    blocked_keywords: allKeywords,
    blocked_categories: Array.from(cats),
    reel_blocker: reelBlocker,
    focus_mode: focusMode,
    schedules: Array.from(scheduleMap.values()),
    launch_limits: settings.launchLimits ?? [],
    daily_limit_minutes: reelBlocker.daily_limit_minutes ?? 30,
  };
}

/**
 * Ensures the stored Supabase Auth session is fresh, refreshing it if expired.
 */
export async function getValidAuthSession(): Promise<CloudAuthSession | null> {
  const session = await get("cloudAuthSession");
  if (!session || !session.accessToken) return null;

  if (session.expiresAt && Date.now() < session.expiresAt - 60_000) {
    return session;
  }

  if (!session.refreshToken) return session;

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: session.refreshToken }),
    });
    if (!res.ok) return session;
    const data = await res.json();
    if (!data?.access_token) return session;

    const refreshed: CloudAuthSession = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || session.refreshToken,
      userId: data.user?.id || session.userId,
      email: data.user?.email || session.email,
      expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000,
    };
    await set("cloudAuthSession", refreshed);
    await set("cloudAuthToken", refreshed.accessToken);
    return refreshed;
  } catch {
    return session;
  }
}

async function ensureExtensionDeviceForSession(session: CloudAuthSession): Promise<string> {
  let deviceId = await get("cloudDeviceId");
  const deviceName = (await get("cloudDeviceName")) || "AmniShield Browser Extension";

  try {
    // Check if user already has an extension device in Supabase
    const queryUrl = `${SUPABASE_URL}/rest/v1/devices?or=(user_id.eq.${session.userId},owner_id.eq.${session.userId})&platform=eq.extension&select=id,device_name,policy_payload&limit=1`;
    const existingRes = await fetch(queryUrl, {
      method: "GET",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.accessToken}`,
      },
    });
    if (existingRes.ok) {
      const rows = await existingRes.json();
      if (Array.isArray(rows) && rows.length > 0 && rows[0].id) {
        deviceId = String(rows[0].id);
        await set("cloudDeviceId", deviceId);
        return deviceId;
      }
    }
  } catch {
    // ignore and create or keep local id
  }

  if (!deviceId) {
    deviceId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `ext-${Date.now()}`;
    await set("cloudDeviceId", deviceId);
  }

  try {
    const localPayload = await exportLocalPolicyPayload();
    const nowIso = new Date().toISOString();
    await fetch(`${SUPABASE_URL}/rest/v1/devices?on_conflict=id`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify([
        {
          id: deviceId,
          user_id: session.userId,
          owner_id: session.userId,
          device_name: deviceName,
          label: deviceName,
          platform: "extension",
          is_online: true,
          sync_enabled: true,
          last_heartbeat: nowIso,
          last_seen: nowIso,
          policy_payload: localPayload,
        },
      ]),
    });
  } catch {
    // non-fatal
  }

  return deviceId;
}

export async function fetchCloudUserProfile(session: CloudAuthSession): Promise<UserProfileConfig | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${session.userId}&select=id,email,is_premium,role,license_key`,
      {
        method: "GET",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session.accessToken}`,
        },
      },
    );
    if (!res.ok) return null;
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const row = rows[0];

    const settings = await get("settings");
    const existingProfile = settings.userProfile ?? {};
    const mergedProfile: UserProfileConfig = {
      ...existingProfile,
      id: row.id || session.userId,
      email: row.email || session.email || existingProfile.email,
      isPremium: Boolean(row.is_premium),
      role: row.role || existingProfile.role || "personal",
      licenseKey: row.license_key || existingProfile.licenseKey,
    };

    if (row.license_key) {
      await activateLicenseKey(String(row.license_key));
    }
    if (row.is_premium) {
      await set("guardianIsPremium", true);
    }

    await set("settings", { ...settings, userProfile: mergedProfile });
    return mergedProfile;
  } catch {
    return null;
  }
}

/**
 * Signs in to AmniShield Cloud using email & password via Supabase Auth.
 */
export async function signInCloudAccount(
  email: string,
  password: string,
): Promise<{ success: boolean; message: string; session?: CloudAuthSession }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !password) {
    return { success: false, message: "Please enter both email and password." };
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: cleanEmail, password }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.access_token) {
      const errMsg =
        data?.error_description || data?.msg || data?.message || data?.error || `Sign-in failed (${res.status})`;
      return { success: false, message: errMsg };
    }

    const session: CloudAuthSession = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || "",
      userId: data.user?.id || "",
      email: data.user?.email || cleanEmail,
      expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000,
    };

    await set("cloudAuthSession", session);
    await set("cloudAuthToken", session.accessToken);
    await fetchCloudUserProfile(session);
    await ensureExtensionDeviceForSession(session);

    return {
      success: true,
      message: `Signed in as ${session.email}.`,
      session,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "Network error while connecting to AmniShield Cloud.",
    };
  }
}

/**
 * Registers a new AmniShield Cloud account with email & password.
 */
export async function signUpCloudAccount(
  email: string,
  password: string,
  displayName?: string,
): Promise<{ success: boolean; message: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || password.length < 6) {
    return { success: false, message: "Provide a valid email and a password of at least 6 characters." };
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: cleanEmail,
        password,
        data: displayName ? { full_name: displayName.trim() } : undefined,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errMsg =
        data?.error_description || data?.msg || data?.message || data?.error || `Sign-up failed (${res.status})`;
      return { success: false, message: errMsg };
    }

    if (data?.access_token && data?.user?.id) {
      const session: CloudAuthSession = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || "",
        userId: data.user.id,
        email: data.user.email || cleanEmail,
        expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000,
      };
      await set("cloudAuthSession", session);
      await set("cloudAuthToken", session.accessToken);
      await fetchCloudUserProfile(session);
      await ensureExtensionDeviceForSession(session);
      return { success: true, message: `Account created and signed in as ${cleanEmail}.` };
    }

    return {
      success: true,
      message: `Verification email sent to ${cleanEmail}. Check your inbox or sign in once confirmed.`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "Network error during account registration.",
    };
  }
}

export async function signOutCloudAccount(): Promise<void> {
  await Promise.all([set("cloudAuthSession", null), set("cloudAuthToken", "")]);
}

/**
 * Claims a 6-digit Console Pairing PIN (`devices.pairing_token`) generated in the AmniShield Web Admin Console.
 */
export async function claimConsolePairingPin(
  pin: string,
  customDeviceName?: string,
): Promise<PairingResult> {
  const cleanPin = pin.trim();
  if (cleanPin.length < 4) {
    return { success: false, isManaged: false, message: "Invalid pairing PIN format." };
  }

  const deviceName = (customDeviceName || (await get("cloudDeviceName")) || "AmniShield Browser Extension").trim();

  try {
    const encodedPin = encodeURIComponent(cleanPin);
    const url = `${SUPABASE_URL}/rest/v1/devices?pairing_token=eq.${encodedPin}&select=id,owner_id,user_id,device_name,is_managed,policy_payload,pairing_token_expires_at`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    if (!res.ok) {
      return { success: false, isManaged: false, message: `Server error (${res.status}) while verifying PIN.` };
    }

    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return {
        success: false,
        isManaged: false,
        message: `Invalid or expired pairing PIN (${cleanPin}). Generate a new code in the Console.`,
      };
    }

    const dev = rows[0];
    const deviceId = String(dev.id);
    const ownerId = dev.owner_id || dev.user_id || undefined;
    const policyPayload =
      dev.policy_payload && typeof dev.policy_payload === "object"
        ? (dev.policy_payload as PolicyPayloadV2)
        : null;

    if (dev.pairing_token_expires_at) {
      const expiresMs = Date.parse(String(dev.pairing_token_expires_at));
      if (!Number.isNaN(expiresMs) && Date.now() > expiresMs) {
        return {
          success: false,
          isManaged: false,
          message: "Pairing PIN has expired. Please generate a new 6-digit code in the Console.",
        };
      }
    }

    const nowIso = new Date().toISOString();
    const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/devices?id=eq.${deviceId}`, {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        device_name: deviceName,
        label: deviceName,
        platform: "extension",
        pairing_token: null,
        last_heartbeat: nowIso,
        last_seen: nowIso,
        is_online: true,
        is_managed: true,
        sync_enabled: true,
      }),
    });

    if (!patchRes.ok) {
      return {
        success: false,
        deviceId,
        ownerId,
        isManaged: false,
        message: `Failed to claim device record (${patchRes.status}).`,
      };
    }

    await Promise.all([
      set("cloudDeviceId", deviceId),
      set("cloudDeviceName", deviceName),
      set("isPairedWithConsole", true),
      set("isConsoleManaged", true),
    ]);

    if (policyPayload) {
      await applyPolicyPayload(policyPayload, "MERGE", "device");
    }

    return {
      success: true,
      deviceId,
      ownerId,
      isManaged: true,
      policyPayload,
      message: `Paired with Admin Console as "${deviceName}".`,
    };
  } catch (err: any) {
    return {
      success: false,
      isManaged: false,
      message: err?.message || "Connection error while pairing with Console.",
    };
  }
}

export async function unpairConsoleDevice(): Promise<void> {
  await Promise.all([
    set("isPairedWithConsole", false),
    set("isConsoleManaged", false),
    set("cloudDeviceId", ""),
  ]);
}

/**
 * Fetches the raw PolicyPayload v2 from Supabase (via paired device ID, signed-in user's devices, or sync_records).
 */
export async function fetchRemotePolicyPayload(): Promise<{
  payload: PolicyPayloadV2 | null;
  source: SyncSummary["source"];
  error?: string;
}> {
  const [session, deviceId, isPaired] = await Promise.all([
    getValidAuthSession(),
    get("cloudDeviceId"),
    get("isPairedWithConsole"),
  ]);

  const bearer = session?.accessToken || SUPABASE_ANON_KEY;
  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${bearer}`,
  };

  try {
    // 1. Direct Device ID fetch (Console Paired or Registered Extension Device)
    if (deviceId) {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/devices?id=eq.${encodeURIComponent(deviceId)}&select=id,device_name,is_managed,policy_payload`,
        { method: "GET", headers },
      );
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0) {
          const dev = rows[0];
          if (typeof dev.is_managed === "boolean") {
            await set("isConsoleManaged", dev.is_managed);
          }
          // Send heartbeat asynchronously
          void sendDeviceHeartbeat(deviceId, bearer);
          if (dev.policy_payload && typeof dev.policy_payload === "object") {
            return { payload: dev.policy_payload as PolicyPayloadV2, source: "device" };
          }
        }
      }
    }

    // 2. Signed-in Account Devices or `sync_records`
    if (session?.userId) {
      const devUrl = `${SUPABASE_URL}/rest/v1/devices?or=(user_id.eq.${session.userId},owner_id.eq.${session.userId})&select=id,device_name,platform,is_managed,policy_payload&order=last_heartbeat.desc.nullslast`;
      const devRes = await fetch(devUrl, { method: "GET", headers });
      if (devRes.ok) {
        const rows = await devRes.json();
        if (Array.isArray(rows) && rows.length > 0) {
          // Prefer extension device or any device with a non-empty policy_payload
          const extRow =
            rows.find((r: any) => r.platform === "extension" && r.policy_payload) ||
            rows.find((r: any) => r.policy_payload && Object.keys(r.policy_payload).length > 0) ||
            rows[0];
          if (extRow?.id && !deviceId) {
            await set("cloudDeviceId", String(extRow.id));
          }
          if (extRow?.policy_payload && typeof extRow.policy_payload === "object") {
            return { payload: extRow.policy_payload as PolicyPayloadV2, source: "account" };
          }
        }
      }

      // Check `sync_records` namespace = "policy_v2"
      const syncRes = await fetch(
        `${SUPABASE_URL}/rest/v1/sync_records?user_id=eq.${session.userId}&namespace=eq.policy_v2&deleted=is.false&order=updated_at.desc&limit=1&select=ciphertext`,
        { method: "GET", headers },
      );
      if (syncRes.ok) {
        const syncRows = await syncRes.json();
        if (Array.isArray(syncRows) && syncRows.length > 0 && syncRows[0].ciphertext) {
          try {
            const raw = String(syncRows[0].ciphertext);
            const jsonStr = raw.trim().startsWith("{") ? raw : atob(raw);
            const parsed = JSON.parse(jsonStr) as PolicyPayloadV2;
            return { payload: parsed, source: "account" };
          } catch {
            // ignore malformed record
          }
        }
      }
    }

    // 3. Fallback to cachedPolicyPayload if paired/logged-in so user can still re-apply cached policy
    if (isPaired || session?.userId) {
      const cached = await get("cachedPolicyPayload");
      if (cached) {
        return { payload: cached, source: "cache" };
      }
      return {
        payload: null,
        source: "none",
        error: "No remote policy payload found yet for this account/device.",
      };
    }

    return {
      payload: null,
      source: "none",
      error: "Sign in to your AmniShield Cloud Account or pair with a Console PIN first.",
    };
  } catch (err: any) {
    const errMsg = err?.message || "Cloud connection failed.";
    await set("lastSyncError", errMsg);
    return { payload: null, source: "none", error: errMsg };
  }
}

async function sendDeviceHeartbeat(deviceId: string, bearer: string): Promise<void> {
  try {
    const nowIso = new Date().toISOString();
    await fetch(`${SUPABASE_URL}/rest/v1/devices?id=eq.${encodeURIComponent(deviceId)}`, {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${bearer}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        last_heartbeat: nowIso,
        last_seen: nowIso,
        is_online: true,
        platform: "extension",
      }),
    });
  } catch {
    // non-fatal
  }
}

/**
 * Pulls the latest PolicyPayload v2 from Supabase and applies it with the chosen ApplyMode ("MERGE" or "FORCE_REPLACE").
 */
export async function pullAndApplyCloudPolicy(mode: ApplyMode = "MERGE"): Promise<SyncSummary> {
  const { payload, source, error } = await fetchRemotePolicyPayload();
  if (!payload) {
    return {
      success: false,
      mode,
      source,
      domainsCount: 0,
      keywordsCount: 0,
      categoriesCount: 0,
      schedulesCount: 0,
      appsCount: 0,
      launchLimitsCount: 0,
      strictMode: false,
      reelBlockerEnabled: false,
      timestamp: Date.now(),
      message: error || "Unable to fetch remote policy from AmniShield Cloud.",
    };
  }

  return await applyPolicyPayload(payload, mode, source);
}

/**
 * Backward-compatible helper used by background polling (`guardianSync.ts`).
 */
export async function pullCloudPolicy(mode: ApplyMode = "MERGE"): Promise<PolicyPayloadV2 | null> {
  const settings = await get("settings");
  if (settings.personalCloudSyncEnabled === false && settings.syncAppUsageEnabled === false) {
    return null;
  }

  const { payload, source } = await fetchRemotePolicyPayload();
  if (!payload) return null;

  await applyPolicyPayload(payload, mode, source);
  return payload;
}

/**
 * Pushes the user's current local rules, schedules, domains, keywords, and categories to Supabase (`devices.policy_payload`).
 */
export async function pushLocalPolicyToCloud(): Promise<{
  success: boolean;
  message: string;
  payload?: PolicyPayloadV2;
}> {
  const [session, existingDeviceId, deviceName] = await Promise.all([
    getValidAuthSession(),
    get("cloudDeviceId"),
    get("cloudDeviceName"),
  ]);

  let deviceId = existingDeviceId;
  if (!deviceId && session) {
    deviceId = await ensureExtensionDeviceForSession(session);
  }

  if (!deviceId && !session) {
    return {
      success: false,
      message: "Sign in to your AmniShield Cloud Account or pair with a Console PIN before pushing rules.",
    };
  }

  const payload = await exportLocalPolicyPayload();
  const bearer = session?.accessToken || SUPABASE_ANON_KEY;
  const nowIso = new Date().toISOString();

  try {
    if (deviceId) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/devices?id=eq.${encodeURIComponent(deviceId)}`, {
        method: "PATCH",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${bearer}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          device_name: deviceName || "AmniShield Browser Extension",
          platform: "extension",
          policy_payload: payload,
          last_heartbeat: nowIso,
          last_seen: nowIso,
          is_online: true,
          sync_enabled: true,
        }),
      });

      if (!res.ok) {
        return { success: false, message: `Failed to push policy to device record (${res.status}).` };
      }
    }

    if (session?.userId) {
      await fetch(`${SUPABASE_URL}/rest/v1/sync_records?on_conflict=user_id,namespace,record_key`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify([
          {
            user_id: session.userId,
            namespace: "policy_v2",
            record_key: "default",
            device_id: deviceId || "extension",
            ciphertext: JSON.stringify(payload),
            version: Date.now(),
            deleted: false,
          },
        ]),
      }).catch(() => {});
    }

    await Promise.all([
      set("cachedPolicyPayload", payload),
      set("lastPolicySyncTimestamp", Date.now()),
      set("lastSyncError", ""),
    ]);

    return {
      success: true,
      payload,
      message: `Pushed ${payload.blocked_domains?.length ?? 0} domains, ${payload.blocked_keywords?.length ?? 0} keywords, and ${Array.isArray(payload.schedules) ? payload.schedules.length : 0} schedules to Cloud.`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "Network error while pushing policy to Cloud.",
    };
  }
}

/**
 * Pushes custom blocked domains back to Supabase cloud while preserving the rest of `policy_payload`.
 */
export async function pushCloudDomains(domains: string[]): Promise<boolean> {
  await set("blockedDomains", domains);
  const res = await pushLocalPolicyToCloud();
  return res.success;
}

/**
 * Returns the live Cloud Sync & Policy Status for the Extension UI.
 */
export async function getCloudSyncStatus(): Promise<CloudSyncStatus> {
  const [
    session,
    deviceId,
    deviceName,
    isPaired,
    isManaged,
    lastSyncedAt,
    syncError,
    preSyncSnapshot,
  ] = await Promise.all([
    get("cloudAuthSession"),
    get("cloudDeviceId"),
    get("cloudDeviceName"),
    get("isPairedWithConsole"),
    get("isConsoleManaged"),
    get("lastPolicySyncTimestamp"),
    get("lastSyncError"),
    get("preSyncSnapshot"),
  ]);

  const isLoggedIn = Boolean(session?.accessToken);
  const mode: CloudSyncStatus["mode"] = isPaired || isManaged
    ? "console_managed"
    : isLoggedIn
    ? "personal_cloud"
    : "standalone";

  return {
    mode,
    isLoggedIn,
    isPairedWithConsole: Boolean(isPaired),
    isConsoleManaged: Boolean(isManaged),
    userEmail: session?.email,
    userId: session?.userId,
    deviceId: deviceId || undefined,
    deviceName: deviceName || "AmniShield Browser Extension",
    lastSyncedAt: lastSyncedAt || undefined,
    syncError: syncError || undefined,
    hasPreSyncSnapshot: Boolean(preSyncSnapshot && preSyncSnapshot.timestamp),
    preSyncSnapshotTimestamp: preSyncSnapshot?.timestamp,
  };
}
