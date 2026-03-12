# Vercel Deployment

## Current Setup

Git pushes to `main` or `rescue-ui` are **not** triggering automatic Vercel deployments. Deploys only work when run manually via CLI.

## Manual Deploy (Current Workaround)

From the project root (`C:\Users\gamer\qcrew-build` for rescue-ui, or your worktree):

```bash
# Production (statgap.gg)
npm run deploy

# Preview only (for rescue-ui testing)
npm run deploy:preview
```

Or with npx:
```bash
npx vercel --prod    # production
npx vercel           # preview
```

## Fix Auto-Deploy from Git

To have Vercel deploy automatically when you push:

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Open your project (statgap.gg)
3. **Settings** → **Git**
4. If no repo is connected:
   - Click **Connect Git Repository**
   - Select **GitHub** → **Gchar42/qcrew**
   - Authorize if prompted
5. Set **Production Branch** (e.g. `main` for statgap.gg)
6. Ensure **Automatic Deployments** is enabled
7. Save

After connecting, pushes to `main` will deploy to production, and pushes to `rescue-ui` will create preview deployments.
