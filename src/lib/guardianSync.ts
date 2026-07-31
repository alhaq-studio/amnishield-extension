import { set } from "./storage";

export interface GuardianStatus {
  status: "online";
  focus_mode_active: boolean;
  banned_apps_count: number;
  banned_domains_count: number;
  banned_domains?: string[];
}

const GUARDIAN_API_URL = "http://127.0.0.1:48192/status";
const SYNC_TIMEOUT_MS = 2000;

/**
 * Silently polls the local AmnShield Windows Guardian HTTP API.
 * Returns GuardianStatus if online, or null if Guardian is offline / not installed.
 * Never throws an error, ensuring 100% standalone autonomy.
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

    if (data.status === "online" && Array.isArray(data.banned_domains)) {
      const activeDomains = data.focus_mode_active ? data.banned_domains : [];
      void set("guardianDomains", activeDomains);
    }

    return data;
  } catch {
    clearTimeout(timer);
    // Silent fallback for standalone mode
    return null;
  }
}
