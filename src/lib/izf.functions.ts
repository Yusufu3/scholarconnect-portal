import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { nameSimilarity, MATCH_THRESHOLD } from "./fuzzy";
import { publicDb } from "./public-db";

// All database work goes through protected database procedures callable with
// the public key only, so the app runs on any host (Lovable, Vercel, ...)
// without private server keys.
const tok = z.string().min(10).max(500);

function logServerError(context: string, error: unknown) {
  console.error(`[IZF] ${context}`, error);
}

function adminError(error: { message?: string } | null) {
  if (!error) return;
  if (error.message?.includes("Unauthorized")) throw new Error("Unauthorized");
  logServerError("admin call failed", error);
  throw new Error(error.message || "Request failed");
}

// ---------- Student ----------

export const matchStudent = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ name: z.string().trim().min(2).max(120) }).parse(d))
  .handler(async ({ data }) => {
    const { data: rows, error } = await publicDb().rpc("izf_candidates");
    if (error) {
      logServerError("matchStudent query failed", error);
      throw new Error("Could not search the list");
    }
    const scored = (rows ?? [])
      .map((r) => ({
        id: r.id,
        full_name: r.full_name,
        programme: r.programme,
        registered: !!r.registered,
        score: nameSimilarity(data.name, r.full_name),
      }))
      .filter((r) => r.score >= MATCH_THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    const top = scored[0];
    const second = scored[1];
    const strong = !!top && top.score >= 0.85 && (!second || top.score - second.score >= 0.08);
    return { strong, matches: scored.map(({ score: _s, ...r }) => r) };
  });

const regSchema = z.object({
  eligible_student_id: z.string().uuid(),
  first_name: z.string().trim().min(1, "Required").max(60),
  middle_name: z.string().trim().max(60).optional().default(""),
  surname: z.string().trim().min(1, "Required").max(60),
  personal_account_number: z
    .string()
    .trim()
    .regex(/^\d{12}$/, "Personal Account Number must be exactly 12 digits (numbers only)."),
  reg_number: z.string().trim().min(3, "Required").max(40),
  year_of_study: z.string().trim().min(1, "Required").max(20),
  programme: z.string().trim().min(2, "Required").max(150),
});

export const submitRegistration = createServerFn({ method: "POST" })
  .inputValidator((d) => regSchema.parse(d))
  .handler(async ({ data }) => {
    const { data: res, error } = await publicDb().rpc("izf_submit_registration", {
      _eligible_student_id: data.eligible_student_id,
      _first_name: data.first_name,
      _middle_name: data.middle_name ?? "",
      _surname: data.surname,
      _pan: data.personal_account_number,
      _reg_number: data.reg_number,
      _year: data.year_of_study,
      _programme: data.programme,
    });
    if (error) {
      logServerError("submitRegistration failed", error);
      return { ok: false as const, error: "Could not save. Please try again." };
    }
    const r = res as { ok: boolean; error?: string };
    if (!r?.ok) return { ok: false as const, error: r?.error || "Could not save. Please try again." };
    return { ok: true as const };
  });

// ---------- Admin ----------

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const { data: token, error } = await publicDb().rpc("izf_admin_login", { _password: data.password });
    if (error) {
      logServerError("adminLogin failed", error);
      return { ok: false as const, token: null, error: "Admin login is temporarily unavailable." };
    }
    if (!token) return { ok: false as const, token: null, error: "Incorrect password." };
    return { ok: true as const, token, error: null };
  });

export const adminStatus = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().max(500).optional() }).parse(d))
  .handler(async ({ data }) => {
    if (!data.token) return { admin: false };
    const { data: ok, error } = await publicDb().rpc("izf_admin_status", { _token: data.token });
    if (error) logServerError("adminStatus failed", error);
    return { admin: !!ok };
  });

type Registration = {
  id: string; eligible_student_id: string; first_name: string; middle_name: string | null;
  surname: string; personal_account_number: string; reg_number: string; year_of_study: string;
  programme: string; created_at: string;
};
type Student = {
  id: string; sn: number | null; full_name: string; reg_number: string | null; programme: string | null;
  institution: string; created_at: string; updated_at: string;
};

export const adminListStudents = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: tok }).parse(d))
  .handler(async ({ data: { token } }) => {
    const { data, error } = await publicDb().rpc("izf_admin_list", { _token: token });
    adminError(error);
    return ((data ?? []) as unknown as (Student & { registration: Registration | null })[]).map((r) => ({
      ...r,
      registration: r.registration ?? null,
    }));
  });

const studentSchema = z.object({
  sn: z.number().int().positive().nullable(),
  full_name: z.string().trim().min(2).max(120),
  reg_number: z.string().trim().max(40).nullable(),
  programme: z.string().trim().max(150).nullable(),
  institution: z.string().trim().min(1).max(60),
});

export const adminCreateStudent = createServerFn({ method: "POST" })
  .inputValidator((d) => studentSchema.extend({ token: tok }).parse(d))
  .handler(async ({ data: { token, ...d } }) => {
    const { error } = await publicDb().rpc("izf_admin_create_student", {
      _token: token, _sn: d.sn as number, _full_name: d.full_name,
      _reg_number: d.reg_number ?? "", _programme: d.programme ?? "", _institution: d.institution,
    });
    adminError(error);
    return { ok: true };
  });

export const adminUpdateStudent = createServerFn({ method: "POST" })
  .inputValidator((d) => studentSchema.extend({ id: z.string().uuid(), token: tok }).parse(d))
  .handler(async ({ data: { token, ...d } }) => {
    const { error } = await publicDb().rpc("izf_admin_update_student", {
      _token: token, _id: d.id, _sn: d.sn as number, _full_name: d.full_name,
      _reg_number: d.reg_number ?? "", _programme: d.programme ?? "", _institution: d.institution,
    });
    adminError(error);
    return { ok: true };
  });

export const adminDeleteStudent = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid(), token: tok }).parse(d))
  .handler(async ({ data }) => {
    const { error } = await publicDb().rpc("izf_admin_delete_student", { _token: data.token, _id: data.id });
    adminError(error);
    return { ok: true };
  });

export const adminDeleteRegistration = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid(), token: tok }).parse(d))
  .handler(async ({ data }) => {
    const { error } = await publicDb().rpc("izf_admin_delete_registration", { _token: data.token, _id: data.id });
    adminError(error);
    return { ok: true };
  });
