export const DEFAULT_CAMPUS = "Zomba Main Campus";
export const DEFAULT_SEMESTER = 1;
export const DEFAULT_FEES = 1300000;
export const DEFAULT_STATUS = "Active";

/** Remaining Years = Expected Finish Year − current calendar year, never negative. */
export function remainingYears(finish: number | null | undefined, now: Date = new Date()): number | null {
  if (finish == null || !Number.isFinite(finish)) return null;
  return Math.max(0, finish - now.getFullYear());
}

export function fmtMWK(n: number | string | null | undefined): string {
  const v = Number(n ?? DEFAULT_FEES);
  return `${v.toLocaleString("en-US")} MWK`;
}

type S = { university?: string | null; institution?: string | null };
export const universityOf = (s: S) => s.university || s.institution || "UNIMA";
