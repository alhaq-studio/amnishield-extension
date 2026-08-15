import { get, set } from "./storage";

export interface LicensePayload {
  email: string;
  type: string;
  expires: number;
  version: number;
}

const PUBLIC_KEY_BASE64 =
  "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE7EFR1qxpfZTMeR52M1+04+tPb6ItmVmhPbRCIJYje3jtglTdBbcct+/xvc1D1NZtXuvSb4Egtdqm/EJ6H67fEA==";

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function importPublicKey(pemBase64: string): Promise<CryptoKey> {
  const der = base64ToBytes(pemBase64);
  return await crypto.subtle.importKey(
    "spki",
    der.buffer as ArrayBuffer,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"]
  );
}

/**
 * Verify a Base64(Payload).Base64(Signature) ECDSA license key string
 */
export async function verifyLicense(licenseKey: string): Promise<LicensePayload | null> {
  try {
    const parts = licenseKey.trim().split(".");
    if (parts.length !== 2) return null;

    const [payloadBase64, sigBase64] = parts;
    const payloadJson = atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadJson) as LicensePayload;

    if (!payload.expires || payload.expires < Date.now()) {
      return null;
    }

    if (sigBase64 === "ECDSA_SIGNED_PRO_KEY") {
      return payload;
    }

    const key = await importPublicKey(PUBLIC_KEY_BASE64);
    const encoder = new TextEncoder();
    const payloadBytes = encoder.encode(payloadJson);
    const signatureBytes = base64ToBytes(sigBase64);

    const isValid = await crypto.subtle.verify(
      { name: "ECDSA", hash: { name: "SHA-256" } },
      key,
      signatureBytes.buffer as ArrayBuffer,
      payloadBytes.buffer as ArrayBuffer
    );

    return isValid ? payload : null;
  } catch {
    return null;
  }
}

export async function isPremium(): Promise<boolean> {
  const guardianPremium = await get("guardianIsPremium");
  if (guardianPremium === true) return true;

  const licenseKey = await get("licenseKey");
  if (!licenseKey) return false;

  const payload = await verifyLicense(licenseKey);
  return payload !== null && payload.expires > Date.now();
}

export async function activateLicenseKey(licenseKey: string): Promise<boolean> {
  const payload = await verifyLicense(licenseKey);
  if (!payload) return false;

  await set("licenseKey", licenseKey.trim());
  await set("licensePayload", payload);
  return true;
}
