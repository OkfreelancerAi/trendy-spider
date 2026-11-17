import { z } from "zod";
import { errCode } from "@/lib/mpp/fail";
import { ledgerCsv, markSold, saveListings } from "@/lib/mpp/ledger.server";
import { requireOwner } from "@/lib/mpp/owner.server";
import { json } from "@/lib/mpp/pay.server";
import { demoPayload, getShop, getTill, recordLook, runLoop } from "@/lib/mpp/shop.server";
import { runListings } from "@/lib/mpp/skills.server";

const LookBody = z.object({
  query: z.string().trim().min(2).max(500),
  skill: z.string().optional(),
});

const ListBody = z.object({
  item: z.string().trim().min(2).max(500),
});

const SaleBody = z.object({
  listingId: z.string().min(1),
  soldUsd: z.number().positive().max(1_000_000),
  commissionPct: z.number().min(0).max(40).optional(),
  buyer: z.string().trim().max(40).optional(),
});

function statusFor(code: string | undefined, table: Record<string, number>, fallback = 500) {
  return code && code in table ? table[code] : fallback;
}

export async function handleDemo() {
  try {
    return json(await demoPayload());
  } catch {
    return json({ error: "demo_failed" }, 500);
  }
}

export async function handleShopGet() {
  try {
    return json(await getShop());
  } catch {
    return json({ error: "shop_failed" }, 500);
  }
}

export async function handleLook(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_request" }, 400);
  }
  const parsed = LookBody.safeParse(body);
  if (!parsed.success) return json({ error: "invalid_request", details: parsed.error.flatten() }, 400);
  try {
    const result = await recordLook({
      query: parsed.data.query,
      skill: parsed.data.skill,
      source: "user",
      accept: false,
    });
    return json({ ok: true, ...result });
  } catch (error) {
    const code = errCode(error);
    return json({ error: code ?? "look_failed" }, statusFor(code, { look_limited: 429 }));
  }
}

export async function handleDesk(request: Request) {
  if (!requireOwner(request)) return json({ error: "unauthorized" }, 401);
  try {
    return json(await getTill());
  } catch {
    return json({ error: "desk_failed" }, 500);
  }
}

export async function handleLoop(request: Request) {
  if (!requireOwner(request)) return json({ error: "unauthorized" }, 401);
  try {
    return json({ ok: true, ...(await runLoop()) });
  } catch (error) {
    const code = errCode(error);
    return json({ error: code ?? "loop_failed" }, statusFor(code, { loop_throttled: 429 }));
  }
}

export async function handleLedger(request: Request) {
  if (!requireOwner(request)) return json({ error: "unauthorized" }, 401);
  const url = new URL(request.url);
  if (url.searchParams.get("format") === "csv") {
    const csv = await ledgerCsv();
    return new Response(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": "attachment; filename=\"trendy-spider-ledger.csv\"",
        "cache-control": "no-store",
      },
    });
  }
  const till = await getTill();
  return json({ lines: till.lines, pending: till.pending });
}

export async function handleListings(request: Request) {
  const owner = requireOwner(request);
  if (!owner) return json({ error: "unauthorized" }, 401);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_request" }, 400);
  }
  const parsed = ListBody.safeParse(body);
  if (!parsed.success) return json({ error: "invalid_request", details: parsed.error.flatten() }, 400);
  try {
    const written = await runListings(parsed.data.item);
    const listings = await saveListings(parsed.data.item, written.listings);
    return json({ ok: true, source: written.source, listings });
  } catch (error) {
    const code = errCode(error);
    return json({ error: code ?? "listing_failed" }, code === "skill_failed" ? 502 : 500);
  }
}

export async function handleSales(request: Request) {
  const owner = requireOwner(request);
  if (!owner) return json({ error: "unauthorized" }, 401);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_request" }, 400);
  }
  const parsed = SaleBody.safeParse(body);
  if (!parsed.success) return json({ error: "invalid_request", details: parsed.error.flatten() }, 400);
  if (parsed.data.commissionPct === undefined) return json({ error: "commission_required" }, 400);
  try {
    const line = await markSold({
      listingId: parsed.data.listingId,
      soldUsd: parsed.data.soldUsd,
      commissionPct: parsed.data.commissionPct,
      buyer: parsed.data.buyer || "desk",
      settledBy: owner.id,
    });
    return json({ ok: true, line });
  } catch (error) {
    const code = errCode(error);
    return json(
      { error: code ?? "sale_failed" },
      statusFor(code, { listing_not_found: 404, listing_closed: 409, commission_required: 400 }),
    );
  }
}
