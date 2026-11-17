export const DEFAULT_OWNER_KEY = "spider-owner";
const KEY = "spider-owner-key";

export function ownerKey(): string {
  if (typeof localStorage === "undefined") return DEFAULT_OWNER_KEY;
  return localStorage.getItem(KEY) || DEFAULT_OWNER_KEY;
}

export function saveOwnerKey(key: string) {
  localStorage.setItem(KEY, key.trim());
}

export function ownerHeaders(): HeadersInit {
  return { "content-type": "application/json", "x-owner-key": ownerKey() };
}
