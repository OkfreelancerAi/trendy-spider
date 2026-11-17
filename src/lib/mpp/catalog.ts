export type SkillId =
  | "freddy-scan"
  | "claw-listing"
  | "invoice-nudge"
  | "tape-scout"
  | "route-mesh"
  | "settle-check"
  | "prepaid-pass";

export type Product = {
  skill: SkillId;
  name: string;
  role: string;
  sample: string;
  leg: boolean;
};

export const PRODUCTS: Product[] = [
  {
    skill: "freddy-scan",
    name: "Freddy",
    role: "Room note from the details you actually gave",
    sample: "North office, one window, desk on the left wall, a plant in the corner",
    leg: true,
  },
  {
    skill: "claw-listing",
    name: "Weaver",
    role: "Three listings for one piece of stock",
    sample: "Matte black field recorder, stereo mics, scuffed case",
    leg: true,
  },
  {
    skill: "invoice-nudge",
    name: "Nudge",
    role: "A polite chase, never a threat",
    sample: "Invoice 1844 for Northwind, $640, 21 days overdue",
    leg: true,
  },
  {
    skill: "tape-scout",
    name: "Scout",
    role: "Reads this floor's quote tape",
    sample: "What is hot on the floor right now",
    leg: true,
  },
  {
    skill: "route-mesh",
    name: "Router",
    role: "Assigns the job to one leg",
    sample: "Which subagent should take a room read",
    leg: true,
  },
  {
    skill: "settle-check",
    name: "Teller",
    role: "Checks a payment response before you book it",
    sample: "Check a Base Sepolia settlement before booking it",
    leg: true,
  },
  {
    skill: "prepaid-pass",
    name: "Pass",
    role: "Prepaid balance for later skills",
    sample: "A five dollar pass for later skills",
    leg: false,
  },
];

/** Floors in micro-USDC (6 decimals). The quote loop may lift these, never cut them. */
export const FLOOR_MICRO: Record<SkillId, number> = {
  "invoice-nudge": 50_000,
  "claw-listing": 100_000,
  "freddy-scan": 250_000,
  "tape-scout": 80_000,
  "route-mesh": 120_000,
  "settle-check": 40_000,
  "prepaid-pass": 1_000_000,
};

export const PASS_TIERS = [1, 5, 20] as const;
export type PassTier = (typeof PASS_TIERS)[number];

export const PAY_TO = `0x51de${"0".repeat(32)}a11e`;
export const USDC = {
  "base-sepolia": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
} as const;
export const CAIP = {
  "base-sepolia": "eip155:84532",
  base: "eip155:8453",
} as const;

export const FREDDY_DISCLAIMER = "Traditional guidance for inspiration only.";
export const MARKET_DISCLAIMER =
  "Operator color only. Not financial, trading, or investment advice.";

export const COUNTERPARTIES = [
  "north-whisker",
  "lane-keeper",
  "glass-orbit",
  "kiln-dao",
  "paper-mite",
  "velvet-route",
] as const;

const KEYWORDS: { skill: SkillId; words: string[] }[] = [
  {
    skill: "freddy-scan",
    words: ["room", "office", "window", "desk", "home", "apartment", "bedroom", "feng", "light", "plant"],
  },
  { skill: "invoice-nudge", words: ["invoice", "overdue", "unpaid", "bill"] },
  {
    skill: "claw-listing",
    words: ["listing", "listings", "sell", "stock", "recorder", "marketplace", "product"],
  },
  { skill: "settle-check", words: ["settle", "settlement", "transaction", "hash", "0x"] },
  { skill: "route-mesh", words: ["which agent", "subagent", "route", "assign", "who should"] },
  { skill: "tape-scout", words: ["hot", "demand", "trending", "quote", "price", "floor"] },
  { skill: "prepaid-pass", words: ["pass", "prepaid", "credit", "balance"] },
];

export function isSkill(id: string): id is SkillId {
  return PRODUCTS.some((p) => p.skill === id);
}

export function productOf(skill: string): Product | undefined {
  return PRODUCTS.find((p) => p.skill === skill);
}

export function matchSkill(query: string, explicit?: string, hottest?: SkillId): SkillId {
  if (explicit && isSkill(explicit)) return explicit;
  const q = query.toLowerCase();
  let best: SkillId = hottest && isSkill(hottest) ? hottest : "freddy-scan";
  let score = 0;
  for (const rule of KEYWORDS) {
    const hits = rule.words.reduce((n, w) => n + (q.includes(w) ? 1 : 0), 0);
    if (hits > score) {
      score = hits;
      best = rule.skill;
    }
  }
  return best;
}

export function tagsFor(query: string): string[] {
  const q = query.toLowerCase();
  const tags = [
    "room",
    "office",
    "window",
    "desk",
    "home",
    "invoice",
    "overdue",
    "listing",
    "sell",
    "stock",
    "settle",
    "quote",
    "agent",
    "pass",
    "light",
    "plant",
    "recorder",
  ].filter((w) => q.includes(w));
  return tags.length ? tags.slice(0, 8) : ["look"];
}

export function quotedMicro(skill: SkillId, boosts: Record<string, number>): number {
  const floor = FLOOR_MICRO[skill];
  if (skill === "prepaid-pass") return floor;
  const bps = Math.min(4000, Math.max(0, Math.round(boosts[skill] ?? 0)));
  return Math.round((floor * (10_000 + bps)) / 10_000);
}

export function nextBoosts(boosts: Record<string, number>, skill: SkillId): Record<string, number> {
  if (skill === "prepaid-pass") return { ...boosts };
  const next = { ...boosts };
  for (const p of PRODUCTS) {
    if (p.skill === "prepaid-pass") continue;
    if (p.skill === skill) next[p.skill] = Math.min(4000, (next[p.skill] ?? 0) + 150);
    else next[p.skill] = Math.max(0, (next[p.skill] ?? 0) - 40);
  }
  return next;
}

export function passTier(query: string): PassTier {
  const q = query.toLowerCase();
  if (/\b20\b|twenty/.test(q)) return 20;
  if (/\b5\b|five/.test(q)) return 5;
  return 1;
}

export function catalogHot(): {
  skill: SkillId;
  name: string;
  looks: number;
  accepts: number;
  quoteMicro: number;
  boostBps: number;
  rank: number;
}[] {
  return PRODUCTS.map((p, i) => ({
    skill: p.skill,
    name: p.name,
    looks: 0,
    accepts: 0,
    quoteMicro: FLOOR_MICRO[p.skill],
    boostBps: 0,
    rank: i + 1,
  }));
}
