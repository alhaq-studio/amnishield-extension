import { browser } from "#imports";
import type {
  FocusLogEntry,
  FocusSession,
  PolicyPayloadV2,
  PreSyncRuleSnapshot,
  ProceedRecord,
  Settings,
  UsageHistory,
} from "./types";
import { defaultFocusModePolicy, defaultReelBlocker } from "./types";

export interface CloudAuthSession {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email?: string;
  expiresAt: number;
}

export interface StoreShape {
  usage: UsageHistory;
  settings: Settings;
  focus: FocusSession | null;
  focusLog: FocusLogEntry[];
  grants: Record<string, number>; // groupId -> granted until (ms)
  proceeds: Record<string, ProceedRecord>; // groupId -> proceed tally
  guardianDomains: string[];
  guardianCustomDomains: string[];
  guardianIsPremium: boolean;
  licenseKey: string;
  licensePayload: any;
  adultPackActive: boolean;
  socialPackActive: boolean;
  blockedDomains: string[];
  // Cloud Sync & Account / Console Pairing state
  cloudAuthSession: CloudAuthSession | null;
  cloudAuthToken: string;
  cloudDeviceId: string;
  cloudDeviceName: string;
  isPairedWithConsole: boolean;
  isConsoleManaged: boolean;
  cachedPolicyPayload: PolicyPayloadV2 | null;
  lastPolicySyncTimestamp: number;
  lastSyncError: string;
  preSyncSnapshot: PreSyncRuleSnapshot | null;
}

export const DEFAULT_SETTINGS: Settings = {
  groups: [],
  focusGroups: [],
  harmfulContentEnabled: true,
  adultContentEnabled: true,
  safeSearchEnabled: true,
  theme: "cosmic",
  syncRulesEnabled: true,
  syncAppUsageEnabled: true,
  syncWebUsageEnabled: true,
  smartRecommendationsEnabled: true,
  strictMode: false,
  allowUnblur: true,
  blockedKeywords: [],
  blockedCategories: ["adult", "harmful"],
  reelBlocker: defaultReelBlocker(),
  focusModePolicy: defaultFocusModePolicy(),
  policySchedules: [],
  launchLimits: [],
  namedBlockLists: {},
  blockedApps: [],
  personalCloudSyncEnabled: true,
};

const DEFAULTS: StoreShape = {
  usage: {},
  settings: DEFAULT_SETTINGS,
  focus: null,
  focusLog: [],
  grants: {},
  proceeds: {},
  guardianDomains: [],
  guardianCustomDomains: [],
  guardianIsPremium: false,
  licenseKey: "",
  licensePayload: null,
  adultPackActive: false,
  socialPackActive: false,
  blockedDomains: [],
  cloudAuthSession: null,
  cloudAuthToken: "",
  cloudDeviceId: "",
  cloudDeviceName: "AmniShield Browser Extension",
  isPairedWithConsole: false,
  isConsoleManaged: false,
  cachedPolicyPayload: null,
  lastPolicySyncTimestamp: 0,
  lastSyncError: "",
  preSyncSnapshot: null,
};

export async function get<K extends keyof StoreShape>(key: K): Promise<StoreShape[K]> {
  const res = await browser.storage.local.get(key);
  return (res[key] ?? DEFAULTS[key]) as StoreShape[K];
}

export async function set<K extends keyof StoreShape>(key: K, value: StoreShape[K]): Promise<void> {
  await browser.storage.local.set({ [key]: value });
}

export async function update<K extends keyof StoreShape>(
  key: K,
  mutate: (current: StoreShape[K]) => StoreShape[K],
): Promise<StoreShape[K]> {
  const next = mutate(await get(key));
  await set(key, next);
  return next;
}

export function watch(listener: (changed: Partial<StoreShape>) => void): () => void {
  const handler = (changes: Record<string, { newValue?: unknown }>, areaName: string) => {
    if (areaName !== "local") return;
    const changed: Partial<StoreShape> = {};
    for (const k of Object.keys(changes)) {
      (changed as Record<string, unknown>)[k] = changes[k].newValue;
    }
    listener(changed);
  };
  browser.storage.onChanged.addListener(handler);
  return () => browser.storage.onChanged.removeListener(handler);
}
