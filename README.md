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

Edit `.env.local` with your Supabase project URL and publishable (or anon) key. The app runs without Supabase for local-only recipe storage; bake history is also kept on the device; sign-in adds cloud sync and backup (see [Bake history](docs/product/bake-history.md)).

For production, configure [Vercel environment variables](docs/engineering/vercel-deployment.md) (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) and connect the repo so pushes to `main` deploy automatically.

For the hosted Supabase project, configure a daily keepalive ping on cron-job.org — see [Supabase operations](docs/engineering/supabase-ops.md).

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
| `npm run test:companion` | Bake mode session, timer, and coach logic tests |
| `npm run test:history` | Bake history storage, import, and stats tests |
| `npm run test:features` | Wizard flow logic + React component smoke tests (Vitest) |
| `npm run build:ios` | Build web, regenerate icons, `cap sync ios` (see [iOS native setup](docs/engineering/ios-native-setup.md)) |

## Project layout

```text
src/
  features/     # UI screens (recipe builder, schedule builder, recipe view, bake mode, history, auth)
  lib/          # Domain logic, storage, hooks (no React in most modules)
  components/   # Shared UI primitives
docs/           # Product and engineering notes
supabase/       # Database migrations and the coach edge function
ios/App/        # Capacitor shell, BakeTimer plugin (AlarmKit), Live Activity widget extension
```

`RecipeBuilder.tsx` composes feature views and custom hooks:

- `useRecipeWizard` — recipe/schedule state, wizard steps, field updaters, draft persistence
- `useAppRouter` + `appRoutes.ts` — URL paths synced with tab, phase, wizard step, and history detail
- `useBakeFlow` — start, resume, save, and exit bake sessions
- `useAuthPrompt` — when the optional "Sync your recipes" offer appears
- `useSavedRecipes`, `useBakeSession`, `useBakeHistory` — persistence and cloud sync
- `useScheduleBuilder` — schedule timeline, advice, and export logic for the schedule screen

## Docs

Product:

- [Recipe builder](docs/product/recipe-builder.md) — inputs, defaults, outputs, templates
- [Calculation and assessment](docs/product/calculation-and-assessment.md) — formula, fermentation heuristic, validation, assessment rules
- [UX](docs/product/ux.md) — screens and flows, schedule presets, bake mode, coach
- [Recipe view and relative days](docs/product/recipe-view-and-relative-days.md)
- [Bake history](docs/product/bake-history.md)
- [UI/UX practices](docs/product/ui-ux-practices.md) — interaction and layout rules
- [UX review for commercial viability](docs/product/ux-review-commercial-viability.md) — dated review with current status

Engineering:

- [Architecture](docs/engineering/architecture.md) — folders, hooks, data types, storage, routing, testing
- [iOS native setup](docs/engineering/ios-native-setup.md) and [Native iOS bake timers](docs/engineering/native-ios-bake-timers.md)
- [Leave dialog and unsaved navigation](docs/engineering/leave-dialog-and-unsaved-navigation.md)
- [Vercel deployment](docs/engineering/vercel-deployment.md) — production hosting, env vars, auto-deploy on `main`
- [Supabase operations](docs/engineering/supabase-ops.md) — free-tier keepalive via cron-job.org
