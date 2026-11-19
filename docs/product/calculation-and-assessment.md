---
title: Calculation and Assessment Model
status: current
date: 2026-11-19
---

# Calculation and Assessment Model

## Purpose

This document defines the deterministic model behind the recipe builder. The code lives in `src/lib/recipe/` (`calculateRecipe.ts`, `validation.ts`, `assessRecipe.ts`, `bulkRiseTargets.ts`, `hydrationEquivalent.ts`, `flourProfiles.ts`, `flourBlend.ts`), with a `.test.ts` beside each file.

The model:

- Calculates a complete sourdough formula from user inputs.
- Estimates levain amount from target bulk fermentation time.
- Keeps ingredient math deterministic and explainable.
- Uses hardcoded assessment rules for predictable baking feedback.
- Does not depend on an LLM for recipe correctness. (The bake-mode coach is a separate, optional feature that only explains; see [Bake mode in the UX doc](./ux.md).)

## Key Product Decision

The calculator treats fermentation estimates as guided approximations, not promises.

Ingredient math can be exact. Fermentation timing cannot be exact because it depends on levain condition, flour, room temperature, handling, salt, inoculation, and baker judgment.

The UI says "estimated" or "target" wherever it discusses fermentation timing.

## Inputs

`RecipeInput` (`lib/recipe/types.ts`):

- `finalDoughWeightGrams`
- `numberOfLoaves`
- `hydrationPercent`
- `saltPercent`
- `doughFlours`: one or more `{ id, flourType, percent }` entries that total `100%` of total flour
- `levainFlourType`
- `targetBulkHours`
- `roomTemperatureCelsius`
- `levainType`
- `levainHydrationPercent`
- `levainActivity`

Autolyse and proofing style are not part of `RecipeInput`; they belong to `ScheduleInput` (see [UX](./ux.md)).

Supported flour types:

- `wheatType550`: light wheat, common white bread flour in Germany
- `wheatType1050`: higher-extraction wheat, common sourdough choice
- `pizzaFlour`: Tipo 00 style pizza flour, often sold in supermarkets
- `wholeWheat`
- `ryeType1150`: medium/light rye (not whole grain)
- `wholeRye`: whole rye, common for levain and rye-forward doughs

`wheatType812` was removed because it is uncommon in German retail baking.

## Defaults

- `finalDoughWeightGrams`: `900`
- `numberOfLoaves`: `1`
- `hydrationPercent`: `80`
- `saltPercent`: `2`
- `doughFlours`: one entry, `wheatType1050` at `100%`
- `levainFlourType`: `wheatType1050` (follows the main dough flour until changed)
- `targetBulkHours`: `8`
- `roomTemperatureCelsius`: `24`
- `levainType`: `standard100`
- `levainHydrationPercent`: `100`
- `levainActivity`: `active`

The six recipe templates override these (`lib/recipe/templates.ts`).

Levain type presets:

- `stiffLevain`: `60%`
- `standard100`: `100%`
- `liquidLevain`: `140%`
- `customHydration`: the user enters `levainHydrationPercent` directly (expert control)

Preset types set hydration automatically. The hydration field is only shown for `customHydration`.

## Formula Model

Final dough weight includes all flour, all water, salt, and levain components. Levain is not extra mass added on top of the final dough target; its flour and water are included in the total formula.

Convert percentages to decimals:

- `hydration = hydrationPercent / 100`
- `saltRate = saltPercent / 100`
- `levainHydration = levainHydrationPercent / 100`

Calculate total flour:

```text
totalFlour = finalDoughWeightGrams / (1 + hydration + saltRate)
```

Calculate total water:

```text
totalWater = totalFlour * hydration
```

Calculate salt:

```text
salt = totalFlour * saltRate
```

Calculate prefermented flour percentage from fermentation heuristics:

```text
prefermentedFlourPercent = estimatePrefermentedFlourPercent(input)
```

Convert prefermented flour to levain flour:

```text
levainFlour = totalFlour * (prefermentedFlourPercent / 100)
```

Calculate levain water and levain amount:

```text
levainWater = levainFlour * levainHydration
levainAmount = levainFlour + levainWater
```

Calculate final dough ingredients outside the levain:

```text
addedFlour = totalFlour - levainFlour
addedWater = totalWater - levainWater
```

Calculate loaf division:

```text
perLoafDoughWeight = finalDoughWeightGrams / numberOfLoaves
```

Estimate baked loaf weight:

```text
estimatedBakedLoafWeightLow = perLoafDoughWeight * 0.85
estimatedBakedLoafWeightHigh = perLoafDoughWeight * 0.90
```

The baked-weight range assumes about 10 to 15% weight loss during baking. It does not yet vary by loaf size, bake duration, oven setup, or uncovered bake time.

All outputs are rounded to one decimal place. `overallHydrationPercent` equals the hydration input, because levain flour and water are already inside the totals.

`calculateRecipe` throws if the input has blocking validation issues, or if the levain would need more water than the recipe contains (`addedWater < 0`) or more flour than it has (`addedFlour < 0`). The UI never calls it with blocking issues; it shows "Formula unavailable" instead.

## Prefermented Flour Heuristic

The model estimates prefermented flour percentage from target bulk time. This is how the app translates the baker's workflow into a levain amount.

Base value at `24C` room temperature for an active levain. These are anchor points; values between anchors are linearly interpolated, and times outside the range use the nearest anchor:

| Target bulk | Prefermented flour |
| ---: | ---: |
| 2 h | 28% |
| 3 h | 28% |
| 4 h | 23% |
| 5 h | 18% |
| 6 h | 14% |
| 8 h | 10% |
| 10 h | 7% |
| 12 h | 5% |

Apply a temperature adjustment:

```text
temperatureDelta = 24 - roomTemperatureCelsius
temperatureMultiplier = clamp(1 + temperatureDelta * 0.08, 0.65, 1.45)
```

For example, at `22C` the model uses roughly `16%` more prefermented flour than the base; at `26C`, roughly `16%` less.

Apply a levain activity adjustment:

| Levain activity | Multiplier |
| --- | ---: |
| `veryActive` | 0.9 |
| `active` | 1.0 |
| `recentlyRefreshedButNotPeaked` | 1.15 |
| `sleepy` | 1.35 |
| `inactive` | 1.35 (fallback for display; the assessment says not to trust it) |

Apply a flour speed adjustment. Each flour has a multiplier:

| Flour | Multiplier |
| --- | ---: |
| `wheatType550` | 1.0 |
| `wheatType1050` | 0.95 |
| `pizzaFlour` | 1.05 |
| `wholeWheat` | 0.9 |
| `ryeType1150` | 0.85 |
| `wholeRye` | 0.8 |

The dough multiplier is the weighted average over `doughFlours` by their percentages. The value used is the average of the dough multiplier and the levain flour's multiplier. Higher-extraction and rye flours ferment faster, so they need slightly less prefermented flour for the same target time.

Final estimate:

```text
prefermentedFlourPercent =
  clamp(
    basePrefermentedFlourPercent
    * temperatureMultiplier
    * levainActivityMultiplier
    * flourSpeedMultiplier,
    4, 30)
```

rounded to one decimal place.

If the user selects `inactive` levain, a fallback value is still calculated for display, but the assessment says the recipe should not be trusted until the levain is refreshed and visibly active.

## Validation Rules

`validateRecipeInput` returns issues with a `field`, a `level` (`error` or `warning`), and a plain-language message. Blocking errors:

- Any number field empty or not a real number ("Enter a ...").
- Final dough weight below `50g` or above `10,000g`. (`50g` was the old field minimum, so every recipe the app could already save still opens.)
- Number of loaves below `1`.
- Hydration below `50%` or above `110%`.
- Salt below `0%` or above `4%`.
- Levain hydration below `40%` or above `200%`.
- Target bulk time below `2h` or above `12h`.
- Room temperature below `16C` or above `32C`.
- No dough flour, a flour share of `0%` or less, or shares that do not total `100%` (0.5% tolerance).

Number fields never rewrite what the user typed. An out-of-range number stays in the field and a cleared field stays empty; the message appears next to the field when the user leaves it (immediately if the number is already above the maximum), and Continue is disabled until it is fixed. Steppers always land inside the range. A draft is not saved while a field is cleared.

Warnings, not blockers, for unusual but possible values:

- Final dough weight from `50g` up to `300g`: "Under about 300g, timings and levain amounts stop being reliable."
- Final dough weight above `3kg` (up to the `10,000g` maximum): "Over about 3kg, bake times and oven or bowl size stop being realistic for a home bake."
- Salt below `1.8%` or above `2.2%`.
- Levain activity below `active` (recently refreshed, sleepy, inactive).

The formula maths is linear and works at any positive weight; the weight limits come from tiny salt and levain gram amounts, the fixed minimum bake time, and home oven size. The limits live in `DOUGH_WEIGHT_LIMITS` in `validation.ts`.

Hydration, prefermented flour, and temperature outliers are not validation warnings. They appear in the assessment.

## Assessment Structure

`assessRecipe(input, formula)` returns structured sections first, then coaching copy.

Each section has:

- `level`: `positive`, `info`, `warning`, or `risk`
- `title`
- `shortMessage`
- `details`

Sections, in order:

1. **Overall recipe shape** (always)
2. **Target dough rise** (always)
3. **Hydration**: High hydration for this flour, or Lower hydration for this flour (only when applicable)
4. **Fermentation**: Low fermentation confidence, or Fermentation timing is approximate (none when confidence is high)
5. **Levain**: Levain may need more time, or Refresh levain before baking
6. **Formula**: Low salt, High salt, Aggressive inoculation, Slow fermentation setup

## Detailed Assessment Rules

### Overall Recipe Shape

The short message names the hydration, the flour blend, and a handling label: `approachable`, `moderate`, or `advanced`. The details quote the prefermented flour percentage, target bulk time and room temperature, add the "confirm readiness from dough signs" reminder, and, when the flour changes how the hydration behaves, the equivalent white-flour hydration.

Handling score starts at `0` and gains `1` for each of:

- Hydration is high for the primary flour.
- Prefermented flour is above `25%`.
- Room temperature is above `27C`.
- Levain activity is not `active` or `veryActive`.
- Whole wheat, Rye Type 1150, or whole rye makes up `20%` or more of the blend.
- Number of loaves is above `1`, because dividing and shaping add process complexity.

Score `0` is `approachable` (level `positive`), `1` to `2` is `moderate` (`warning`), `3` or more is `advanced` (`risk`).

The hydration label is `high-hydration` when hydration is high for the flour, `lower-hydration` when it is below the flour's comfortable range, otherwise `balanced`.

### Hydration And Handling

Hydration judgments are flour-relative, using the primary flour (the one with the largest share). Bands from `flourProfiles.ts`:

| Flour Type | Comfortable Range | High Hydration | Notes |
| --- | ---: | ---: | --- |
| Wheat Type 550 | 65-75% | above 75% | Easier gluten development, but very open-crumb formulas still require handling skill. |
| Wheat Type 1050 | 72-82% | above 82% | Absorbs more water, but can feel slack and produce a denser crumb if gluten is weak. |
| Pizza flour (Tipo 00 style) | 58-68% | above 69% | Lower absorption; the default pizza template sits at 65%. |
| Whole wheat | 75-88% | above 88% | Absorbs more water and ferments faster; bran can weaken gluten structure. |
| Rye Type 1150 | 70-85% | above 85% | Rye has low gluten strength; assess stickiness and structure separately. |
| Whole rye | 72-90% | above 90% | Very absorbent; sticky, paste-like handling. |

(In code, "high" is nominal hydration strictly above the flour's `highHydrationStartsAt`.)

Effective hydration is nominal hydration minus a per-flour offset, expressed in white-flour terms. It is only used for wording ("`85%` on Whole wheat handles like ~`78%` on white flour") and for bulk rise targets. Offsets, applied as a weighted average over the blend: Type 550 `0`, Type 1050 `-3`, pizza flour `+2`, whole wheat `-7`, Rye Type 1150 `-5`, whole rye `-8`.

Rules:

- Hydration above the high threshold: a `risk` section "High hydration for this flour" warning about stickiness, spreading, shaping difficulty, and the need for stronger development. For rye as the primary flour the copy says rye structure does not improve through gluten development the way wheat does.
- Hydration below the comfortable range: an `info` section "Lower hydration for this flour" (easier handling, tighter crumb).
- Inside the comfortable range, or between comfortable and high: no section.

### Target Dough Rise

An `info` section tells the baker the volume rise to aim for at the end of bulk, for example "~`35`-`50%`". It comes from `getBulkRiseTargets`:

- Anchor ranges for white wheat dough by room temperature, interpolated: `18C` 55-75%, `21C` 45-60%, `24C` 35-50%, `27C` 25-35%, `29C` 20-28%. Outside that range the nearest anchor is used.
- Scaled down for whole grain: weighted share of whole wheat (`35%` penalty), Rye Type 1150 (`38%`), whole rye (`40%`), capped at `45%`.
- Effective hydration at or below `65%` lowers the top of the range by `5` points.
- Ranges are rounded to the nearest `5`, with the low end held between `15%` and `90%`.
- At effective hydration of `80%` or more, a note suggests a straight-sided container because very wet dough spreads and hides volume gain.

The same range is quoted in the Pre-shape and Shape steps of the schedule and in bake mode.

### Fermentation Confidence

Based on room temperature, levain activity, target bulk time, and prefermented flour.

High confidence (no section shown) needs all of:

- Levain is `active` or `veryActive`.
- Room temperature is `22-26C`.
- Target bulk is `4-8h`.
- Prefermented flour is `8-18%`.

Low confidence (`risk`, "Low fermentation confidence") when any of:

- Levain is `sleepy` or `inactive`.
- Room temperature is below `20C` or above `28C`.
- Target bulk is below `3h` or above `10h`.
- Prefermented flour is below `6%` or above `25%`.

Everything in between is medium: a `warning` "Fermentation timing is approximate".

The copy always reminds the baker to watch dough signs: rise, aeration, domed surface, bubbles at the edge, and dough strength.

### Levain Readiness

- `veryActive`, `active`: no section.
- `recentlyRefreshedButNotPeaked`: `warning`. The levain may need more time before mixing.
- `sleepy`, `inactive`: `risk`, "Refresh levain before baking". Treat the formula as planning only until the levain is refreshed and visibly active.

### Salt

- `1.8-2.2%`: normal range, no section.
- Below `1.8%`: `warning`. Fermentation may move faster and flavor may be flatter.
- Above `2.2%`: `warning`. Fermentation may slow and the loaf may taste saltier.

### Prefermented Flour

- Above `25%`: `risk`, "Aggressive inoculation". Timing windows become narrow and overproofing sensitivity rises.
- Below `6%`: `warning`, "Slow fermentation setup". Fermentation is slow and depends more on levain strength.
- Otherwise no section.

## Coaching Copy Principles

Assessment copy should:

- Be direct but encouraging.
- Explain why the rule matters.
- Use "likely" and "watch for" when discussing fermentation.
- Connect technical facts to baking outcomes.
- Avoid pretending the calculator can see the dough.

Good example:

> Your formula is in a comfortable hydration range for Type 1050, but it is still an ambitious dough. Expect a tacky feel and give the dough time to build strength. Watch fermentation signs more than the clock.

Bad example:

> Your dough will be ready in exactly 5 hours.

## Not Modelled

- Autolyse timing and proofing implications are not assessed in the recipe assessment. Autolyse, folds, and proofing are chosen in the schedule builder, which shows its own advice (autolyse recommendation, and an assessment of the cold retard length: under 8 h short, up to 16 h typical, up to 22 h long, beyond that a risk of over-proofing).
- Dough temperature (only room temperature is used).
- Baked weight does not vary by bake method.
