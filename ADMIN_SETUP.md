# Admin Dashboard

The public form saves responses to the local server. Google Sheets and Google Drive are not used.

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

- Form responses: `data/submissions.json`
- Uploaded files: `data/uploads/<submission-id>/`

The `data` directory is excluded from git. Back it up separately and use persistent disk storage when deploying.

## Production

Build and start the same Node server:

```bash
npm run build
npm start
```

Set `NODE_ENV=production` and use HTTPS so the admin session cookie is Secure. The host must provide persistent disk
storage; serverless hosts with temporary filesystems are not suitable for this storage setup.
