import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, FileSpreadsheet, LogOut, Pencil, Plus, Search, Trash2, Eye, Lock } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  adminStatus, adminLogin, adminLogout, adminListStudents, adminCreateStudent, adminUpdateStudent, adminDeleteStudent, adminDeleteRegistration,
} from "@/lib/izf.functions";
import { downloadExcel, downloadPdf, type Layout } from "@/lib/export";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — IZF Scholarship" },
      { name: "description", content: "IZF Scholarship administration: eligible students, submissions and exports." },
      { property: "og:title", content: "Admin Dashboard — IZF Scholarship" },
      { property: "og:description", content: "IZF Scholarship administration dashboard." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type Student = Awaited<ReturnType<typeof adminListStudents>>[number];

function AdminPage() {
  const status = useServerFn(adminStatus);
  const q = useQuery({ queryKey: ["admin-status"], queryFn: () => status() });
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader admin />
      {q.isLoading ? <p className="p-8 text-center text-muted-foreground">Loading…</p> : q.data?.admin ? <Dashboard /> : <Login />}
    </div>
  );
}

function Login() {
  const login = useServerFn(adminLogin);
  const qc = useQueryClient();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-serif text-2xl"><Lock className="h-5 w-5" /> Admin Login</CardTitle>
          <CardDescription>Authorised IZF staff only.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              const r = await login({ data: { password: pw } });
              setBusy(false);
              if (r.ok) { setPw(""); qc.invalidateQueries({ queryKey: ["admin-status"] }); }
              else setErr(true);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="pw">Password</Label>
              <Input id="pw" type="password" autoComplete="current-password" value={pw} onChange={(e) => { setPw(e.target.value); setErr(false); }} />
              {err && <p className="text-sm text-destructive">Incorrect password.</p>}
            </div>
            <Button type="submit" className="w-full" disabled={!pw || busy}>{busy ? "Checking…" : "Log in"}</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

function Dashboard() {
  const list = useServerFn(adminListStudents);
  const logout = useServerFn(adminLogout);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["students"], queryFn: () => list() });
  const students = q.data ?? [];
  const submitted = students.filter((s) => s.registration).length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">{students.length} eligible · {submitted} submitted · {students.length - submitted} pending</p>
        </div>
        <Button variant="outline" onClick={async () => { await logout(); qc.clear(); qc.invalidateQueries({ queryKey: ["admin-status"] }); }}>
          <LogOut className="mr-2 h-4 w-4" /> Log out
        </Button>
      </div>
      <Tabs defaultValue="eligible">
        <TabsList className="mb-4 w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="eligible">Eligible Students</TabsTrigger>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>
        {q.isLoading ? <p className="text-muted-foreground">Loading…</p> : q.isError ? <p className="text-destructive">Could not load data.</p> : (
          <>
            <TabsContent value="eligible"><EligibleSection students={students} /></TabsContent>
            <TabsContent value="submissions"><SubmissionsSection students={students} /></TabsContent>
            <TabsContent value="export"><ExportSection students={students} /></TabsContent>
          </>
        )}
      </Tabs>
    </main>
  );
}

function useSearch(students: Student[], term: string) {
  return useMemo(() => {
    const t = term.trim().toLowerCase();
    if (!t) return students;
    return students.filter((s) =>
      [s.full_name, s.reg_number, s.programme, s.registration?.reg_number, String(s.sn ?? "")].some((v) => v?.toLowerCase().includes(t)),
    );
  }, [students, term]);
}

function StatusBadge({ s }: { s: Student }) {
  return s.registration ? <Badge className="bg-success text-success-foreground hover:bg-success">Submitted</Badge> : <Badge variant="secondary">Pending</Badge>;
}

function EligibleSection({ students }: { students: Student[] }) {
  const [term, setTerm] = useState("");
  const [editing, setEditing] = useState<Student | "new" | null>(null);
  const [deleting, setDeleting] = useState<Student | null>(null);
  const [viewing, setViewing] = useState<Student | null>(null);
  const del = useServerFn(adminDeleteStudent);
  const qc = useQueryClient();
  const rows = useSearch(students, term);
  const delM = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success("Student deleted"); qc.invalidateQueries({ queryKey: ["students"] }); },
    onError: () => toast.error("Delete failed"),
  });

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="font-serif">Eligible Students</CardTitle>
        <div className="flex gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search…" value={term} onChange={(e) => setTerm(e.target.value)} />
          </div>
          <Button onClick={() => setEditing("new")}><Plus className="mr-1 h-4 w-4" /> Add</Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0 sm:p-6 sm:pt-0">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left">
            <tr><th className="p-3">S/N</th><th className="p-3">Name</th><th className="hidden p-3 md:table-cell">Programme</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-b last:border-0">
                <td className="p-3 text-muted-foreground">{s.sn ?? "—"}</td>
                <td className="p-3 font-medium">{s.full_name}<div className="text-xs font-normal text-muted-foreground">{s.institution}{s.reg_number ? ` · ${s.reg_number}` : ""}</div></td>
                <td className="hidden p-3 md:table-cell">{s.programme ?? s.registration?.programme ?? "—"}</td>
                <td className="p-3"><StatusBadge s={s} /></td>
                <td className="p-3">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" aria-label="View" onClick={() => setViewing(s)}><Eye className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setEditing(s)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => setDeleting(s)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No students found.</td></tr>}
          </tbody>
        </table>
      </CardContent>
      {editing && <StudentDialog student={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      {viewing && <ViewDialog s={viewing} onClose={() => setViewing(null)} />}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.full_name}?</AlertDialogTitle>
            <AlertDialogDescription>This removes the student from the eligible list{deleting?.registration ? " and deletes their submitted information" : ""}. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleting && delM.mutate(deleting.id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function StudentDialog({ student, onClose }: { student: Student | null; onClose: () => void }) {
  const create = useServerFn(adminCreateStudent);
  const update = useServerFn(adminUpdateStudent);
  const qc = useQueryClient();
  const [f, setF] = useState({
    sn: student?.sn?.toString() ?? "",
    full_name: student?.full_name ?? "",
    reg_number: student?.reg_number ?? "",
    programme: student?.programme ?? "",
    institution: student?.institution ?? "UNIMA",
  });
  const [busy, setBusy] = useState(false);
  const valid = f.full_name.trim().length >= 2 && f.institution.trim() && (!f.sn || /^\d+$/.test(f.sn));

  async function save() {
    setBusy(true);
    const data = { sn: f.sn ? Number(f.sn) : null, full_name: f.full_name, reg_number: f.reg_number || null, programme: f.programme || null, institution: f.institution };
    try {
      if (student) await update({ data: { ...data, id: student.id } });
      else await create({ data });
      toast.success(student ? "Student updated" : "Student added");
      qc.invalidateQueries({ queryKey: ["students"] });
      onClose();
    } catch {
      toast.error("Could not save student");
    } finally {
      setBusy(false);
    }
  }

  const inp = (k: keyof typeof f, label: string, hint?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={k}>{label}</Label>
      <Input id={k} value={f[k]} onChange={(e) => setF((p) => ({ ...p, [k]: e.target.value }))} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{student ? "Edit student" : "Add eligible student"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {inp("full_name", "Official full name *")}
          <div className="grid grid-cols-2 gap-3">{inp("sn", "S/N")}{inp("institution", "Institution *")}</div>
          {inp("reg_number", "Registration Number", "If set, students must enter this exact number.")}
          {inp("programme", "Programme Name", "If set, it is filled in automatically for the student.")}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!valid || busy} onClick={save}>{busy ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ViewDialog({ s, onClose }: { s: Student; onClose: () => void }) {
  const r = s.registration;
  const rows: [string, string][] = [
    ["Official name", s.full_name], ["S/N", String(s.sn ?? "—")], ["Institution", s.institution], ["Status", r ? "Submitted" : "Pending"],
    ...(r ? ([
      ["First Name", r.first_name], ["Middle Name", r.middle_name || "—"], ["Surname", r.surname],
      ["Personal Account Number", r.personal_account_number], ["Registration Number", r.reg_number],
      ["Year of Study", r.year_of_study], ["Programme", r.programme], ["Submitted", new Date(r.created_at).toLocaleString()],
    ] as [string, string][]) : []),
  ];
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{s.full_name}</DialogTitle></DialogHeader>
        <dl className="divide-y text-sm">
          {rows.map(([k, v]) => <div key={k} className="grid grid-cols-2 gap-2 py-2"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium break-words">{v}</dd></div>)}
        </dl>
      </DialogContent>
    </Dialog>
  );
}

function SubmissionsSection({ students }: { students: Student[] }) {
  const [term, setTerm] = useState("");
  const [filter, setFilter] = useState("submitted");
  const [viewing, setViewing] = useState<Student | null>(null);
  const [resetting, setResetting] = useState<Student | null>(null);
  const delReg = useServerFn(adminDeleteRegistration);
  const qc = useQueryClient();
  const searched = useSearch(students, term);
  const rows = searched.filter((s) => filter === "all" || (filter === "submitted" ? s.registration : !s.registration));
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="font-serif">Submissions</CardTitle>
        <div className="flex gap-2">
          <Input className="sm:w-56" placeholder="Search…" value={term} onChange={(e) => setTerm(e.target.value)} />
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="submitted">Submitted</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="all">All</SelectItem></SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0 sm:p-6 sm:pt-0">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left">
            <tr><th className="p-3">Name</th><th className="hidden p-3 sm:table-cell">Reg. No.</th><th className="hidden p-3 md:table-cell">Year</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-b last:border-0">
                <td className="p-3 font-medium">{s.full_name}</td>
                <td className="hidden p-3 sm:table-cell">{s.registration?.reg_number ?? "—"}</td>
                <td className="hidden p-3 md:table-cell">{s.registration?.year_of_study ?? "—"}</td>
                <td className="p-3"><StatusBadge s={s} /></td>
                <td className="p-3"><div className="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" aria-label="View" onClick={() => setViewing(s)}><Eye className="h-4 w-4" /></Button>
                  {s.registration && <Button size="icon" variant="ghost" aria-label="Remove submission" onClick={() => setResetting(s)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                </div></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Nothing to show.</td></tr>}
          </tbody>
        </table>
      </CardContent>
      {viewing && <ViewDialog s={viewing} onClose={() => setViewing(null)} />}
      <AlertDialog open={!!resetting} onOpenChange={(o) => !o && setResetting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove submission?</AlertDialogTitle>
            <AlertDialogDescription>{resetting?.full_name}'s submitted details will be deleted so they can submit again. They stay on the eligible list.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={async () => {
              if (!resetting?.registration) return;
              try { await delReg({ data: { id: resetting.registration.id } }); toast.success("Submission removed"); qc.invalidateQueries({ queryKey: ["students"] }); }
              catch { toast.error("Could not remove"); }
            }}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

const FIELDS: { key: string; label: string; get: (s: Student, i: number) => string }[] = [
  { key: "no", label: "No.", get: (_s, i) => String(i + 1) },
  { key: "sn", label: "S/N", get: (s) => String(s.sn ?? "") },
  { key: "official", label: "Official Name", get: (s) => s.full_name },
  { key: "first", label: "First Name", get: (s) => s.registration?.first_name ?? "" },
  { key: "middle", label: "Middle Name", get: (s) => s.registration?.middle_name ?? "" },
  { key: "surname", label: "Surname", get: (s) => s.registration?.surname ?? "" },
  { key: "pan", label: "Personal Account No.", get: (s) => s.registration?.personal_account_number ?? "" },
  { key: "reg", label: "Registration No.", get: (s) => s.registration?.reg_number ?? s.reg_number ?? "" },
  { key: "year", label: "Year of Study", get: (s) => s.registration?.year_of_study ?? "" },
  { key: "programme", label: "Programme", get: (s) => s.registration?.programme ?? s.programme ?? "" },
  { key: "institution", label: "Institution", get: (s) => s.institution },
  { key: "status", label: "Status", get: (s) => (s.registration ? "Submitted" : "Pending") },
  { key: "date", label: "Submitted On", get: (s) => (s.registration ? new Date(s.registration.created_at).toLocaleDateString() : "") },
];

function ExportSection({ students }: { students: Student[] }) {
  const [cols, setCols] = useState<string[]>(["no", "first", "middle", "surname", "pan", "reg", "year", "programme"]);
  const [layout, setLayout] = useState<Layout>("grid");
  const [scope, setScope] = useState("submitted");
  const [title, setTitle] = useState("UNIMA Scholarship Students");
  const [busy, setBusy] = useState(false);

  const picked = FIELDS.filter((f) => cols.includes(f.key));
  const list = students.filter((s) => scope === "all" || (scope === "submitted" ? s.registration : !s.registration));
  const header = picked.map((f) => f.label);
  const body = list.map((s, i) => picked.map((f) => f.get(s, i)));

  const toggle = (k: string) => setCols((c) => (c.includes(k) ? c.filter((x) => x !== k) : FIELDS.filter((f) => f.key === k || c.includes(f.key)).map((f) => f.key)));
  const tableCls = layout === "grid" ? "border" : "";
  const cellCls = layout === "grid" ? "border px-2 py-1.5" : "px-2 py-1.5";

  async function run(kind: "pdf" | "xlsx") {
    if (!picked.length) { toast.error("Select at least one column"); return; }
    setBusy(true);
    try {
      if (kind === "pdf") await downloadPdf(title, header, body, layout);
      else await downloadExcel(title, header, body);
    }
    catch { toast.error("Export failed"); }
    finally { setBusy(false); }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card>
        <CardHeader><CardTitle className="font-serif">Export settings</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5"><Label htmlFor="title">Document title</Label><Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="space-y-1.5">
            <Label>Students</Label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="submitted">Submitted only</SelectItem><SelectItem value="pending">Pending only</SelectItem><SelectItem value="all">All eligible</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Table layout</Label>
            <Select value={layout} onValueChange={(v) => setLayout(v as Layout)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="grid">Bordered grid</SelectItem><SelectItem value="striped">Striped rows</SelectItem><SelectItem value="minimal">Minimal</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Columns</Label>
            <div className="grid grid-cols-2 gap-2">
              {FIELDS.map((f) => (
                <label key={f.key} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={cols.includes(f.key)} onCheckedChange={() => toggle(f.key)} /> {f.label}
                </label>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button disabled={busy} onClick={() => run("pdf")}><Download className="mr-2 h-4 w-4" /> Download PDF</Button>
            <Button disabled={busy} variant="outline" onClick={() => run("xlsx")}><FileSpreadsheet className="mr-2 h-4 w-4" /> Download Excel</Button>
          </div>
        </CardContent>
      </Card>
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle className="font-serif">Preview</CardTitle>
          <CardDescription>{list.length} records</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="min-w-max rounded-md border bg-card p-4">
            <div className="mb-3 border-b pb-2">
              <div className="font-serif text-lg font-bold">IZF Scholarship</div>
              <div className="text-sm text-muted-foreground">{title}</div>
            </div>
            <table className={`w-full text-xs ${tableCls}`}>
              <thead>
                <tr className={layout === "minimal" ? "border-b-2 border-foreground" : "bg-primary text-primary-foreground"}>
                  {header.map((h) => <th key={h} className={`${cellCls} text-left font-semibold`}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {body.slice(0, 50).map((r, i) => (
                  <tr key={i} className={layout === "striped" && i % 2 ? "bg-secondary" : layout === "minimal" ? "border-b" : ""}>
                    {r.map((c, j) => <td key={j} className={cellCls}>{c}</td>)}
                  </tr>
                ))}
                {!body.length && <tr><td className="p-4 text-center text-muted-foreground" colSpan={header.length || 1}>No records.</td></tr>}
              </tbody>
            </table>
            {body.length > 50 && <p className="mt-2 text-xs text-muted-foreground">Showing first 50 of {body.length} rows. The download includes all rows.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
