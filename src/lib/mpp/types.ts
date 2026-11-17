import type { SkillId } from "./catalog";

export type LedgerLine = {
  id: string;
  createdAt: string;
  type: "close" | "pass" | "sale";
  skill: string;
  channel: string;
  buyer: string;
  amountMicroUsdc: number;
  commissionMicroUsdc: number;
  status: "pending_settlement" | "settled";
  paymentReference: string | null;
  network: string | null;
  settledAt: string | null;
  notes: string;
};

export type Listing = {
  id: string;
  createdAt: string;
  stockItem: string;
  title: string;
  body: string;
  askMicroUsdc: number | null;
  status: "draft" | "closed";
};

export type HotRow = {
  skill: SkillId;
  name: string;
  looks: number;
  accepts: number;
  quoteMicro: number;
  boostBps: number;
  rank: number;
};

export type DemandHit = {
  id: string;
  label: string;
  skill: SkillId;
  source: "user" | "loop";
  at: string;
};

export type OfferView = {
  id: string;
  skill: SkillId;
  pitch: string;
  amountMicroUsdc: number;
  status: "sent" | "accepted" | "accepting";
  queryLabel: string;
  source: "user" | "loop";
  buyer: string;
  createdAt: string;
  receiptId: string | null;
  input: unknown | null;
  sandboxReference: string | null;
};

export type ShopState = {
  hot: HotRow[];
  demand: DemandHit[];
  offers: OfferView[];
  network: "base-sepolia";
  payTo: string;
  asset: string;
};

export type TillState = {
  pending: LedgerLine[];
  lines: LedgerLine[];
  listings: Listing[];
  commissionPct: number | null;
  totals: { pendingMicro: number; settledMicro: number; commissionMicro: number };
  loopTicks: number;
};

export type PaymentRequired = {
  x402Version: number;
  error: string;
  accepts: {
    scheme: string;
    network: string;
    maxAmountRequired: string;
    resource: string;
    description: string;
    mimeType: string;
    payTo: string;
    maxTimeoutSeconds: number;
    asset: string;
    extra?: { name?: string; version?: string; caip2?: string; sandbox?: boolean };
  }[];
};
