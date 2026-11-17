export function formatUsd(micro: number): string {
  const neg = micro < 0;
  const v = Math.abs(Math.round(micro));
  const whole = Math.floor(v / 1_000_000);
  const frac = String(v % 1_000_000).padStart(6, "0");
  let show = frac.slice(0, 4).replace(/0+$/, "");
  if (show.length < 2) show = show.padEnd(2, "0");
  return `${neg ? "-" : ""}$${whole.toString()}.${show}`;
}

export function formatBoost(bps: number): string {
  if (!bps) return "floor";
  const s = (bps / 100).toFixed(2).replace(/\.?0+$/, "");
  return `+${s}%`;
}

export function sandboxRefFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const match = notes.match(/ref:(0x[a-fA-F0-9]{64})/);
  return match ? match[1] : null;
}

export function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

export function usdToMicro(usd: number): number {
  return Math.round(usd * 1_000_000);
}
