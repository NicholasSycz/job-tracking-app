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
