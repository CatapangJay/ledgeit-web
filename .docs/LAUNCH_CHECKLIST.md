# LedgeIt — Launch Checklist

> From dev limbo to public launch.
> Companion docs: [ARCHITECTURE.md](./ARCHITECTURE.md) · [DEPLOYING.md](./DEPLOYING.md) · [TASKS.md](./TASKS.md)
> Stack: Next.js 16 (App Router) · Supabase (auth + Postgres) · Zustand · Tailwind v4 · deployed on Railway

**The trap this avoids:** polishing forever, or shipping something that breaks on the first real user.
**The cure:** a hard scope cut + a fixed launch date + this list.

**Legend:** 🔴 launch blocker (don't ship without it) · 🟡 launch week · 🟢 post-launch

---

## Phase 0 — Draw the line (do first)

- [ ] **Pick a launch date.** Without it, everything stays optional forever.
- [ ] **Write the v1 scope in one sentence** and freeze it. Everything else → a "v2" list.
- [ ] **Define "done for launch":** a stranger can sign up, bulk-log an expense, see it in the ledger/insights, and return tomorrow to find it still there. That is the bar — nothing more.

---

## Phase 1 — 🔴 Correctness & build

- [ ] `npm run build` succeeds with **zero errors**.
- [ ] `npm run lint` — clear the 6 warnings in `BulkEntryMode` (dead `removeEntry`, `changeType`, unused imports) so real warnings aren't buried.
- [ ] **Smoke-test the core loop** on a fresh browser profile: sign up → bulk-log 3–4 entries (include a standalone date line + an inline date) → confirm dates land correctly → refresh → data persists → log out/in.
- [ ] **Test on a real phone** (mobile-first PWA): bottom-sheet drag, keyboard behavior, and safe-area insets differ from desktop devtools.
- [ ] Add app-level states — **currently missing:**
  - [ ] `src/app/error.tsx` (without it, one thrown error = white screen for the user)
  - [ ] `src/app/not-found.tsx`
  - [ ] `src/app/loading.tsx`

---

## Phase 2 — 🔴 Secrets, data & backend safety

- [ ] **Commit a `.env.example`** (keys with blank values). Real `.env.local` stays gitignored.
- [ ] **Row Level Security (RLS) ON for every Supabase table.** A logged-in user must only read/write their own rows. Test it: try to query another user's data and confirm it fails.
- [ ] All migrations in `db/migrations` applied to the **production** Supabase project (not just local/dev).
- [ ] `NEXT_PUBLIC_*` keys are the **anon/publishable** keys (browser-safe). The service-role key must never appear in client code.
- [ ] Supabase **auth redirect URLs** set for the production domain (the `src/app/auth/callback` route breaks otherwise).

---

## Phase 3 — 🔴 PWA reality check

Product docs call LedgeIt a PWA, but there is currently **no manifest, no app icons, no service worker** (only Next's default SVGs in `public/`). To actually be installable:

- [ ] Add `src/app/manifest.ts` (name, short_name, theme_color, `display: standalone`, icons).
- [ ] Add real **app icons**: 192px, 512px, maskable, apple-touch-icon, and a favicon that isn't the Next default.
- [ ] Offline / service worker — **only if** offline is a v1 promise. Otherwise defer to v2 and don't claim "works offline" yet.
- [ ] Verify: Chrome DevTools → Lighthouse → "Installable" check passes.

---

## Phase 4 — 🟡 Trust & polish (launch week)

- [ ] **Metadata & social cards:** page `<title>`, description, and Open Graph image (`opengraph-image.tsx`) so shared links don't look broken.
- [ ] **Legal minimum:** Privacy Policy + Terms pages. LedgeIt stores users' financial data — not optional. A simple generated version is fine for v1.
- [ ] **Real README** (currently the Next.js default): what LedgeIt is + local setup steps.
- [ ] **Security headers** in `next.config.ts` (currently empty): at minimum `X-Content-Type-Options`, `Referrer-Policy`, and a basic CSP.
- [ ] Custom domain + HTTPS on Railway.
- [ ] Test the full flow in **Safari / iOS** specifically — strictest environment and where PWAs behave differently.

---

## Phase 5 — 🟡 Know when it breaks (deploy on launch day)

- [ ] **Error monitoring** (e.g. Sentry free tier, ~15 min). Without it, production crashes are invisible.
- [ ] **Basic analytics** (Plausible or similar) — did anyone sign up? did they log an entry?
- [ ] **Uptime check** (e.g. UptimeRobot) pinging the homepage.
- [ ] Confirm the Supabase plan **doesn't pause on inactivity** (free tier pauses after ~1 week idle — would kill a fresh launch).

---

## Phase 6 — 🟢 Post-launch (don't block launch on these)

- [ ] Add unit tests for the parser and money math — **currently zero tests.** The parser is core logic; test it before building features on top.
- [ ] In-app feedback channel (form, email, or Discord link).
- [ ] Rate limiting / abuse protection on auth if signups grow.
- [ ] Confirm Supabase backups (point-in-time or scheduled) for financial data.
- [ ] CI (GitHub Actions running `build` + `lint`) so broken code can't merge.

---

## The anti-limbo rules

1. **Ship at "good and safe," not "perfect."** Phases 1–3 are the real gate; 4–5 can trail by days.
2. **Every "wouldn't it be cool if…" goes to the v2 list**, untouched until after launch.
3. **Dogfood it yourself for a week** logging real spending — surfaces the 3 things that matter, kills 20 imaginary ones.
4. **Timebox polish.** If it isn't in this checklist and isn't a crash, it waits.

---

## Quick-win code batch (can be done in one pass)

High-impact, low-risk items that don't need external assets or decisions:

- [ ] `error.tsx` + `not-found.tsx` + `loading.tsx`
- [ ] `src/app/manifest.ts` + root metadata (icons/OG artwork added separately)
- [ ] Security headers in `next.config.ts`
- [ ] `.env.example`
- [ ] Clear the `BulkEntryMode` lint warnings

Needs your assets / decisions (not code): app icon artwork, legal copy, Supabase dashboard settings (RLS, redirect URLs, plan), monitoring/analytics account setup.
