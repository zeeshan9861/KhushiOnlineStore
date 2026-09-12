Netlify + Hosted backend (recommended)

Overview

- Deploy the static frontend to Netlify.
- Deploy the Express backend (`server.js`) to a small host (Render, Railway, Heroku, VPS).
- Point the frontend to the backend by creating an `api-config.js` file containing `window.API_BASE_URL = 'https://your-backend.example';` and include it in the published site root.

Quick steps

1) Deploy backend (example: Render)
- Create a new Web Service on Render or Railway, connect your GitHub repo, set the start command to `node server.js` and the port to `3001` (or leave default and set `PORT` environment variable).
- Ensure the service is reachable at `https://your-backend-domain`.

2) Configure frontend API base
- Create `api-config.js` in the project root (not committed with secrets if you prefer):

  window.API_BASE_URL = 'https://your-backend-domain';

 - Alternatively, during Netlify build you can auto-generate `api-config.js` from an environment variable. The repository includes a build script `scripts/generate-config.js` that uses the env var `NETLIFY_API_BASE_URL`.

  To enable automatic generation on Netlify set these deploy settings:

  - Build command: `npm run build`
  - Publish directory: `/` (project root) or the folder you use for static files
  - Environment variable: `NETLIFY_API_BASE_URL` = `https://your-backend-domain`

  Netlify will run `npm run build` during deploy and create `api-config.js` with the provided URL.

3) Deploy frontend to Netlify
- In Netlify, create a new site from Git and point the repository.
- Set "Publish directory" to the repository root (the site is static files).
- Add any build command if you have one (this project is plain HTML/JS so you can leave build command empty).
- Ensure `api-config.js` is present in the repo/publish directory or generate it during build.

4) Verify end-to-end
- Admin console URL: https://your-netlify-site/admin-console-system/admin-console.html
- Main site: https://your-netlify-site/
- When you delete/add a product in Admin, it will POST to `https://your-backend-domain/api/products` and the server will persist to `products.json`. The main site will fetch from the same backend.

Notes & Production concerns
- Do not rely on `products.json` file persistence for a production app; migrate to a database (Postgres, MongoDB, or Supabase) for concurrency and durability.
- Secure the backend by adding authentication and validating POST payloads.
- Use HTTPS for both frontend and backend.

If you want, I can:
- Add a small build script to generate `api-config.js` from a Netlify env var during deploy, or
- Create a `Dockerfile` and Render instructions for deploying the backend automatically.

Which of these would you like next? (generate-config / docker-backend)
