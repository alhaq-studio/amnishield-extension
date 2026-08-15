import { get, set } from "./storage";

export interface GuardianStatus {
  status: "online";
  is_premium?: boolean;
  web_filter_enabled?: boolean;
  focus_mode_active?: boolean;
  adult_pack_active?: boolean;
  social_pack_active?: boolean;
  custom_domains?: string[];
  banned_apps_count?: number;
  banned_domains_count?: number;
  banned_domains?: string[];
}

const GUARDIAN_API_URL = "http://127.0.0.1:48192/status";
const GUARDIAN_UPDATE_DOMAINS_URL = "http://127.0.0.1:48192/update-domains";
const SYNC_TIMEOUT_MS = 2000;

/**
 * Silently polls the local AmniShield Windows Guardian HTTP API.
 * Returns GuardianStatus if online, or null if Guardian is offline / not installed.
 */
export async function pollGuardianStatus(): Promise<GuardianStatus | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS);

  try {
    const res = await fetch(GUARDIAN_API_URL, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) return null;
    const data = (await res.json()) as GuardianStatus;

    if (data.status === "online") {
      if (typeof data.is_premium === "boolean") {
        void set("guardianIsPremium", data.is_premium);
      }

      if (typeof data.adult_pack_active === "boolean") {
        void set("adultPackActive", data.adult_pack_active);
      }

      if (typeof data.social_pack_active === "boolean") {
        void set("socialPackActive", data.social_pack_active);
      }

      if (Array.isArray(data.custom_domains)) {
        void set("guardianCustomDomains", data.custom_domains);
      }

      if (Array.isArray(data.banned_domains)) {
        void set("guardianDomains", data.banned_domains);
      }
    }

    return data;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

/**
 * Posts updated custom domain rules back to AmniShield Windows app.
 */
export async function postUpdateDomainsToGuardian(domains: string[]): Promise<boolean> {
  try {
    const res = await fetch(GUARDIAN_UPDATE_DOMAINS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocked_domains: domains }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
