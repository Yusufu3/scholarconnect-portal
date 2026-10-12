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
import { matchStudent, updateContactDetails } from "@/lib/izf.functions";

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
                  <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>We could not find your name on the official eligible list. Please check your spelling and try again.</span>
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
                  {m.registered && <div className="mt-1 text-sm text-destructive">Submitted — update your details</div>}
                </button>
              ))}
              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
                <Button variant="outline" className="flex-1" onClick={() => setStep("search")}><ArrowLeft className="mr-2 h-4 w-4" /> Not me</Button>
                <Button className="flex-1" disabled={!selected} onClick={() => setStep("form")}>
                  Continue
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
              <p className="text-muted-foreground">Your details have been updated. Please join the official WhatsApp group for updates.</p>
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
  const [f, setF] = useState({ contact_phone: "", contact_email: "", national_id: "", father_national_id: "", mother_national_id: "", gender: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);
  const update = useServerFn(updateContactDetails);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  if (!student?.registered) {
    return <Card><CardContent className="space-y-4 py-8 text-center">
      <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
      <p>New registrations are closed. Only students who have already submitted can update their details.</p>
      <Button variant="outline" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
    </CardContent></Card>;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    (Object.keys(f) as (keyof typeof f)[]).forEach((k) => { if (!f[k].trim()) errs[k] = "This field is required"; });
    if (f.contact_phone && !/^\+?[0-9 ]{7,20}$/.test(f.contact_phone.trim())) errs["contact_phone"] = "Enter a valid contact number";
    if (f.contact_email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.contact_email.trim())) errs["contact_email"] = "Enter a valid email address";
    setErrors(errs); setServerError("");
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const res = await update({ data: { ...f, gender: f.gender as "F" | "M", eligible_student_id: student!.id } });
      if (res.ok) onDone(); else setServerError(res.error);
    } catch { setServerError("Please check your details and try again."); }
    finally { setSaving(false); }
  }

  const field = (k: keyof typeof f, label: string, type = "text") => (
    <div className="space-y-1.5">
      <Label htmlFor={k}>{label} <span className="text-destructive">*</span></Label>
      <Input id={k} type={type} value={f[k]} onChange={(e) => set(k)(e.target.value)} aria-invalid={!!errors[k]} />
      {errors[k] && <p className="text-sm text-destructive">{errors[k]}</p>}
    </div>
  );

  return <Card>
    <CardHeader>
      <CardTitle className="font-serif text-2xl">Update your details</CardTitle>
      <CardDescription>Updating details for <strong className="text-foreground">{student.full_name}</strong>.</CardDescription>
    </CardHeader>
    <CardContent>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {field("contact_phone", "Contact Number", "tel")}
        {field("contact_email", "Contact Email", "email")}
        {field("national_id", "Student National ID")}
        {field("father_national_id", "Father's National ID")}
        {field("mother_national_id", "Mother's National ID")}
        <div className="space-y-1.5">
          <Label>Gender <span className="text-destructive">*</span></Label>
          <Select value={f.gender} onValueChange={set("gender")}>
            <SelectTrigger aria-invalid={!!errors["gender"]}><SelectValue placeholder="Select F or M" /></SelectTrigger>
            <SelectContent><SelectItem value="F">F</SelectItem><SelectItem value="M">M</SelectItem></SelectContent>
          </Select>
          {errors["gender"] && <p className="text-sm text-destructive">{errors["gender"]}</p>}
        </div>
        {serverError && <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {serverError}</div>}
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
          <Button type="button" variant="outline" className="flex-1" onClick={onBack}>Back</Button>
          <Button type="submit" className="flex-1" size="lg" disabled={saving}>{saving ? "Saving…" : "Save Details"}</Button>
        </div>
      </form>
    </CardContent>
  </Card>;
}

function nameFallback() { return "New Applicant"; }
