# SBI Quote — Local Dev & Deployment

The app is now two clean parts (no more Render, no more browser-stored rates):

| Part | Folder | Stack | Hosting |
|------|--------|-------|---------|
| Backend API | `quote-api/` | Laravel + Sanctum | Hostinger MySQL (`u820431346_quote`) |
| Frontend | `frontend/` | React + Vite + Tailwind | Static files at `quote.softpromis.com` |

- **All rate tables live in the database** (`settings` table) and are edited from the
  in-app **Settings** page. The browser stores only the login token.
- **Local DB = SQLite** (`quote-api/database/database.sqlite`), zero setup.
- **Production DB = MySQL** on Hostinger.

---

## Run locally (two terminals)

**1. API (Laravel, SQLite):**
```bash
cd quote-api
php artisan serve --port=8799
```

**2. Frontend (Vite dev server, proxies `/api` → :8799):**
```bash
cd frontend
npm install      # first time only
npm run dev
```
Open the URL Vite prints (e.g. `http://127.0.0.1:5173/`).

**Login:** `admin` / `admin123`

### Start fresh (wipe local DB + reseed admin and default rates)
```bash
cd quote-api
php artisan migrate:fresh --seed
```
This empties all quotes/executives/followups, recreates the schema, seeds the
`admin` user and the default rate configuration. No browser data is involved.

---

## Build for production

```bash
cd frontend
npm run build        # outputs static site to frontend/dist/
```

Deploy:
1. Upload **contents of `frontend/dist/`** to the `quote.softpromis.com` docroot
   (`public_html/quote`). This replaces the old compiled bundle.
2. Upload **`quote-api/`** to `public_html/quote-api` and follow
   `quote-api/DEPLOYMENT.md` (set `.env` MySQL creds, run `php artisan migrate --seed`,
   add the `/api` → Laravel `.htaccess` rewrite, cache config/routes).
3. Both share one origin: frontend at `/`, API at `/api`.

> On first production deploy set a strong admin password via the seeder env vars
> (`SEED_ADMIN_USERNAME`, `SEED_ADMIN_PASSWORD`) or change it right after.
