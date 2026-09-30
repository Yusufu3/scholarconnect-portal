<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## IZF decisions
- All data access goes through server functions using the service client; tables have RLS on with no public policies (why: students/admin never touch the database directly).
- Admin auth is a shared password (ADMIN_PASSWORD secret) + encrypted session cookie in src/lib/admin-session.server.ts (why: single admin, no accounts requested).
- Name matching is deterministic OSA/Damerau-Levenshtein in src/lib/fuzzy.ts, threshold 0.72 (why: user forbade AI matching).
