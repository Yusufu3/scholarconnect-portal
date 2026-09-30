import { Link } from "@tanstack/react-router";
import { GraduationCap, ShieldCheck } from "lucide-react";

export function SiteHeader({ admin = false }: { admin?: boolean }) {
  return (
    <header className="border-b bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="leading-tight">
            <span className="block font-serif text-lg font-bold">IZF Scholarship</span>
            <span className="block text-xs opacity-80">Student Registration</span>
          </span>
        </Link>
        {!admin && (
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 rounded-md border border-primary-foreground/30 px-3 py-1.5 text-sm hover:bg-primary-foreground/10"
          >
            <ShieldCheck className="h-4 w-4" /> Admin Login
          </Link>
        )}
      </div>
    </header>
  );
}
