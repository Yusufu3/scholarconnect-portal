# Make the app work on Vercel

## Why it fails on Vercel
The app's server code depends on private keys that only exist inside Lovable hosting: the database master key, the admin password (12345) and the signing secret. Vercel has none of them, so:
- Admin login fails (password secret missing, so nothing can match).
- Student search fails (the server can't open the database without the master key).

The database master key can't be copied out of Lovable Cloud, so just pasting keys into Vercel won't work. The fix is to stop needing it.

## The fix
Move the secure logic into the database itself, so the app only needs the public database address and public key. Those are safe to publish and already in the project, so Vercel (or any host) works with no extra setup.

1. **Student search and registration**: done by protected database procedures. The student list stays hidden; procedures only return the top 3 matches (name, programme, already-registered), exactly like now. Duplicate prevention, 12-digit account number and registration-number checks move into the database too.
2. **Admin login**: the password is stored in the database as a one-way hash (never readable). Logging in with 12345 returns a signed session token valid 8 hours, checked by the database on every admin action (list, add, edit, delete, delete submission).
3. **Name matching**: unchanged. The same non-AI fuzzy matching still runs in the app code, on the candidate names returned by the database procedure.
4. **Vercel hosting setup**: add a Vercel build target so the server parts run on Vercel, plus a short README section listing the two public settings (database URL and public key) in case Vercel needs them entered.

## What stays the same
Design, pages, form fields, WhatsApp link, export, the 61 students and all existing data.

## Technical details
- Migration: `admin_config` table (bcrypt hash via pgcrypto, plus token secret), `admin_sessions` table; RLS on with no policies, so tables are unreachable directly.
- SECURITY DEFINER RPCs granted to `anon`: `izf_candidates()` returns id/full_name/programme/registered only, `izf_submit_registration(...)`, `izf_admin_login(pw)` returns a random token stored hashed with expiry, and `izf_admin_list/create/update/delete_student`, `izf_admin_delete_registration`, each taking the token.
- `izf.functions.ts` switches to a publishable-key server client (no service role); fuzzy scoring stays in `fuzzy.ts`.
- `vite.config.ts`: nitro preset `vercel` when `VERCEL` env is set, otherwise keep the default.
- AGENTS.md: replace the service-role and HMAC-token rules with the new ones.
- Verify: admin login with 12345, CRUD, exact/typo/unrelated search, and submit plus duplicate block, then clean up test data.
