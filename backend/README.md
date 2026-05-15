# SBI Quote API (backend)

Node.js + Express API for the SBI Quote V1.0 PWA. Deploy on Render with **Root Directory** = `backend`.

## Setup (local)

```bash
cd backend
cp .env.example .env
# Edit .env with Hostinger MySQL credentials and JWT_SECRET
npm install
npm run dev
```

API base: `http://localhost:3000/api`

## Database migration

Before creating quotes with EV flag, run:

`database/migrations/add_is_ev_to_quotes.sql`

in phpMyAdmin on database `u820431346_quote`.

## Endpoints

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/auth/login` | No |
| GET | `/api/health` | No |
| GET | `/api/quotes/stats` | Bearer |
| GET | `/api/quotes` | Bearer |
| GET | `/api/quotes/:id` | Bearer |
| POST | `/api/quotes` | Bearer |
| DELETE | `/api/quotes/:id` | Bearer |
| GET | `/api/executives` | Bearer |
| POST | `/api/executives` | Bearer |
| PUT | `/api/executives/:id` | Bearer |
| DELETE | `/api/executives/:id` | Bearer |
| GET | `/api/followups/:quoteId` | Bearer |
| POST | `/api/followups` | Bearer |

## Render

- **Root Directory:** `backend`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm run start`
- Set all variables from `.env.example` in Render Environment.

## Test login

```bash
curl -i -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"YOUR_PASSWORD"}'
```
