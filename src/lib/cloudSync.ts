import { get, set } from "./storage";

const SUPABASE_URL = "https://jrgpmcomvibgklmvnxud.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyZ3BtY29tdmliZ2tsbXZueHVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MTQ1MjMsImV4cCI6MjA4NjQ5MDUyM30.4iL_L3W4h4l2_359UvjG52b575B5L74c653L7493b8E";

export interface CloudPolicyPayload {
  blocked_domains?: string[];
  blocked_keywords?: string[];
  blocked_categories?: string[];
  strict_mode?: boolean;
}

export interface CloudSyncStatus {
  isLoggedIn: boolean;
  userEmail?: string;
  lastSyncedAt?: number;
  syncError?: string;
}

/**
 * Fetches the user's latest policy payload from Supabase cloud.
 */
export async function pullCloudPolicy(): Promise<CloudPolicyPayload | null> {
  const token = await get("cloudAuthToken" as any);
  const deviceId = await get("cloudDeviceId" as any);

  if (!token && !deviceId) {
    return null;
  }

  try {
    let url = `${SUPABASE_URL}/rest/v1/devices?select=id,policy_payload`;
    if (deviceId) {
      url += `&id=eq.${deviceId}`;
    }

    const headers: Record<string, string> = {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
    };

    const res = await fetch(url, { method: "GET", headers });
    if (!res.ok) return null;

    const data = await res.json();
    if (Array.isArray(data) && data.length > 0 && data[0].policy_payload) {
      const payload = data[0].policy_payload as CloudPolicyPayload;
      
      // Update local storage with cloud policy
      if (Array.isArray(payload.blocked_domains)) {
        await set("guardianCustomDomains" as any, payload.blocked_domains);
      }
      if (typeof payload.strict_mode === "boolean") {
        await set("adultPackActive" as any, payload.strict_mode);
      }
      return payload;
    }
    return null;
  } catch (err) {
    console.warn("AmniShield Extension: Cloud sync pull failed", err);
    return null;
  }
}

/**
 * Pushes custom blocked domains back to Supabase cloud.
 */
export async function pushCloudDomains(domains: string[]): Promise<boolean> {
  const token = await get("cloudAuthToken" as any);
  const deviceId = await get("cloudDeviceId" as any);

  if (!deviceId) return false;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/devices?id=eq.${deviceId}`, {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        policy_payload: { blocked_domains: domains },
        last_heartbeat: new Date().toISOString(),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
