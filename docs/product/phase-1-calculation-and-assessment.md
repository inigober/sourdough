---
title: Phase 1 Calculation and Assessment Model
status: draft
---

# Phase 1 Calculation and Assessment Model

## Purpose

This document defines the first deterministic model behind the Phase 1 recipe builder.

The model should:

- Calculate a complete sourdough formula from user inputs.
- Estimate levain amount from target bulk fermentation time.
- Keep ingredient math deterministic and explainable.
- Use hardcoded assessment rules for predictable baking feedback.
- Avoid depending on an LLM for core recipe correctness.

## Key Product Decision

The calculator should treat fermentation estimates as guided approximations, not promises.

Ingredient math can be exact. Fermentation timing cannot be exact because it depends on levain condition, flour, room temperature, handling, salt, inoculation, and baker judgment.

The UI should say "estimated" or "target" wherever the model discusses fermentation timing.

## Inputs

Required user inputs:

- `finalDoughWeightGrams`
- `numberOfLoaves`
- `hydrationPercent`
- `saltPercent`
- `doughFlours` (one or more flour entries that must total `100%` of total flour)
- `levainFlourType`
- `targetBulkHours`
- `roomTemperatureCelsius`
- `levainType`
- `levainHydrationPercent`
- `levainActivity`
- `autolyseEnabled`
- `proofingStyle`

Phase 1 supports a dough flour blend (`doughFlours`) and a separate levain flour. Each blend entry has a `flourType` and `percent`. Percentages must add up to `100%` of total flour in the dough.

Supported flour types:

- `wheatType550` — light wheat, common white bread flour in Germany
- `wheatType1050` — higher-extraction wheat, common sourdough choice
- `pizzaFlour` — Tipo 00 style pizza flour, often sold in supermarkets
- `wholeWheat` — whole wheat
- `ryeType1150` — medium/light rye (not whole grain)
- `wholeRye` — whole rye, common for levain and rye-forward doughs (distinct from `ryeType1150`)

`wheatType812` was removed because it is uncommon in German retail baking.

## Defaults

- `numberOfLoaves`: `1`
- `hydrationPercent`: `80`
- `saltPercent`: `2`
- `doughFlours`: one entry, `wheatType1050` at `100%`
- `levainFlourType`: same as the primary dough flour (`wheatType1050` in the default blend; user can change it)
- `finalDoughWeightGrams`: `900`
- `roomTemperatureCelsius`: TBD
- `levainType`: `standard100`
- `levainHydrationPercent`: `100`
- `levainActivity`: `active`
- `autolyseEnabled`: `true`
- `autolyseMinutes`: `45`
- `proofingStyle`: `both`

Levain type presets:

- `stiffLevain`: `60%`
- `standard100`: `100%`
- `liquidLevain`: `140%`
- `customHydration`: user enters `levainHydrationPercent` directly (expert control)

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
prefermentedFlourPercent = estimatePrefermentedFlourPercent(
  targetBulkHours,
  roomTemperatureCelsius,
  levainActivity,
  doughFlours,
  levainFlourType
)
```

Convert prefermented flour to levain flour:

```text
levainFlour = totalFlour * (prefermentedFlourPercent / 100)
```

Calculate levain water:

```text
levainWater = levainFlour * levainHydration
```

Calculate levain amount:

```text
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

The baked-weight range assumes about 10-15% weight loss during baking. Later versions can adjust this by loaf size, bake duration, oven setup, and uncovered bake time.

## Prefermented Flour Heuristic

The model should estimate prefermented flour percentage from target bulk time. This is how the app translates the user's workflow into levain amount.

Start with a base value at `24C` room temperature for an active levain:

- `2-3h`: `28%`
- `3-4h`: `23%`
- `4-5h`: `18%`
- `5-6h`: `14%`
- `6-8h`: `10%`
- `8-10h`: `7%`
- `10-12h`: `5%`

For values between bands, interpolate instead of jumping suddenly.

Apply temperature adjustment:

```text
temperatureDelta = 24 - roomTemperatureCelsius
temperatureMultiplier = 1 + (temperatureDelta * 0.08)
```

Examples:

- At `22C`, use roughly `16%` more prefermented flour than the base.
- At `26C`, use roughly `16%` less prefermented flour than the base.

Clamp `temperatureMultiplier` between `0.65` and `1.45` to avoid extreme outputs.

Apply levain activity adjustment:

- `veryActive`: `0.9`
- `active`: `1.0`
- `recentlyRefreshedButNotPeaked`: `1.15`
- `sleepy`: `1.35`
- `inactive`: do not trust the calculation; show refresh guidance and mark fermentation confidence as low.

Apply flour speed adjustment:

- `wheatType550`: `1.0`
- `wheatType1050`: `0.95`
- `pizzaFlour`: `1.05`
- `wholeWheat`: `0.9`
- `ryeType1150`: `0.85`
- `wholeRye`: `0.8`

For multi-flour doughs, use a weighted average of these multipliers from `doughFlours` percentages. Higher-extraction and rye flours often ferment faster, so they need slightly less prefermented flour for the same target time.

Final estimate:

```text
prefermentedFlourPercent =
  basePrefermentedFlourPercent
  * temperatureMultiplier
  * levainActivityMultiplier
  * doughFlourSpeedMultiplier
```

Clamp the final value between `4%` and `30%`.

If the user selects `inactive` levain, still calculate a fallback value for display, but the assessment must clearly say the recipe should not be trusted until the levain is refreshed and visibly active.

## Validation Rules

Show blocking errors for:

- Final dough weight at or below `0g`.
- Number of loaves below `1`.
- Hydration below `50%` or above `110%`.
- Salt below `0%` or above `4%`.
- Levain hydration below `40%` or above `200%`.
- Target bulk time below `2h` or above `12h`.
- Room temperature below `16C` or above `32C`.
- Calculated `addedWater` below `0g`.
- Calculated `addedFlour` below `0g`.

Show warnings, not blockers, for unusual but possible values:

- Hydration near the edge of the selected flour's range.
- Salt below `1.8%` or above `2.2%`.
- Prefermented flour below `6%` or above `25%`.
- Levain activity below `active`.
- Rye selected with very high hydration.

## Assessment Structure

The assessment should produce structured facts first, then coaching copy.

Assessment sections:

- Recipe style
- Difficulty
- Hydration and handling
- Fermentation confidence
- Levain readiness
- Flour notes
- Suggested watch-outs

Each section should have:

- `level`: `positive`, `info`, `warning`, or `risk`
- `title`
- `shortMessage`
- `details`

## Detailed Assessment Rules

### Recipe Style

Set the broad style from hydration and flour:

- Wheat flour under `70%`: lower-hydration, easier-handling wheat sourdough.
- Wheat flour from `70-78%`: balanced country-style sourdough.
- Wheat flour above the flour-specific high threshold: high-hydration, more open-crumb-oriented sourdough.
- Whole wheat: flavor-forward, higher-absorption loaf with denser crumb risk.
- Rye Type 1150: rye-influenced sourdough with sticky handling and lower gluten structure.

For the user's default `80%` hydration with Type 1050, describe the loaf as a high-hydration, flavor-forward wheat loaf with moderate-to-advanced handling demands.

### Difficulty

Start at `moderate`.

Increase difficulty when:

- Hydration is in the high band for the selected flour.
- Prefermented flour is above `25%`.
- Temperature is above `27C`.
- Levain activity is not clearly active.
- Rye Type 1150 or whole wheat is selected.
- Number of loaves is above `1`, because dividing and shaping add process complexity.

Decrease difficulty when:

- Hydration is comfortably within range.
- Levain is active or very active.
- Salt is within `1.8-2.2%`.
- Prefermented flour is between `8-18%`.

Output one of:

- `easy`
- `moderate`
- `advanced`
- `risky`

### Hydration And Handling

Use flour-relative hydration bands:

- Wheat Type 550: comfortable `65-75%`, high `76%+`
- Wheat Type 812: comfortable `68-78%`, high `79%+`
- Wheat Type 1050: comfortable `72-82%`, high `83%+`
- Whole wheat: comfortable `75-88%`, high `89%+`
- Rye Type 1150: comfortable `70-85%`, high `86%+`

If hydration is below the comfortable range:

- Mention easier handling and potentially tighter crumb.

If hydration is inside the comfortable range:

- Mention balanced handling for that flour.

If hydration is above the high threshold:

- Warn about stickiness, spreading, shaping difficulty, and the need for stronger gluten development.

For rye, avoid saying "gluten development will solve it." Rye structure behaves differently, so the app should talk about stickiness, paste-like dough, and careful handling.

### Fermentation Confidence

Base confidence on room temperature, levain activity, and target bulk time.

High confidence:

- Levain is `active` or `veryActive`.
- Room temperature is `22-26C`.
- Target bulk is `4-8h`.
- Prefermented flour is `8-18%`.

Medium confidence:

- Room temperature is `20-22C` or `26-28C`.
- Target bulk is `3-4h` or `8-10h`.
- Prefermented flour is `6-25%`.

Low confidence:

- Levain is `sleepy` or `inactive`.
- Room temperature is below `20C` or above `28C`.
- Target bulk is below `3h` or above `10h`.
- Prefermented flour is below `6%` or above `25%`.

The assessment should always remind the user to watch dough signs: rise, aeration, domed surface, bubbles at the edge, and dough strength.

### Levain Readiness

Rules:

- `veryActive`: positive. Mention the levain may ferment quickly.
- `active`: positive. Treat the estimate as reasonable.
- `recentlyRefreshedButNotPeaked`: warning. Mention that the levain may need more time before mixing.
- `sleepy`: risk. Recommend a refresh before relying on the formula.
- `inactive`: risk. Recommend reviving the levain before baking and mark the formula as a planning estimate only.

If the levain hydration differs from the selected preset, explain that the formula has accounted for the custom flour and water contribution.

### Flour Notes

Wheat Type 550:

- Mild flavor, good gluten potential, easier structure.
- High hydration may still feel slack.

Wheat Type 812:

- Balanced flavor and structure.
- Good bridge between white and high-extraction formulas.

Wheat Type 1050:

- More flavor and water absorption than lighter wheat flours.
- Can still produce a denser crumb if gluten development or fermentation is weak.

Whole wheat:

- Higher absorption and stronger flavor.
- Ferments faster and can weaken structure because of bran.

Rye Type 1150:

- Sticky handling and lower gluten strength.
- Fermentation may feel fast and dough signs differ from wheat dough.

### Salt

Rules:

- `1.8-2.2%`: normal range.
- Below `1.8%`: warn that fermentation may move faster and flavor may be flatter.
- Above `2.2%`: warn that fermentation may slow and the loaf may taste saltier.
- Above `3%`: mark as high risk unless the user intentionally wants a salty formula.

### Prefermented Flour

Rules:

- Below `6%`: slow fermentation, more schedule risk, possible under-fermentation if the levain is not strong.
- `8-18%`: typical controlled range.
- `18-25%`: faster fermentation, more acidity and overproofing sensitivity.
- Above `25%`: aggressive inoculation; warn that timing windows become narrow.

### Autolyse

If autolyse is enabled:

- Positive for Type 1050, whole wheat, and higher hydration wheat doughs.
- Mention that autolyse can improve extensibility and hydration.

If autolyse is disabled:

- Neutral for simpler formulas.
- Warning for high-hydration Type 1050 or whole wheat formulas because the dough may be harder to develop.

Do not assess detailed autolyse timing beyond the Phase 1 default of `45 minutes`.

### Proofing Style

Room-temperature proof:

- Mention faster turnaround and more schedule sensitivity.

Cold proof:

- Mention more flavor development, easier scoring, and longer planning horizon.

Both:

- Mention flexibility: finish structure at room temperature, then use cold proofing for flavor and timing.

Phase 1 should output proofing implications, not a full proofing schedule.

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

## Open Decisions

These should be confirmed before implementation:

- `roomTemperatureCelsius` means room temperature in Phase 1.
- The first default final dough weight is `900g`.
- Calculated prefermented flour percentage is exposed by default in the summary.
- The Phase 1 formula calls the ingredient "levain" in the UI.
