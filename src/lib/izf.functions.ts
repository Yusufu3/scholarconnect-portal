import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { nameSimilarity, MATCH_THRESHOLD } from "./fuzzy";
const sess = () => import("./admin-session.server");
const requireAdmin = async (token?: string) => (await sess()).requireAdmin(token);
const tok = z.string().min(10).max(500);

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const normReg = (s: string) => s.replace(/\s+/g, "").toUpperCase();

// ---------- Student ----------

export const matchStudent = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ name: z.string().trim().min(2).max(120) }).parse(d))
  .handler(async ({ data }) => {
    const sb = await db();
    const { data: rows, error } = await sb
      .from("eligible_students")
      .select("id, full_name, programme, registrations(id)");
    if (error) throw new Error("Could not search the list");
    const scored = (rows ?? [])
      .map((r) => ({
        id: r.id,
        full_name: r.full_name,
        programme: r.programme,
        registered: Array.isArray(r.registrations) ? r.registrations.length > 0 : !!r.registrations,
        score: nameSimilarity(data.name, r.full_name),
      }))
      .filter((r) => r.score >= MATCH_THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    const top = scored[0];
    const second = scored[1];
    // Strong = clearly the best, no close competitor.
    const strong = !!top && top.score >= 0.85 && (!second || top.score - second.score >= 0.08);
    return { strong, matches: scored.map(({ score: _s, ...r }) => r) };
  });

const regSchema = z.object({
  eligible_student_id: z.string().uuid(),
  first_name: z.string().trim().min(1, "Required").max(60),
  middle_name: z.string().trim().max(60).optional().default(""),
  surname: z.string().trim().min(1, "Required").max(60),
  personal_account_number: z.string().trim().min(3, "Required").max(40),
  reg_number: z.string().trim().min(3, "Required").max(40),
  year_of_study: z.string().trim().min(1, "Required").max(20),
  programme: z.string().trim().min(2, "Required").max(150),
});

export const submitRegistration = createServerFn({ method: "POST" })
  .inputValidator((d) => regSchema.parse(d))
  .handler(async ({ data }) => {
    const sb = await db();
    const { data: st } = await sb
      .from("eligible_students")
      .select("id, reg_number, programme")
      .eq("id", data.eligible_student_id)
      .maybeSingle();
    if (!st) return { ok: false as const, error: "Student is not on the eligible list." };
    if (st.reg_number && normReg(st.reg_number) !== normReg(data.reg_number)) {
      return { ok: false as const, error: "Registration Number does not match our records." };
    }
    const { data: existing } = await sb
      .from("registrations")
      .select("id")
      .eq("eligible_student_id", st.id)
      .maybeSingle();
    if (existing) return { ok: false as const, error: "This student has already submitted." };
    const { error } = await sb.from("registrations").insert({
      ...data,
      middle_name: data.middle_name || null,
      reg_number: normReg(data.reg_number),
      programme: st.programme || data.programme,
    });
    if (error) {
      if (error.code === "23505") return { ok: false as const, error: "This student has already submitted." };
      return { ok: false as const, error: "Could not save. Please try again." };
    }
    return { ok: true as const };
  });

// ---------- Admin ----------

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const expected = process.env["IZF_ADMIN_PASSWORD"];
    const m = await sess();
    if (!expected) throw new Error("Admin password is not configured");
    if (!m.passwordMatches(data.password, expected)) return { ok: false as const, token: null };
    return { ok: true as const, token: m.issueAdminToken() };
  });

export const adminStatus = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().max(500).optional() }).parse(d))
  .handler(async ({ data }) => ({ admin: (await sess()).verifyAdminToken(data.token) }));

export const adminListStudents = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: tok }).parse(d))
  .handler(async ({ data: { token } }) => {
  await requireAdmin(token);
  const sb = await db();
  const { data, error } = await sb
    .from("eligible_students")
    .select("*, registrations(*)")
    .order("sn", { ascending: true, nullsFirst: false })
    .order("full_name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => {
    const reg = Array.isArray(r.registrations) ? r.registrations[0] : r.registrations;
    const { registrations: _r, ...rest } = r;
    return { ...rest, registration: reg ?? null };
  });
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
  .handler(async ({ data: { token, ...data } }) => {
    await requireAdmin(token);
    const sb = await db();
    const { error } = await sb.from("eligible_students").insert({
      ...data,
      reg_number: data.reg_number || null,
      programme: data.programme || null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpdateStudent = createServerFn({ method: "POST" })
  .inputValidator((d) => studentSchema.extend({ id: z.string().uuid(), token: tok }).parse(d))
  .handler(async ({ data: { token, ...data } }) => {
    await requireAdmin(token);
    const sb = await db();
    const { id, ...rest } = data;
    const { error } = await sb
      .from("eligible_students")
      .update({
        ...rest,
        reg_number: rest.reg_number || null,
        programme: rest.programme || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteStudent = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid(), token: tok }).parse(d))
  .handler(async ({ data: { token, ...data } }) => {
    await requireAdmin(token);
    const sb = await db();
    const { error } = await sb.from("eligible_students").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteRegistration = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid(), token: tok }).parse(d))
  .handler(async ({ data: { token, ...data } }) => {
    await requireAdmin(token);
    const sb = await db();
    const { error } = await sb.from("registrations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
