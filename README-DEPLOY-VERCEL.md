# Deploy HonestInvoice to Vercel

This project is a Vite + React SPA. Vercel configuration (`vercel.json`) is included for SPA rewrites and redirects.

## Prerequisites
- Node.js and npm installed
- Vercel CLI installed: `npm i -g vercel`
- Vercel account, logged in locally: `vercel login`

## One-time setup
1. Link the project to Vercel (choose an existing scope or create a new project):
   ```bash
   vercel link
   ```
2. Configure environment variables in Vercel Project Settings (e.g., SUPABASE_URL, SUPABASE_ANON_KEY, STRIPE keys).

## Deploy
You can deploy via the provided script or with Vercel CLI directly.

### Using script
```bash
./scripts/deploy.sh
```
- The script pulls Vercel environment, builds locally, and deploys with `--prebuilt` to use the `dist` folder.

### Using CLI directly
```bash
vercel pull --environment=production
npm run build
vercel deploy --prod --prebuilt
```

## SPA routing and redirects
- `vercel.json` rewrites everything to `/index.html` to support React Router.
- Common legacy routes (/signin, /signup, /login, /register) redirect to `/auth`.

## Custom domain & HTTPS
- Add your custom domain in Vercel > Project > Settings > Domains.
- Vercel automatically provisions HTTPS certificates.

## Notes
- Ensure Site URL in Supabase matches the Vercel production URL to keep auth/email links correct.
- The `_redirects` files used for Cloudflare/Netlify are not required on Vercel.

