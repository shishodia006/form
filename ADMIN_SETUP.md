# Admin Dashboard

The public form and protected admin dashboard use the same API.

## Run locally

```bash
npm install
npm run dev
```

- Public form: `http://localhost:5173`
- Admin dashboard: `http://localhost:5173/admin`

Admin credentials are stored in `.env.local`:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-strong-password
SESSION_SECRET=your-long-random-secret
HOST=0.0.0.0
```

Restart `npm run dev` after changing these values.

## Data storage

Without cloud environment variables, local development uses:

- Form responses: `data/submissions.json`
- Uploaded files: `data/uploads/<submission-id>/`

The `data` directory is excluded from git.

## Deploy on Vercel

Vercel cannot persist the local `data` directory. Production uses:

- Neon Postgres for form responses
- A private Vercel Blob store for uploaded files

### 1. Connect Neon

1. Open the Vercel project.
2. Open `Storage` or `Marketplace`.
3. Select `Neon` and create a free Postgres database.
4. Connect it to this project and confirm that `DATABASE_URL` appears under `Settings > Environment Variables`.

The API creates the `website_intake_submissions` table automatically on its first database request.

### 2. Connect private Blob storage

1. Open the project `Storage` section.
2. Create a Blob store.
3. Select **Private** access when creating it.
4. Connect it to this project and confirm that `BLOB_READ_WRITE_TOKEN` is available.

Private/public access cannot be changed after creating the store.

### 3. Add project environment variables

Add these under `Settings > Environment Variables` for Production, Preview, and Development:

```env
VITE_ADMIN_WHATSAPP_NUMBER=919876543210
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-strong-admin-password
SESSION_SECRET=your-long-random-secret
```

`DATABASE_URL` and `BLOB_READ_WRITE_TOKEN` should come from the connected storage integrations. Do not prefix
server secrets with `VITE_`.

### 4. Redeploy

Open `Deployments`, redeploy the latest commit, then check:

- API health: `/api/health`
- Public form: `/`
- Admin dashboard: `/admin`

The health response should show `"database":"postgres"`, `"uploads":"blob"`, and
`"securityConfigured":true`.

## Production behavior

Uploaded files go directly from the browser to private Blob storage using a short-lived signed upload authorization.
Only an authenticated admin can download them through the API. Form responses are saved in Postgres and remain
available across deployments.

Existing responses in the local `data` directory do not automatically move to Neon.
