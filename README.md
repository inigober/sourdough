# Sourdough

Mobile-first sourdough baking assistant — recipe builder, schedule planner, bake companion, and bake history.

## Prerequisites

- Node.js 22+ (uses `node --experimental-strip-types` for tests)
- npm

## Setup

```bash
npm install
cp .env.example .env.local
```

Edit `.env.local` with your Supabase project URL and publishable (or anon) key. The app runs without Supabase for local-only recipe storage; sign-in enables cloud sync and bake history.

For the hosted project, also configure GitHub Actions secrets so the daily keepalive workflow can run — see [Supabase operations](docs/engineering/supabase-ops.md).

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Typecheck and production build |
| `npm run preview` | Preview production build |
| `npm test` | Run all unit tests |
| `npm run test:recipe` | Recipe calculation and validation tests |
| `npm run test:schedule` | Schedule builder logic tests |
| `npm run test:storage` | Local and cloud storage tests |
| `npm run test:companion` | Bake companion session tests |
| `npm run test:features` | Wizard flow logic + React component smoke tests (Vitest) |

## Project layout

```text
src/
  features/     # UI screens (recipe builder, schedule, companion, history)
  lib/          # Domain logic, storage, hooks (no React in most modules)
  components/   # Shared UI primitives
docs/           # Product and engineering notes
supabase/       # Database migrations
```

`RecipeBuilder.tsx` composes feature views and custom hooks:

- `useRecipeWizard` — recipe/schedule state, wizard steps, field updaters, draft persistence
- `useAppRouter` + `appRoutes.ts` — URL paths synced with tab, phase, wizard step, and history detail
- `useBakeFlow` — start, resume, save, and exit bake sessions
- `useAuthPrompt` — welcome-screen sign-in prompt
- `useSavedRecipes`, `useBakeSession`, `useBakeHistory` — persistence and cloud sync
- `useScheduleBuilder` — schedule timeline, advice, and export logic for the schedule screen

## Docs

- [UI/UX practices](docs/product/ui-ux-practices.md)
- [Phase 1 implementation plan](docs/engineering/phase-1-implementation-plan.md)
- [Supabase operations](docs/engineering/supabase-ops.md) — keepalive workflow and GitHub secrets
