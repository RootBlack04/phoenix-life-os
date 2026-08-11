# Phoenix Life OS — Local Full-Stack Dashboard

Phoenix Life OS is a personal operating system dashboard built with Next.js, TypeScript, Tailwind CSS, Framer Motion and Recharts.

This version adds a real local PostgreSQL backend through **Supabase Local + Docker**, with **Prisma ORM** as the database access layer.

## Architecture

```text
Next.js 16
   ↓
Server Components / Server Actions
   ↓
Prisma ORM 7
   ↓
Supabase Local
   ↓
PostgreSQL
```

The existing UI is preserved. `src/data/mock.ts` is now used only as the original reference/demo source; runtime dashboard data is read from PostgreSQL after seeding.

## Requirements

- Node.js 20+
- npm
- Docker Desktop running
- Supabase CLI

Install the Supabase CLI using the official installation method for your OS, then verify:

```bash
supabase --version
docker --version
node --version
```

## 1. Install dependencies

```bash
npm install
```

## 2. Start Supabase Local

From the project root:

```bash
supabase start
```

The local stack uses the default Supabase ports:

- API: `http://127.0.0.1:54321`
- PostgreSQL: `127.0.0.1:54322`
- Studio: `http://127.0.0.1:54323`

Check the stack with:

```bash
supabase status
```

## 3. Configure environment

Copy the example file:

```bash
cp .env.example .env.local
```

The default local PostgreSQL URL is:

```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres?schema=public"
```

If your Supabase CLI reports different local database credentials/ports, use the values reported by `supabase status`.

## 4. Generate Prisma Client

Prisma 7 uses the generated client output in `src/generated/prisma`:

```bash
npm run db:generate
```

## 5. Create the database schema

For the first setup:

```bash
npm run db:migrate -- --name init
```

Prisma owns the application migration history in this project. Supabase Local supplies PostgreSQL and its surrounding local services; we do not maintain a second competing schema migration history in Supabase migrations.

## 6. Seed demo data

```bash
npm run db:seed
```

This creates a demo Phoenix Life OS user and realistic data for:

- Goals / missions
- Tasks
- Habits + habit logs
- Notes
- Languages + progress
- Engineering tracks + projects
- Job applications
- Resources
- Health metrics
- Income
- Daily dashboard metrics
- Journal entries

## 7. Start Next.js

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Useful commands

```bash
npm run dev
npm run build
npm run lint
npm run db:generate
npm run db:migrate -- --name <migration-name>
npm run db:seed
npm run db:reset
npm run db:studio
```

`npm run db:studio` opens Prisma Studio for inspecting the PostgreSQL data.

## Current database-backed features

### Overview

- KPIs are calculated from database records
- Life-area progress is calculated from domain data
- Active missions come from goals
- Weekly score/focus charts come from `DailyMetric`
- Task status comes from real tasks
- Habit preview comes from `HabitLog`
- Language progress comes from PostgreSQL
- Engineering progress comes from PostgreSQL
- Quick notes are persisted

### Notes

- Create notes
- Edit title/content
- Pin/unpin
- Delete
- Search
- Markdown-style preview
- Changes survive browser refresh

### Habits

- Real weekly habit records
- Toggle completion
- Unique `(habitId, date)` constraint prevents duplicate daily logs
- Data survives refresh

### Career

- Job applications are loaded from PostgreSQL
- Click a card to move it through the Kanban stages
- Status changes are persisted

### Health

- Latest metrics are loaded from PostgreSQL
- Sleep trend uses stored health records
- New health records can be saved

### Income

- Income sources and goals come from PostgreSQL
- New income records can be saved

## Database schema

The main Prisma models are:

```text
User
Goal
Task
Habit
HabitLog
Note
JournalEntry
Language
LanguageProgress
EngineeringTrack
Project
JobApplication
Resource
HealthMetric
Income
DailyMetric
```

## Important architecture rule

Prisma is server-only. It must never be imported into browser/client components.

The intended data flow is:

```text
Client UI
   ↓
Server Action / Server Component
   ↓
src/lib/db/*
   ↓
src/lib/prisma.ts
   ↓
Prisma
   ↓
PostgreSQL
```

## Local-only phase

This project is intentionally configured for **Supabase Local** during development.

Nothing here requires Supabase Cloud.

Later, the same PostgreSQL/Prisma architecture can be moved to a hosted PostgreSQL/Supabase project by changing the database connection configuration rather than rewriting the UI.

## Troubleshooting

### `DATABASE_URL is not configured`

Create `.env.local` from `.env.example` and restart the Next.js server.

### Prisma Client is missing

Run:

```bash
npm run db:generate
```

### Database connection refused

Make sure Docker Desktop is running and:

```bash
supabase start
supabase status
```

### Reset everything locally

```bash
npm run db:reset
npm run db:seed
```

If the Supabase stack itself is broken:

```bash
supabase stop
supabase start
```

## Verification checklist

After local setup, verify:

```bash
npm run db:generate
npm run db:migrate -- --name init
npm run db:seed
npm run lint
npm run build
```

Then:

```bash
npm run dev
```

Open each route and refresh after making a data change. Persistent records should remain after refresh.

## Note about this repository package

The development environment used to prepare this package does not provide Docker or access to Prisma's package/binary registry, so the final Prisma generation/migration commands cannot be executed inside that environment. The project is configured for Prisma 7 + Supabase Local and those commands are intended to be run on the developer machine with normal npm/Docker access.
