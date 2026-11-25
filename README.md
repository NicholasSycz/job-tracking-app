# JobJourney

A full-stack web application for tracking job applications during your job search. Built with React, Express, TypeScript, and PostgreSQL.

## Tech Stack

**Frontend**
- React 19 with TypeScript
- Vite (build tool)
- Recharts (analytics/charting)
- Lucide React (icons)

**Backend**
- Express 5 with TypeScript
- Prisma ORM
- PostgreSQL
- JWT authentication (with optional Google OAuth)
- Rate limiting

**Testing**
- Jest (unit/integration tests)
- Playwright (end-to-end tests)

## Prerequisites

- Node.js (v18 or higher recommended)
- PostgreSQL database
- npm

## Project Structure

```
job-tracking-app/
├── jobjourney/          # React frontend
├── jobjourney-api/      # Express backend
└── e2e/                 # Playwright end-to-end tests
```

## Installation

Clone the repository and install dependencies for each package:

```bash
# Install frontend dependencies
cd jobjourney
npm install

# Install backend dependencies
cd ../jobjourney-api
npm install

# Install e2e test dependencies (optional)
cd ../e2e
npm install
```

## Environment Setup

### Backend

Create a `.env` file in the `jobjourney-api/` directory:

```bash
cp jobjourney-api/.env.example jobjourney-api/.env
```

Configure the following variables:

```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://user:password@localhost:5432/jobjourney
JWT_SECRET=your-secure-jwt-secret-change-me
CORS_ORIGINS=http://localhost:3000
FRONTEND_URL=http://localhost:3000

# Optional: Google OAuth (leave empty to disable)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:4000/auth/google/callback
```

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `JWT_SECRET` | Production only | `dev-secret-change-me` | Secret for JWT signing |
| `PORT` | No | `4000` | API server port |
| `NODE_ENV` | No | `development` | Environment mode |
| `CORS_ORIGINS` | No | `http://localhost:3000` | Allowed CORS origins (comma-separated) |
| `FRONTEND_URL` | No | `http://localhost:3000` | Frontend URL for redirects |

### Frontend

Create a `.env.local` file in the `jobjourney/` directory:

```bash
cp jobjourney/.env.example jobjourney/.env.local
```

Configure the API URL:

```env
VITE_API_BASE_URL=http://localhost:4000
```

## Database Setup

1. Create a PostgreSQL database:

```bash
createdb jobjourney
```

2. Run Prisma migrations:

```bash
cd jobjourney-api
npx prisma migrate deploy
```

3. Generate the Prisma client:

```bash
npx prisma generate
```

## Running the Application

You'll need two terminal windows to run both servers.

### Start the Backend

```bash
cd jobjourney-api
npm run dev
```

The API will be available at `http://localhost:4000`.

### Start the Frontend

```bash
cd jobjourney
npm run dev
```

The app will be available at `http://localhost:3000`.

## Running Tests

### Unit & Integration Tests (Backend)

```bash
cd jobjourney-api

# Run tests once
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### End-to-End Tests

Make sure both frontend and backend servers are stopped before running e2e tests (Playwright will start them automatically).

```bash
cd e2e

# Run tests
npm run test

# Run with UI
npm run test:ui

# Run in headed mode (visible browser)
npm run test:headed

# Debug mode
npm run test:debug
```

## Building for Production

### Frontend

```bash
cd jobjourney
npm run build
```

Build output will be in `jobjourney/dist/`.

### Backend

```bash
cd jobjourney-api
npm run build
npm start
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/signup` | Register a new user |
| POST | `/auth/login` | Log in |
| POST | `/auth/password-reset` | Request password reset |
| GET | `/auth/google` | Google OAuth login |
| GET | `/auth/ping` | Health check |
| GET | `/api/applications` | List job applications |
| POST | `/api/applications` | Create application |
| PUT | `/api/applications/:id` | Update application |
| DELETE | `/api/applications/:id` | Delete application |
| GET | `/api/settings` | Get user settings |
| PUT | `/api/settings` | Update user settings |

## Features

- Track job applications with status (Applied, Interview, Offer, Rejected, etc.)
- Dashboard with application statistics
- Analytics and charts
- Search and filter applications
- Dark/light theme
- Multi-tenant architecture
- Rate limiting for API protection

## Web push notifications on the Raspberry Pi

Web push has no subscription fee. JobJourney stays on your home network, but the Pi
and phones need internet access to contact the browser's push service (Apple's APNs
on iPhone). Email delivery is not implemented yet.

### Configure the backend

Install dependencies, apply the database migration, and generate the Prisma client:

```bash
cd jobjourney-api
npm ci
npx prisma migrate deploy
npx prisma generate
npm run push:keys
```

If your existing database was created with `prisma db push` and has no migration
history, `migrate deploy` reports P3005. Baseline that database against its existing
schema before deploying migrations; do not reset a database containing your jobs.
For a disposable test database, `prisma db push` can synchronize the test schema.

Copy the generated keys into the backend `.env` and set a real contact email:

```env
WEB_PUSH_PUBLIC_KEY=<generated publicKey>
WEB_PUSH_PRIVATE_KEY=<generated privateKey>
WEB_PUSH_SUBJECT=mailto:your-email@example.com
FRONTEND_URL=https://pi-server.local
CORS_ORIGINS=https://pi-server.local
```

Keep the same key pair across restarts and deployments. The private key stays on
the backend. If you rotate keys, each phone must enable notifications again.
Restart the backend after configuring these values. The reminder worker runs in
the API process every minute; keep that process running on the Pi.

### Enable trusted HTTPS

iPhone web push cannot use `http://pi-server.local/`. Use
`https://pi-server.local/` with a certificate both phones trust. A free local
option is [Caddy's internal certificate authority](https://caddyserver.com/docs/automatic-https#local-https).
The example [Caddyfile](deployment/Caddyfile) serves the frontend and proxies API,
auth, and avatar requests to port 4000 on the same origin.

1. Install Caddy on the Pi using its [installation instructions](https://caddyserver.com/docs/install).
   Integrate the example into your current web-server setup; ports 80/443 may
   already be occupied by the server currently serving JobJourney.
2. Set `VITE_API_BASE_URL=https://pi-server.local` in `jobjourney/.env.local`, then
   run `npm ci` and `npm run build` in `jobjourney/`.
3. Copy the contents of `jobjourney/dist/` to `/srv/jobjourney/dist/`, or change the
   `root` path in the Caddyfile. Ensure the Caddy service can read that directory.
4. Use the example as Caddy's configuration and start/reload Caddy. Preserve its
   data directory so the local certificate authority survives restarts.
5. Transfer Caddy's **public** `pki/authorities/local/root.crt` from its data
   directory to each iPhone and install the certificate profile. Never transfer
   the CA private key. Then open **Settings → General → About → Certificate Trust
   Settings** and enable full trust for that root certificate, as described in
   [Apple's instructions](https://support.apple.com/en-us/102390).
6. Confirm Safari opens `https://pi-server.local/` without a certificate warning.
   Keep the service on your LAN; router port forwarding is not required.

Both the frontend and API must use HTTPS from the phone's perspective; an HTTPS
page cannot call the old HTTP API URL. The same-origin proxy above handles this.
HTTP and HTTPS also have separate login storage, so sign in again after switching.

### Enable each iPhone

On iOS 16.4 or later:

1. In Safari, visit `https://pi-server.local/` and choose **Share → Add to Home Screen**.
2. Open JobJourney from its Home Screen icon and sign in.
3. Open **Settings → Notifications → Enable on this device**, then allow notifications.
4. Use **Send test notification** and confirm the phone receives it.

Repeat on the other phone. Subscriptions belong to the signed-in account. Two
phones signed into the same account both receive that account's reminders;
separate accounts in the same workspace receive job-added and job-updated alerts
for that workspace, while scheduled reminders remain for their own applications.
Signing out or choosing **Disable on this device** stops future delivery to that device.

### Notification behavior

- Job added/updated: enabled accounts in the same workspace receive an alert,
  including the person making the change. Each account can turn these two alert
  types off independently. Each subscribed phone receives its own copy.
- Bulk imports and status changes send one summary per device. Unchanged saves
  do not send an alert. Failed or unauthorized writes do not queue alerts.
- Change alerts are queued in the same database transaction as the saved jobs.
  Delivery starts after commit without delaying the response. Temporary failures
  retry through the background worker; membership and preferences are checked
  again before retrying. Undelivered change alerts expire after 24 hours.
- Follow-ups: one reminder per device when an application's enabled follow-up
  date is due. Changing that date makes it a new reminder.
- Interviews: one reminder per device for each enabled, pending interview round
  within the next 24 hours. Past rounds and completed outcomes are skipped.
- Closed applications (Offer, Rejected, Ghosted), inactive accounts, and users who
  no longer belong to the job's workspace do not receive reminders.
- Account preferences apply across that account's enabled devices. The per-job
  reminder checkboxes still control which applications qualify.
- Delivery history persists in PostgreSQL. Temporary failures retry after five
  minutes; expired browser subscriptions are removed. Delivery means the push
  service accepted the message, not that a person read it. In the rare case of a
  server crash between sending and recording success, a retry may occur.
- Notification taps open Applications or Calendar. Opening those views still
  requires connectivity to the Pi; iPhone Focus settings can delay visible alerts.

Without VAPID configuration, notification settings explain that setup is needed,
and the worker stays disabled. No external push service is contacted by the tests.
