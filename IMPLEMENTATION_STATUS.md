# Phoenix Life OS — Database Migration Status

## Completed in this package

- Prisma 7 schema for the Phoenix Life OS domains
- Prisma 7 `prisma.config.ts`
- PostgreSQL driver adapter architecture (`@prisma/adapter-pg`)
- Reusable Prisma singleton
- Supabase Local Docker configuration
- `.env.example`
- Prisma seed data based on the existing dashboard mock data
- Server-side database query layer
- Server Actions with Zod validation
- Overview dashboard moved from mock runtime data to database queries
- Notes persistence
- Habit persistence + real HabitLog heatmap
- Career application status persistence
- Health metric persistence
- Income persistence
- Languages, engineering, resources, journal and dashboard metrics read from PostgreSQL
- Runtime imports of `src/data/mock.ts` removed from the application UI
- README with local setup instructions

## Not verified in the preparation environment

The preparation environment did not provide Docker and could not access Prisma's npm/binary registry. Therefore these commands were not executable here:

```bash
npm install
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run build
```

The code was checked for TypeScript syntax; dependency-resolution errors are expected until dependencies and the generated Prisma client are installed.

## First-run commands on your Windows machine

```powershell
cd phoenix-life-os
npm install
supabase start
Copy-Item .env.example .env.local
npm run db:generate
npm run db:migrate -- --name init
npm run db:seed
npm run lint
npm run build
npm run dev
```

If PowerShell's `Copy-Item` command is inconvenient, create `.env.local` manually from `.env.example`.

## Expected architecture

```text
Browser
  ↓
Next.js App Router
  ↓
Server Components / Server Actions
  ↓
src/lib/db
  ↓
src/lib/prisma.ts
  ↓
Prisma 7 + @prisma/adapter-pg
  ↓
Supabase Local PostgreSQL
```
