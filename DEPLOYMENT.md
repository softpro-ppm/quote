# Deployment Guide — SBI Quote V1.0

**Live app:** https://softpromis.com/quote/  
**GitHub:** https://github.com/softpro-ppm/quote  
**Hostinger path:** `/home/u820431346/domains/softpromis.com/public_html/quote`  
**Render API:** https://quote-6qt6.onrender.com

---

## Overview

| Layer | Host | Deploy from repo |
|-------|------|------------------|
| Frontend (static PWA) | Hostinger `public_html/quote/` | Root of repo (no build step on server) |
| Backend (Node API) | Render service `quote` | **`backend/` folder only** (not in repo yet — see [BACKEND_RECOVERY_PLAN.md](./BACKEND_RECOVERY_PLAN.md)) |

Frontend and backend deploy **independently**. Pushing frontend changes does **not** update Render unless `backend/` changed and you deploy Render.

---

## Frontend — Hostinger

### Prerequisites

- Git access on Hostinger (repo cloned to `public_html/quote`)
- Apache with `mod_rewrite` and `.htaccess` allowed
- App URL must use path prefix: **`https://softpromis.com/quote/`**

### Deploy steps

1. SSH or Hostinger File Manager / Git:
   ```bash
   cd /home/u820431346/domains/softpromis.com/public_html/quote
   git pull origin main
   ```
2. Confirm these files exist **in the same directory**:
   - `index.html`
   - `.htaccess`
   - `sw.js`, `manifest.webmanifest`
   - `assets/index-CF1zL0Tt.js` (must match `index.html` script tag)
   - `assets/index-y1Th8epX.css`
   - `login-sbi.css`, `brand/`, `pwa/`
3. Open https://softpromis.com/quote/ (trailing slash recommended).
4. Test a deep link, e.g. https://softpromis.com/quote/login — should load the SPA, not Apache 404.
5. **After each deploy:** hard refresh or clear site data / unregister service worker once so `sw.js` precache updates.

### `.htaccess`

Shipped with repo; `RewriteBase /quote/` for subfolder SPA routing. Do not move the app to domain root without updating `index.html` base logic and `.htaccess`.

### What not to do on Hostinger

- Do not run `npm build` in `public_html/quote` (there is no frontend build in repo).
- Do not delete `.htaccess` unless you replace SPA rules.
- Do not point the whole domain document root here unless you intentionally change URL strategy.

### Local test (before upload)

```bash
cd /path/to/quote
python3 serve_local.py
```

- http://127.0.0.1:8765/ — root base  
- http://127.0.0.1:8765/quote/ — mirrors Hostinger path  
- `/api` proxied to Render (`serve_local.py`)

---

## Backend — Render

### Current Render settings (expected)

| Setting | Value |
|---------|--------|
| Service URL | https://quote-6qt6.onrender.com |
| Root Directory | `backend` |
| Build Command | `npm install && npm run build` |
| Start Command | `npm run start` |

### Prerequisites before any Render deploy

- [ ] `backend/` folder exists in GitHub `main`
- [ ] `backend/package.json` has working `build` and `start` scripts
- [ ] Environment variables set on Render (database, JWT secret, CORS, etc.)
- [ ] Database reachable from Render (Hostinger remote MySQL or other host)
- [ ] `quotes.is_ev` column exists if using current frontend bundle

### Deploy steps (only when backend exists)

1. Push backend changes to `main`.
2. Render Dashboard → service **quote** → **Manual Deploy** (or auto-deploy on push).
3. Wait for **Build succeeded** and **Live**.
4. Smoke test:
   ```bash
   curl -s -X POST https://quote-6qt6.onrender.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"YOUR_PASSWORD"}'
   ```
5. Test login from https://softpromis.com/quote/

### Do NOT deploy Render when

- `backend/` is **missing** from the repo (current situation) — build **will fail**.
- You only changed frontend static files (`index.html`, `assets/`, `sw.js`) — Render deploy is unnecessary.

### Frontend → API URL (no Hostinger config needed)

Production bundle calls:

```text
https://quote-6qt6.onrender.com/api
```

Login example:

```text
POST https://quote-6qt6.onrender.com/api/auth/login
```

CORS must allow origin `https://softpromis.com` on the Render API.

---

## Typical workflow

| Change | Hostinger `git pull` | Render deploy |
|--------|----------------------|---------------|
| UI / `assets/` / `sw.js` / `.htaccess` | Yes | No |
| New API routes / DB logic in `backend/` | No | Yes |
| Both | Yes | Yes (after backend folder exists) |

---

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Login fails, network error to `onrender.com` | Render down, CORS, or API not deployed |
| 404 on `/quote/login` refresh | `.htaccess` missing or rewrite disabled |
| Old UI after deploy | Service worker cache — clear site data |
| Render build fails immediately | No `backend/` in repo |
| Quotes save fails after UI update | DB missing `is_ev` column |

See [BACKEND_RECOVERY_PLAN.md](./BACKEND_RECOVERY_PLAN.md) for API contracts and backend restoration.

---

## Checklist — safe production state

**Frontend (Hostinger)**

- [ ] `git pull` in `public_html/quote`
- [ ] https://softpromis.com/quote/ loads
- [ ] Deep links work
- [ ] Service worker refreshed after update

**Backend (Render)**

- [ ] `backend/` present in repo
- [ ] Last Render deploy **Succeeded**
- [ ] `POST /api/auth/login` returns token
- [ ] Login works from live site
