export type Scale = {
  map: (v: number) => number;
  ticks: { value: number; label: string }[];
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function axisTitle(label: string, unit: string): string {
  return unit ? `${label} (${unit})` : label;
}

export function toNumber(x: number | string, kind: "linear" | "log" | "time"): number {
  return kind === "time" ? Date.parse(String(x)) : Number(x);
}

function padDomain(min: number, max: number, kind: "linear" | "log" | "time"): [number, number] {
  if (min !== max) return [min, max];
  if (kind === "log") return [min / 2, max * 2];
  if (kind === "time") return [min - 86_400_000, max + 86_400_000];
  const pad = Math.abs(min) * 0.1 || 1;
  return [min - pad, max + pad];
}

function formatNumber(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e6) return `${+(v / 1e6).toPrecision(3)}M`;
  if (abs >= 1e4) return `${+(v / 1e3).toPrecision(3)}k`;
  return `${+v.toPrecision(3)}`;
}

function linearTicks(min: number, max: number, count: number): number[] {
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => (max - min) / s <= count) ?? 10 * mag;
  const ticks: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) ticks.push(+v.toPrecision(12));
  return ticks;
}

function logTicks(min: number, max: number): number[] {
  const out: number[] = [];
  for (const mults of [[1], [1, 3], [1, 2, 5]]) {
    out.length = 0;
    for (let e = Math.floor(Math.log10(min)); e <= Math.ceil(Math.log10(max)); e++) {
      for (const m of mults) {
        const v = m * 10 ** e;
        if (v >= min && v <= max) out.push(v);
      }
    }
    if (out.length >= 4) break;
  }
  return out;
}

function timeTicks(min: number, max: number, count: number): number[] {
  return Array.from({ length: count + 1 }, (_, i) => min + ((max - min) * i) / count);
}

export function makeScale(
  values: number[],
  kind: "linear" | "log" | "time",
  range: [number, number],
  tickCount = 5,
): Scale {
  let [min, max] = padDomain(Math.min(...values), Math.max(...values), kind);
  let ticks: number[];
  if (kind === "log") {
    min = 10 ** (Math.floor(Math.log10(min) * 2) / 2);
    max = 10 ** (Math.ceil(Math.log10(max) * 2) / 2);
    ticks = logTicks(min, max);
  } else if (kind === "time") {
    ticks = timeTicks(min, max, Math.max(tickCount - 1, 3));
  } else {
    ticks = linearTicks(min, max, tickCount);
    min = Math.min(min, ticks[0]);
    max = Math.max(max, ticks[ticks.length - 1]);
    if (ticks.length < 4) ticks = linearTicks(min, max, tickCount + 2);
  }
  const f = kind === "log" ? Math.log10 : (v: number) => v;
  const [a, b] = [f(min), f(max)];
  const map = (v: number) => range[0] + ((f(v) - a) / (b - a)) * (range[1] - range[0]);
  const label = (v: number) => {
    if (kind !== "time") return formatNumber(v);
    const d = new Date(v);
    return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  };
  return { map, ticks: ticks.map((value) => ({ value, label: label(value) })) };
}

export function spreadLabels(ys: number[], minGap: number): boolean {
  const sorted = [...ys].sort((p, q) => p - q);
  return sorted.every((y, i) => i === 0 || y - sorted[i - 1] >= minGap);
}
