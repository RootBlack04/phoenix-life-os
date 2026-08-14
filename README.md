# Phoenix Life OS

Phoenix Life OS is a personal Life Operating System dashboard built with Next.js, React, TypeScript, Tailwind CSS, Prisma, PostgreSQL/Supabase Local, Server Actions, Zod, Framer Motion, and Lucide React.

## Current status

**2026-08-14 — Release Candidate**

The current local working project has completed feature implementation and functional verification for the core dashboard modules.

### Core modules

| Module | Status |
|---|---|
| Overview | 🟢 Verified |
| Habits | 🟢 Verified |
| Notes | 🟢 Verified |
| Career | 🟢 Verified |
| Income | 🟢 Verified |
| Health | 🟢 Verified |
| Engineering | 🟢 Fully verified |
| Languages | 🟢 Fully verified |
| Mindset | 🟢 Fully verified |
| Resources | 🟢 Fully verified |
| Settings | 🟢 Fully verified |

## Verification

The local project was verified with:

```bash
npx prisma migrate status
npx prisma validate
npm run lint
npm run build
```

Results recorded on 2026-08-14:

- Prisma migrations: **up to date**
- Prisma schema validation: **passed**
- ESLint: **passed**
- Production build: **passed**

Interactive verification was also performed for Engineering, Languages, Mindset, Resources, and Settings, including persistence after refresh where applicable.

## Database

The project uses Prisma with PostgreSQL through local Supabase.

The current database state was verified as:

```text
Database schema is up to date!
```

Do not run destructive database commands such as a reset unless explicitly required and reviewed first.

## Architecture

```text
Next.js
  ↓
Server / Client Components
  ↓
Server Actions
  ↓
Database layer
  ↓
Prisma
  ↓
PostgreSQL / Supabase Local
```

Interactive domain components live under:

```text
src/components/domain/
```

Database access and Server Actions live under:

```text
src/lib/db/
```

## Development rule

Preserve the existing architecture.

Prefer:

```text
ONE TASK → TEST → VERIFY → CHECKPOINT → NEXT TASK
```

Do not rebuild working modules unnecessarily.

## Checkpoint history

The project uses dated checkpoints to distinguish:

- Implemented
- Functionally verified
- Database verified
- Production verified

See `IMPLEMENTATION_STATUS.md` for the current detailed verification state and checkpoint history.

## Security

`.env` and `.env.local` are local environment files and are not part of the GitHub repository. Never commit real secrets.

## Next phase

Core feature verification is complete.

The next work is maintenance/documentation/UX polish only unless a real defect is discovered.
