import { z } from "zod";
import {
  CAIP,
  PAY_TO,
  USDC,
  isSkill,
  productOf,
  quotedMicro,
  type SkillId,
} from "@/lib/mpp/catalog";
import { errCode } from "@/lib/mpp/fail";
import { countRecentSignatures, createPending, getSettings, sandboxTx, settleReceipt, sha256 } from "@/lib/mpp/ledger.server";
import { requireOwner } from "@/lib/mpp/owner.server";
import { beginOffer, finishOffer, quoteContext, readOffer, releaseOffer } from "@/lib/mpp/shop.server";
import { amountFor, parseSkillInput, runSkill } from "@/lib/mpp/skills.server";

const Body = z.object({
  skill: z.string().min(1),
  input: z.unknown().optional(),
  offerId: z.string().min(1).optional(),
});

const SettleBody = z.object({
  receiptId: z.string().min(1),
  paymentReference: z.string().min(1),
  network: z.enum(["base", "base-sepolia"]),
  settlementResponse: z.string().min(1),
});

const Payload = z.object({
  scheme: z.literal("exact"),
  network: z.enum(["base", "base-sepolia"]),
  asset: z.string().min(1),
  amount: z.string().regex(/^\d+$/),
  payTo: z.string().min(1),
  resource: z.string().min(1),
  facilitator: z.string().optional(),
});

export function json(data: unknown, status = 200, extra?: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extra,
    },
  });
}

function requirements(request: Request, skill: SkillId, amount: number) {
  const origin = new URL(request.url).origin;
  const network = "base-sepolia" as const;
  return {
    x402Version: 1,
    error: "payment_required",
    accepts: [
      {
        scheme: "exact",
        network,
        maxAmountRequired: String(amount),
        resource: `${origin}/api/mpp/skill`,
        description: `${productOf(skill)?.name ?? skill} · ${skill}`,
        mimeType: "application/json",
        payTo: PAY_TO,
        maxTimeoutSeconds: 60,
        asset: USDC[network],
        extra: {
          name: "USDC",
          version: "2",
          caip2: CAIP[network],
          sandbox: !process.env.X402_FACILITATOR_URL,
        },
      },
    ],
  };
}

function paymentHeader(request: Request): string {
  return (
    request.headers.get("payment-signature") ||
    request.headers.get("x-payment") ||
    ""
  ).trim();
}

function decodePayload(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) return JSON.parse(trimmed);
  return JSON.parse(Buffer.from(trimmed, "base64").toString("utf8"));
}

async function facilitate(raw: string, expected: { skill: SkillId; amount: number }) {
  const facilitator = process.env.X402_FACILITATOR_URL?.trim();
  if (facilitator) {
    const res = await fetch(facilitator, {
      method: "POST",
      signal: AbortSignal.timeout(12_000),
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        x402Version: 1,
        paymentSignature: raw,
        paymentRequirements: {
          scheme: "exact",
          network: "base-sepolia",
          maxAmountRequired: String(expected.amount),
          resource: expected.skill,
          payTo: PAY_TO,
          asset: USDC["base-sepolia"],
        },
      }),
    });
    const text = await res.text();
    if (!res.ok) return { ok: false as const, error: "facilitator_rejected", detail: text.slice(0, 180) };
    let body: { success?: unknown; transaction?: unknown; network?: unknown };
    try {
      body = JSON.parse(text) as { success?: unknown; transaction?: unknown; network?: unknown };
    } catch {
      return { ok: false as const, error: "facilitator_rejected", detail: "Facilitator reply was not JSON" };
    }
    if (body.success !== true || typeof body.transaction !== "string" || !body.transaction) {
      return { ok: false as const, error: "facilitator_rejected", detail: "Facilitator did not report success" };
    }
    return {
      ok: true as const,
      settlementResponse: text,
      paymentReference: body.transaction,
      network: typeof body.network === "string" ? body.network : "base-sepolia",
    };
  }

  let decoded: unknown;
  try {
    decoded = decodePayload(raw);
  } catch {
    return {
      ok: false as const,
      error: "facilitator_unconfigured",
      detail: "Base Sepolia sandbox needs a test signature. A live facilitator is not configured.",
    };
  }
  const parsed = Payload.safeParse(decoded);
  if (!parsed.success || parsed.data.facilitator !== "sandbox") {
    return {
      ok: false as const,
      error: "facilitator_unconfigured",
      detail: "Live settlement needs a facilitator. The sandbox accepts a test signature on Base Sepolia.",
    };
  }
  const payload = parsed.data;
  if (payload.network !== "base-sepolia") {
    return {
      ok: false as const,
      error: "mainnet_needs_facilitator",
      detail: "Base mainnet is not auto-settled here. Use Base Sepolia or a facilitator.",
    };
  }
  if (payload.resource !== expected.skill) {
    return { ok: false as const, error: "payment_invalid", detail: "Signature resource does not match the skill." };
  }
  if (BigInt(payload.amount) !== BigInt(expected.amount)) {
    return { ok: false as const, error: "payment_invalid", detail: "Signature amount does not match the offer." };
  }
  if (payload.payTo.toLowerCase() !== PAY_TO.toLowerCase()) {
    return { ok: false as const, error: "payment_invalid", detail: "Signature payTo does not match the desk." };
  }
  if (payload.asset.toLowerCase() !== USDC["base-sepolia"].toLowerCase()) {
    return { ok: false as const, error: "payment_invalid", detail: "Signature asset is not Base Sepolia USDC." };
  }
  const reference = sandboxTx(sha256(raw));
  const settlementResponse = JSON.stringify({
    success: true,
    transaction: reference,
    network: "base-sepolia",
    facilitator: "trendy-spider-sandbox",
  });
  return { ok: true as const, settlementResponse, paymentReference: reference, network: "base-sepolia" };
}

export async function handleSkill(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_request" }, 400);
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return json({ error: "invalid_request", details: parsed.error.flatten() }, 400);
  if (!isSkill(parsed.data.skill)) return json({ error: "unknown_skill" }, 400);
  const skill = parsed.data.skill;
  let input: unknown;
  try {
    input = parseSkillInput(skill, parsed.data.input ?? {});
  } catch (error) {
    return json({ error: errCode(error) ?? "invalid_request" }, 400);
  }

  const settings = await getSettings();
  const quoted = quotedMicro(skill, settings.boosts);
  let amount = amountFor(skill, input, quoted);
  if (parsed.data.offerId) {
    try {
      amount = await readOffer(parsed.data.offerId, skill);
    } catch (error) {
      const code = errCode(error);
      const status = code === "offer_taken" ? 409 : code === "offer_not_found" ? 404 : 400;
      return json({ error: code ?? "offer_not_found" }, status);
    }
  }

  const signature = paymentHeader(request);
  if (!signature) {
    const challenge = requirements(request, skill, amount);
    return json(challenge, 402, {
      "PAYMENT-REQUIRED": Buffer.from(JSON.stringify(challenge)).toString("base64"),
    });
  }

  if ((await countRecentSignatures()) >= 30) return json({ error: "rate_limited" }, 429);

  let claimed = false;
  try {
    if (parsed.data.offerId) {
      amount = await beginOffer(parsed.data.offerId, skill);
      claimed = true;
    }
    const cleared = await facilitate(signature, { skill, amount });
    if (!cleared.ok) {
      if (claimed && parsed.data.offerId) await releaseOffer(parsed.data.offerId);
      return json(
        { error: cleared.error, detail: cleared.detail, ...requirements(request, skill, amount) },
        402,
      );
    }

    let output: Record<string, unknown>;
    let source: string;
    try {
      const ran = await runSkill(skill, input, await quoteContext());
      output = ran.output as Record<string, unknown>;
      source = ran.source;
    } catch (error) {
      if (claimed && parsed.data.offerId) await releaseOffer(parsed.data.offerId);
      const code = errCode(error);
      return json({ error: code ?? "skill_failed" }, code === "invalid_request" ? 400 : 502);
    }

    const pending = await createPending({
      type: skill === "prepaid-pass" ? "pass" : "close",
      skill,
      buyer: "shopper",
      amountMicroUsdc: amount,
      reason: "paid skill",
      signatureHash: sha256(signature),
      reference: cleared.paymentReference,
    });
    if (parsed.data.offerId) await finishOffer(parsed.data.offerId, pending.line.id);

    return json(
      {
        ok: true,
        skill,
        receiptId: pending.line.id,
        status: pending.line.status,
        amountMicroUsdc: amount,
        network: cleared.network,
        settlementResponse: cleared.settlementResponse,
        sandboxReference: cleared.paymentReference,
        output,
        source,
      },
      200,
      { "PAYMENT-RESPONSE": Buffer.from(cleared.settlementResponse).toString("base64") },
    );
  } catch (error) {
    if (claimed && parsed.data.offerId) await releaseOffer(parsed.data.offerId).catch(() => undefined);
    const code = errCode(error);
    const status =
      code === "payment_signature_replayed" || code === "offer_taken"
        ? 409
        : code === "rate_limited"
          ? 429
          : code === "skill_failed"
            ? 502
            : 500;
    return json({ error: code ?? "skill_failed" }, status);
  }
}

export async function handleSettle(request: Request): Promise<Response> {
  const owner = requireOwner(request);
  if (!owner) return json({ error: "unauthorized" }, 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_request" }, 400);
  }
  const parsed = SettleBody.safeParse(body);
  if (!parsed.success) {
    return json({ error: "invalid_request", details: parsed.error.flatten() }, 400);
  }
  const { receiptId, paymentReference, network, settlementResponse } = parsed.data;
  try {
    const result = await settleReceipt({
      receiptId,
      paymentReference: paymentReference.trim(),
      network,
      settlementResponse,
      settledBy: owner.id,
    });
    return json({
      ok: true,
      receiptId,
      status: result.status,
      amountMicroUsdc: result.amountMicroUsdc,
      paymentReference: paymentReference.trim(),
    });
  } catch (error) {
    const code = errCode(error);
    const status =
      code === "receipt_not_found"
        ? 404
        : code === "already_settled" || code === "payment_reference_used"
          ? 409
          : code === "settlement_not_successful"
            ? 400
            : 500;
    return json({ error: code ?? "settlement_failed" }, status);
  }
}
