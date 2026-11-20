---
title: UI review on the iOS Simulator, what the browser review could not see
status: review
date: 2026-11-20
---

# UI review on the iOS Simulator

Scope: the real native app (Capacitor shell, WKWebView, `ios/App/App/public` as just built by `npm run build:ios`) in the iOS Simulator, to find what the [browser review](./ui-review.md) (390 / 768 / 1100 px) could not see. This is a review only. Nothing in the repo was changed except this file.

Convention (same as the other reviews): **Observed** = I saw it in the running simulator, took a screenshot, or measured pixels in a screenshot. **Inferred** = reasoned from code, config or general iOS knowledge, not seen. Effort: S = under a day, M = 1 to 3 days, L = a week or more (my estimate).

## What was tested, and on what

| Item | Detail |
| --- | --- |
| Main device | iPhone 17 (402 x 874 pt, Dynamic Island), iOS 26.5 simulator, Debug build of scheme `App`, light and dark |
| Other devices | iPhone 17e (390 x 844 pt, notch), iPhone 17 Pro Max (440 x 956 pt), iPad Pro 11-inch (M5). Home screen only, driven with `simctl` screenshots because the simulator panel could not be attached to them |
| Why not iPhone 17 Pro / iOS 27 | Those simulators exist but their iOS 27 runtime is not installed ("runtime profile not found"). The iPhone 17 is the same screen size and island as the 17 Pro. iOS 27 behaviour is therefore not covered |
| No iPhone SE | None installed. The 17e (390 pt wide) is the narrowest device I could check |
| Settings I changed | Appearance (light/dark), content size, increase contrast. All reset to light / large / disabled on all three simulators; every simulator shut down |
| Not available in the simulator tool | Safari Web Inspector, so no DOM measuring. Measurements below come from pixel positions in screenshots (3 px = 1 pt) |

Screenshots are described, not stored.

---

## 1. Verdict on the Dynamic Island / top area (the priority)

**The top safe-area fix works on a real iOS web view, in light and dark, on every screen that has a sticky header. It does not cover Home, Saved and History.**

Observed on iPhone 17:

- The black band is gone. The island's bottom edge is at about 51 pt, and the first content (the Sign in pill on Home, the progress bar in the wizard, the page title on Summary, Schedule and bake mode) starts at about 66 to 72 pt. That is a gap of roughly 15 pt under the island. This matches the formula `max(24px, env(safe-area-inset-top) + 4px)` in the "Top safe area" block of `src/styles.css` (inset is about 62 pt on this phone). On the iPhone 17e (notch, inset about 47 pt) the title starts at about 52 pt: also tight, no dead band.
- Status bar legibility is fine in both themes. iOS flips the clock and battery automatically (white on `#1a1511` in dark, black on `#f8f1e8` in light), because `UIViewControllerBasedStatusBarAppearance` is true and the web view follows the system theme. No contrast problem at the island itself.
- The opaque band behind the status bar works on pages with a sticky header. Scrolling Summary, Schedule builder and bake mode under the header never showed content beside the clock or island, in light or dark.

What the fix does **not** do (Observed, light and dark):

1. Home, Saved and History have no sticky header, so there is no band. Scrolling Home moves card edges and text ("Updated 20 Nov", a template card top) straight through the area beside the island and behind the clock. See problem 1.
2. When the keyboard opens, iOS scrolls the page and titles slide under the clock (see problem 2).
3. The soft header fade has a visible cut line about 130 pt from the top: scrolled text is sliced by a blurred edge and leaves a faint ghost smear under the header (Observed on Summary and bake mode, dark and light, most visible in dark). Not a bug, but it reads as a rendering artefact. See problem 9.

Other top-area checks:

- Launch: in dark mode the sequence is black for about 0.6 s, then the app's own warm `#1a1511`. No white frame in four dark launches. In light mode one of two iPhone launches showed a single pure white (`#ffffff`) frame between black and the cream app, and the iPad showed about 1 s of white. See problem 6.
- Overscroll and bounce colours: could not be captured (the bounce is too short for a screenshot). From code, `html, body { background: var(--color-bg) }` is set, so the area revealed by a bounce should be the page colour in both themes (Inferred).
- Home indicator area: the bottom nav and the sticky Back / Continue footer both sit above the indicator with about 34 pt of bottom inset. On the Home tabs the nav is about 114 pt tall including the inset (a third of a small phone). Nothing is clipped.

---

## 2. Problems, ranked

### 1. Home, Saved and History scroll content through the status bar. MAJOR. Effort S

- Observed: scrolled Home in dark and light on iPhone 17: the previous card ("Updated 20 Nov") and the card edges run beside and behind the clock and the island.
- Cause: the opaque band is part of `--app-chrome-header-bg`, applied only to `.wizard-shell__header`, `.screen-chrome`, `.app-header`. The tab screens use `.app-shell` with no sticky header, so nothing paints the area above `env(safe-area-inset-top)`.
- Fix: one fixed, non-interactive strip at the top of the shell (`position: fixed; top: 0; left: 0; right: 0; height: env(safe-area-inset-top); background: var(--color-bg); z-index` above content, `pointer-events: none`), in the "Top safe area" block. This also covers the keyboard case in problem 2.

### 2. Keyboard shifts the page and leaves it shifted. MAJOR. Effort S to M

- Observed (wizard, dark): tapping the dough weight field scrolled the whole page up by about 126 pt; the card title slid beneath the clock and island. After the keyboard was dismissed the page stayed scrolled; two taps on Continue moved to steps 2 and 3, which also stayed scrolled so the step heading was hidden under the sticky header until I swiped down. The same happened after saving from the Save recipe dialog (Summary stayed scrolled by about 85 pt).
- Observed (History): tapping Search moved the page up about 87 pt even though the field was already well above the keyboard; the title "Bake history" ended up on top of the clock.
- Cause (Inferred): iOS pans the web view when a field is focused. The app calls `window.scrollTo(0, 0)` on step changes (`useRecipeWizard.ts`, `useAppLocation.ts`), but that resets the page scroll, not the native pan, so it has no effect. There is no keyboard handling in the repo (no `@capacitor/keyboard`, no `visualViewport` code).
- Fix options (decide with the owner): (a) on field blur or `visualViewport` resize, call `window.scrollTo(0, 0)` after a short delay (S, no dependency, may be imperfect); (b) add the `@capacitor/keyboard` plugin and set `resize` to `none` or `native` (M, a new dependency, so it needs the dependency discussion in CLAUDE.md); (c) make the shell a single fixed-height scroll container so the document itself never pans (L, touches every screen). Recommend (a) first and re-test on a device.
- The keyboard did not cover any dialog button: with the Save recipe dialog open the keyboard pushed the dialog up and Cancel, Save and the field were all visible. No problem there.

### 3. Landscape is allowed, and the layout has no left or right safe-area insets. MAJOR. Effort S (lock) or M (support)

- Observed: `Info.plist` lists portrait and both landscapes for iPhone, and all four orientations for iPad. In landscape on the iPhone 17, content starts 20 pt from the left edge, which is where the island sits (`grep` finds 21 uses of `env(safe-area-inset-*)`, all top and bottom; none left or right). In the tool's rendering the island overlaps the first card and the New recipe pill.
- Observed: the wizard in landscape: the sticky header (about 130 pt of 402 pt) plus the sticky footer plus margins leave about a third of the screen for the step. On step 1 only the field labels are visible; the steppers are cut by the footer until you scroll. The Home bottom nav takes about a quarter of the height.
- Fix: the cheap and honest option for a kitchen app is to remove the two landscape entries from `UISupportedInterfaceOrientations` (iPhone) in `Info.plist` and keep iPad as is, or to add `padding-inline: max(var(--app-shell-pad-inline), env(safe-area-inset-left/right))` and a compact header and footer for `(orientation: landscape) and (max-height: 500px)`. This is a product decision, not a bug; the app was clearly designed portrait-first.

### 4. Dynamic Type, increase contrast and bold text are ignored. MAJOR (accessibility). Effort L

- Observed: setting the content size to accessibility-extra-extra-extra-large changed nothing in the web view (Home was pixel-identical to the default size), only iOS system UI would scale. Increase contrast on: no visible change. No `prefers-contrast` rule exists (`grep`). Bold text and reduce motion were not driven (see section 6).
- Cause: sizes are `rem` against the root font size, which iOS does not scale. Matches the earlier review's "Dynamic Type" inference, now confirmed.
- Fix: this depends on the type scale in the [UI review](./ui-review.md) section 6.1. The usual approach for web views is `font: -apple-system-body` on the root plus `rem` sizes. Do it only after the scale exists, and check wizard footers and the bake timer at large sizes.

### 5. The "Timer alerts are off" notice appears before the user has been asked. MAJOR (trust). Effort S

- Observed: right after starting a bake (before any permission request), bake mode showed "Timer alerts are off. The in-app countdown still runs, but you will not get a lock-screen alert..." with an Open Settings button. Tapping Start timer then raised two system prompts back to back: "Allow Sourdough to schedule alarms and timers?" (AlarmKit, with the Info.plist text) and "Sourdough Would Like to Send You Notifications". After Allow on both, the notice disappeared and a green Timer panel (11:59:59 for a 12 h step) ran.
- Cause (Inferred, from `permissionNotice.ts`): the notice is shown when `status === 'denied' || alertMode === 'none'`, and the default state for "never asked" has `alertMode: 'none'`, so a first-time user is told alerts are off and sent to Settings, where there is nothing to turn on yet.
- Fix: treat `notDetermined` as "no notice" (or a neutral line: "Allow alerts when you start the first timer"). Add a unit test in `permissionNotice.test.ts`. Also consider explaining the two prompts before the first Start timer.
- Good: the web banner ("Web preview only...") is correctly absent natively. AlarmKit permission text is clear. The notification fallback copy could not be exercised (iOS 26.5 uses AlarmKit).

### 6. Launch: one white frame in light mode, black frames in dark. MINOR. Effort S to M

- Observed: iPhone 17, light, two launches: black, then (run 1) pure white, then the cream app; (run 2) black, grey, cream splash, then the app. iPad light: about 1 s of white before the app. Dark: black, black, then the warm app (no white).
- Cause (Inferred): `LaunchScreen.storyboard` has a white `systemBackgroundColor` and the splash image (a tiny bread icon on a 2732 px square, so effectively an empty cream or near-black screen); `capacitor.config.json` has no `backgroundColor`, so the WKWebView paints white until the page's first frame. The dark splash variant never appeared in my captures.
- Fix: set `backgroundColor` in `capacitor.config.ts` (`ios.backgroundColor`), or paint the web view's background natively from `AppViewController` with colours that match `#f8f1e8` and `#1a1511`. S to M, then `npm run build:ios`.

### 7. Native date and time pickers: system blue, plain-text look. MINOR. Effort S

- Observed: in the Start baking dialog "Mix date" and "Start time" render as plain bold text fields ("21. Nov 2026", "09:00", day first and 24 h from the simulator locale) with no calendar or clock icon. Tapping opens the iOS calendar popover with a **blue** selected day, blue check and blue month chevron, the only blue on an otherwise brown screen. Monday-first week.
- Cause: `accent-color` is set only for checkboxes (`styles.css` line 3326). Date and time inputs inherit the system tint.
- Fix: `input[type='date'], input[type='time'] { accent-color: var(--color-primary); }` (Inferred: WebKit's picker honours it; verify) and a small trailing chevron or icon so they read as pickers.

### 8. Selects look like text inputs on iOS too. MINOR. Effort S

- Observed: the History "All bakes" filter has no chevron in WKWebView either. Confirms problem 7 of the browser review. The `.field-card` boxes also nest as described there.

### 9. Header fade edge. MINOR. Effort S

- Observed: see section 1. A hard-ish cut about 130 pt from the top with blurred ghost text. Cause: the gradient (`--app-chrome-header-bg`) is opaque to 68% of the header and fades over the last 20 pt, plus a `backdrop-filter`. Lengthen the fade (for example 60% to 100%) or drop the blur. Check on a physical device.

### 10. Long-press selects text and opens the iOS callout. MINOR. Effort S

- Observed: a 1.2 s press on a "Full schedule" row in bake mode selected the word "oven", showed selection handles and the Copy / Look Up / Translate menu, and highlighted the row. No `-webkit-touch-callout`, `user-select` or `-webkit-tap-highlight-color` rule exists (`grep` finds none), the same gap the browser review listed.
- Fix: `user-select: none; -webkit-touch-callout: none` on buttons, nav, rows and chips (not on recipe text); `-webkit-tap-highlight-color: transparent` plus a real `:active` state. A tap-highlight flash could not be seen with the simulator's pointer (Inferred).

### 11. Text inputs have autocorrect and auto-capitalise on. MINOR. Effort S

- Observed: History Search opened with the shift key active ("Q W E...") and QuickType suggestions ("I", "The", "I'm"). The recipe name field showed "moderate / moderately / moderated" suggestions. `grep` finds no `autoCapitalize`, `autoCorrect`, `spellCheck` or `enterKeyHint` in `src` (only `inputMode`).
- Fix: Search `autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="search"`; recipe name `autoCapitalize="sentences"` is fine, add `enterKeyHint="done"`.
- No zoom on focus was seen on any field (all inputs are 16 px, `styles.css` line 3302), so that earlier worry is closed. Number fields use `inputMode="decimal"`: the keypad has a comma key (simulator locale) and the system "previous, next, done" bar above it; focusing selects the whole value, which is good for stepper fields.

### 12. Bake mode details. MINOR. Effort S

- Observed: a blank band of about 60 pt between "Step 1 of 13" and "About this bake" (the browser review's "blank band"). The sticky Previous / Next footer covers the bottom edge of the "Next up" card (design, but the card's border runs behind the buttons). In landscape this chrome is heavier (problem 3).
- Observed copy: "Start now and shift the plan by -8h 25m?" and "Remaining schedule shifted by -8h 25m" (signed durations read as an error); the current step shows "Fri 20 Nov 13:19 - 01:19", an end time past midnight with no date.
- Observed: the "Full schedule" highlight works: the current row has the tinted fill and brown text, inner padding is even. The "Amounts" disclosure was not opened in this pass (it was already seen in the browser review).

### 13. Two kinds of modal close. MINOR. Effort S

- Observed: right after "Exit bake mode" a "Sync your recipes" dialog appeared on Home with a bare small x (no circle), while Save recipe and Start baking use a circular x. Sheets and dialogs are centred cards everywhere (no grabber, no slide), as the browser review said.

### 14. Left-edge swipe does nothing. MINOR (decision). Effort M

- Observed: swiping from the left edge on Home and inside the wizard did not navigate. Only the in-page back buttons work. Expected for a Capacitor app without WKWebView back-forward gestures or router support; whether it matters is a product call (browser review question 8).

---

## 3. Device sizes

| Device | Observed |
| --- | --- |
| iPhone 17 (402 pt) | All the screenshots above. Layout is the intended one |
| iPhone 17e (390 pt, notch) | Home: the title wraps to two lines ("Plan your sourdough / bake") beside the Sign in pill; nothing clipped; the nav fits. Top gap under the notch is tight and correct. Wizard, summary and bake mode not driven (no panel access) |
| iPhone 17 Pro Max (440 pt) | Home: one line title, no problems. Not driven further |
| iPad Pro 11 (834 pt) | The app runs full-screen (not letterboxed). Home shows a 2-column template grid, a left-aligned New recipe pill, and a bottom nav stretched across the whole width. `.app-shell` is capped at 960 px so there is no side letterbox at this size. About 1 s of white at launch (problem 6). Nothing broken, but it looks like a stretched phone layout, as the browser review's question 2 predicted |
| Landscape | Allowed by `Info.plist`; see problem 3 |

---

## 4. What the earlier browser review got right and wrong

Right (confirmed on iOS):

- No `-webkit-touch-callout`, `user-select` or tap-highlight rules: long-press selection and callout confirmed.
- Selects have no chevron: confirmed on iOS.
- Dialogs are centred cards, no motion, no grabber: confirmed.
- 16 px inputs prevent focus zoom: confirmed, none seen.
- Native date and time pickers are the right call: confirmed, but they inherit the system blue.
- Dynamic Type not followed: confirmed (it was an inference).
- Top inset block "good, keep": confirmed for sticky-header screens.
- Bake mode "best screen", dark mode "good": confirmed.

Wrong or incomplete:

- "Safe areas: Good, keep" (section 5, table) was too generous: there is no band on Home, Saved, History, and no left or right insets at all.
- It listed the sticky header fade as "test on device"; it does show a cut line on iOS.
- It did not see the keyboard-induced page shift and leftover scroll, the false "Timer alerts are off" notice, the double permission prompts, the white launch frame, the landscape problems, or the system-blue pickers. None of these can appear in a desktop browser.
- It assumed `:hover` might stick after a tap on iOS; I could not test that with the simulator pointer (still Inferred).

---

## 5. Quick fixes and larger work

Quick (each under a day, none changes a design decision):

1. Fixed status-bar strip for all screens (problem 1).
2. `notDetermined` must not show "Timer alerts are off" (problem 5), with a unit test.
3. `accent-color` on date and time inputs (problem 7).
4. `autoCapitalize`, `autoCorrect`, `enterKeyHint` on the search and name fields (problem 11).
5. `user-select`, `-webkit-touch-callout`, tap highlight, `:active` (problem 10).
6. Match the web view and launch background to the theme (problem 6).
7. Header fade length (problem 9) and the signed-duration copy (problem 12).

Larger or needs a decision:

- Keyboard behaviour (problem 2): start with the blur and `visualViewport` reset, escalate only if a device shows it is not enough.
- Landscape: lock iPhone to portrait now, or invest in side insets and a compact chrome (problem 3).
- Dynamic Type and high-contrast support after the type scale (problem 4).
- Sheets with a grabber, a tablet layout, edge-swipe back (problems 13 and 14, iPad row).

---

## 6. What I could not verify, and what remains for a physical-device pass

Not possible or not done in the simulator:

- AlarmKit alarms actually ringing, the Lock Screen countdown, Live Activities and the widget extension, notification delivery when the app is backgrounded, and the pre-iOS 26 notification fallback copy.
- Haptics, the camera (the photo picker and "Take photo" need a real device; I did not open the Photos picker), real device performance and thermal behaviour.
- VoiceOver, Voice Control, Switch Control, Full Keyboard Access: no way to drive or read them here. Accessibility Inspector was not available. Labels on icon buttons are therefore still unchecked.
- Bold text and Reduce Motion: not exposed by `simctl ui`; I did not drive the Settings app. The CSS has a `prefers-reduced-motion` block (line 4104) but almost nothing animates, so the risk is low.
- Overscroll bounce colours, tap-highlight flash, and `:hover` after tap (the simulator pointer does not reproduce touch).
- iOS 27: the iOS 27 runtimes are not installed here, so the UIScene lifecycle behaviour on the iOS 27 SDK, the deep link `sourdough://bake` on iOS 27, and any iOS 27 chrome changes are untested. On iOS 26.5 the deep link opened bake mode after the system "Open in Sourdough?" prompt, which is a simulator `openurl` behaviour.
- iPhone SE-class (320 to 375 pt) width: none installed; the 17e at 390 pt is the closest.
- Signed-in flows, the coach, cloud sync and remote photos (no sign-in, per the rules).

Physical-device checklist: Dynamic Island in dark with the fixed strip, keyboard on every input type, the AlarmKit alarm on the Lock Screen with the screen locked and Focus on, a real launch (cold start) in dark and light, bounce colours, long-press and tap feedback, camera and photo picker, and a pass with VoiceOver and Larger Text.
