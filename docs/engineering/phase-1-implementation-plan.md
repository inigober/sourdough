---
title: Phase 1 Implementation Plan
status: draft
---

# Phase 1 Implementation Plan

## Goal

Build the first version of the sourdough recipe builder as a progressive web app.

Phase 1 should let a user:

- Enter guided recipe inputs.
- Calculate a complete ingredient formula.
- Review and adjust a live summary.
- Read a rule-based coaching assessment.

The implementation should optimize for learnability, explicit data flow, and small incremental changes.

## Recommended Stack

Use a simple TypeScript web app stack:

- React for UI components.
- TypeScript for explicit recipe and calculation types.
- Vite for local development and bundling.
- Node’s built-in test runner (`node --test`) for calculation, storage, and domain logic tests.
- Vitest for feature-level React component tests (TSX imports are not supported by `node --test`).

Why this stack:

- It is lightweight enough for a learning project.
- It supports a future PWA path.
- It keeps calculation logic easy to test outside the UI.
- It avoids premature backend, database, or auth complexity.

Alternatives:

- Next.js: useful later for routing, server features, and deployment structure, but heavier than needed for Phase 1.
- Plain JavaScript: faster to start, but weaker for learning data shapes and preventing formula mistakes.
- Backend-first app: unnecessary while recipes are local and unsaved.

## Architecture Overview

Use three clear layers:

1. Recipe state
   - Stores user-controlled inputs.
   - Lives in the UI layer for Phase 1.

2. Calculation engine
   - Converts inputs into deterministic formula outputs.
   - Has no React dependency.
   - Covered by tests.

3. Assessment engine
   - Converts inputs and calculated outputs into structured coaching sections.
   - Has no React dependency.
   - Covered by tests.

Data flow:

```text
User inputs
  -> RecipeInput state
  -> calculateRecipe(input)
  -> RecipeFormula
  -> assessRecipe(input, formula)
  -> AssessmentSection[]
  -> UI screens
```

This direction should stay one-way. UI components should display state and call update handlers; they should not contain formula math.

## Proposed Source Structure

```text
src/
  app/
    App.tsx
    recipeBuilderState.ts
  components/
    InfoToggle.tsx
    StepLayout.tsx
    fields/
      NumberField.tsx
      SelectField.tsx
      ToggleField.tsx
  features/
    recipe-builder/
      RecipeBuilder.tsx
      steps/
        WelcomeStep.tsx
        DoughTargetStep.tsx
        FlourStep.tsx
        FermentationStep.tsx
        ProcessStep.tsx
        SummaryStep.tsx
        AssessmentStep.tsx
  lib/
    recipe/
      types.ts
      defaults.ts
      flourProfiles.ts
      calculateRecipe.ts
      assessRecipe.ts
      validation.ts
      copy.ts
```

Why this placement:

- `features/recipe-builder/` owns the user flow.
- `lib/recipe/` owns baking domain logic and can be tested without the UI.
- `components/` contains reusable UI building blocks with no baking knowledge.
- `app/` wires everything together.

## Core Types

Start with explicit domain types.

```typescript
type FlourType =
  | 'wheatType550'
  | 'wheatType1050'
  | 'pizzaFlour'
  | 'wholeWheat'
  | 'ryeType1150'
  | 'wholeRye';

type LevainType = 'stiffLevain' | 'standard100' | 'liquidLevain' | 'customHydration';

type LevainActivity =
  | 'veryActive'
  | 'active'
  | 'recentlyRefreshedButNotPeaked'
  | 'sleepy'
  | 'inactive';

type ProofingStyle = 'roomTemperature' | 'cold' | 'both';

type RecipeInput = {
  finalDoughWeightGrams: number;
  numberOfLoaves: number;
  hydrationPercent: number;
  saltPercent: number;
  doughFlours: FlourBlendEntry[];
  levainFlourType: FlourType;
  targetBulkHours: number;
  roomTemperatureCelsius: number;
  levainType: LevainType;
  levainHydrationPercent: number;
  levainActivity: LevainActivity;
  autolyseEnabled: boolean;
  proofingStyle: ProofingStyle;
};
```

Keep these names close to the product docs. That makes the code easier to trace.

## Calculation Engine

Create `calculateRecipe(input: RecipeInput): RecipeFormula`.

Responsibilities:

- Validate that the input can produce a formula.
- Calculate total flour, total water, salt, levain amount, levain flour, levain water, added flour, and added water.
- Estimate prefermented flour percentage from target bulk time.
- Estimate per-loaf dough weight and baked loaf weight range.

Do not:

- Render UI.
- Create coaching copy.
- Know about wizard steps.

Test cases:

- Default `900g`, `80%`, `2%`, Type 1050 formula.
- 100% levain hydration splits levain evenly into flour and water.
- 60% levain hydration contributes more flour than water.
- 140% levain hydration contributes more water than flour.
- Multiple loaves divide dough weight correctly.
- Invalid values produce validation errors.

## Assessment Engine

Create `assessRecipe(input: RecipeInput, formula: RecipeFormula): AssessmentSection[]`.

Responsibilities:

- Classify recipe style.
- Determine difficulty.
- Assess flour-relative hydration.
- Assess fermentation confidence.
- Assess levain readiness.
- Produce flour notes, salt notes, and watch-outs.

Do not:

- Recalculate ingredient amounts.
- Depend on React.
- Make network calls or LLM calls.

Test cases:

- Type 1050 at `80%` is comfortable-high, not globally "high".
- Type 550 at `80%` is high hydration.
- Sleepy or inactive levain lowers fermentation confidence.
- Salt outside `1.8-2.2%` creates a warning.
- Prefermented flour above `25%` creates a timing risk.

## UI State Model

Use a single `RecipeInput` state object for the wizard.

Derived values should not be stored:

- `RecipeFormula` is recalculated from `RecipeInput`.
- `AssessmentSection[]` is recalculated from `RecipeInput` and `RecipeFormula`.

This keeps the data flow simple and avoids stale summary values.

Recommended state:

```typescript
type RecipeBuilderState = {
  currentStep: RecipeBuilderStep;
  input: RecipeInput;
};
```

When `levainType` changes, update `levainHydrationPercent` to the preset value unless the user has manually edited levain hydration. Track that with a small boolean:

```typescript
type RecipeBuilderState = {
  currentStep: RecipeBuilderStep;
  input: RecipeInput;
  hasCustomLevainHydration: boolean;
};
```

## Build Order

### Step 1: App Skeleton

Create the TypeScript React app with routing unnecessary for Phase 1.

Acceptance criteria:

- App runs locally.
- One page renders the recipe builder shell.
- No domain logic yet.

### Step 2: Domain Types And Defaults

Add `RecipeInput`, flour profiles, levain presets, and defaults.

Acceptance criteria:

- Defaults match product specs.
- Types are explicit and easy to read.

### Step 3: Calculation Engine

Implement `calculateRecipe`.

Acceptance criteria:

- Default recipe produces a complete formula.
- Unit tests cover levain hydration and loaf division.
- No React imports in `lib/recipe/`.

### Step 4: Assessment Engine

Implement `assessRecipe`.

Acceptance criteria:

- Assessment returns structured sections.
- Flour-relative hydration rules are tested.
- Fermentation confidence and levain readiness are tested.

### Step 5: Guided Wizard UI

Build screens one at a time:

1. Welcome
2. Dough target
3. Flour
4. Fermentation and levain
5. Process assumptions
6. Summary
7. Assessment

Acceptance criteria:

- User can move forward and backward.
- Input values persist between steps.
- Summary shows live calculated outputs.
- Assessment displays structured sections.

### Step 6: Info Toggles

Add contextual explanations beside each input.

Acceptance criteria:

- Each required input has a short toggleable explanation.
- Explanations do not clutter the default UI.

### Step 7: Polish And PWA Basics

Add responsive mobile layout and basic PWA metadata.

Acceptance criteria:

- Layout works on mobile width.
- App has a name, theme color, and installable direction started.

## What To Avoid In Phase 1

Do not add:

- Backend.
- Database.
- Authentication.
- AI calls.
- Photo upload.
- Full baking schedule.
- Timers.
- Complex global state library.
- International flour database.

These are real future needs, but they would distract from proving the calculator and assessment.

## Learning Milestones

This project should teach:

- How product requirements become types.
- How user inputs flow through calculation logic.
- How to separate UI from domain logic.
- How tests protect formula correctness.
- How rule-based assessment differs from AI-generated advice.

## First Implementation Checkpoint

The first meaningful checkpoint should be:

> With default inputs, the app calculates a complete `900g` Type 1050, `80%` hydration sourdough formula and displays the ingredient list in a summary screen.

This proves the core product promise before investing in polish.
