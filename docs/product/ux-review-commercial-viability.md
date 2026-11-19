---
title: UX review for commercial viability
status: review
date: 2026-10-30
---

# UX review: what must improve before this is commercially viable

Scope: web build at 390x844 (Vite dev server, fresh storage and seeded recipe), code reading of the screens, a short look at the stale iOS Simulator build. Not exercised: signed-in flows (sign-in and account creation were deliberately not performed), history detail with real data, native AlarmKit timers, photo upload to the coach, true offline mode (the PWA service worker does not run in dev).

Convention: **Observed** = I saw it in the running app or read it in code. **Inferred** = reasoned from code or general knowledge, not seen running.

---

## 1. Honest verdict

This is a technically careful, honest, calm app with one real differentiator: it goes from a formula to a timed, backwards-planned schedule with real dates, and carries that into a step-by-step bake mode with native timers. The calculation engine and the assessment copy ("confirm readiness from dough signs, not the clock alone") are credible and better than most hobby tools. Visual language is warm and coherent: one palette, rounded cards, a sticky wizard chrome, a clear primary-button colour, a native `<dialog>` for modals, consistent pen/bin icons. The "relative days, real date at start" model is a smart idea.

But it is not yet a product a stranger would pay for or trust with a two-day bake. Three things stop it. First, the kitchen reality is not designed in: no screen wake lock, no glanceable timer, one-tap jumps that destroy a running timer, no preheat or cooling step, and silence on the web build. Second, data trust is broken at the exact moment of value: a signed-out baker who finishes a bake cannot save it, and every way of leaving that dialog (Back to home, X, Escape, backdrop) deletes the bake. Third, the first-run and beginner experience is a developer's tool: a sign-in modal before any value, a page titled "Sourdough recipe builder", 25 jargon fields (coil folds, 1:15:15 feedings) on one screen, and no onboarding that explains what the app does better than a spreadsheet. It currently looks like a very good prototype for an experienced baker who is also the author. That is a good place to be, but it is a prototype.

---

## 2. The 12 most important problems, ranked

### 1. A finished bake can be lost, and saving needs an account. BLOCKER. Effort M

- Observed: finishing a bake signed out and tapping Save bake shows "Sign in to save this bake to your history." (red text, no fix path in the dialog). Tapping Back to home then deleted the session: `sourdough:bake-session:v1` was null and nothing was in storage afterwards. In code (`useBakeFlow.ts`, `bakeFlow.ts`) `onClose` of `BakeCompleteDialog` maps to `exitCompanion({finished:true})`, which clears the session. The X, Escape (native dialog `cancel`) and backdrop click all use the same `onClose`. `useBakeSession.saveCompletedBake` returns early when `!user`.
- Observed: History tab signed out is an empty card with only "Sign in to save and view your bake history." CLAUDE.md says the app "works fully local without it". History is the exception.
- Why it matters: the whole retention story (learn from each loaf) is behind an account wall, and the escape hatch silently destroys a 30-hour record.
- Fix: save history locally first (same shape as the remote row, `localStorage` or IndexedDB), sync when signed in. Make the dialog's non-save exits ask "Discard this bake?" or save as unrated by default. Rename "Back to home" to "Skip, don't save" if it truly discards. Never delete the session until a save succeeded or the user explicitly discarded.

### 2. Bake mode is not designed for a kitchen. BLOCKER. Effort M

- Observed: no wake lock anywhere (grep for `wakeLock`, `IdleTimer`, `keepAwake` in `src` and `ios/App/App` returned nothing; no keep-awake Capacitor plugin in `package.json`). The phone will auto-lock mid-fold.
- Observed type sizes in `styles.css`: step title 1.35rem, timer 1.75rem, "Current step" label about 0.8rem, "Step 18 of 18" small orange text. The timer is a card in the middle of a scrolling page, below a three-line hero paragraph and a Previous card. Nothing is readable at arm's length with floury hands.
- Observed: the Previous card is at 55% opacity with `#9a8776` text (about 3:1 contrast on cream, lower after opacity), and bake-mode footer buttons are fine (about 47px) but the Full schedule rows are 58px tall tap targets in a list directly under the primary content.
- Fix: a bake-mode screen with: wake lock on while in bake mode (Capacitor KeepAwake, or `navigator.wakeLock` on web), a hero timer at 48-64px, step name at 28px+, a "Next up: X at 17:15 (in 2h 10m)" line, and everything else (full schedule, notes) collapsed below. Dim the previous-step card less and move it out of the way. Add a lock-screen widget or Live Activity check (Info.plist has `NSSupportsLiveActivities`; verify the timer shows there).

### 3. One-tap destructive navigation in bake mode, with no undo. MAJOR. Effort S-M

- Observed: with a 6h timer running on step 1, a single tap on row 4 of "Full schedule" jumped to step 4, silently logged steps 1-3 as skipped, and discarded the running timer. No confirmation, no undo. Two taps (last row, then Finish baking) reach the "Bake complete" dialog with 17 steps skipped. Pressing Previous afterwards moved back one step but the step log still contained the step as completed (I read `stepLogs` after Previous: autolyse was logged while being the current step), so history data would be wrong. (Observed in `localStorage`; the effect on the saved record is inferred.)
- Fix: jumping forward more than one step needs a confirm ("Skip 3 steps? Your running timer will stop."), or make the schedule list read-only and add an explicit "Jump to" action. Add a transient "Undo" toast after Next step, Jump and Finish. Make Previous truly reverse the log entry.

### 4. First run: a sign-in modal before any value, and no explanation of the promise. MAJOR. Effort S

- Observed: on a fresh profile the first thing on screen is a "Sync your recipes" modal over the Home page with "Sign in" and "Create account"; the close X is small and appears again after clearing storage. It reappeared on `/history` after I finished a bake (opened by the failed save). The dismissed flag persists, good, but a first-time user sees a sync prompt before they know what there is to sync.
- Observed: Home title is "Sourdough recipe builder" and the intro says "Build a recipe, review ingredients, plan your bake schedule, and save loaves..." That describes features, not the benefit. The primary create action, "New recipe from scratch", is a secondary-style outline button inside a card, below an empty Saved recipes card. A new user's best path (a template) is two scrolls down.
- Fix: no modal on launch; offer sync after the first saved recipe or first finished bake ("Keep your bakes safe"). First-run Home: one hero line ("Plan your sourdough bake, hour by hour, and get alerts when to act"), one primary button "Plan a bake" with a three-template carousel above the fold, saved recipes below once they exist. Rename the app header; "recipe builder" undersells the timer and bake mode.

### 5. The schedule has real baking gaps and a night-time plan with no warning. MAJOR. Effort M

- Observed in the timeline (builder, recipe view, bake mode): there is no oven preheat step and no cooling step. The sequence goes Cold retard ends 08:00, then "Bake with lid on 08:00-08:19". A Dutch-oven bake needs the oven and pot at temperature 45-60 minutes earlier. "Oven on" in the start dialog is the time of the first bake step, so it actively mislabels the preheat. No "cool before slicing" step although the finish dialog says "ready to cool".
- Observed: 14:20 to 17:15 on bake day -1 has no step at all (the bulk wait). In bake mode that is a 3 hour hole between "Coil fold 3" and "Pre-shape"; the app does not say "bulk: check the dough at 16:30" and has no "waiting" state or between-steps countdown.
- Observed: seed recipe puts "Refresh starter" at 23:45 on bake day -2 and "Build levain" at 05:45. Nothing flags that the plan requires waking at 05:45. The default "start baking" date is tomorrow, with the first task tonight at 23:45.
- Fix: add Preheat oven (configurable lead time, with pot) as a timed step before bake, add Cool, add explicit Wait steps ("Bulk fermentation, check dough at 16:30"), and show a "sleep-friendliness" hint (steps between 23:00 and 06:00 highlighted with a one-tap "shift schedule" suggestion). Extend `buildTimeline` and bump `CURRENT_BAKE_SESSION_TIMELINE_VERSION` with a migration per CLAUDE.md.

### 6. No input sanity: nonsense recipes pass silently. MAJOR. Effort S

- Observed: dough weight 50g is accepted without any warning. The summary then happily showed Salt 1g, Levain 5g, "Estimated baked loaf ~50g" and an assessment calling it a high-hydration loaf. In `validation.ts` the only dough weight rule is `> 0`.
- Observed: clearing the weight field and pressing Continue silently kept the previous value (50g) with no message. Typing 150 into hydration silently clamped to 110. In both cases no inline message explained what happened. (My intended "78" ended up as 110 after a triple-click-and-type; I could not prove whether that was my input method or an app bug, so treat that as unverified.)
- Observed: the Start baking dialog accepts a mix date 10 days in the past with no warning (Start baking stays enabled).
- Fix: sensible bounds with a message ("Under about 300g, timings and levain amounts stop being reliable"), blur-time validation with visible text, keep the user's text until they fix it, and warn on past start times with a "Start now" shortcut (listed as not covered in `recipe-view-and-relative-days.md`).

### 7. The schedule builder is a 6,300px expert form with no beginner path. MAJOR. Effort L

- Observed: `/build/schedule` is one page (6,338px tall at 390px width, about 7.5 screens) with roughly 25 inputs and 20 info toggles: Slap and folds, Stretch and fold sets, Coil fold sets, Pre-shape before bulk ends, Rest after mixing in levain, Lid on/off, and "feeding 1:15:15". It breaks the wizard pattern used for the recipe (four tidy steps, "N of 4" progress) and drops the user into a flat settings page. The timeline itself is at the very bottom.
- The audience in docs is "friendly expert language, not beginner simplification". That excludes the largest market: people who baked two loaves and want a plan.
- Fix: three presets at the top ("Simple overnight", "Same-day", "Weekend deep ferment") each producing a full schedule, with "Customise" opening sections one at a time. Show the resulting timeline first and edit by tapping a step. Put one-line plain explanations under jargon ("Coil fold: a gentle fold done in the bowl").

### 8. Timers: reliability is unproven and the web build is silent. MAJOR. Effort M

- Observed: the timer stores an absolute `activeTimerEndsAt` and survives a page reload (5:59:46 after reload), good. On web, `webNativeBakeTimer` is a no-op: "Web/PWA relies on the in-app countdown only". The installable PWA therefore shows Start timer with no warning that it will not ring when the phone is locked.
- Observed: starting a timer is allowed 15 hours before the step is due. Starting "Refresh starter" at 09:02 rewrote the displayed step to "Fri 30 Oct 09:02 - 15:02", while the Full schedule showed "09:02 Refresh starter", then "05:45 Build levain", then "09:00 Autolyse": times out of order. The drift banner did not appear. (Observed; cause inferred: only the current step is re-based.)
- Not verified: AlarmKit behaviour on a locked device, after reboot, with Focus modes, and the permission-denied path. These need a physical device test plan.
- Fix: show "Starts in 14h 43m" on future steps and ask before starting early ("This step is planned for 23:45. Start now and shift the plan by -14h?"); show a persistent non-dismissable banner on web ("This web version can't alert you with the screen off. Use the iOS app or keep this screen open."); document and test the lock-screen path on a real device.

### 9. The AI coach is a single-shot chat with no safety rails or memory. MAJOR. Effort M

- Observed: the coach sheet opens with a static, step-specific tip, then a free text field. Asking "My dough is sticky, is that normal?" at the Autolyse step returned a reply that suggested "you might need to add a little more water", which contradicts the app's own hydration plan and is risky advice at that stage. No disclaimer that this is AI, no suggested questions, no streaming (only "Coach is thinking..."), and each answer spends one of 5 quota slots that are counted client-side in the session (`coachQuestionsAsked`).
- Observed: closing the sheet and reopening it lost the whole conversation including the reply I had paid a quota slot for (231 characters, the sticky question gone). Code shows `setDraft('')` and photo clearing before the request, so a failed call also loses the question and the photo; errors are shown as "Coach is temporarily unavailable. (<raw error>)".
- Fix: persist the transcript in the bake session; keep draft and photo until success; add quick-chip questions per step ("Is my dough ready?", "It's too wet"); add a one-line expectation ("AI guidance, based on your recipe and photo. When unsure, trust the dough."); give the coach the live context (actual vs planned time, ambient temperature if known, what has been logged); show friendly error copy and a Retry button; explain the 5-question limit before it bites.

### 10. Accessibility and touch targets fall short of the app's own rules. MAJOR. Effort M

- Observed (measured in the page): number-field steppers are 43x20px each (the practices doc says about 44px), info toggles are 36x36, the summary edit pens and the "Save recipe" link are 24-26px tall, and the Summary edit cards have 24px tap areas. The wizard footer is two icon-only circles (chevrons) rather than "Back" and "Continue", with `aria-label`s but no visible labels.
- Observed: contrast. `--color-text-subtle` (#9a8776) is 3.07:1 on the page background and 3.3:1 on cards (fails 4.5:1); `--color-accent` (#c8884d) is 2.64:1; the Previous card in bake mode uses subtle text at 55% opacity. Primary button white on #a15b2a is 5.19:1 (fine).
- Observed: no `prefers-reduced-motion` and no dark mode in the CSS (searched `styles.css`). Fonts use `rem` and no `-apple-system-body`, so Dynamic Type from iOS settings probably is not honoured in the WKWebView (inferred; not tested with a large text size).
- Observed good: native `<dialog>` with `aria-modal`, labelled dialogs, `inputMode="decimal"` on numeric fields, 14 `:focus-visible` rules, safe-area insets used in sticky chrome.
- Fix: raise stepper and info targets to 44px using padding (visual size can stay), make Back/Continue labelled pill buttons, darken subtle and accent text colours, add a reduced-motion block, test a VoiceOver pass through wizard and bake mode, set a dark theme for kitchens used at night.

### 11. Retention loop is a log, not a learning loop. MINOR to MAJOR (product). Effort M-L

- Observed (code, signed-in screen not run): history detail shows notes, a 3-level assessment (Great loaf / OK / Needs work), the recipe snapshot, planned schedule and step timings with start drift. There is no "Bake this again" action, no way to apply "next time" notes to the recipe, no loaf photo, no structured feedback (crumb, crust, oven spring, proof), no comparison between bakes. Saved recipes show only "Mix on bake day -1 · Updated 20 Oct": no number of bakes, last bake rating, or hydration.
- Fix: after "Save bake", offer "Tweak recipe for next time" prefilled from the notes; add a photo (the camera path already exists for the coach); show "Baked 3x, last: OK" on the card; offer "Baked this before? Last time you noted: ...". This is where a baker feels the app learning them.

### 12. Polish and trust details a paying user notices. MINOR. Effort S-M

- Observed: Home header "Sourdough recipe builder" is a hidden dev-panel unlock target (`dev-panel-unlock-target` button) wrapping the app's h1.
- Observed: test-mode strings can show in bake mode (`VITE_BAKE_TIMER_TEST_MINUTES` copy in `CompanionView.tsx`); guarded in `build:ios` but a user-visible string that mentions `.env.local` should never be in production code.
- Observed: the simulator build I opened is stale relative to the repo (it still says "Bake on 18 Aug" and "Open a saved recipe or duplicate it as a starting point"), so rebuild before any device test.
- Observed: flour step title is derived data ("100% Wheat Type 1050") instead of a question like the first step; "Timing and starter strength" is a different tone again; empty vertical space on the dough-size and hydration steps (about half the screen) while the preview/explanations the docs promise ("hydration interpretation") live elsewhere.
- Observed: the recipe view's Ingredients list ("Added flour 448g, Added water 349g") never names the flour type or gives totals, and the bake-day instruction text is jargon-heavy (1:3:3 refresh, 1:8:8 build) with no explanation.
- Observed: Delete recipe is one bin tap away from Duplicate on each card (there is a `ConfirmDialog`, which is good, but the buttons are adjacent at 44px).
- Fix: strip dev affordances from production; unify step titles to sentence-case questions; add the flour name to ingredients and a total-flour/total-water line; spacing pass for the sparse wizard steps.

---

## 3. Quick wins (about a day each or less)

1. Stop auto-opening the sync modal on first launch; show it after first saved recipe or first finished bake.
2. Change the "Bake complete" dialog: never delete on X/Escape/backdrop; make "Back to home" read "Don't save" with a confirm; keep the session until saved or explicitly discarded.
3. Add wake lock in bake mode (Capacitor keep-awake or `navigator.wakeLock`).
4. Confirm before jumping more than one step in Full schedule; add an Undo toast for Next step.
5. Show "Starts in Xh Ym" on future bake steps; ask before starting a timer more than 30 minutes early.
6. Enlarge the current-step title and the timer (timer 56px), demote the hero paragraph into a collapsed "About this bake".
7. Add 44px touch targets for steppers, info toggles and the summary edit links; replace the wizard footer chevrons with "Back" and "Continue" text buttons.
8. Raise `--color-text-subtle` and `--color-accent` to at least 4.5:1; remove the 55% opacity from the Previous card.
9. Persist the coach transcript for the bake and keep the draft on failure; add three quick-question chips.
10. Add a web-build banner: "No alerts with the screen off in the web version."
11. Warn on past start dates in the bake-start dialog and add a "Start now" button.
12. Add dough-weight bounds (for example 300g to 3kg) with a visible message.
13. Replace the Home title with benefit copy and make the primary action a filled button.
14. Add an oven preheat step and a cooling step to the timeline.

---

## 4. What a professional-grade version of each major screen looks like

- **Home:** One hero line, one filled primary button ("Plan a bake"), and either "Continue your bake" (when a session exists, always first and impossible to miss) or three template tiles above the fold. Saved recipes are cards showing name, weight/hydration, "baked 3x, last: Great", with Start baking as the only primary action and Duplicate/Delete moved into a overflow menu. No modal on launch.
- **Recipe wizard:** Same four steps, but each step shows a live "what this means" strip: for hydration, a plain-language descriptor for the chosen flour; for weight, the loaf size in common terms. Footer is labelled "Back / Continue". Inline validation text, never silent clamping, with sanity bounds. Template name is visible so users know what they started from.
- **Summary:** An ingredient list that reads like a recipe (named flours, levain build, totals), a single "Plan the bake" primary action, and the assessment condensed into two or three sentences with details behind a disclosure.
- **Schedule builder:** Presets first ("Overnight", "Same day"), the resulting timeline on top, and tap-a-step-to-edit. Advanced parameters are grouped in collapsed sections. Warnings for night-time steps with a one-tap shift. Start baking on a sticky footer.
- **Start baking dialog:** "When do you want to bake?" with both modes (mix at / oven at), a "Start now" option, a visible past-time warning, and a preview that lists the first task, preheat time and bake time.
- **Bake mode:** Screen stays awake. Top area: a huge countdown to the next action, step name, and one line of instruction. A "Next up" strip. Optional "Wait" states between active steps with a gentle idle view. One large Done button; no accidental jumps; undo toast. Schedule list is read-only until an explicit "Jump" action. Dark/night mode. Lock-screen Live Activity mirrors the same countdown. Coach is a bottom sheet with quick chips, memory and honest framing.
- **Bake complete:** Photo, a short structured assessment (crumb, crust, proof), notes, one primary action Save; saved locally always; "Tweak recipe for next time" as the follow-up.
- **History:** Local-first list with photos, ratings and trends; detail view shows planned vs actual timings and a "Bake again with these tweaks" button.

---

## 5. Things NOT worth building yet

- Subscription/paywall flows, referral loops or monetisation dialogs (explicitly out of scope).
- A bigger AI coach (voice, long conversations, image analysis of crumb) before the base bake-mode glanceability and data trust issues are fixed.
- Social features, recipe sharing, public profiles.
- An Android build or a native rewrite; fix the web-view feel first.
- Many more templates or flour profiles; six templates are enough while the schedule experience is rough.
- Deep analytics dashboards on history; need a local history and a handful of bakes first.
- Starter-feeding management as a separate feature (the starter prep inside the schedule is enough for now).
- Fancy animation; the product needs reduced motion more than motion.

---

## 6. Benchmarks against existing bread and baking apps (unverified, from general knowledge)

I could not check these products during this review. Treat as recollection, not research.

- **Dedicated sourdough/bread apps (for example BreadBuddy-style apps, Sourdough Companion-type apps, Loaf-type apps):** typically offer recipe/ratio calculators, a feeding or fermentation timer, and a bake log with photos. They usually do not generate a backwards-planned, step-by-step schedule with native alarms as this app does; that is your edge. They usually do have photo logs and starter reminders, which this app lacks.
- **Recipe and kitchen apps (Paprika, Mela, Tasty-type, NYT Cooking):** polished recipe views, cook-along modes with big text and screen-awake; this is the bar for bake mode glanceability. Paprika and similar offer local-first storage with optional sync, which is the right model for this app's history.
- **Timer/clock apps (iOS Clock, Apple Timer widgets):** the benchmark for lock-screen reliability.
- **Habit/journal apps:** simple photo and rating logs that make it easy to see progress over time.
- **Typical onboarding standard:** value first, account later; no modal before the first action.

---

## 7. Open questions for the owner

1. Who is the first paying user: the experienced weekend baker (like the author) or the beginner who has baked fewer than five loaves? The answer decides how much of the schedule builder must be simplified (problem 7).
2. Is the web/PWA build a product or only a dev surface? If it is a product it needs a different alert story (problem 8); if it is a dev surface, say so in the UI.
3. Should history work without an account? The doc says the app works fully local; history currently contradicts it (problem 1). What is the intended reason for the account requirement: sync, cost, or abuse limits on the coach?
4. Should the plan adapt to when the user actually starts (shift the whole schedule), or is the manual drift system the intended model? Today the display after starting a timer early is inconsistent (problem 8).
5. Is the coach meant to give corrective baking advice or only explain steps? That decides how it is framed and how it is tested against the formula.
6. Should you support working backward from oven time ("I want bread at 6pm Sunday")? The docs list it as not covered and it is probably how most people think.
7. What is the minimum device test matrix for AlarmKit timers (locked, silent, Focus, low power, after reboot)? Without it the central promise is unproven.
8. Are you willing to drop the "no beginner simplification" principle in `phase-1-ux.md` for the first-run path?
