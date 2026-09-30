// Deterministic (non-AI) fuzzy name matching.
// Case-insensitive, whitespace/punctuation normalized, tolerant of typos,
// missing letters and swapped adjacent letters (Damerau-Levenshtein / OSA).

export function normalizeName(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function osaDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const d: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i]![0] = i;
  for (let j = 0; j <= n; j++) d[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, d[i - 2]![j - 2]! + 1);
      }
      d[i]![j] = v;
    }
  }
  return d[m]![n]!;
}

function sim(a: string, b: string): number {
  const max = Math.max(a.length, b.length);
  if (!max) return 1;
  return 1 - osaDistance(a, b) / max;
}

/** Similarity 0..1 between typed input and an official name. */
export function nameSimilarity(input: string, official: string): number {
  const a = normalizeName(input);
  const b = normalizeName(official);
  if (!a || !b) return 0;
  if (a === b) return 1;

  const ta = a.split(" ");
  const tb = b.split(" ");

  // 1. Whole-string similarity (spaces removed).
  const whole = sim(a.replace(/ /g, ""), b.replace(/ /g, ""));
  // 2. Order-insensitive whole-string similarity.
  const sorted = sim([...ta].sort().join(""), [...tb].sort().join(""));
  // 3. Token alignment: each input token matched to its best official token.
  const used = new Set<number>();
  let tokenSum = 0;
  for (const t of ta) {
    let best = 0;
    let bestIdx = -1;
    tb.forEach((o, idx) => {
      if (used.has(idx)) return;
      const s = sim(t, o);
      if (s > best) {
        best = s;
        bestIdx = idx;
      }
    });
    if (bestIdx >= 0) used.add(bestIdx);
    tokenSum += best;
  }
  // Penalise unmatched official tokens lightly (middle names can be omitted).
  const coverage = used.size / tb.length;
  const token = (tokenSum / ta.length) * (0.85 + 0.15 * coverage);

  return Math.max(whole, sorted, token);
}

export const MATCH_THRESHOLD = 0.72;
