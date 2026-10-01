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
- All data access goes through SECURITY DEFINER izf_* database procedures called with the publishable key (src/lib/public-db.ts); tables have RLS on with no policies (why: app must run on Vercel where no private keys exist).
- Admin auth: bcrypt password hash in admin_config, izf_admin_login returns a random 8h token (stored hashed in admin_sessions), kept in sessionStorage and sent with every admin call (why: iframe blocks cookies; no host secrets needed).
- Name matching is deterministic OSA/Damerau-Levenshtein in src/lib/fuzzy.ts, threshold 0.72 (why: user forbade AI matching).
