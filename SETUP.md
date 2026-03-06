# Statgap Phase 1 – Setup

## 1. Use this project

Phase 1 was built in **`C:\Users\gamer\statgap-build`** because the repo under `C:\Windows\System32\statgap` is not writable from this environment.

To use it:

- **Option A:** Use `C:\Users\gamer\statgap-build` as your project folder (open it in Cursor and run `npm run dev` there).
- **Option B:** Copy everything from `C:\Users\gamer\statgap-build` into your real repo (e.g. after moving the repo to a writable path like `C:\Users\gamer\projects\statgap`), then run `npm install` and `npm run dev`.

## 2. Supabase configuration

1. Create a project at [supabase.com](https://supabase.com).
2. In the dashboard: **SQL Editor** → New query → paste the contents of **`supabase/schema.sql`** → Run.
3. In **Authentication** → **URL Configuration**, set:
   - **Site URL:** `http://localhost:3000` (or your production URL).
   - **Redirect URLs:** add `http://localhost:3000/auth/callback` (and your production callback if needed).

## 3. Environment variables

Create **`.env.local`** in the project root with:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

Get both from Supabase: **Project Settings** → **API** → Project URL and anon (public) key.

## 4. Run the app

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Sign up, create a crew, open it to see the mock match feed, react and comment.

## 5. Riot Match History (optional)

For the Riot match history feature, add `RIOT_API_KEY` to `.env.local` and (on Vercel) to Environment Variables. See **[docs/RIOT_SETUP.md](docs/RIOT_SETUP.md)** for full setup, Vercel config, and production key notes.
