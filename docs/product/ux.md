---
title: UX
status: current
date: 2026-11-19
---

# UX

## UX Goal

Help the user build a complete sourdough recipe with guidance, not just fill out a calculator, then carry that recipe through the bake.

The experience should feel like:

> I know what I want to bake, and the app helps me turn that into a clear formula, a plan for the days around it, and calm guidance while the dough is working.

The product prioritises clarity, trust, and learning over speed. Interaction rules that apply to every screen (info toggles, icons, validation, wizard chrome) are in [UI/UX practices](./ui-ux-practices.md); this document covers the screens and flows.

## Core UX Principles

- Use a guided multi-step flow for first-time clarity.
- End with an editable summary where the user can adjust key parameters and immediately see the impact.
- Keep explanations hidden by default behind info buttons, except onboarding context, which is visible body copy.
- Use friendly expert language, not beginner simplification. **Exception: the schedule builder** (see below), which deliberately starts from simple presets.
- Show calculated values transparently, especially levain amount and prefermented flour percentage.
- Never silently change what the user typed. Show the message, keep the text.
- Local first: everything works without an account. Signing in adds cloud sync and backup.

## App Map

| Route | Screen |
| --- | --- |
| `/` | Home: templates, saved recipes, resume cards |
| `/build/dough-size`, `/build/flour`, `/build/recipe-targets`, `/build/fermentation` | Recipe wizard steps |
| `/build/summary` | Ingredient summary and assessment |
| `/build/schedule` | Schedule builder |
| `/recipe/:id` | Read-only recipe view |
| `/bake` | Bake mode |
| `/history`, `/history/:id` | Bake history list and detail |

Home and History are the two bottom-nav tabs. Routes live in `features/recipe-builder/appRoutes.ts`.

## Screen Flow

### 1. Home

Purpose: get to a first plan quickly, and get back to anything in progress.

Content, top to bottom:

- Title "Plan your sourdough bake" with the sign-in control, a one-line promise ("Hour by hour, with alerts when it is time to act"), and **New recipe**.
- **Continue where you left off** (an unfinished builder draft) and **Resume baking** (an unfinished bake). When either card is showing it owns the filled primary button and New recipe becomes secondary.
- **Saved recipes** (shown first when any exist): each card shows the name, the mix day ("Mix on bake day −1"), the updated date, and "Baked Nx · last: Great loaf" once the recipe has history. Tapping the card opens the recipe view. Start baking, Duplicate, and a bin icon (delete, with confirmation) sit on the card.
- **Start from a template**: six templates with a photo. Shown before saved recipes for a first-time user, after them for a returning one.

There is no sign-in modal on launch. After a recipe is saved and the baker is back on Home, the app offers "Sync your recipes" once; dismissing it is remembered. Explicit sign-in taps always open it. Without Supabase configured, nothing about accounts is offered.

### 2. Dough Size

Purpose: define the basic dough size.

Inputs: final dough weight (default 900 g, steppers of 50 g) and number of loaves (default 1). Field messages follow the rules in [Calculation and assessment](./calculation-and-assessment.md): a weight under 300 g or over 3 kg shows a warning but Continue stays enabled; under 50 g or over 10,000 g blocks Continue.

### 3. Flour Blend

Purpose: define the flour context for calculation and assessment.

The step shows the total dough weight and the estimated total flour, then one row per dough flour (flour type plus a percent and gram stepper). "Add another flour" adds a whole wheat entry; the shares always total 100% and rebalance as one changes. Each flour has an info toggle.

### 4. Hydration And Salt

Hydration (default 80%) and salt (default 2%), both as baker's percentages of total flour. Salt outside 1.8 to 2.2% shows a warning.

### 5. Fermentation And Levain

Purpose: turn the target bulk time into a levain amount.

Inputs: target bulk fermentation time, room temperature, levain activity, levain type (with custom hydration when chosen), and levain flour. Each has an info toggle. Weak levain shows a warning on the field.

### 6. Summary

Purpose: give the user control, then show the result.

- Four cards summarise the inputs; tapping one opens that wizard step, and a Save button in the wizard footer returns to the summary.
- **Ingredient list**, **Formula breakdown**, and the **Assessment** update immediately. If the inputs have a blocking error the summary says "Formula unavailable".
- Footer: **Save recipe** (or "Update recipe") and **Build schedule**.

The assessment sections are listed in [Calculation and assessment](./calculation-and-assessment.md).

### 7. Schedule Builder

Decision (owner, from the UX review in [ux-review-commercial-viability.md](./ux-review-commercial-viability.md), problem 7): the "no beginner simplification" principle does **not** apply to the schedule builder. A 25-field expert form was too much for a first-time baker, so the screen leads with simple choices and keeps the expert controls one tap away.

Layout, top to bottom:

1. A one-line summary of the plan ("Mix on bake day −1 and bake on bake day...") and a reminder that the real date is chosen when baking starts.
2. **Choose a plan**: three presets, each with a one-sentence plain-language description.
   - *Simple overnight*: mix and fold during the day, about 14 hours in the fridge, bake at 08:00 the next morning. Stretch-and-folds only; autolyse 45 minutes when recommended.
   - *Same day*: start at 07:00, proof at room temperature, bake the same evening. Stretch-and-folds only; autolyse 30 minutes when recommended.
   - *Weekend deep ferment*: about 20 hours in the fridge, bake at 12:00 the next day. Full fold plan for the dough's hydration, always with a 60-minute autolyse.
3. **Bake schedule**: the resulting timeline directly beneath the presets, updating as soon as a plan is chosen.
4. **Customise** (collapsed): the individual fields, grouped into collapsed sections (Starter prep, Start time and mixing, Folding and shaping, Proofing, Baking). Jargon fields carry a visible one-line explanation (for example "Coil fold: a gentle fold done in the bowl"). The Proofing section shows the cold retard length and an assessment of it.
5. **Export** (collapsed): copy ingredients, copy the schedule, or copy the full recipe as JSON.
6. Footer: Back, **Save recipe**, and **Start baking**.

How presets behave (`lib/schedule/presets.ts`):

- A preset sets only the shape of the day: start time, autolyse, mixing rests, folds, pre-shape, and cold vs room-temperature proofing. Oven method and temperatures, starter prep and the (absent) calendar date are never touched.
- Cold presets keep the bake time and fridge time fixed and work out the start time from the recipe's bulk length, so a 4-hour and a 10-hour bulk both get a sensible overnight.
- Nothing about the chosen preset is stored. The builder compares the current values with each preset: a match shows that plan as selected ("Current plan: Simple overnight."), anything else shows **Custom**. Saved recipes and bake sessions keep exactly the shape they have.
- Opening the builder never changes existing values. Choosing a preset over values the user has edited asks "Replace your settings?" and lists what will be reset (up to five changes, then "and N more").

Defaults when a schedule is first created (`lib/schedule/defaults.ts`): start time 09:00, cold proof with an 08:00 bake, Dutch oven, starter prep on (starter from the fridge), autolyse on from 72% hydration. Fold counts follow hydration, and bake times and temperatures scale with dough weight. These rescale when the dough weight or loaf count changes.

The timeline contains only the steps the plan defines: starter refresh and levain build when starter prep is on, autolyse, mixing, rests, slap and folds, stretch and folds, coil folds, pre-shape, shape, cold retard or room-temperature proof, and the bake phases. It is deliberately not exhaustive; not every moment needs its own step.

Not built yet: tapping a timeline step to edit it.

### 8. Recipe View

Tapping a saved recipe opens a read-only page with the ingredients, starter and levain amounts, and the schedule by bake day, with Start baking and an Edit recipe action. See [Recipe view and relative days](./recipe-view-and-relative-days.md).

### 9. Starting A Bake

Every entry point (Home card, recipe view, schedule builder, "Bake again" from history) opens one dialog, "When are you mixing?". It takes a mix date and start time and previews the first step, mix time, and the time the oven steps begin. If the chosen time is more than 5 minutes in the past, a warning appears and Start baking stays enabled; **Start now** sets the date and time to the current moment. The check re-runs every 30 seconds while the dialog is open. Details are in [Recipe view and relative days](./recipe-view-and-relative-days.md).

Starting from the schedule builder with a recipe that is not saved yet, or has unsaved edits, first asks to save it. The real date and time live only on the bake session.

### 10. Bake Mode

Purpose: one calm screen for what to do now, with timers that keep working when the phone is locked.

Layout, top to bottom:

- "Step N of M", and a collapsed **About this bake** (mix day, bake day, coach hint).
- Notices, only when relevant: the web-build banner, a schedule drift note ("Remaining schedule shifted by +20m based on actual timing"), the native timer permission notice, and a test-timer note when a test override is set.
- **Previous** step card, then the **Current step** card: time range, step name (large), a coach button, "Starts in 2h 10m" for a future step, the step detail, **Start timer** and an edit pen for steps whose timing can be adjusted, the timer (large, tabular digits, "Time's up" at zero, restart button), and "Next up: X at 17:15 (in 2h 10m)".
- **Full schedule**: every step with its time and, for future steps, "Starts in ...". Tapping a row reveals **Jump to this step**.
- Footer: **Previous** and **Next step** (**Finish baking** on the last step). **Exit bake mode** keeps the session.

Behaviours:

- **Screen stays awake** while bake mode is open: the web Screen Wake Lock API where supported, and on native iOS the plugin's `setKeepAwake` turns off the idle timer. Auto-lock comes back when bake mode closes. The native path has not been tested on a physical device. See [Native iOS bake timers](../engineering/native-ios-bake-timers.md).
- **Early start confirm**: starting a timer more than 30 minutes before the step's planned start asks "Start this step early?" and, if confirmed, shifts the whole remaining plan earlier so the Full schedule stays in order. Starting within 30 minutes of plan does not shift it. Starting late always shifts the plan later.
- **Skip confirm**: jumping forward more than one step asks "Skip N steps?" (the running timer stops and the steps in between are logged as skipped). Jumping to the next step or backwards does not ask.
- **Undo toast**: Next step and Jump show an Undo toast for 8 seconds. Undo restores the session as it was, but keeps the coach question count. Finish baking has no Undo.
- **Going back**: Previous and backward jumps remove the step logs from the step returned to onward, so history shows only steps actually done.
- **Web build banner**: the web version cannot ring with the screen off, so it shows a persistent note ("This web version can't alert you with the screen off. Use the iOS app or keep this screen open."). The native app does not show it.
- **Timers** survive a reload (the end time is stored). On the iOS app a timer also becomes an AlarmKit alarm or a notification; permission is asked on the first Start timer tap, with a notice and Open Settings if alerts are limited or denied.
- **Adjusting a step** (pen): levain build time, autolyse, rests, slap and folds, room proof, and bake phase lengths can be edited in place; the change is saved to the bake session only.
- **Mix steps** show the levain and salt grams.

#### Coach

The sparkles button opens an AI baking coach for the current step (a Supabase edge function, so it needs Supabase configured).

- It opens with a static tip for the step, a one-line framing ("AI guidance based on your recipe and photo. When unsure, trust the dough."), and tap-to-fill quick questions per step.
- Up to 5 questions per bake; the remaining count is shown, and the last question is flagged. A question only counts once a reply succeeds.
- The conversation is saved in the bake session (`coachTranscript`, last 10 messages; photos are not stored, only a "Photo shared" note) and is there when the sheet is reopened.
- On failure the draft and photo stay in the box, friendly copy is shown with a Retry button for retryable failures, and no quota is spent. Raw errors only go to the developer console.
- The prompt includes live bake progress (step number, planned vs actual time, drift, steps already logged). The coach is told never to recommend adding or removing water, flour, salt, or starter, or to change the hydration or any amount; for sticky, wet, stiff or slack dough it explains what is normal for the step and suggests technique only. A photo can be attached; it is compressed before upload.

### 11. Bake Complete

Finishing the last step opens "Bake complete" with an optional loaf assessment (Great loaf, OK, Needs work) notes and an optional loaf photo (compressed on the device). **Save bake** saves it and only then clears the bake session. Closing the dialog (X, Escape, backdrop) keeps the bake so it shows as "Resume baking" on Home. **Don't save** asks for confirmation and is the only path that deletes an unsaved bake. See [Bake history](./bake-history.md).

### 12. History

A searchable list of completed bakes (search by recipe name or notes, filter by assessment) with a detail view showing notes, the assessment, the recipe snapshot, the planned schedule, step timings with drift, **Bake again**, and Delete. History is local first, and signing in uploads it. See [Bake history](./bake-history.md).

## Navigation

- The wizard has a sticky header with progress and a sticky footer with Back and Continue, so both stay reachable. The last wizard step's button reads "View summary". The app follows the system light or dark setting, respects reduced motion, and keeps tap targets at least 44px (see [UI/UX practices](./ui-ux-practices.md)).
- Entered values are preserved when moving between steps and across reloads (draft).
- Leaving a dirty recipe asks to save or discard (see [Leave dialog and unsaved navigation](../engineering/leave-dialog-and-unsaved-navigation.md)). Bake mode is never blocked.
- Bake timers can reopen the app on bake mode through the `sourdough://bake` link.

## Empty, Error, And Warning States

Blocking errors:

- Prevent moving forward only when the app cannot calculate a valid recipe.
- Explain the problem in plain language, next to the field, after the user leaves it.

Warnings:

- Allow the user to continue.
- Explain tradeoffs and risks.
- Reappear in the assessment if still relevant.

Network and storage failures (saving a recipe or a bake, loading history, the coach) show a message with a Try again action and never discard what the user entered.

## Ideas Not Built Yet

- Tap a timeline step in the schedule builder to edit it.
- Choose the oven time instead of the mix time when starting a bake (working backward).
- "Tweak recipe from notes" after a bake.
- Streaming coach replies.
