# Sourdough

Mobile-first sourdough baking assistant: recipe builder, schedule planner, bake companion (step-by-step bake mode with timers and a coach), and bake history. React + TypeScript + Vite, wrapped as an iOS app with Capacitor. Optional Supabase backend for sign-in, cloud recipe sync, and bake history; the app works fully local without it.

The owner is a PM learning engineering through this product. Treat the repo as a learning tool as well as a product (see "How to work with me").

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite dev server |
| `npm run build` | `tsc --noEmit` + production build |
| `npm test` | All unit tests (Node test runner for `src/lib`, Vitest for components) |
| `npm run test:schedule` / `test:recipe` / `test:storage` / `test:companion` / `test:history` / `test:features` | One area at a time. Prefer these while iterating |
| `npm run build:ios` | Build web, regenerate icons, `cap sync ios`. Fails on purpose if `VITE_BAKE_TIMER_TEST_*` is set |
| `npm run build:ios:test` | Same, but allows the short bake-timer override for device testing |

iOS details live in [docs/engineering/ios-native-setup.md](docs/engineering/ios-native-setup.md). Run `pod install` with `LANG=en_US.UTF-8` or CocoaPods crashes on a Unicode normalization error. Open `ios/App/App.xcworkspace`, never the `.xcodeproj`.

## Architecture

```text
src/features/   UI screens: recipe-builder, schedule-builder, companion (bake mode), history, auth
src/lib/        Domain logic, storage, hooks. Mostly no React
src/components/ Shared UI primitives
docs/           product/ and engineering/ notes
supabase/       migrations
ios/App/        Capacitor shell, BakeTimer plugin (AlarmKit), widget extension
```

- `RecipeBuilder.tsx` composes the screens and these hooks: `useRecipeWizard` (recipe/schedule state, wizard steps, drafts), `useAppRouter` + `appRoutes.ts` (URL ↔ tab/phase/step), `useBakeFlow` (start/resume/save/exit bake), `useSavedRecipes`, `useBakeSession`, `useBakeHistory`, `useScheduleBuilder`.
- Core data types: `RecipeInput` (`lib/recipe/types.ts`), `ScheduleInput` (`lib/schedule/types.ts`), `SavedRecipe` (`lib/storage/types.ts`), `BakeSession` (`lib/companion/types.ts`).
- `buildTimeline(schedule, recipe)` produces `TimelineStep[]` as offsets in minutes from mix start; clock times and date labels are derived afterwards in `mixDateTime.ts`. Each step also carries `bakeDayOffset` (0 = oven day, -1 = the day before).
- **Recipes have no calendar date.** Saved recipes and the builder use relative "Bake day −1" labels (`relativeDays.ts`), and `ScheduleInput.mixDate` is `''` on them. The real `mixDate` and `startTime` are chosen in `BakeStartDialog` when a bake starts and live only on the `BakeSession` (and history). Bake mode and history still show real dates.
- Tapping a saved recipe opens the read-only view (`/recipe/:id`, `features/recipe-view`); editing is the pen action there. `buildRecipeOverview` supplies its ingredient, levain and schedule data.
- New routes must be added in both `appRoutes.ts` and the `createBrowserRouter` list in `src/app/App.tsx`; the router redirects unknown paths home.
- Bake sessions store a snapshot of recipe and schedule. Changing the shape of the timeline needs a bump of `CURRENT_BAKE_SESSION_TIMELINE_VERSION` and a migration in `migrateBakeSession.ts`.
- Anything persisted (local storage, Supabase rows, bake sessions, history) must tolerate older saved shapes. Normalize on read (see `normalizeScheduleInput.ts`) instead of assuming the latest shape.

## iOS gotchas

- The app uses the **UIScene lifecycle** (required by the iOS 27 SDK). `SceneDelegate.swift` forwards URL and universal-link events to Capacitor's `SceneDelegateProxy`, and `Info.plist` has `UIApplicationSceneManifest` pointing at `Main.storyboard`. Do not re-add `UIMainStoryboardFile`, and do not rely on `AppDelegate.application(_:open:)`; it no longer fires.
- Timer alerts reopen the app through `sourdough://bake` (`useBakeDeepLink.ts`).
- New Swift files must be added to `ios/App/App.xcodeproj/project.pbxproj`.

## How to work with me

I am a PM learning engineering, so optimize for clarity, maintainability, and understanding over speed.

**Before changing code** for a meaningful feature: say the goal, the approach, which files own the change and why, and how data flows. If several approaches are reasonable, name them and recommend one. Then make the smallest useful change. Explaining and asking beats guessing; do not hide uncertainty behind confident code.

**While implementing**: small, reviewable steps. Keep architecture, styling, logic, and dependency changes separate where practical. Do not do broad refactors or large rewrites without approval. No TODO placeholders unless asked.

**After changing code**: say what changed, why, what could break, and how to test it locally. Name any technical debt introduced and put future ideas separately from the current change.

**Debugging**: do not jump to a patch. State the symptom, the evidence, how the diagnosis narrowed, the root cause, why the fix addresses it, and how I can verify. Prefer logs, tests, and small repros over guessing. If the root cause is unproven, say what is known versus assumed.

**Technical decisions**: if I propose one, assess it first (what is strong, what are the risks and hidden assumptions) and push back when it adds needless complexity or weakens the product. Offer a better alternative when there is one. Do not rubber-stamp.

**Dependencies**: before adding or upgrading one, explain what it does, why existing code or platform features are not enough, alternatives, and bundle size, maintenance, and lock-in risk. Prefer no new dependency.

## Code conventions

- Simple and explicit over clever. Clear names over short names. Small, focused files. Follow patterns already in the repo.
- Strict TypeScript; explicit types where they clarify data shapes or boundaries.
- Keep UI components, business logic, AI prompts, state, and persistence separate. Business logic stays in `src/lib` and gets a `.test.ts` beside it.
- Local state before global state. Frontend-first. Do not abstract until reuse is real.
- Comments only for non-obvious product logic or implicit framework behavior.

## UI/UX

Read [docs/product/ui-ux-practices.md](docs/product/ui-ux-practices.md) before touching UI, field copy, info toggles, or wizard flow. Mobile-first. Quick defaults:

- Info `i` toggles anchor under the trigger, clamp to the margins, and close on outside click.
- Edit = pen, delete = bin, `+`/`−` = numeric steppers only.
- Wizard has a sticky header and footer; the welcome screen is excluded from the progress count.
- Related field pairs stack on mobile and go two columns from ~640px (`field-grid--pair`); use `field-grid--responsive` and `summary-groups` for multi-field steps and summary cards.
- Calculated previews are a labeled block inside the step, below the inputs, not header chips.
- Onboarding context on welcome is visible body copy, not a hidden toggle.
- Accessible icon buttons; avoid unnecessary animation.

If a request conflicts with a practice and I did not say "override", stop and name the tradeoff first. If I say "override", implement it, and offer to log it in the practices doc if it becomes a lasting rule.

## Docs

[docs/product/](docs/product) holds product behavior (recipe builder, calculation and assessment, UX, UI/UX practices); [docs/engineering/](docs/engineering) holds the implementation plan, iOS setup and native bake timers, Supabase ops, Vercel deploy, and the unsaved-navigation dialog. Update the relevant doc when behavior changes.
