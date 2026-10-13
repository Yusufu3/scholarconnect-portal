export const DEFAULT_CAMPUS = "Zomba Main Campus";
export const DEFAULT_SEMESTER = 1;
export const DEFAULT_FEES = 1300000;
export const DEFAULT_STATUS = "Active";

/** Remaining Years = Expected Finish Year − current calendar year, never negative. */
export function remainingYears(finish: number | null | undefined, now: Date = new Date()): number | null {
  if (finish == null || !Number.isFinite(finish)) return null;
  return Math.max(0, finish - now.getFullYear());
}

/** Expected Finish Year from Year of Study: Year 1 → 2030, 2 → 2029, 3 → 2028, 4 → 2027, 5 → 2026. */
export function expectedFinishFromStudy(year: string | number | null | undefined): number | null {
  const n = Number(year);
  if (!Number.isInteger(n) || n < 1 || n > 5) return null;
  return 2031 - n;
}

/** Remaining Years = 4 − Year of Study, never negative. */
export function remainingYearsFromStudy(year: string | number | null | undefined): number | null {
  const n = Number(year);
  if (!Number.isInteger(n) || n < 1 || n > 5) return null;
  return Math.max(0, 4 - n);
}

type StudySource = {
  expected_finish_year?: number | string | null;
  registration?: { year_of_study?: string | null } | null;
};

/** Expected Finish Year: derived from Year of Study when known, otherwise the stored value. */
export function finishYearOf(s: StudySource): number | null {
  const fromStudy = expectedFinishFromStudy(s.registration?.year_of_study);
  if (fromStudy != null) return fromStudy;
  const raw = s.expected_finish_year;
  if (raw == null || raw === "") return null;
  const stored = Number(raw);
  return Number.isFinite(stored) ? stored : null;
}

/** Remaining Years: 4 − Year of Study when known, otherwise Expected Finish Year − current year. */
export function remainingOf(s: StudySource): number | null {
  const fromStudy = remainingYearsFromStudy(s.registration?.year_of_study);
  if (fromStudy != null) return fromStudy;
  return remainingYears(finishYearOf(s));
}

export function fmtMWK(n: number | string | null | undefined): string {
  const v = Number(n ?? DEFAULT_FEES);
  return `${v.toLocaleString("en-US")} MWK`;
}

type S = { university?: string | null; institution?: string | null };
export const universityOf = (s: S) => s.university || s.institution || "UNIMA";
