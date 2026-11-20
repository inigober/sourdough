---
title: Architecture
status: current
date: 2026-11-19
---

# Architecture

## What The App Is

A mobile-first sourdough assistant: a recipe builder, a schedule planner, a bake mode with timers and a coach, and a bake history. It is a React + TypeScript + Vite web app (installable as a PWA) wrapped as an iOS app with Capacitor. An optional Supabase backend adds sign-in, cloud recipe sync, history sync, and the coach. Without Supabase the app works fully on the device.

The code should stay easy to learn from: explicit data flow, small files, domain logic separate from UI, and tests next to the logic.

## Stack And Why

- **React** for UI components (`react-router-dom` for URLs).
- **TypeScript**, strict, for explicit recipe, schedule and session types. The domain types are the best documentation of the product.
- **Vite** for development and bundling, with `vite-plugin-pwa` for the web manifest and service worker.
- **Capacitor** for the iOS shell and the local `BakeTimer` plugin (see [iOS native setup](./ios-native-setup.md)).
- **Supabase** (optional): auth, Postgres tables with row-level security, and one edge function for the coach.
- **Node's built-in test runner** (`node --test`) for domain logic under `src/lib` and some pure feature logic, and **Vitest** for React component tests, because `node --test` cannot import `.tsx`.

Why this stack:

- It is lightweight enough for a learning project.
- It keeps calculation logic easy to test outside the UI.
- It avoids a backend-first design: recipes and history are stored locally first, and the cloud is an add-on.

Alternatives considered:

- Next.js: heavier than needed; the app is a client-side app and Vercel serves the static build with a rewrite to `index.html` (see [Vercel deployment](./vercel-deployment.md)).
- Plain JavaScript: faster to start, but weaker for learning data shapes and preventing formula mistakes.
- A global state library: not needed. State is local to a feature hook (see below).

## Folder Layout

```text
src/
  app/            App.tsx (router), format helpers
  components/     Shared UI with no baking knowledge (fields, dialogs, chrome, toast, icons)
  features/       One folder per screen area
    recipe-builder/  Wizard, summary, routing glue, bake-start flow
    schedule-builder/  Presets, timeline, customise sections
    recipe-view/     Read-only recipe page (also hosts Delete recipe)
    saved-recipes/   Saved tab list, its cards, and the compact shortcut on Home
    companion/       Bake mode, coach sheet, bake-complete dialog
    history/         History list and detail
    auth/            Sign-in modal and top bar
    dev/             Hidden dev panel
  lib/            Domain logic, storage, hooks. Mostly no React
    recipe/    Formula, validation, assessment, flour profiles, templates
    schedule/  Timeline, presets, defaults, bake start, relative days
    companion/ Bake session, live schedule, timers, coach, native timer bridge
    history/   History storage (local and remote), import, stats
    storage/   Saved recipes, drafts, bake session persistence
    auth/      Supabase client and auth context
    ui/        Pure rules behind UI (number field input)
    dev/       Local state reset
supabase/       migrations/ and functions/coach
ios/App/        Capacitor shell, BakeTimer plugin (AlarmKit), widget extension
docs/           product/ and engineering/ notes
```

Why this placement:

- `features/` owns user flows. `lib/` owns domain logic and can be tested without a UI. `components/` holds reusable building blocks that know nothing about baking.
- Business logic stays in `src/lib` with a `.test.ts` beside it. UI components display state and call handlers; they do not contain formula math.

## Data Flow

```text
User inputs
  -> RecipeInput state                (useRecipeWizard)
  -> validateRecipeInput(input)       blocking errors gate Continue
  -> calculateRecipe(input)           RecipeFormula
  -> assessRecipe(input, formula)     AssessmentSection[]
  -> UI screens
```

```text
RecipeInput + ScheduleInput
  -> buildTimeline(schedule, recipe)  TimelineStep[]  (offsets in minutes from mix start)
  -> formatTimelineForDisplay / mixDateTime.ts        clock times and date labels
  -> builder timeline, recipe view, bake mode
```

The direction stays one-way. Derived values (`RecipeFormula`, assessment, timeline) are recalculated from the inputs and never stored, which avoids stale summaries.

## Core Types

- `RecipeInput` (`lib/recipe/types.ts`): dough weight, loaves, hydration, salt, `doughFlours` blend, levain settings, target bulk time, room temperature. No dates, no schedule.
- `ScheduleInput` (`lib/schedule/types.ts`): autolyse, folds, proofing style (`roomTemperature` or `cold`), desired bake time, bake method and phases, starter prep. `mixDate` is `''` on recipes.
- `TimelineStep`: `startOffsetMinutes`, `durationMinutes`, display times, and `bakeDayOffset` (0 is the oven day, -1 the day before).
- `SavedRecipe` (`lib/storage/types.ts`): `recipeInput`, optional `scheduleInput`, timestamps.
- `BakeSession` (`lib/companion/types.ts`): a snapshot of recipe and schedule, current step, schedule drift, step logs, active timer end, coach question count, and the coach transcript.
- `BakeHistorySession` (`lib/history/types.ts`): the same snapshot plus notes, assessment, and per-step planned and actual times.

Keep type names close to the product docs so the code is easy to trace.

## Recipes Have No Calendar Date

Saved recipes and the builder use relative "Bake day −1" labels (`relativeDays.ts`). The real `mixDate` and `startTime` are chosen in `BakeStartDialog` when a bake starts and live only on the `BakeSession` and its history. Older saved recipes may still contain a `mixDate`; it is ignored and cleared on the next save. See [Recipe view and relative days](../product/recipe-view-and-relative-days.md).

## State And Hooks

State is local to features. `RecipeBuilder.tsx` composes the screens and these hooks:

| Hook | Owns |
| --- | --- |
| `useRecipeWizard` | Recipe and schedule state, wizard steps, field updaters, validation, formula and assessment, draft persistence |
| `useAppRouter` + `appRoutes.ts` | URL to tab, phase, wizard step, history detail and recipe view, and back |
| `useAppNavigation` (in `useAppLocation.ts`) | Unsaved-navigation blocking and the leave dialog (see [Leave dialog](./leave-dialog-and-unsaved-navigation.md)) |
| `useBakeFlow` | Start, resume, save and exit a bake, and the "When are you mixing?" request |
| `useBakeSession` | The one active bake session and its persistence |
| `useSavedRecipes` | Saved recipes, locally or in Supabase, and import after sign-in; `isSavedRecipesLoading` while a signed-in list loads. Feeds both Home and the Saved tab |
| `useBakeHistory` | History list and detail, locally or in Supabase, and import after sign-in |
| `useScheduleBuilder` | Timeline, advice, presets, and export for the schedule screen |
| `useAuthPrompt` | When the "Sync your recipes" offer may appear |

Bake mode adds its own hooks in `lib/companion/`: `useBakeNativeTimer` (keeps the native alarm in step with the session), `useBakeKeepAwake`, and `useBakeDeepLink`.

Do not abstract until reuse is real, and prefer local state over global state.

## Routing

Routes are defined in two places that must stay in sync:

- `features/recipe-builder/appRoutes.ts`: path helpers, `parseAppRoute`, `isKnownAppPath`, and the unsaved-navigation rule.
- The `createBrowserRouter` list in `src/app/App.tsx`.

The paths are `/`, `/saved`, `/history`, `/history/:bakeId`, `/recipe/:recipeId`, `/build/:step` (wizard steps, `summary`, `schedule`), and `/bake`. Unknown paths redirect home. All of them render `RecipeBuilder`, which picks the screen from the parsed route.

## Storage

Local storage keys (all read defensively):

| Key | Content |
| --- | --- |
| `sourdough:saved-recipes:v1` | Saved recipes while signed out |
| `sourdough:builder-draft:v1` | The unfinished recipe and schedule. Written as the baker works, but never while the builder still holds its untouched starting state (`isUntouchedBuilderState`), so loading the app or a `/build/...` URL cannot replace a real draft with defaults. Restored on a refresh at a `/build/...` URL (see below) |
| `sourdough:bake-session:v1` | The active bake session |
| `sourdough:bake-history:v1` | Completed bakes while signed out |
| `sourdough:auth-prompt-dismissed`, `sourdough:history-backup-nudge-dismissed` | Dismissed prompts |

When signed in (and Supabase is configured), recipes go to `saved_recipes` and history to `bake_sessions` and `bake_session_steps`, both with row-level security so each user sees only their own rows (`supabase/migrations/`). On sign-in, recipes saved on the device are imported once per user, then bakes saved on the device are uploaded; the local copy is removed only after its upload succeeded. See [Bake history](../product/bake-history.md).

The bake session lives on the device even when signed in: it is a working copy, and only the finished bake goes to history.

### Draft restore on refresh

The builder starts every page load with defaults. When the page is first loaded on a builder route (`/build/:step`, `/build/summary`, `/build/schedule`), `useRecipeWizard` puts the stored draft back into memory and **keeps the URL**. The rules are in `lib/storage/restoreBuilderDraft.ts` (`decideBuilderDraftRestore`, `resolveRestoredDraftState`, tested beside it):

- Only a first load on a builder route restores. Home, Saved, History, `/recipe/:id` and `/bake` never do (Home keeps its Resume card), and neither does an in-app navigation later.
- The URL wins over the draft's saved step. The restored content shows on whatever builder page the baker is on, and the next autosave records that step.
- It restores only while the builder is still untouched. If the baker edits during the (async) saved-recipe lookup, their edit wins and the draft is left alone.
- A draft linked to a saved recipe waits for sign-in to finish, then fetches that recipe by id (this device or the cloud) so the unsaved-changes check compares against the right recipe. If it is missing or unreachable, only the link is dropped: the work is kept and a later save creates a new recipe.
- The stored schedule is normalized like a saved one, so older draft shapes still load. `resumeDraft` (Home Resume card) uses the same state builder and then navigates to the draft's own step.

### Persisted data must tolerate older shapes

Anything persisted (local storage, Supabase rows, bake sessions, history) is normalized on read instead of assuming the latest shape. Examples: `normalizeScheduleInput.ts` fills missing schedule fields from defaults, `loadBakeSession` normalizes the coach transcript, and local history rows are normalized with unusable rows skipped.

Bake sessions store a snapshot of the recipe and schedule, and their timeline can change shape. Changing the shape of the timeline needs a bump of `CURRENT_BAKE_SESSION_TIMELINE_VERSION` (`lib/companion/migrateBakeSession.ts`) and a migration step there. It is currently version 2.

## Coach

The coach is a Supabase edge function (`supabase/functions/coach`) that calls an OpenAI model with the prompt built in `lib/companion/buildCoachPrompt.ts`. The function checks the user's sign-in token itself and answers 401 otherwise, caps request sizes, and enforces 5 questions per bake and 25 per user per rolling 24 hours by counting rows in `public.coach_usage` (written only by the function with the service role; the table has row level security and no policies). A question is recorded only after OpenAI answers. The rules are pure code in `supabase/functions/coach/usageRules.ts`, tested from `src/lib/companion/coachServerRules.test.ts`. Known limit: the prompt is still built in the app, so a signed-in user could send their own instructions within the caps; moving prompt building to the server is a follow-up.

## Native iOS

The Capacitor shell, the `BakeTimer` plugin (AlarmKit alarms on iOS 26+, local notifications before that, keep-awake), the Live Activity widget extension, and the `sourdough://bake` deep link are described in [Native iOS bake timers](./native-ios-bake-timers.md) and [iOS native setup](./ios-native-setup.md). Native timers are a companion layer: the in-app `activeTimerEndsAt` stays the source of truth.

## Testing

| Command | Covers |
| --- | --- |
| `npm run test:recipe` | Formula, validation, assessment, flour blends, templates |
| `npm run test:schedule` | Timeline, presets, defaults, bake start, relative days |
| `npm run test:storage` | Saved recipes, drafts, bake session storage, imports |
| `npm run test:companion` | Bake session, live schedule, timers, coach logic, wake lock, native timer bridge |
| `npm run test:history` | History storage, import, stats, bake again |
| `npm run test:ui`, `test:auth`, `test:dev` | Pure UI rules, auth helpers, local reset |
| `npm run test:features` | Wizard, routing and bake-flow logic (node runner), then component tests (Vitest, server-rendered markup) |
| `npm test` | All of the above |

CI (`.github/workflows/ci.yml`) runs `npm test` and `npm run build` on pushes to `main` and on pull requests. `npm run build` includes `tsc --noEmit`.

What the tests protect:

- Formula correctness (levain hydration splits, loaf division, validation limits).
- Assessment rules (flour-relative hydration, fermentation confidence).
- Persistence across older shapes.
- Bake-mode state changes (skip, undo, early start, drift).

Rule-based assessment is tested like any other pure function, which is the point of keeping it separate from AI-written advice.

## Decisions Worth Keeping

- **Domain logic has no React.** It can be tested in milliseconds and read without UI noise.
- **Derived values are never stored.** Formula, assessment and timeline are recomputed.
- **Local first.** Every feature works without Supabase; signing in adds sync and backup.
- **Calculation separate from judgment.** Numbers come from the calculator; coaching copy comes from rules; the LLM coach is optional and cannot change numbers.
- **Relative days on recipes, real dates on sessions.** One recipe can be baked on any date.
- **Explicit over clever.** Plain names, small files, strict types.

## Ideas Not Built Yet

- Android (the JS hook is shared; the native side would be separate).
- Offline-first behaviour for the web build beyond the PWA shell.
- Planning backward from the time the bread should be ready (choosing the oven time instead of the mix time).
