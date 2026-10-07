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
  eligible_student_id: z.string().uuid().nullable(),
  first_name: z.string().trim().min(1, "Required").max(60),
  middle_name: z.string().trim().max(60).optional().default(""),
  surname: z.string().trim().min(1, "Required").max(60),
  personal_account_number: z.string().trim().regex(/^\d{12}$/, "Personal Account Number must be exactly 12 digits (numbers only)."),
  reg_number: z.string().trim().min(1, "Required").max(40),
  year_of_study: z.string().trim().min(1, "Required").max(20),
  programme: z.string().trim().min(2, "Required").max(150),
  bank_name: z.string().trim().min(1, "Required").max(120),
  bank_account_number: z.string().trim().regex(/^\d+$/, "Account Number must contain digits only").max(30),
  bank_account_name: z.string().trim().min(1, "Required").max(120),
});

export const submitRegistration = createServerFn({ method: "POST" })
  .inputValidator((d) => regSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      if (data.eligible_student_id) {
        const { data: student, error: studentError } = await supabaseAdmin
          .from("eligible_students")
          .select("id, reg_number, programme")
          .eq("id", data.eligible_student_id)
          .maybeSingle();

        if (studentError) throw studentError;
        if (!student) return { ok: false as const, error: "Student record not found." };

        if (student.reg_number &&
            student.reg_number.replace(/\\s+/g, "").toUpperCase() !== data.reg_number.replace(/\\s+/g, "").toUpperCase()) {
          return { ok: false as const, error: "Registration Number does not match our records." };
        }

        const { data: existing } = await supabaseAdmin
          .from("registrations")
          .select("id")
          .eq("eligible_student_id", data.eligible_student_id)
          .maybeSingle();

        if (existing) return { ok: false as const, error: "This student has already submitted." };

        const { error } = await supabaseAdmin.from("registrations").insert({
          eligible_student_id: data.eligible_student_id,
          first_name: data.first_name,
          middle_name: data.middle_name || null,
          surname: data.surname,
          personal_account_number: data.personal_account_number,
          reg_number: data.reg_number,
          year_of_study: data.year_of_study,
          programme: student.programme || data.programme,
          bank_name: data.bank_name,
          bank_account_name: data.bank_account_name,
          bank_account_number: data.bank_account_number,
          eligibility_status: "eligible",
        } as any);

        if (error) throw error;
        return { ok: true as const };
      }

      const { error } = await supabaseAdmin.from("registrations").insert({
        eligible_student_id: null,
        first_name: data.first_name,
        middle_name: data.middle_name || null,
        surname: data.surname,
        personal_account_number: data.personal_account_number,
        reg_number: data.reg_number,
        year_of_study: data.year_of_study,
        programme: data.programme,
        bank_name: data.bank_name,
        bank_account_name: data.bank_account_name,
        bank_account_number: data.bank_account_number,
        eligibility_status: "not_yet_eligible",
      } as any);

      if (error) throw error;
      return { ok: true as const };
    } catch (error: any) {
      logServerError("submitRegistration direct save failed", error);
      return { ok: false as const, error: error?.message || "Could not save. Please try again." };
    }
  });

export const updateBankDetails = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    eligible_student_id: z.string().uuid(),
    bank_name: z.string().trim().min(1).max(120),
    bank_account_number: z.string().trim().regex(/^\\d+$/, "Account Number must contain digits only").max(30),
    bank_account_name: z.string().trim().min(1).max(120),
  }).parse(d))
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const { data: existing, error: lookupError } = await supabaseAdmin
        .from("registrations")
        .select("id")
        .eq("eligible_student_id", data.eligible_student_id)
        .maybeSingle();

      if (lookupError) throw lookupError;
      if (!existing) {
        return { ok: false as const, error: "Submitted student record not found." };
      }

      const { error } = await supabaseAdmin
        .from("registrations")
        .update({
          bank_name: data.bank_name,
          bank_account_name: data.bank_account_name,
          bank_account_number: data.bank_account_number,
        } as any)
        .eq("eligible_student_id", data.eligible_student_id);

      if (error) throw error;
      return { ok: true as const };
    } catch (error: any) {
      logServerError("updateBankDetails direct save failed", error);
      return { ok: false as const, error: error?.message || "Could not save bank details. Please try again." };
    }
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
  id: string; eligible_student_id: string | null; first_name: string; middle_name: string | null;
  surname: string; personal_account_number: string; reg_number: string; year_of_study: string;
  programme: string; bank_name: string | null; bank_account_number: string | null; bank_account_name: string | null;
  eligibility_status: "eligible" | "not_yet_eligible"; created_at: string;
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
    const payload = (data ?? {}) as { eligible?: unknown[]; not_yet_eligible?: unknown[] };
    return [...(payload.eligible ?? []), ...(payload.not_yet_eligible ?? [])] as (Student & { registration: Registration | null; not_yet_eligible?: boolean })[];
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

// Reset a submitted registration to the portal's existing Pending state.
// Pending is represented by the absence of a registrations row, so the
// existing protected delete RPC is used rather than introducing a second
// status system that could diverge from the student submission flow.
export const adminResetRegistration = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid(), token: tok }).parse(d))
  .handler(async ({ data }) => {
    const { error } = await publicDb().rpc("izf_admin_delete_registration", {
      _token: data.token,
      _id: data.id,
    });
    adminError(error);
    return { ok: true };
  });
