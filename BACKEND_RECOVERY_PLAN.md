# Backend Recovery Plan — SBI Quote V1.0

**Date:** 2026-05-15  
**Repo:** https://github.com/softpro-ppm/quote  
**Live frontend:** https://softpromis.com/quote/  
**Render service:** https://quote-6qt6.onrender.com (name: `quote`)

---

## Current problem

The GitHub repo is a **static frontend export only**. It deploys correctly to Hostinger under `public_html/quote/`, but it does **not** contain the Node.js API that Render is configured to build and run.

| What Render expects | What the repo has |
|---------------------|-------------------|
| Root Directory: `backend/` | **No `backend/` folder** |
| `npm install && npm run build` | No root or `backend/package.json` |
| `npm run start` | No server entry file |

**Result:** A Render **Manual Deploy** (or any deploy from current `main`) will **fail** at build time because Render cannot find `backend/package.json` and the configured build/start commands have nothing to run.

The live frontend at https://softpromis.com/quote/ can still load in the browser, but **login and all data features require the Render API**. If Render is down, redeployed incorrectly, or still running an old build, users will see API errors on login and admin pages.

---

## Why Render manual deploy is dangerous now

1. **Build will fail** — Render clones the repo, `cd backend`, runs `npm install && npm run build`. With no `backend/`, the job fails immediately.
2. **Risk of misconfiguration** — Changing Render Root Directory to repo root without a valid `package.json` there also fails.
3. **No rollback from git** — Pushing frontend-only commits does not restore API source; only a previous Render **successful** deploy image (if still available) keeps the old API running.
4. **Do not click Manual Deploy** until `backend/` is restored and tested locally or in a branch deploy.

---

## Repo inspection summary (2026-05-15)

### `backend/` exists?

**No.** There is no `backend/` directory in the repository.

### Repo type

- **Static SPA** (Vite/React build output committed to git)
- Active bundle: `assets/index-CF1zL0Tt.js` (referenced from `index.html`)
- No React/Vite **source** (`src/`, `package.json`, `vite.config.*`) in repo
- Local dev helper: `serve_local.py` (proxies `/api` → Render for localhost only)

### Top-level layout (relevant files)

```
quote/
├── index.html              # SPA shell, /quote base tag logic
├── .htaccess               # Apache SPA fallback (RewriteBase /quote/)
├── manifest.webmanifest
├── sw.js, workbox-*.js
├── login-sbi.css
├── assets/                 # Bundled JS/CSS (many old hashes; only one active)
├── brand/, pwa/
├── serve_local.py          # Local static + /api proxy
├── u820431346_quote.sql    # DB schema dump (local; *.sql gitignored)
├── BACKEND_RECOVERY_PLAN.md
└── DEPLOYMENT.md
```

---

## Frontend API usage (from `assets/index-CF1zL0Tt.js`)

No source code is available; behavior is documented from the **active bundle only**.

### API base URL (production)

```text
baseURL = "https://quote-6qt6.onrender.com/api"
```

**When:** `hostname` is **not** `127.0.0.1` and **not** `localhost` (includes `softpromis.com`).

### API base URL (local)

```text
baseURL = "/api"
```

`serve_local.py` proxies `/api/*` → `https://quote-6qt6.onrender.com` (see `QUOTE_API_UPSTREAM`).

### Auth

| Item | Value |
|------|--------|
| Login | `POST /auth/login` |
| **Full production URL** | `https://quote-6qt6.onrender.com/api/auth/login` |
| Request body | `{ username, password }` |
| Success shape (expected) | `{ success: true, data: { token, user } }` |
| Token storage | `localStorage.auth_token` |
| User storage | `localStorage.auth_user` |
| Authenticated requests | Header `Authorization: Bearer <token>` |
| 401 handling | Clears token/user, redirects to login (`__RB + "/login"`) |

Paths are relative to **`/api`** (not `/api/auth` vs `/auth` — the base URL already ends with `/api`).

### Endpoints used by the frontend

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/auth/login` | Login |
| GET | `/quotes/stats` | Dashboard statistics |
| GET | `/quotes` | Paginated list (`page`, `limit`, optional `search`) |
| POST | `/quotes` | Create quote |
| GET | `/executives?active=true` | Active executives (quote form) |
| GET | `/executives` | All executives (admin) |
| POST | `/executives` | Create executive |
| POST | `/followups` | Add follow-up note |

**POST `/quotes` body fields (snake_case):**

- `owner_name`, `vehicle_number`, `vehicle_model`, `phone_number`
- `idv`, `od_discount`, `ncb`, `executive_id`
- `gold_premium`, `platinum_premium`
- `is_ev` — `0` or `1`

**POST `/followups` body:**

- `quote_id`, `notes`

**POST `/executives` body (from bundle):**

- `name`, `email`, `phone`, `is_active` (admin UI)

The bundle may also call update routes for executives via dynamic URLs; confirmed in bundle: **GET** and **POST** only. Rebuild backend with at least these; add PUT/PATCH if you recover older source that used them.

### Expected JSON patterns (inferred)

- Success responses often use `{ success: true, data: ... }`.
- Errors often use `{ error: { message: "..." } }` (frontend reads `response.data.error.message`).

---

## Database (from `u820431346_quote.sql`)

**Note:** `*.sql` is in `.gitignore`; the dump may exist only on your machine. Use it as the schema reference for recovery.

### Tables

| Table | Purpose |
|-------|---------|
| `users` | Admin login (`username`, `password_hash`, `email`) |
| `executives` | Sales executives |
| `quotes` | Generated quotations |
| `followups` | Notes per quote |

### `quotes` schema gap (EV feature)

Current dump **does not** include `is_ev`. The frontend **sends** `is_ev` on create. Backend recovery should add:

```sql
ALTER TABLE quotes
  ADD COLUMN is_ev TINYINT(1) NOT NULL DEFAULT 0
  AFTER platinum_premium;
```

(Adjust position as needed; run on Hostinger MySQL and any DB used by Render.)

### `users` passwords

Dump shows `password_hash` with bcrypt-style `$2y$10$...` — backend should use **bcrypt** (or compatible) verification for `POST /auth/login`.

### Connection

Render typically uses env vars such as:

- `DATABASE_URL` or `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

Exact names depend on the restored backend; check old Render **Environment** tab or recovered `.env.example`.

---

## Files required to restore `backend/`

Minimum layout for Render (Root Directory = `backend`):

```
backend/
├── package.json          # scripts: "build", "start"
├── tsconfig.json         # if TypeScript (optional)
├── src/
│   └── index.ts          # or server.js at root
├── .env.example          # document required env vars (no secrets)
└── README.md             # optional
```

### Expected capabilities

1. **HTTP server** (Express/Fastify/etc.) listening on `PORT` (Render sets this).
2. **CORS** — allow `https://softpromis.com` (and localhost for dev).
3. **Mount routes under `/api`** — frontend base URL is `.../api`, paths are `/auth/login`, `/quotes`, etc.
4. **JWT (or session) auth** — issue token on login; validate `Bearer` on protected routes.
5. **MySQL/MariaDB** — same schema as Hostinger DB (`u820431346_quote` or equivalent).

### Suggested route modules

| Module | Routes |
|--------|--------|
| `auth` | `POST /auth/login` |
| `quotes` | `GET /quotes`, `GET /quotes/stats`, `POST /quotes` |
| `executives` | `GET /executives`, `POST /executives` |
| `followups` | `POST /followups` |

### `package.json` scripts (typical)

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

Or plain JS: `"build": "echo ok"`, `"start": "node server.js"`.

---

## Recommended recovery steps (in order)

### 1. Do not break Hostinger frontend

- Continue deploying **only** static files to `public_html/quote/`.
- Do **not** change `index.html`, `.htaccess`, or `assets/index-CF1zL0Tt.js` unless fixing a confirmed bug.
- Git pull on Hostinger is fine for frontend-only commits.

### 2. Recover backend source (pick one)

| Option | Action |
|--------|--------|
| **A. Old git / backup** | Search old laptop, deleted repo, Render deploy logs, zip backups for `backend/` folder. |
| **B. Render shell / image** | If an old deploy still runs, inspect running container or download artifacts (limited on free tier). |
| **C. Rebuild** | Implement API from this document + `u820431346_quote.sql` + bundle contracts above. |

### 3. Add `backend/` to repo

- Restore or create `backend/` with `package.json`, server, routes, DB layer.
- Add `.env.example` listing `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, etc.
- Test locally: `cd backend && npm install && npm run dev` against Hostinger DB (or local MySQL import).

### 4. Align database

- Run `is_ev` migration on production DB.
- Confirm Render env points to the **same** database Hostinger/phpMyAdmin uses (if that was the original design).

### 5. Deploy Render safely

- Push `backend/` to `main`.
- Confirm Render: Root Directory = `backend`, Build = `npm install && npm run build`, Start = `npm run start`.
- Use **Deploy** only after a green build on a test branch (recommended).
- Smoke test: `POST https://quote-6qt6.onrender.com/api/auth/login` with valid credentials.

### 6. Verify end-to-end

- https://softpromis.com/quote/ → login → dashboard stats → create quote → follow-up.
- Hard refresh `/quote/admin/...` routes (`.htaccess`).
- Clear service worker once after frontend changes.

---

## Render manual deploy: safe or unsafe?

| Situation | Manual deploy on Render |
|-----------|-------------------------|
| **Current repo (`main`, no `backend/`)** | **UNSAFE — will fail** |
| After `backend/` restored and build passes locally | **Safe** to deploy |
| Frontend-only commit, API unchanged | **Skip** Render deploy (not needed) |

---

## What is NOT in this repo (do not assume)

- React/Vite source for rebuilding the UI
- `backend/` API source
- Root `package.json`
- CI/CD pipelines
- Render `render.yaml` (unless added later)

To change UI behavior long-term, you need the original frontend project or edit the minified bundle (high risk; not recommended).

---

## Next action (recommended)

1. **Search for the old `backend/` folder** (backup, old GitHub repo, email attachments).
2. If not found, **rebuild the API** to match the endpoint table and JSON shapes in this document, using `u820431346_quote.sql` plus `is_ev` migration.
3. **Do not** trigger Render Manual Deploy until step 1 or 2 is complete and `npm run build` succeeds in `backend/`.
4. Keep Hostinger deploys limited to static files; they are independent of Render.

---

## Quick reference — production login URL

```http
POST https://quote-6qt6.onrender.com/api/auth/login
Content-Type: application/json

{"username":"admin","password":"<your-password>"}
```

Successful response should include `data.token` for subsequent `Authorization: Bearer ...` requests.
