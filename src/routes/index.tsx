import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CheckCircle2, Search, ArrowLeft, MessageCircle, AlertCircle } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { matchStudent, submitRegistration, updateBankDetails } from "@/lib/izf.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IZF Scholarship Student Registration" },
      { name: "description", content: "Eligible IZF scholarship students: find your name and submit your details." },
      { property: "og:title", content: "IZF Scholarship Student Registration" },
      { property: "og:description", content: "Find your name and submit your IZF scholarship information." },
    ],
  }),
  component: StudentPage,
});

type Match = { id: string; full_name: string; programme: string | null; registered: boolean };
const WHATSAPP = "https://chat.whatsapp.com/KYDaapRb9tzKIaF6TVTa3V";

function StudentPage() {
  const [step, setStep] = useState<"search" | "confirm" | "form" | "done">("search");
  const [name, setName] = useState("");
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [selected, setSelected] = useState<Match | null>(null);
  const [loading, setLoading] = useState(false);
  const [strong, setStrong] = useState(false);
  const [searchError, setSearchError] = useState("");
  const search = useServerFn(matchStudent);

  async function onSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSearchError("");
    const typed = String(new FormData(e.currentTarget).get("name") ?? name);
    if (typed !== name) setName(typed);
    if (typed.trim().length < 2) { setMatches(null); return; }
    setLoading(true);
    try {
      const res = await search({ data: { name: typed } });
      setMatches(res.matches);
      setStrong(res.strong);
      if (res.matches.length) {
        setSelected(res.strong ? res.matches[0]! : null);
        setStep("confirm");
      }
    } catch (err) {
      console.error(err);
      setMatches(null);
      setSearchError("Search failed. Please check your connection and try again.");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-xl px-4 py-8 sm:py-12">
        {step !== "done" && <Steps step={step} />}
        {step === "search" && (
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-2xl">Find your name</CardTitle>
              <CardDescription>Enter your full name as registered at the university.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSearch} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Aisha Jiya" autoComplete="name" />
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  <Search className="mr-2 h-4 w-4" /> {loading ? "Checking…" : "Check Eligibility"}
                </Button>
                {searchError && <p className="text-sm text-destructive">{searchError}</p>}
                {matches && matches.length === 0 && (
                  <div className="space-y-3 rounded-md border border-primary/30 bg-primary/5 p-4">
                    <div className="flex gap-2 text-sm">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>Your name is not currently on the official eligible list. You may still submit your information for review.</span>
                    </div>
                    <Button type="button" className="w-full" onClick={() => setStep("form")}>
                      Continue as Not Yet Eligible
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        )}
        {step === "confirm" && matches && (
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-2xl">{strong ? "Is this you?" : "Select your name"}</CardTitle>
              <CardDescription>{strong ? "We found your name on the official eligible list." : <>We found possible matches for “{name}”. If more than one appears, select your correct name.</>}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {matches.map((m) => (
                <button key={m.id} type="button" onClick={() => setSelected(m)}
                  className={`w-full rounded-md border p-4 text-left transition ${selected?.id === m.id ? "border-primary bg-secondary ring-2 ring-primary/30" : "hover:bg-muted"}`}>
                  <div className="font-medium">{m.full_name}</div>
                  {m.programme && <div className="text-sm text-muted-foreground">{m.programme}</div>}
                  {m.registered && <div className="mt-1 text-sm text-destructive">Already submitted — add bank details</div>}
                </button>
              ))}
              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
                <Button variant="outline" className="flex-1" onClick={() => setStep("search")}><ArrowLeft className="mr-2 h-4 w-4" /> Not me</Button>
                <Button className="flex-1" disabled={!selected} onClick={() => setStep("form")}>
                  {selected?.registered ? "Add Bank Details" : "Continue"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        {step === "form" && (
          <RegistrationForm student={selected} onBack={() => setStep(selected ? "confirm" : "search")} onDone={() => setStep("done")} />
        )}
        {step === "done" && (
          <Card className="text-center">
            <CardContent className="space-y-5 py-10">
              <CheckCircle2 className="mx-auto h-16 w-16 text-success" />
              <h1 className="font-serif text-2xl font-bold">Your information has been successfully submitted.</h1>
              <p className="text-muted-foreground">If you were not on the eligible list, your application is marked <strong>Not Yet Eligible</strong> and will be reviewed by IZF. Please join the official WhatsApp group for updates.</p>
              <Button asChild size="lg" className="w-full bg-success text-success-foreground hover:bg-success/90 sm:w-auto">
                <a href={WHATSAPP} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-2 h-5 w-5" /> Join the IZF Scholarship WhatsApp Group</a>
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

function Steps({ step }: { step: string }) {
  const items = [["search", "Find name"], ["confirm", "Confirm"], ["form", "Details"]];
  const idx = items.findIndex(([k]) => k === step);
  return <ol className="mb-6 flex items-center gap-2 text-xs sm:text-sm">{items.map(([k, l], i) => (
    <li key={k} className="flex flex-1 items-center gap-2">
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${i <= idx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
      <span className={i <= idx ? "font-medium" : "text-muted-foreground"}>{l}</span>
      {i < items.length - 1 && <span className="h-px flex-1 bg-border" />}
    </li>
  ))}</ol>;
}

function RegistrationForm({ student, onBack, onDone }: { student: Match | null; onBack: () => void; onDone: () => void }) {
  const isExisting = !!student?.registered;
  const parts = (student?.full_name ?? nameFallback()).split(/\s+/);
  const [f, setF] = useState({
    first_name: parts[0] ?? "", middle_name: parts.length > 2 ? parts.slice(1, -1).join(" ") : "",
    surname: parts.length > 1 ? parts[parts.length - 1]! : "", personal_account_number: "",
    reg_number: "", year_of_study: "", programme: student?.programme ?? "",
    bank_name: "", bank_account_number: "", bank_account_name: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = useServerFn(submitRegistration);
  const updateBank = useServerFn(updateBankDetails);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!f.bank_name.trim()) errs.bank_name = "This field is required";
    if (!f.bank_account_number.trim()) errs.bank_account_number = "This field is required";
    else if (!/^\d+$/.test(f.bank_account_number.trim())) errs.bank_account_number = "Account Number must contain digits only";
    if (!f.bank_account_name.trim()) errs.bank_account_name = "This field is required";
    if (!isExisting) {
      (["first_name", "surname", "reg_number", "year_of_study", "programme"] as const).forEach((k) => { if (!f[k].trim()) errs[k] = "This field is required"; });
      if (!/^\d{12}$/.test(f.personal_account_number.trim())) errs.personal_account_number = "Personal Account Number must be exactly 12 digits (numbers only).";
    }
    setErrors(errs); setServerError("");
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const res = isExisting
        ? await updateBank({ data: { eligible_student_id: student!.id, bank_name: f.bank_name, bank_account_number: f.bank_account_number, bank_account_name: f.bank_account_name } })
        : await submit({ data: { ...f, eligible_student_id: student?.id ?? null } });
      if (res.ok) onDone(); else setServerError(res.error);
    } catch { setServerError("Please check your details and try again."); }
    finally { setSaving(false); }
  }

  const field = (k: keyof typeof f, label: string, opts: { optional?: boolean; note?: string; readOnly?: boolean; numeric?: boolean } = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={k}>{label} {opts.optional ? <span className="font-normal text-muted-foreground">(optional)</span> : <span className="text-destructive">*</span>}</Label>
      <Input id={k} value={f[k]} readOnly={opts.readOnly} className={opts.readOnly ? "bg-muted" : ""} inputMode={opts.numeric ? "numeric" : undefined}
        onChange={(e) => set(k)(opts.numeric ? e.target.value.replace(/\D/g, "") : e.target.value)} aria-invalid={!!errors[k]} />
      {opts.note && <p className="text-sm font-medium text-accent-foreground">{opts.note}</p>}
      {errors[k] && <p className="text-sm text-destructive">{errors[k]}</p>}
    </div>
  );

  return <Card>
    <CardHeader>
      <CardTitle className="font-serif text-2xl">{isExisting ? "Add your bank details" : "Your details"}</CardTitle>
      <CardDescription>{isExisting ? <>Submitted application for <strong className="text-foreground">{student!.full_name}</strong>. Only bank details are required now.</> : student ? <>Registering as <strong className="text-foreground">{student.full_name}</strong></> : <>You are registering as <strong className="text-foreground">Not Yet Eligible</strong>. Your submission will be reviewed by IZF.</>}</CardDescription>
    </CardHeader>
    <CardContent>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {!isExisting && <>
          {field("first_name", "First Name")}{field("middle_name", "Middle Name", { optional: true })}{field("surname", "Surname")}
          {field("personal_account_number", "Personal Account Number", { note: "Use the Personal Account Number from the University portal, NOT the bank.", numeric: true })}
          {field("reg_number", "Registration Number")}
          {field("year_of_study", "Year of Study")}
          {field("programme", "Programme Name", { readOnly: !!student?.programme })}
        </>}
        {field("bank_name", "Bank Name")}
        {field("bank_account_name", "Account Name", { note: "Enter the name exactly as it appears on the bank account." })}
        {field("bank_account_number", "Account Number", { numeric: true })}
        {serverError && <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {serverError}</div>}
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
          <Button type="button" variant="outline" className="flex-1" onClick={onBack}>Back</Button>
          <Button type="submit" className="flex-1" size="lg" disabled={saving}>{saving ? "Saving…" : isExisting ? "Save Bank Details" : "Submit"}</Button>
        </div>
      </form>
    </CardContent>
  </Card>;
}

function nameFallback() { return "New Applicant"; }
