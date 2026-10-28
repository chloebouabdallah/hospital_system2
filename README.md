# Patient Guidance & Appointment Platform

Final Year Project — a patient guidance and appointment booking system with a rule-based symptom checker.

## Stack

- Frontend: React (Vite)
- Backend: Node.js / Express
- Database: PostgreSQL
- ORM: Prisma 6

## Structure

```
fyp/
├── backend/       Express API + Prisma + PostgreSQL
│   ├── db/        SQL scripts (schema, verify, seed)
│   ├── prisma/    Prisma schema
│   └── src/       Express app (routes, controllers, middleware)
├── frontend/      React app
│   └── src/       components, pages, services, hooks
└── README.md
```

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### Backend

```
cd backend
npm install
```

Create a `.env` file in `backend/`:

```
DATABASE_URL="postgresql://postgres:<password>@127.0.0.1:5433/patient_platform?schema=public"
PORT=5000
JWT_SECRET=<your-secret>
```

Then:

```
npx prisma generate
npm run dev
```

Backend runs at http://localhost:5000 — health check: http://localhost:5000/api/health

### Frontend

```
cd frontend
npm install
npm run dev
```

Frontend runs at http://localhost:5173

## Disclaimer

This tool does not provide a medical diagnosis. It is intended only to help users understand their symptoms and decide what type of care to seek.