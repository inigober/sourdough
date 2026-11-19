---
title: Recipe Builder
status: current
date: 2026-11-19
---

# Recipe Builder

## Product Goal

Help intermediate to advanced sourdough bakers build a complete recipe from a few guided inputs, understand the resulting formula, and get coaching-like feedback before baking.

The promise of the builder is:

> Build a complete sourdough formula, understand the tradeoffs, and know what kind of loaf you are likely to get.

The builder is the first half of the product. It produces a formula and an assessment. The second half turns that formula into a timed plan (schedule builder), then into a guided bake (bake mode) and a record of what happened (bake history). Those are described in [UX](./ux.md), [Recipe view and relative days](./recipe-view-and-relative-days.md) and [Bake history](./bake-history.md).

## Primary User

An intermediate to advanced sourdough baker who already understands terms like hydration, levain, bulk fermentation, proofing, and autolyse.

The product should feel friendly, but not simplified. Advanced concepts are available in context with short explanations. Fields have an optional info (`i`) toggle; explanations stay hidden by default and expand in place. The one exception to "no beginner simplification" is the schedule builder, which starts from presets (see [UX](./ux.md)).

## Where A Recipe Starts

The Home screen offers:

- **New recipe**: starts the wizard from the default values below.
- **Start from a template**: six templates (Country-style loaf, Focaccia, Pizza, Ciabatta, Pan de cristal, Pain de champagne). Each one is a full `RecipeInput` with its own weight, hydration, salt, flour, bulk time and room temperature (`lib/recipe/templates.ts`). Loading a template opens the wizard so every value can still be changed.
- **Saved recipes**: tap one to open the read-only recipe view, or Duplicate it as a starting point.
- **Continue where you left off**: the wizard and schedule builder save a draft on every change (`lib/storage/draftStorage.ts`), so leaving the builder never loses work. A draft is not saved while a number field is cleared.

## Core Flow

A guided four-step wizard, then an editable summary.

The welcome (Home) screen is not part of the step count. The progress bar shows "N of 4" and the current step name.

1. **Dough size**
   - Final dough weight
   - Number of loaves
2. **Flour blend**
   - One or more dough flours whose shares add up to 100% of total flour
   - The step shows the total dough weight and the estimated total flour for context
3. **Hydration & salt**
   - Hydration (% of total flour)
   - Salt (% of total flour)
4. **Fermentation & levain**
   - Target bulk fermentation time
   - Room temperature
   - Levain activity
   - Levain type, and custom levain hydration when the type is "Custom hydration"
   - Levain flour (flour used in the levain itself)
5. **Summary** (`/build/summary`)
   - Four tappable cards (Dough size, Flour blend, Hydration & salt, Fermentation & levain) jump back to the matching step. After editing, the wizard offers a Save action that returns straight to the summary.
   - Ingredient list, formula breakdown, and the assessment, all recalculated from the inputs.
   - Actions: **Save recipe** and **Build schedule**.

Autolyse, proofing style, folds, and baking are not recipe inputs. They live in the schedule builder, because they shape the timeline rather than the formula. Changing the dough weight or loaf count also rescales the bake times and temperatures in the schedule (`scaleScheduleBakeParams.ts`).

## Inputs

| Input | Default | Notes |
| --- | --- | --- |
| Final dough weight | 900 g | Total dough mass before baking, including the levain. Allowed 50 g to 10,000 g; warns under 300 g and over 3 kg (see Validation). |
| Number of loaves | 1 | Used to calculate per-loaf dough weight. At least 1. |
| Flour blend | 100% German Type 1050 | One or more flours, shares add up to 100%. "Add another flour" adds a whole wheat entry. |
| Hydration | 80% | Baker's percentage of total flour. Allowed 50% to 110%. |
| Salt | 2% | Baker's percentage of total flour. Allowed 0% to 4%; the usual wheat range is 1.8 to 2.2%. |
| Target bulk fermentation time | 8 h | Allowed 2 h to 12 h, in 0.5 h steps. |
| Room temperature | 24 C | Air temperature where the dough ferments, not dough temperature. Allowed 16 C to 32 C. |
| Levain activity | Active | Very active, Active, Recently refreshed (not peaked), Sleepy, Inactive. |
| Levain type | 100% hydration levain | Stiff (60%), 100% hydration, Liquid (140%), or Custom hydration. |
| Levain hydration | 100% | Set by the levain type. Only editable (40% to 200%) for Custom hydration. |
| Levain flour | Same as the main dough flour | Follows the dough's main flour until the user picks a different levain flour. |

The defaults come from `defaultRecipeInput` in `lib/recipe/defaults.ts`. They are anchored on the owner's usual high-hydration wheat loaf.

### Number fields never rewrite what you typed

Number inputs in the wizard keep exactly what the user typed. An out-of-range number stays in the field, a cleared field stays empty, and the message appears next to the field when the user leaves it (immediately when the number is above the maximum, since adding digits cannot fix it). Continue is disabled until the value is valid. The `+`/`-` steppers are an explicit action and always land inside the allowed range. The schedule builder's number fields have no validation messages of their own and still clamp. See [UI/UX practices](./ui-ux-practices.md).

## Levain Presets

| Levain Type | Hydration | Product Meaning |
| --- | ---: | --- |
| Stiff levain | 60% | Lower hydration levain, often slower and more acidity-leaning. |
| 100% hydration levain | 100% | Standard equal-parts flour and water levain. |
| Liquid levain | 140% | Very wet levain, clearly distinct from the standard 100% preset. |
| Custom hydration | your value | Expert control: the hydration field appears. |

Choosing a preset sets the levain hydration to the preset value. Choosing Custom hydration keeps the current value and lets the user edit it. A wetter levain contributes more water to the dough; a stiffer levain contributes more flour for the same levain weight. The ingredient math accounts for this (see [Calculation and assessment](./calculation-and-assessment.md)).

The recipe uses "levain" for the prefermented ingredient. "Starter" is the seed culture used to build that levain in the schedule's starter prep steps.

## Flour Options

Six flours, with German naming (`lib/recipe/flourProfiles.ts`):

- Wheat Type 550
- Wheat Type 1050
- Pizza flour (Tipo 00 style)
- Whole wheat
- Rye Type 1150
- Whole rye

Each flour has a comfortable hydration range, a "high hydration" threshold, and a fermentation speed multiplier. Wheat Type 812 was removed because it is uncommon in German retail baking.

A blend must have at least one flour, every flour above 0%, and shares totalling 100% (0.5% tolerance). Changing one share rescales the others proportionally.

## Input Explanations

Every input has a short, toggleable explanation (`features/recipe-builder/fieldInfo.ts`), written in practical baking language. Explanations must match what the app actually calculates on that step, and they stay hidden until the user taps `i`.

## Calculated Outputs

The calculator produces (`RecipeFormula`):

- Total flour and total water
- Added flour and added water, excluding what the levain contributes
- Salt
- Levain amount, levain flour, levain water
- Overall hydration (equal to the hydration input, because levain flour and water are part of the totals)
- Prefermented flour percentage (levain flour as a share of total flour)
- Per-loaf dough weight
- Estimated baked loaf weight range (85 to 90% of dough weight)

The summary shows an **Ingredient list** and a **Formula breakdown**:

- Ingredient list, single flour: Added flour, Added water, Salt, Levain.
- Ingredient list, flour blend: one row per flour (its share of total flour), then Added water, Salt, Levain.
- Formula breakdown: Total flour, Total water, Levain flour, Levain water, Prefermented flour, Estimated baked loaf (midpoint, rounded to 50 g).

The read-only recipe view names the flour on the ingredient rows and adds a totals line (see [Recipe view and relative days](./recipe-view-and-relative-days.md)). The schedule builder can copy the ingredient list, the schedule text, or the full recipe as JSON.

## Assessment Output

The assessment is generated automatically on the summary from the inputs and the formula (`assessRecipe`). It is rule-based: no network or LLM call, and the calculator never depends on one.

It contains:

- **Overall recipe shape**: hydration label, flour summary, handling difficulty, prefermented flour, bulk time, and a note on how the hydration handles relative to white flour.
- **Target dough rise**: the volume rise to look for at the end of bulk, adjusted for temperature, flour and hydration.
- Hydration and handling, fermentation confidence, levain readiness, salt, and prefermented flour sections, only when they have something to say.

Each section has a level (`positive`, `info`, `warning`, `risk`), a title, a short message, and details. The thresholds are in [Calculation and assessment](./calculation-and-assessment.md).

The assessment should sound like a helpful baking coach. It explains consequences, not just labels, and it never pretends the app can see the dough.

Example tone:

> This is an ambitious but manageable high-hydration wheat loaf. Type 1050 should give you good flavor and more absorption than white flour, but at 80% hydration the dough may still feel slack. Strong gluten development and patient coil folds will matter.

## Rule Model

Deterministic math is separate from judgment.

- **Calculation rules** produce trusted numbers: flour, water, salt, levain, per-loaf weight.
- **Heuristic rules** estimate fermentation (how much prefermented flour a target bulk time needs) and flag predictable implications (hydration relative to the flour, salt range, levain readiness).
- **Coaching copy** turns those facts into readable feedback. It is template-based and hardcoded.

Hydration judgments are flour-relative. The assessment says "high for this flour" rather than a global threshold. The bands are starting assumptions for coaching and warnings, not hard rules; they are in [Calculation and assessment](./calculation-and-assessment.md).

## Ideas Not Built Yet

- Country-specific flour naming, searchable flour profiles, gluten percentage, and custom flour definitions.
- AI-written assessment copy (the rule engine would stay the source of numbers).
- Comparing two recipes side by side.
