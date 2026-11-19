---
title: Recipe view and relative days
status: current
date: 2026-11-19
---

# Recipe view and relative days

## Why

A saved recipe used to carry a fixed mix date, so it was only correct for one bake. Recipes now describe a bake in relative days and get real dates only when you start baking.

## Behavior

**Relative days.** Days count back from bake day, the day the oven goes on.

| Label | Meaning |
| --- | --- |
| Bake day | Oven day |
| Bake day −1 | The day before (usually mix day with a cold proof) |
| Bake day −2 | Two days before (for example a levain build the evening before) |

The schedule builder, the recipe view, and saved-recipe cards use these labels. There is no mix date field on a recipe. The recipe keeps a typical start time (for example 09:00) and a typical oven time, which set how long the cold retard runs.

**Recipe view.** Tapping a saved recipe on Home opens `/recipe/:id` without entering edit mode. It shows:

- Dough summary (weight, loaves, hydration, salt).
- Ingredients.
- Starter and levain: amount in the dough, and when starter prep is on, the refresh (for fridge starter) and levain build amounts and ratio.
- The schedule grouped by bake day, one line per step with a time and duration.

**Actions.** Start baking opens the bake-start dialog. The pen action (Edit recipe) opens the existing summary and schedule builder.

**Starting a bake.** Every entry point (Home card, recipe view, schedule builder, and "Bake again" in history) opens the same dialog, "When are you mixing?". It asks for the real mix date and start time, defaulting to today if the usual start time is still ahead and tomorrow otherwise, and previews the first step, mix time, and oven time. Those values are written to the bake session only, so the saved recipe is untouched. Bake mode, timers and history keep using real dates.

**Past start times.** A start time more than 5 minutes in the past shows a warning ("This start time was 10 days ago...") but Start baking stays enabled. Up to 5 minutes ago counts as now and shows nothing. A "Start now" button sets the date and time to the current time. The warning is only about the mix time; a first step before the mix (such as building levain) that is already late is not flagged yet.

## Compatibility

Recipes saved before this change still contain a `mixDate`. It is ignored and cleared the next time the recipe is saved.

## Ideas not built yet

- Choosing the oven time instead of the mix time when starting a bake (working backward).
