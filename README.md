# Phoenix Life OS

Phoenix Life OS is a personal operating-system dashboard for tracking life areas, measuring weekly progress, choosing priorities, executing real tasks, and reviewing results.

## Stable Baseline status

**Phoenix Life OS MVP — Stable Baseline**

The current repository is a verified, normal-usage MVP. Its application data is stored in PostgreSQL through Prisma, all production routes build successfully, and the planning-to-execution loop persists through hard refreshes.

The final baseline verification passed ESLint, TypeScript, the optimized Next.js build, all 12 production routes, and browser console checks. Production hosting and deployment have not been verified.

## Core product loop

```text
Track
→ Measure
→ Understand
→ Prioritize
→ Execute
→ Review
→ Improve
```

- Domain modules track habits, learning, engineering, career, income, health, mindset, notes, and resources.
- Weekly Analytics measures real activity in the active week.
- Weekly Score and Insights explain the current state without treating missing data as failure.
- The planning engine turns actionable insights into focused Weekly Priorities.
- Users explicitly create real Tasks from priorities and execute them on `/tasks`.
- Weekly Execution Review closes the loop with current-week task results.

## Main modules and routes

| Route | Module |
|---|---|
| `/` | Overview, Weekly Analytics, Score, Insights, Priorities, and Execution Review |
| `/tasks` | Production task execution |
| `/career` | Job-application board and neutral career guidance |
| `/engineering` | Engineering tracks and projects |
| `/habits` | Weekly habits and activity history |
| `/health` | Health metrics and logging |
| `/income` | Income tracking |
| `/languages` | Language skills and study sessions |
| `/mindset` | Journal and mood tracking |
| `/notes` | Notes management |
| `/resources` | Learning resources and progress |
| `/settings` | Display name and default desktop-sidebar state |

## Execution flow

```text
Weekly Analytics
→ Weekly Score and Insights
→ Planning
→ Weekly Priorities
→ explicit Create Task
→ /tasks
→ PENDING → IN_PROGRESS → DONE
→ Weekly Execution Review
```

Priority-created tasks use the existing Prisma `Task` model. The active dashboard week and an exact title-and-description match associate a task with its originating priority. Creation is always user-controlled; the application does not generate tasks automatically.

Task status changes use Server Actions and the shared database layer. Moving a task to `DONE` sets `completedAt`; moving it out of `DONE` clears it. Server-backed refreshes preserve task state.

## Architecture and stack

```text
Next.js App Router
→ Server and Client Components
→ validated Server Actions
→ database access layer
→ Prisma
→ PostgreSQL / Supabase Local
```

Primary technologies:

- Next.js 16, React 19, and TypeScript
- Tailwind CSS
- Prisma and PostgreSQL
- Zod validation
- Recharts, Framer Motion, and Lucide React

Key locations:

- `src/app/` — production routes
- `src/components/` — dashboard, domain, layout, task, and UI components
- `src/lib/analytics/` — weekly metrics, score, insights, and planning
- `src/lib/db/` — database reads, writes, and Server Actions
- `prisma/schema.prisma` — data model
- `prisma/seed.ts` — optional local bootstrap data

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure a local environment file with the project database connection. Do not commit `.env` or `.env.local`.

3. Start the local PostgreSQL/Supabase database expected by the configured connection.

4. Generate the Prisma client and apply migrations:

   ```bash
   npm run db:generate
   npm run db:migrate
   ```

5. Optionally bootstrap the local `demo-user` dataset:

   ```bash
   npm run db:seed
   ```

   The seed is intended for local bootstrap and replaces the seeded user's existing domain records. Do not run it against data you need to preserve.

6. Start development:

   ```bash
   npm run dev
   ```

## Development commands

```bash
npm run dev          # Start the development server
npm run build        # Create an optimized production build
npm run start        # Run the completed production build
npm run lint         # Run ESLint
npm run db:generate  # Generate the Prisma client
npm run db:migrate   # Apply development migrations
npm run db:seed      # Bootstrap local demo-user data
npm run db:studio    # Open Prisma Studio
```

Avoid destructive database resets unless they are explicitly required and reviewed.

## Verification

Baseline checks:

```bash
npm run lint
npm run build
```

The Stable Baseline was also verified by loading every production route, checking browser console output, exercising task and Settings persistence, and confirming task lifecycle invariants in the database.

## Intentional limitations

These are current product boundaries, not defects:

- The application uses a single `demo-user`; production authentication and multi-user authorization are not implemented.
- Timezone is informational and read-only in Settings. Weekly calculations use the application's configured Casablanca timezone.
- Theme selection is not exposed because alternate themes are not implemented.
- Notifications and notification delivery are not implemented.
- Localization and language switching are not implemented.
- Weekly Settings goals are not exposed until they have real analytics/UI consumers.
- Priority-to-task association is a current-week exact title-and-description match rather than a dedicated provenance field.
- Production deployment and hosting readiness have not been verified.

## Development rule

Preserve the existing architecture and work in verified increments:

```text
ONE TASK → IMPLEMENT → TEST → VERIFY → CHECKPOINT → NEXT TASK
```

The Stable Baseline is complete. Future feature work should begin with an explicit product decision rather than continuing obsolete audit cleanup tasks.
