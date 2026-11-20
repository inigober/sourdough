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
| `/` | Home: start a bake or a recipe, resume cards, saved-recipes shortcut, templates |
| `/saved` | Saved tab: the full list of saved recipes |
| `/build/dough-size`, `/build/flour`, `/build/recipe-targets`, `/build/fermentation` | Recipe wizard steps |
| `/build/summary` | Ingredient summary and assessment |
| `/build/schedule` | Schedule builder |
| `/recipe/:id` | Read-only recipe view |
| `/bake` | Bake mode |
| `/history`, `/history/:id` | Bake history list and detail |

Home, Saved and History are the three bottom-nav tabs. Routes live in `features/recipe-builder/appRoutes.ts`.

## Screen Flow

### 1. Home

Purpose: get to a first plan quickly, and get back to anything in progress.

Content, top to bottom:

- Title "Plan your sourdough bake" with the sign-in control, a one-line promise ("Hour by hour, with alerts when it is time to act"), and **New recipe**.
- **Continue where you left off** (an unfinished builder draft) and **Resume baking** (an unfinished bake). When either card is showing it owns the filled primary button and New recipe becomes secondary.
- **Saved recipes shortcut** (only when the baker has saved recipes): a compact card with the count, a **See all** link to the Saved tab, and the three most recently updated recipes as slim rows. A row shows the name and one meta line ("Updated 19 Nov", or "Baked 3x · last: Great loaf" once the recipe has history; a recipe without a schedule says "No schedule yet" first). Tapping the row opens the recipe view; **Start baking** on the row opens the same "When are you mixing?" dialog as everywhere else. With no saved recipes there is no card at all, so a first-time baker sees only New recipe and the templates.
- **Start from a template**: a heading and six photo tiles below the shortcut, with no outer card around them. Tapping a tile loads that template into the wizard.

Home stays short on purpose: a long saved list lives on the Saved tab, never here.

There is no sign-in modal on launch. After a recipe is saved and the baker is back on Home, the app offers "Sync your recipes" once; dismissing it is remembered. Explicit sign-in taps always open it. Without Supabase configured, nothing about accounts is offered.

### 2. Dough Size

Purpose: define the basic dough size.

Inputs: final dough weight (default 900 g, steppers of 50 g) and number of loaves (default 1). Field messages follow the rules in [Calculation and assessment](./calculation-and-assessment.md): a weight under 300 g or over 3 kg shows a warning but Continue stays enabled; under 50 g or over 10,000 g blocks Continue.

### 3. Flour Blend

Purpose: define the flour context for calculation and assessment.

The step title is a question ("Which flour are you using?", or "Which flours are you blending?" with more than one flour); the live blend summary (for example "70% Wheat Type 1050 + 30% Whole rye") is a labelled "Your blend" line below the inputs. The step shows the total dough weight and the estimated total flour, then one row per dough flour (flour type plus a percent and gram stepper). "Add another flour" adds a whole wheat entry; the shares always total 100% and rebalance as one changes. Each flour has an info toggle.

### 4. Hydration And Salt

Hydration (default 80%) and salt (default 2%), both as baker's percentages of total flour. Salt outside 1.8 to 2.2% shows a warning.

### 5. Fermentation And Levain

Purpose: turn the target bulk time into a levain amount.

Inputs: target bulk fermentation time, room temperature, levain activity, levain type (with custom hydration when chosen), and levain flour. Each has an info toggle. Weak levain shows a warning on the field.

### 6. Summary

Purpose: give the user control, then show the result.

- Four cards summarise the inputs; tapping one opens that wizard step, and a Save button in the wizard footer returns to the summary.
- The **Ingredients** card, **Formula breakdown**, and the **Assessment** update immediately. If the inputs have a blocking error the summary says "Formula unavailable".
- The Ingredients card has two groups, each row icon | name | amount: **Levain** (amount that goes into the dough, then the build as starter, flour and water with its ratio, plus a refresh feeding for a fridge starter) and **Added to the dough** (flour or flours, water, salt, and the levain row). The levain build uses the schedule defaults until a schedule is built.
- The **Assessment** is one line (a level word, a check or warning icon, and the overall-shape message) with a "Show details" disclosure, collapsed by default. The details hold every section, including the reminder to confirm readiness from dough signs.
- Footer, always visible while scrolling (the Save recipe link sits above the main button): **Save recipe** (or "Update recipe") and **Build schedule**.

The assessment sections are listed in [Calculation and assessment](./calculation-and-assessment.md).

### 7. Schedule Builder

Decision (owner, from the UX review in [ux-review-commercial-viability.md](./ux-review-commercial-viability.md), problem 7): the "no beginner simplification" principle does **not** apply to the schedule builder. A 25-field expert form was too much for a first-time baker, so the screen leads with simple choices and keeps the expert controls one tap away.

Layout, top to bottom:

1. A one-line summary of the plan ("Mix on bake day −1 and bake on bake day...") and a reminder that the real date is chosen when baking starts.
2. **Choose a plan**: three presets and a fourth option, **Custom**, each with a one-sentence plain-language description (one radio group, arrow keys move between the four).
   - *Simple overnight*: mix and fold during the day, about 14 hours in the fridge, bake at 08:00 the next morning. Stretch-and-folds only; autolyse 45 minutes when recommended.
   - *Same day*: start at 07:00, proof at room temperature, bake the same evening. Stretch-and-folds only; autolyse 30 minutes when recommended.
   - *Weekend deep ferment*: about 20 hours in the fridge, bake at 12:00 the next day. Full fold plan for the dough's hydration, always with a 60-minute autolyse.
   - *Custom*: shown only while Custom is selected, as the next block under the picker: the individual fields, grouped into collapsed sections (Starter prep, Start time and mixing, Folding and shaping, Proofing, Baking). Jargon fields carry a visible one-line explanation (for example "Coil fold: a gentle fold done in the bowl"). The Proofing section shows the cold retard length and an assessment of it. Custom is selected when the values match no preset, when the baker taps it, or as soon as they edit any value (so the fields never disappear mid-edit, even if the values happen to equal a preset). Picking a preset hides the groups again.
3. **Bake schedule**: the resulting timeline, directly under the picker (or under the Custom groups, so a baker who has just edited sees the effect right below), updating as soon as a plan is chosen or a value changes.
4. **Export**: a small, quiet text button. Tapping it reveals three text actions: copy ingredients, copy the schedule, or copy the full recipe as JSON.
5. Footer: Back, **Save recipe**, and **Start baking**.

How presets behave (`lib/schedule/presets.ts`):

- A preset sets only the shape of the day: start time, autolyse, mixing rests, folds, pre-shape, and cold vs room-temperature proofing. Oven method and temperatures, starter prep and the (absent) calendar date are never touched.
- Cold presets keep the bake time and fridge time fixed and work out the start time from the recipe's bulk length, so a 4-hour and a 10-hour bulk both get a sensible overnight.
- Nothing about the chosen preset is stored. The builder compares the current values with each preset: a match shows that plan as selected ("Current plan: Simple overnight."), anything else shows **Custom**; a baker who chose Custom or edited a value stays on Custom. Saved recipes and bake sessions keep exactly the shape they have.
- Opening the builder never changes existing values. Choosing a preset over values the user has edited asks "Replace your settings?" and lists what will be reset (up to five changes, then "and N more"); cancelling keeps Custom and every value. Choosing Custom itself never changes a value.

Defaults when a schedule is first created (`lib/schedule/defaults.ts`): start time 09:00, cold proof with an 08:00 bake, Dutch oven, starter prep on (starter from the fridge), autolyse on from 72% hydration. Fold counts follow hydration, and bake times and temperatures scale with dough weight. These rescale when the dough weight or loaf count changes.

The timeline contains only the steps the plan defines: starter refresh and levain build when starter prep is on, autolyse, mixing, rests, slap and folds, stretch and folds, coil folds, pre-shape, shape, cold retard or room-temperature proof, and the bake phases. It is deliberately not exhaustive; not every moment needs its own step.

**Steps have no gaps.** Each step ends exactly when the next one starts. The last step of the bulk (normally the last fold) runs until Pre-shape and says "rest until pre-shape", so a long bulk no longer shows an unexplained hole after the folds.

**Editing a step (model; the screen is built in the schedule builder, see below).** The timeline is built from the schedule settings, so an edit changes the setting a step comes from and the whole timeline is laid out again:

- Change a step's **duration**: every later step moves by the difference. The end of the bulk and the bake time of a cold schedule are anchored, so on a cold schedule the cold retard absorbs the shift, and in the bulk the last fold's rest absorbs it.
- Change a step's **start time**: the step before it takes the difference (so there is never a gap). Moving the first step changes the start time of the whole plan.
- Editing the last step of the bulk moves Pre-shape. Pre-shape's own duration is how long it runs before the bulk ends.
- One fold can be changed on its own (a per-fold override); other single steps change their own setting (autolyse, the two rests, slap and folds rest, room proof, each bake phase).
- Not editable here: the levain prep steps (use the levain settings), the Shape moment, and the cold retard (use the bake time). An edit that cannot be honoured is refused with a message; nothing is guessed.

### 8. Recipe View

Tapping a saved recipe opens a read-only page with the ingredients, starter and levain amounts, and the schedule by bake day, with Start baking and an Edit recipe action. **Delete recipe** (bin icon, danger colour, no filled button) is the last item on the page, apart from the main actions, and asks for confirmation before removing the recipe; afterwards the baker lands on the Saved tab. Delete is deliberately not on the list cards, where it used to sit one tap from Duplicate. See [Recipe view and relative days](./recipe-view-and-relative-days.md).

### 9. Starting A Bake

Every entry point (Home card, recipe view, schedule builder, "Bake again" from history) opens one dialog, "When are you mixing?". It takes a mix date and start time and previews the first step, mix time, and the time the oven steps begin. If the chosen time is more than 5 minutes in the past, a warning appears and Start baking stays enabled; **Start now** sets the date and time to the current moment. The check re-runs every 30 seconds while the dialog is open. Details are in [Recipe view and relative days](./recipe-view-and-relative-days.md).

Starting from the schedule builder with a recipe that is not saved yet, or has unsaved edits, first asks to save it. The real date and time live only on the bake session.

### 10. Bake Mode

Purpose: one calm screen for what to do now, with timers that keep working when the phone is locked.

Layout, top to bottom:

- "Step N of M", and a collapsed **About this bake** (mix day, bake day, coach hint).
- Notices, only when relevant: the web-build banner, a schedule drift note ("The remaining schedule moved 20m later, based on your actual timing"), the native timer permission notice, and a test-timer note when a test override is set.
- **Previous** step card, then the **Current step** card: time range, step name (large), a coach button, "Starts in 2h 10m" for a future step, the step detail, an **Amounts** disclosure (see below), **Start timer** and an edit pen for steps whose timing can be adjusted, the timer (large, tabular digits, "Time's up" at zero, restart button), and "Next up: X at 17:15 (in 2h 10m)".
- **Full schedule**: every step with its time and, for future steps, "Starts in ...". The current row is filled, with padding all round and the same text position as every other row. Tapping another row outlines it and reveals **Jump to this step**.
- Footer: **Previous** and **Next step** (**Finish baking** on the last step). **Exit bake mode** keeps the session.

Behaviours:

- **Amounts** (`getStepAmounts` in `lib/companion/stepAmounts.ts`): the steps where you weigh ingredients have a small "Amounts" button with a chevron (`aria-expanded`) on the Current step card. It is collapsed on every step and opens on tap; nothing is remembered between steps. Other steps show no button. What each step lists:
  - **Refresh starter**: seed starter, flour, water, total (the 1:3:3 feeding).
  - **Build levain**: seed starter, flour, water, total, plus "Includes N% extra for scrape and transfer". Uses the same feeding ratio and buffer as the recipe view.
  - **Autolyse**: each flour of the blend by name, and the added water.
  - **Mix in levain / Mix in salt**: the levain or the salt. With no autolyse, the first mix step also lists the flour and water, because nothing earlier combines them.
  - If the recipe cannot be calculated, no amounts are shown. Because the grams now live in the disclosure, the step's one-line detail no longer repeats them in bake mode (the schedule screens still show them).
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

The sparkles button opens an AI baking coach for the current step (a Supabase edge function, so it needs Supabase configured). **It answers signed-in bakers only**: signed out, the sheet shows the step tips and a Sign in prompt.

- It opens with a static tip for the step, a one-line framing ("AI guidance based on your recipe and photo. When unsure, trust the dough."), and tap-to-fill quick questions per step.
- Up to 5 questions per bake and 25 per user per rolling 24 hours, both counted on the server; the remaining count is shown, and the last question is flagged. A question only counts once a reply succeeds.
- The conversation is saved in the bake session (`coachTranscript`, last 10 messages; photos are not stored, only a "Photo shared" note) and is there when the sheet is reopened.
- On failure the draft and photo stay in the box, friendly copy is shown with a Retry button for retryable failures, and no quota is spent. Raw errors only go to the developer console.
- The prompt includes live bake progress (step number, planned vs actual time, drift, steps already logged). The coach is told never to recommend adding or removing water, flour, salt, or starter, or to change the hydration or any amount; for sticky, wet, stiff or slack dough it explains what is normal for the step and suggests technique only. A photo can be attached; it is compressed before upload.

### 11. Bake Complete

Finishing the last step opens "Bake complete" with an optional loaf assessment (Great loaf, OK, Needs work) notes and an optional loaf photo (compressed on the device). **Save bake** saves it and only then clears the bake session. Closing the dialog (X, Escape, backdrop) keeps the bake so it shows as "Resume baking" on Home. **Don't save** asks for confirmation and is the only path that deletes an unsaved bake. See [Bake history](./bake-history.md).

### 11b. Saved

The full list of saved recipes, newest updated first. Each card shows the name, the mix day, the updated date, "Baked Nx · last: …" when there is history, **Start baking** (when the recipe has a schedule) and **Duplicate**. A search box (by name) appears only when there are more than eight recipes. While a signed-in baker's list loads it says "Loading your recipes…"; a load failure shows the message with **Try again**; with no recipes it explains how to save one and offers **New recipe**. The list data and the "baked Nx" stats come from the same hooks as Home, so both always agree.

### 12. History

A list of completed bakes (search by recipe name or notes and filter by assessment, shown from six bakes) with a detail view showing notes, the assessment, the recipe snapshot, the planned schedule, step timings with drift, **Bake again**, and Delete. History is local first, and signing in uploads it. See [Bake history](./bake-history.md).

## Navigation

- The wizard has a sticky header with progress and a sticky footer with Back and Continue, so both stay reachable. Footer buttons share one height and equal columns. When editing from the summary there are three: Save is the only primary button and sits on its own row above Back and Continue on narrow screens (one row from 480px); on 320px phones the arrow icons are dropped so labels stay on one line. The last wizard step's button reads "View summary". The app follows the system light or dark setting, respects reduced motion, and keeps tap targets at least 44px (see [UI/UX practices](./ui-ux-practices.md)).
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

- Choose the oven time instead of the mix time when starting a bake (working backward).
- "Tweak recipe from notes" after a bake.
- Streaming coach replies.
