# Deploying LedgeIt to Railway

This guide walks you through deploying the Next.js app to [Railway](https://railway.app), connected to your existing Supabase project.

---

## Prerequisites

- Railway account — [railway.app](https://railway.app)
- Supabase project live and migrations run (see [db/README.md](../db/README.md))
- GitHub repository connected to Railway (or a Railway CLI push)

---

## 1 — Create Railway Project

1. Go to [railway.app/new](https://railway.app/new)
2. Select **Deploy from GitHub repo**
3. Search for and select `ledgeit-web`
4. Railway auto-detects Next.js — no manual build config needed

> Railway uses `npm run build` and `npm run start` automatically for Next.js projects.

---

## 2 — Set Environment Variables

In your Railway project, go to **Settings → Variables** and add the following. Copy exact values from Supabase.

| Variable | Where to copy from |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Supabase → Settings → API → Publishable key |
| `NEXT_PUBLIC_SITE_URL` | Set to your Railway deploy URL (e.g. `https://ledgeit-web.up.railway.app`) |

> All variable names must match `.env.example` exactly.  
> Never paste values into `.env.local` — that file is only for local development and is gitignored.

---

## 3 — Configure Supabase Auth Redirect URL

Magic link emails redirect users back to your app. Supabase must know your production domain.

1. Open **Supabase → Authentication → URL Configuration**
2. Add your Railway deployment URL to **Redirect URLs**:
   ```
   https://ledgeit-web.up.railway.app/auth/callback
   ```
3. Save

> If you add a custom domain later, add it here too.

---

## 4 — Deploy

Railway automatically deploys on every push to your `main` branch (or whichever branch you connected). To trigger a manual deploy:

- Go to your Railway project → **Deployments** → **Redeploy**

Build logs are shown in real time. A successful deploy ends with:
```
✓ Starting Next.js server
```

---

## 5 — Custom Domain (Optional)

1. Railway project → **Settings → Domains → Add Domain**
2. Follow the CNAME instructions from Railway
3. Once propagated, update `NEXT_PUBLIC_SITE_URL` in Railway variables to the new domain
4. Update the Supabase Redirect URL (Step 3) to use the new domain

---

## 6 — Verifying the Deploy

Run through this checklist after each deploy:

- [ ] App loads at the Railway URL without errors
- [ ] Visiting `/` while logged out redirects to `/login`
- [ ] Sending a magic link email works (check spam if not received)
- [ ] Clicking the magic link lands on `/` with an active session
- [ ] Transactions load and display correctly
- [ ] Logging a new transaction appears immediately and persists after refresh
- [ ] Signing out redirects to `/login`

---

## Rollback

If a deploy breaks production:

1. Railway project → **Deployments**
2. Find the last working deployment
3. Click **Redeploy** on that entry

Railway instantly swaps traffic back to the previous build.

---

## Secrets Checklist

> Verify before every deploy:

- [ ] No `.env.local` file is committed — check with `git status`
- [ ] All secrets are set in Railway → Variables, not hardcoded in source
- [ ] The Supabase `service_role` key is **never** used in this app (only `anon` public key)
- [ ] `DATABASE_URL` is only needed if running migrations locally — do not add to Railway unless required
