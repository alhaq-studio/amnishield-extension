export async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function randomSalt(bytes = 16): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  const b64 = btoa(String.fromCharCode(...arr));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function hashWithSalt(value: string, salt: string): Promise<string> {
  return sha256Hex(`${salt}|${value}`);
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let res = 0;
  for (let i = 0; i < a.length; i++) {
    res |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return res === 0;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomSalt(16);
  const hash = await hashWithSalt(password, salt);
  return `v2$${salt}$${hash}`;
}

export async function verifyPassword(input: string, stored?: string): Promise<boolean> {
  if (!stored) return false;
  if (!stored.startsWith("v2$")) {
    return stored === input;
  }
  const parts = stored.substring(3).split("$");
  if (parts.length !== 2) return false;
  const salt = parts[0];
  const expected = parts[1];
  const actual = await hashWithSalt(input, salt!);
  return timingSafeEqual(expected, actual);
}

export async function hashSecurityAnswer(answer: string): Promise<string> {
  const salt = randomSalt(16);
  const cleanAnswer = answer.trim().toLowerCase();
  const hash = await hashWithSalt(cleanAnswer, salt);
  return `v2$${salt}$${hash}`;
}

export async function verifySecurityAnswer(input: string, stored?: string): Promise<boolean> {
  if (!stored) return false;
  const cleanInput = input.trim().toLowerCase();
  if (!stored.startsWith("v2$")) {
    return stored.trim().toLowerCase() === cleanInput;
  }
  const parts = stored.substring(3).split("$");
  if (parts.length !== 2) return false;
  const salt = parts[0];
  const expected = parts[1];
  const actual = await hashWithSalt(cleanInput, salt!);
  return timingSafeEqual(expected, actual);
}
