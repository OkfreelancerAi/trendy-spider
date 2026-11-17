import { timingSafeEqual } from "node:crypto";

function same(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function requireOwner(request: Request): { id: string } | null {
  const expected = process.env.OWNER_KEY?.trim() || "spider-owner";
  const got = request.headers.get("x-owner-key")?.trim() ?? "";
  if (!got || !same(got, expected)) return null;
  return { id: "owner" };
}
