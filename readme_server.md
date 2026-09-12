# Product API Server

## Free database setup with Supabase

The API supports a free Supabase Postgres project. Product data is stored in the `products` table and remains available to the admin console and storefront from any browser.

1. Create a project at [supabase.com](https://supabase.com/) on the free plan.
2. Open Supabase **SQL Editor** and run [`supabase_schema.sql`](supabase_schema.sql).
3. Copy `.env.example` to `.env` and set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from Supabase **Project Settings > API**.
4. Run `npm start` and open `http://localhost:3001`.

The service role key must stay in the server environment. Do not put it in `api-config.js`, browser JavaScript, Netlify frontend variables, or Git.

When Supabase variables are present, `GET /api/products` reads the database and `POST /api/products` replaces the database contents. Without them, the API falls back to `products.json` for local development.
Server persistence for Khushi Online Store

This repository includes a minimal Express server to persist `products.json`.

Why: The admin console originally saved changes to browser `localStorage`, which is local to each browser instance. To make product changes available across different browsers/devices you must persist changes to a shared store (server-side file or database).

How to run (development):

1. Install Node.js (v16+ recommended).
2. From the project root run:

```bash
npm install
npm start
```

3. The server listens on `http://localhost:3000` by default.

API endpoints:
- GET  /api/products  -> returns contents of `products.json`
- POST /api/products  -> accepts an array of products and overwrites `products.json` (creates a backup `products.json.bak`)

Serving the frontend:
- The server now serves the frontend static files from the project root. After starting the server you can open the website at:

	http://localhost:3000/

	This makes it easy to test full end-to-end behavior: admin console changes POST to `/api/products`, which updates `products.json` on disk, and the main site will then load the updated list from `/api/products`.

Important notes:
- This server is a minimal dev helper and is NOT production-ready.
- File writes are synchronous for simplicity; consider adding validation and authentication before using in production.

Admin console behavior:
- `admin-console.js` will attempt to POST updated products to `/api/products`. If the server is not running or the POST fails, the admin console will fall back to localStorage-only synchronization and keep the previous UX.

If you want, I can also add an optional script to serve the frontend from the same server for local testing.
