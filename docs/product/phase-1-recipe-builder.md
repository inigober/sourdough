---
title: Phase 1 Recipe Builder
status: draft
---

# Phase 1 Recipe Builder

## Product Goal

Help intermediate to advanced sourdough bakers build a complete recipe from a few guided inputs, understand the resulting formula, and get coaching-like feedback before baking.

The Phase 1 promise is:

> Build a complete sourdough formula, understand the tradeoffs, and know what kind of loaf you are likely to get.

Phase 1 is not a full schedule companion. It may expose process assumptions for assessment, but detailed step timing, timers, oven scheduling, and editable workflows belong to Phase 2.

## Primary User

The initial user is an intermediate to advanced sourdough baker who already understands terms like hydration, levain, bulk fermentation, proofing, and autolyse.

The product should feel friendly, but not simplified. Advanced concepts should be available in context with short explanations.

Each input should have an optional info button or similar "more info" toggle. Explanations should stay hidden by default, then expand in place when the user wants to understand why an input matters.

## Core Flow

The first version uses a guided multi-step flow followed by an editable summary.

1. Dough target
   - Final dough weight
   - Number of loaves
   - Hydration
   - Salt percentage

2. Flour
   - Dough flour type
   - Levain flour type, defaulting to the dough flour
   - Explanation: levain flour affects fermentation speed and flavor, but matching the dough flour keeps the first formula simple.

3. Fermentation
   - Desired bulk fermentation time
   - Room temperature
   - Levain type
   - Levain hydration, defaulting to the selected levain preset and editable in context
   - Levain activity
   - Prefermented flour percentage, shown by default in the summary

4. Process assumptions
   - Autolyse on/off
   - Proofing style: room-temperature proof, cold proof, or both
   - Strength-building method is recommended automatically, not editable in Phase 1

5. Summary
   - User can review and adjust all important inputs
   - Calculated outputs update when inputs change
   - Assessment is shown automatically after the summary

## Phase 1 Inputs

| Input | Default | Notes |
| --- | --- | --- |
| Final dough weight | 900g | User enters total dough mass before baking. |
| Number of loaves | 1 | Used to calculate per-loaf dough weight. |
| Hydration | 80% | Anchored on the user's usual high-hydration wheat loaf. |
| Salt percentage | 2% | Common default for wheat sourdough. |
| Dough flour type | German Type 1050 | First version focuses on Germany. |
| Levain flour type | Same as dough flour | Can be changed by the user. |
| Desired bulk fermentation time | TBD | User's preferred workflow starts from target time. |
| Room temperature | TBD | Used for fermentation estimation and assessment. |
| Levain type | 100% hydration levain | User can choose from three presets. |
| Levain hydration | 100% | Defaults from levain type, but can be edited. |
| Levain activity | Active | Other states affect assessment and levain recommendations. |
| Autolyse | On | Default duration is 45 minutes. |
| Proofing style | Both | Supports room-temperature and cold proof assumptions. |

## Levain Presets

| Levain Type | Hydration | Product Meaning |
| --- | ---: | --- |
| Stiff levain | 60% | Lower hydration levain, often slower and more acidity-leaning. |
| 100% hydration levain | 100% | Standard equal-parts flour and water levain. |
| Liquid levain | 140% | Very wet levain, clearly distinct from the standard 100% preset. |

These values are presets, not locked values. Levain hydration defaults to 100% and should be editable in the fermentation step. When the user chooses a preset, the hydration input updates to that preset's value unless the user has manually overridden it.

The UI should explain that levain hydration changes how much flour and water the levain contributes to the final dough. A wetter levain contributes more water; a stiffer levain contributes more flour for the same levain weight.

Phase 1 should use "levain" for the prefermented ingredient in the recipe. Phase 2 can use "starter" for the seed culture used to build that levain as part of a feeding schedule.

## Flour Options

Phase 1 starts with German flour types:

- Wheat Type 550
- Wheat Type 812
- Wheat Type 1050
- Whole wheat
- Rye Type 1150

Later versions can add country-specific flour naming, searchable flour profiles, gluten percentage, and custom flour definitions.

## Input Explanations

Every required input should support a contextual explanation. These explanations should be short, toggled by the user, and written in practical baking language.

Examples:

- Hydration: explains that higher hydration usually means a more open crumb and stickier handling, but the same percentage behaves differently depending on flour type.
- Flour type: explains that different flours absorb water differently and affect gluten strength, flavor, and fermentation behavior.
- Levain flour type: explains that matching the dough flour keeps the formula simple, while changing it can affect fermentation speed and flavor.
- Levain hydration: explains how the levain changes the total flour and water in the dough.
- Desired bulk fermentation time: explains that the app estimates inoculation and risk, but the baker should still watch dough signs.

## Calculated Outputs

The calculator should produce:

- Total flour
- Total water
- Added water, excluding water contributed by the levain
- Salt
- Levain amount
- Levain hydration
- Levain flour
- Levain water
- Overall hydration, including levain flour and water
- Prefermented flour percentage
- Per-loaf dough weight
- Estimated baked loaf weight

Prefermented flour percentage should be calculated in Phase 1 and shown by default in the summary.

## Assessment Output

The assessment should be generated automatically after the summary.

It should include:

- Expected loaf style
- Difficulty level
- Handling notes
- Fermentation risk
- Hydration risk
- Flour-specific notes
- Coaching suggestions

The assessment should sound like a helpful baking coach. It should explain consequences, not just label values.

Example tone:

> This is an ambitious but manageable high-hydration wheat loaf. Type 1050 should give you good flavor and more absorption than white flour, but at 80% hydration the dough may still feel slack. Strong gluten development and patient coil folds will matter.

## Rule Model

Phase 1 should separate deterministic math from judgment.

### Calculation Rules

Calculation rules produce trusted numeric outputs:

- Convert final dough weight into flour, water, salt, and levain quantities.
- Include levain flour and water in overall hydration.
- Calculate added water separately from total water.
- Calculate prefermented flour percentage.
- Divide dough weight by number of loaves.
- Estimate baked loaf weight from dough weight.

### Heuristic Rules

Heuristic rules flag predictable baking implications:

- Hydration risk depends on flour type, not one global threshold.
- Salt outside 1.8-2.2% is unusual for wheat sourdough.
- Inactive or sleepy levain requires refresh guidance.
- Short desired bulk time implies higher inoculation and higher overproofing sensitivity.
- Long desired bulk time implies lower inoculation and possible acidity buildup.
- Type 1050 supports flavor and absorption, but can still produce a denser crumb than strong white bread flour.
- Rye-heavy choices should warn about stickiness, lower gluten strength, and different handling.

Initial flour-relative hydration bands:

| Flour Type | Comfortable Range | High Hydration | Notes |
| --- | ---: | ---: | --- |
| Wheat Type 550 | 65-75% | 76%+ | Easier gluten development, but very open-crumb formulas still require handling skill. |
| Wheat Type 812 | 68-78% | 79%+ | Middle ground between white and high-extraction wheat. |
| Wheat Type 1050 | 72-82% | 83%+ | Absorbs more water, but can feel slack and produce a denser crumb if gluten is weak. |
| Whole wheat | 75-88% | 89%+ | Absorbs more water and ferments faster; bran can weaken gluten structure. |
| Rye Type 1150 | 70-85% | 86%+ | Hydration behaves differently because rye has low gluten strength; assess stickiness and structure separately. |

These bands are starting assumptions for coaching and warnings, not hard rules. The assessment should say "high for this flour" rather than simply "high hydration."

### Coaching Layer

The coaching layer turns calculation and heuristic facts into readable feedback.

For Phase 1, this can be hardcoded or template-based. AI-generated copy can be added later, but the calculator and risk flags should not depend on an LLM.

## Phase 2 Parking Lot

These ideas are intentionally deferred:

- Full baking schedule
- Starter feeding schedule
- Native or browser timers
- Editable process steps
- Oven schedule by baking method and loaf size
- AI Q&A
- Photo uploads
- Bake history
- User accounts
