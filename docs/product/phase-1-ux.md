---
title: Phase 1 UX
status: draft
---

# Phase 1 UX

## UX Goal

Help the user build a complete sourdough recipe with guidance, not just fill out a calculator.

The experience should feel like:

> I know what I want to bake, and the app helps me turn that into a clear formula with useful feedback.

Phase 1 should prioritize clarity, trust, and learning over speed.

## Core UX Principles

- Use a guided multi-step flow for first-time clarity.
- End with an editable summary where the user can adjust key parameters and immediately see the impact.
- Keep explanations hidden by default behind info buttons.
- Use friendly expert language, not beginner simplification.
- Show calculated values transparently, especially levain amount and prefermented flour percentage.
- Avoid full scheduling in Phase 1.

## Screen Flow

### 1. Welcome

Purpose: set expectations.

Primary content:

- Product promise: "Build a sourdough recipe and understand what kind of loaf it will produce."
- Short explanation: "Choose your dough target, flour, levain, and fermentation goal. We will calculate the formula and assess the bake."
- Primary action: `Start recipe`

This screen may become optional later.

### 2. Dough Target

Purpose: define the basic dough size and baker's percentages.

Inputs:

| Input | Default | Required | Notes |
| --- | ---: | --- | --- |
| Final dough weight | 900g | Yes | Pre-bake dough mass. |
| Number of loaves | 1 | Yes | Used for dividing dough and estimating baked loaf weight. |
| Hydration | 80% | Yes | Interpreted relative to flour type later. |
| Salt | 2% | Yes | Standard wheat sourdough default. |

Live preview:

- Per-loaf dough weight
- Estimated baked loaf weight range

Info buttons:

- Final dough weight: explains that this is total dough mass before baking.
- Number of loaves: explains that the same formula can be divided into multiple loaves.
- Hydration: explains crumb, handling, and flour dependency.
- Salt: explains flavor, fermentation speed, and dough strength.

### 3. Flour

Purpose: define the flour context for calculation and assessment.

Inputs:

| Input | Default | Required | Notes |
| --- | --- | --- | --- |
| Dough flour type | Wheat Type 1050 | Yes | German flour list in Phase 1. |
| Levain flour type | Same as dough flour | Yes | Can be changed by the user. |

Flour options:

- Wheat Type 550
- Wheat Type 812
- Wheat Type 1050
- Whole wheat
- Rye Type 1150

Live preview:

- Hydration interpretation for selected flour.
- Example: "80% is comfortable-high for Type 1050, but would be very high for Type 550."

Info buttons:

- Dough flour type: explains water absorption, gluten strength, flavor, and fermentation impact.
- Levain flour type: explains that matching dough flour keeps the formula simple, while changing levain flour can affect flavor and fermentation speed.

### 4. Fermentation And Levain

Purpose: turn the user's target bulk fermentation time into a levain amount.

Inputs:

| Input | Default | Required | Notes |
| --- | ---: | --- | --- |
| Target bulk fermentation time | TBD | Yes | Used to estimate prefermented flour. |
| Room temperature | TBD | Yes | Phase 1 uses room temperature, not dough temperature. |
| Levain type | 100% hydration levain | Yes | Preset updates levain hydration. |
| Levain hydration | 100% | Yes | Editable even after choosing a preset. |
| Levain activity | Active | Yes | Affects fermentation confidence. |

Levain type presets:

- Stiff levain: 60%
- 100% hydration levain: 100%
- Liquid levain: 140%

Live preview:

- Estimated levain amount
- Prefermented flour percentage
- Fermentation confidence: high, medium, or low

Info buttons:

- Target bulk fermentation time: explains that time is a target and the baker should still watch dough signs.
- Room temperature: explains that warmer rooms speed fermentation and cooler rooms slow it.
- Levain type: explains stiff, standard, and liquid levain presets.
- Levain hydration: explains how levain flour and water are included in the final formula.
- Levain activity: explains why weak or inactive levain makes timing less reliable.

### 5. Process Assumptions

Purpose: collect simple process context for assessment without becoming a scheduler.

Inputs:

| Input | Default | Required | Notes |
| --- | --- | --- | --- |
| Autolyse | On | Yes | Default duration is 45 minutes. |
| Proofing style | Both | Yes | Options: room temperature, cold, both. |

Non-editable Phase 1 assumptions:

- Strength-building method is recommended automatically.
- Detailed folding, proofing, and oven schedules are deferred to Phase 2.

Screen note:

> These choices help us assess the recipe. Full step-by-step scheduling comes in Phase 2.

Info buttons:

- Autolyse: explains when autolyse helps, especially with higher hydration and stronger flours.
- Proofing style: explains room-temperature proofing, cold proofing, and using both.

### 6. Recipe Summary

Purpose: give the user control before assessment.

The summary should be the most useful screen in Phase 1. It should let the user review and adjust important inputs while seeing calculation outputs update immediately.

Editable input summary:

- Final dough weight
- Number of loaves
- Hydration
- Salt
- Dough flour type
- Levain flour type
- Target bulk fermentation time
- Room temperature
- Levain type
- Levain hydration
- Levain activity
- Autolyse
- Proofing style

Calculated output summary:

| Output | Notes |
| --- | --- |
| Total flour | Includes flour inside the levain. |
| Added flour | Flour added directly to the final dough. |
| Total water | Includes water inside the levain. |
| Added water | Water added directly to the final dough. |
| Salt | Based on total flour. |
| Levain amount | Total levain mass. |
| Levain flour | Flour contributed by levain. |
| Levain water | Water contributed by levain. |
| Overall hydration | Includes levain flour and water. |
| Prefermented flour percentage | Shown by default. |
| Per-loaf dough weight | Based on number of loaves. |
| Estimated baked loaf weight | Shown as a range. |

Interaction details:

- Changing any input recalculates outputs immediately.
- Invalid values show inline errors near the affected input.
- Warnings should not block the summary unless the calculation becomes impossible.
- The user should understand which values are inputs and which are calculated.

Primary action:

- `View assessment`

### 7. Assessment

Purpose: explain what the recipe is likely to produce and what the user should watch for.

Assessment sections:

- Recipe style
- Difficulty
- Hydration and handling
- Fermentation confidence
- Levain readiness
- Flour notes
- Watch-outs

Each section should include:

- Level: positive, info, warning, or risk
- Short title
- One-sentence summary
- Optional detail text

Example:

> This is a flavor-forward Type 1050 wheat sourdough. At 80% hydration, it should be manageable for this flour, but still tacky and moderately demanding. Watch dough strength and fermentation signs more than the clock.

Primary actions:

- `Edit recipe`
- `Start over`

Deferred actions:

- Save recipe
- Generate full schedule
- Start timers
- Ask AI coach

## Navigation

The user should be able to move backward and forward through the guided steps.

Recommended pattern:

- Step indicator at the top.
- `Back` and `Continue` actions at the bottom.
- Preserve entered values when moving between steps.
- Use the summary as the main place for broad editing.

## Empty, Error, And Warning States

Blocking errors:

- Prevent moving forward only when the app cannot calculate a valid recipe.
- Explain the problem in plain language.
- Keep the user close to the input that needs fixing.

Warnings:

- Allow the user to continue.
- Explain tradeoffs and risks.
- Reappear in the assessment if still relevant.

Example warning:

> This is a high levain percentage. The dough may ferment quickly, so your timing window will be narrower.

## Phase 1 Non-Goals

Do not include:

- Full baking schedule
- Starter feeding schedule
- Native or browser timers
- Editable fold/kneading plan
- Oven schedule
- Photo upload
- AI Q&A
- Bake history
- Accounts or authentication

## Implementation Notes

The UX should be built around a shared recipe state object that feeds:

- The current step's inputs.
- The live summary calculations.
- The assessment rules.

The calculation engine should be implemented before polishing the UI, because trust in the ingredient list is the core product value.
