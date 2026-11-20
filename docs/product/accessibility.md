---
title: Accessibility audit (VoiceOver, Dynamic Type and the rest)
status: current
date: 2026-11-20
---

# Accessibility audit

Scope: the whole web app as it runs in the Capacitor iOS shell (the same code), plus a reading of the native iOS pieces in `ios/App`. The owner's question was: "what do you want to prepare for Dynamic Type and VoiceOver? Not sure if we're missing anything."

Short answer: VoiceOver mostly needed fixes in a handful of places (dialogs and the coach sheet, the bake timer, screen changes, a few repeated or unclear names). Dynamic Type needs a decision and a type scale first (section 3), so it is written up as a recommendation and was not changed here.

How to read this doc (same convention as the [UX review](./ux-review-commercial-viability.md) and the [UI review](./ui-review.md)):

- **Observed** = I saw it in the running web app (DOM and accessibility-tree inspection in a browser at desktop width, light and dark), measured it, or counted it with grep.
- **Inferred** = reasoned from code or from how iOS and WebKit are documented to behave. Not seen on a device.
- **Fixed** = changed in this pass. **Remains** = not fixed, with the reason.
- `[x]` fixed or already fine, `[ ]` remains or needs the owner's device.

**What this pass could not do:** run VoiceOver, a real iPhone, Dynamic Type, Voice Control or Switch Control. Everything marked Observed was checked through the DOM, the browser accessibility tree and scripted interaction (focus, key events). What VoiceOver actually says is Inferred until you run [the on-device test script](./accessibility-testing.md).

Related: the rules for new UI are in [UI/UX practices](./ui-ux-practices.md), "Accessibility Basics".

---

## 1. What changed in this pass (summary)

| Area | Change | Files |
| --- | --- | --- |
| Dialogs | Native dialogs (`DialogCard`, used by every confirm, save and bake dialog) now put the role and name on the `<dialog>` itself (it used to be a dialog inside a dialog), start on the title instead of the Close button, and return focus to the control that opened them | `components/DialogCard.tsx` |
| Coach sheet | Was a plain div that did not take focus, trap it, close on Escape, hide the page behind it, or give focus back. Now it does all five. The reply and "Coach is thinking" are announced once through a live region; the hidden file input is no longer a second, nameless Tab stop | `features/companion/CompanionCoachPanel.tsx`, `lib/ui/useModalSheet.ts`, `lib/ui/focusTrap.ts`, `lib/ui/inertBackground.ts` |
| Sign-in modal | Same treatment as the coach (focus, trap, Escape, inert page, focus back); each step moves focus to its title; messages are `status`, errors are `alert` | `features/auth/AuthModal.tsx` |
| Adjust step dialog | Was a hand-built div dialog; now uses `DialogCard` | `features/companion/CompanionStepEditDialog.tsx` |
| Bake timer | The countdown was `role="timer" aria-live="polite"`, so it would have been announced every second. It is now silent while it ticks and is read in words ("12 minutes 30 seconds remaining") only when focused. Start of a timer and "Time's up" are announced through always-present live regions | `features/companion/CompanionView.tsx`, `lib/companion/timerSpeech.ts` |
| Undo toast | Announced through a live region that is filled just after it appears (live regions inserted already full are often not read), says that Undo is available, and no longer disappears while a finger, pointer or the screen-reader cursor is on it | `components/Toast.tsx`, `CompanionView.tsx` |
| Screen changes | Page title per screen (it was always "Sourdough Assistant"); after navigating, focus moves to the new screen's heading so VoiceOver reads it | `app/routeEffects.ts`, `app/App.tsx`, `features/recipe-builder/documentTitle.ts` |
| Headings | Wizard steps had no level-1 heading (only an h2). They now expose level 1 | `components/SectionHeading.tsx` and the four step sections |
| Validation | Messages next to number fields, selects and the flour blend are announced when they appear (`alert` for errors, `status` for warnings); selects link their message and set `aria-invalid` | `components/NumberField.tsx`, `SelectField.tsx`, `FlourSection.tsx` |
| Repeated names | "Start baking" / "Duplicate" on every Saved card now include the recipe name; blended-flour controls name their flour ("Remove Rye", not "Remove flour"); the summary's edit buttons say what they edit and the current value | `SavedRecipeCard.tsx`, `FlourSection.tsx`, `RecipeResultsView.tsx` |
| Search and filter | Result count announced after typing (Saved, History) | `SavedRecipesView.tsx`, `BakeHistoryView.tsx`, `lib/ui/resultCount.ts` |
| Bake steps | A finished step says "Done:" to screen readers and shows a check mark; the current step has a bar on its left edge (state was text colour and tint only) | `CompanionView.tsx`, appended CSS block |
| Forms | A label that wrapped a group of buttons (loaf assessment) is now a plain container, so tapping its text no longer activates the first button; save errors are `alert` | `BakeCompleteDialog.tsx`, `BakeHistoryDetailView.tsx` |
| Account menu | Removed `role="menu"` / `menuitem` (a menu role promises arrow-key behaviour that did not exist); it is now a disclosure button that closes on Escape | `features/auth/WelcomeTopBar.tsx` |
| `aria-controls` | Only set while the panel exists | `CollapsibleSection`, `RecipeAssessment`, `InfoToggle` |
| Display settings | Increase Contrast (borders and subtle text), Reduce Transparency (solid bars), forced colours; no ring on script-focused headings | one appended block at the end of `styles.css` |
| Tests | Contrast guard for the colour tokens, focus-trap and inert logic, spoken timer text, document titles, result counts, and markup checks for the items above | `lib/ui/*.test.ts`, `lib/companion/timerSpeech.test.ts`, `features/recipe-builder/documentTitle.test.ts`, `features/accessibility/accessibility.test.tsx` |

Visible text was not changed, except: the hidden label of the coach's text field now reads "Ask about this step" (it matches the visible placeholder, so Voice Control's "Tap Ask about this step" works), and the summary edit buttons' hidden name changed from "Edit Dough size" to "Edit Dough size: 900g · 1 loaf" (contains the visible value). Check the "Edit ..." wording in the on-device script.

---

## 2. VoiceOver and screen readers

### 2.1 Names, roles and values

- [x] **Observed:** every icon is `aria-hidden` (one shared `Icon` component), so icons are never read as "image".
- [x] **Observed:** icon-only buttons have names: back (`aria-label` from `ChromeBackButton`), pen (`PenEditButton` label), Home (hidden text), coach, photo, close, stepper `−`/`+` ("Decrease Final dough weight"), info `i` ("Info about Total flour in recipe").
- [x] **Fixed:** repeated controls name what they act on (Saved cards, blended flours, summary edit buttons).
- [x] **Voice Control:** the rule "visible text is part of the name" (practices doc) holds for the wizard footer ("Back", "Continue", "Save", where Save's name is "Save and return to summary", which contains "Save"), the Saved cards ("Start baking Country loaf" contains "Start baking") and the summary edit buttons. **Remains / Inferred:** the pen buttons have no visible text; Voice Control users say "Show numbers" or "Show names" and use "Tap Edit bake notes". See the test script.
- [x] **Observed:** custom radio cards for the plan picker are real `<input type="radio">` in a `<fieldset>` with a (hidden) legend, so VoiceOver says "Same day, radio button, 2 of 4". The loaf assessment is a labelled group of `aria-pressed` toggle buttons (VoiceOver: "Great loaf, toggle button, on").
- [x] **Observed:** steppers are a `−` button, a text input (`inputMode="decimal"`) and a `+` button in one row. VoiceOver does not treat this as an adjustable control (no swipe up/down to change the value); it is three controls. **Remains (Inferred, optional):** exposing the whole stepper as one `role="spinbutton"` would let VoiceOver users swipe up and down; not done because the three-control version is understandable and tappable, and the change would touch every number field.
- [x] **Observed:** disclosure patterns (`CollapsibleSection`, Amounts, Assessment details, Export, info `i`) use `aria-expanded`; `aria-controls` is only set while the panel exists (fixed).
- [x] **Fixed:** `role="menu"` on the account menu removed (see section 1).
- [ ] **Remains (Inferred):** the info bubble is `role="tooltip"` placed right after its button. VoiceOver does not announce a tooltip that appears; the user hears "expanded" on the button and swipes right to read it. Acceptable, but the on-device test checks it.
- [x] **Observed:** images. Template photos have `alt=""` (the card's name and description sit next to them, so they are decoration). Loaf photos have `alt="Your <recipe> loaf"`; the coach and picker previews have alt text. The thumbnail in History is inside an `aria-hidden` container.

### 2.2 Page structure

- [x] **Observed:** `<html lang="en">` is set; there is a `<main>` (in `App.tsx`), a `<nav aria-label="Main navigation">` for the bottom bar, and named `<nav>`s for wizard, schedule, recipe and bake footers; `<header>` is used for page chrome. **Remains:** there is no `<footer>`; not needed.
- [x] **Fixed:** the wizard steps had no h1 (Observed: first heading was an h2). Each now has one level-1 heading (the step question). Implemented as `<h2 aria-level="1">` so existing CSS (which targets `h2`) keeps working. **Technical debt:** replace with a real `<h1>` when `styles.css` is split (the UI review's phase 1).
- [x] **Observed, other screens:** Home h1 "Plan your sourdough bake"; Saved, History, History detail, Ingredient summary, Schedule builder, Recipe and Bake mode all get an h1 from `ScreenChrome` (the recipe name in Bake mode and Recipe). h2 for cards, h3/h4 inside the ingredient card.
- [x] **Observed:** lists are real lists (`ul`/`ol`) for templates, saved recipes, history, schedule steps and coach chips.
- [x] **Fixed:** page `<title>` per screen ("Saved recipes · Sourdough Assistant", "New recipe: Flour blend · …", "Bake mode · …"). Matters mainly for the web build and for how the iOS app switcher and VoiceOver "web page" announcements read.
- [x] **Fixed:** after a screen change, focus goes to the new heading. Without it VoiceOver keeps its cursor on a control that no longer exists (Inferred; standard single-page-app behaviour). Observed in the browser: after Continue/Back in the wizard, `document.activeElement` is the new step's heading. It waits for React Router's transition to render (about 300 ms in dev) and gives up after 1.5 s. **Not verified:** how VoiceOver on iOS reads this; check in the test script, step "Wizard".
- [ ] **Remains (Observed):** the Previous / Next step footer in bake mode is last in the DOM (after "Exit bake mode") because it is visually pinned. VoiceOver reaches it by swiping past the whole schedule, or by the rotor (Containers / Landmarks; it is a named `nav`). Moving it earlier in the DOM would change the layout structure; not done. The test script records how bad this feels.
- [ ] **Remains (Inferred):** the Schedule builder's footer and the History/Saved lists are long; the heading rotor is the way through them. All sections have headings, so this works.

### 2.3 Dynamic content, live regions

| Thing | Before | Now |
| --- | --- | --- |
| Bake timer countdown | Observed in code: `role="timer" aria-live="polite"`, a one-second change = an announcement every second | Countdown is `role="timer" aria-live="off"` and reads "12 minutes 30 seconds remaining" when focused |
| Timer start | Silent | "Timer started for Autolyse: 45 minutes." (polite, always-present region) |
| "Time's up" | Visible text only (the native alarm rings on iOS, but a VoiceOver user on the web build heard nothing) | `role="alert"` region says "Time's up. The timer for Autolyse has finished." Once per timer |
| Undo toast | `role="status"` inserted with its text (often not announced), disappears after 8 s | Region filled after insertion; "… Undo is available."; the 8 s timer pauses while the toast is focused or hovered |
| Coach reply | Not announced | "Coach says: …" once; "Coach is thinking." while waiting; failures were already `role="alert"` |
| Validation messages | Linked with `aria-describedby` on number fields only | Announced on appearance; selects linked too |
| Search/filter results | Silent | "3 bakes shown" / "No bakes match" |
| Wizard progress | `aria-live="polite"` on the progress block, so "Step 2 of 4: Flour blend" is read after Continue | Unchanged |
| Toasts for export/photo notices | `role="status"` | Same component, same fix |

- [ ] **Remains (Inferred):** the Undo toast sits last in the DOM, like the bake footer; a VoiceOver user hears the announcement but has to swipe to the end to reach the button. The pause-while-held change makes the 8 s window less hostile, and Previous is one swipe from the end as an alternative. Needs the device to judge.
- [ ] **Remains:** the web build cannot ring with the screen off (already stated in-app). For a VoiceOver user on the web build the "Time's up" alert only works while the page is open.

### 2.4 Dialogs, sheets and focus

| Pattern | Observed result |
| --- | --- |
| `DialogCard` and everything built on it (`ConfirmDialog`, Save recipe, Leave recipe, Bake start, Bake complete, Adjust step, photo viewer, dev panel) | Native `<dialog>` + `showModal()`: the rest of the page is inert, Escape closes it, backdrop click closes it. **Fixed:** one dialog role (was nested), focus starts on the title, focus returns to the opener (checked: Save recipe → Cancel returns focus to the "Save recipe" button) |
| Coach sheet | **Fixed.** Checked in the browser: portal to `<body>`, `#root` becomes inert, focus on "Baking coach" heading, Tab on the last control wraps to the first, Escape closes, focus returns to the coach button, `#root` is interactive again |
| Sign-in modal | **Fixed.** Same checks passed ("Cloud sync unavailable" variant, since sign-in is not configured here) |
| Info bubble | Escape and outside click close it (Observed in code); focus is not moved into it |
| Account menu | Closes on outside click and (fixed) Escape |

- [ ] **Remains (Inferred):** nested dialogs (Bake complete → "Don't save?") rely on the native top layer. Fine in browsers; check with VoiceOver that the inner dialog is read first.
- [ ] **Remains (Inferred):** WebKit versions differ on how `aria-modal` on a native `<dialog>` is treated; the dialog is also made modal by `showModal()`, so the page behind should be hidden from VoiceOver either way.

### 2.5 Forms and validation

- [x] **Observed:** visible labels everywhere; hidden labels only where a visible heading already labels the control (flour type, percentage).
- [x] **Observed:** `NumberField` sets `aria-invalid` and `aria-describedby` only once the message is shown (after blur), matching the "never silently clamp" rule.
- [x] **Fixed:** blend-total errors on the Flour step are announced; selects link their message.
- [ ] **Remains (Inferred, not tried):** the wizard steps wrap their fields in `<form>` elements with no submit button and no `onSubmit`; browsers may submit a form on Return when it has a single text field (page reload). Not touched; worth a look when the wizard is next changed.
- [ ] **Remains (Inferred):** `type="text"` + `inputMode="decimal"` shows the numeric keyboard but VoiceOver says "text field". Fine.

---

## 3. Dynamic Type and larger text

**Does the app follow iOS Settings > Display & Brightness > Text Size (and Accessibility > Larger Text)?**

- **Observed:** font sizes are all in `rem`: 153 declarations in `rem`, 4 `clamp(...)` with `vw`/`rem`, zero `px` font sizes. `:root` sets no `font-size` and no `-apple-system-body`, so 1rem is the browser default of 16px, always.
- **Inferred (not tested on a device):** WKWebView does not scale the default 16px with the iOS Text Size setting unless the page asks for a system text style. So today the app does not follow Dynamic Type. The UI review said the same ("Dynamic Type: rem follows the root size, not the iOS setting").

**Known approach (recommendation, not applied, as instructed):**

1. In the type-scale task, set the root font from the system body style, then re-state the family:
   `html { font: -apple-system-body; font-family: <existing stack>; }` and keep every size in `rem` or `em`. In WebKit, `-apple-system-body` resolves to the user's preferred body size (17px at the default setting) and grows with Larger Text; `rem` sizes then follow it. This also changes today's 16px base to about 17px at the default, so it is a visible (small) change; do it together with the type scale so the new `--text-md` is defined as "1rem".
2. Add `-webkit-text-size-adjust: 100%` so iOS does not apply its own inflation.
3. Keep inputs at 16px or more (so iOS does not zoom on focus); with the root at 17px+ this holds.
4. WebKit applies the size at load and on a content size category change; whether a running app re-layouts without a relaunch must be tested on a device.
5. Cap the top end deliberately. The accessibility sizes (AX1 to AX5) reach about 3x. Decide whether the app supports them fully or stops at about 200% with `html { font-size: min(<system body>, 2rem) }` style clamping. Do not promise AX5 before testing the sticky bars below.
6. Do not use Capacitor's Android-only `textZoom` setting; there is no iOS equivalent in `capacitor.config.ts`, and none is needed with the approach above.

**Layout risks at large sizes (Inferred from `styles.css`; not rendered at large sizes):**

| Risk | Where | Why it matters |
| --- | --- | --- |
| Sticky header **and** sticky footer take a fixed share of the viewport | Wizard (`wizard-shell__header`, `page-shell__footer-wrap`), Recipe view, Schedule builder, Bake mode footer | At AX sizes the bars can fill most of a phone screen, leaving a sliver of content. Consider un-sticking the header at large sizes |
| `white-space: nowrap` in 17 rules (screen title, recipe-view step time and duration, coach Send, Saved card buttons, flour grams, chips) | `.screen-chrome__title` (ellipsis), `.saved-recipe-card__bake`, `.recipe-view__step-time` and others | Long text clips or forces horizontal overflow; `.app-shell` is `overflow-x: clip`, so overflow is unreachable rather than scrollable (the History detail bug in the UI review was this) |
| Mixed units: buttons and steppers are `44px` while labels scale | `--touch-target-min: 44px`, `--icon-button-size: 2.75rem`, `.number-field__control` min-width `calc(44px*2 + 3.25rem + 2px)` | Fine for hit areas; the stepper's value box scales while its buttons do not, so a 6-digit value can overflow |
| Timer size is viewport-based | `.companion__timer-value` `clamp(2.5rem, 14vw, 3.5rem)` | The kitchen-critical number does not grow with Text Size at all. It should be `rem`-based |
| `-webkit-line-clamp: 2` on the History recipe line, 12 `overflow: hidden` rules | History rows, cards | Text is cut instead of wrapping |
| Breakpoints are in `px` (640, 960) | Pair/triple columns | Large text on an iPad or landscape phone keeps 2 to 3 columns of ever-bigger text. Prefer single column from a text-size condition, or `em`-based breakpoints |
| Fixed bottom bar + `padding-bottom: calc(4.75rem + safe-area)` | `.app-bottom-nav`, `.main-screen--with-nav` | The padding is in `rem` (follows root), the bar's height follows its content: they should stay in step; verify |
| Dialogs only scroll on narrow screens | `.dialog-card` has `max-height` + `overflow: auto` only at the mobile breakpoint | In landscape or at large sizes a tall dialog (Bake complete) can extend beyond the screen |
| Coach sheet | `max-height: min(88dvh, 720px)`, transcript is the flexible row | Probably fine (transcript scrolls); the composer and header may crowd it at large sizes |

**Owner decision needed:** is "supports Larger Text" a goal for v1? The UI review (open question 9) asked the same. A kitchen app is a strong case (reading from a distance, floury hands), and the effort is mostly the type scale plus fixing the rows above, not a rewrite.

---

## 4. Other iOS and platform settings

| Setting | Status |
| --- | --- |
| **Reduce Motion** | [x] **Observed:** one `prefers-reduced-motion: reduce` block switches off transitions and animations (`styles.css`); the coach's smooth scroll checks the setting in JS. The quick-wins pass may add motion; keep new motion under this block. WKWebView reports the iOS setting through this media query (Inferred) |
| **Increase Contrast** | [x] **Fixed:** `prefers-contrast: more` block: borders go to at least 4:1 and subtle text uses the muted colour (light and dark). **Not verified:** that iOS reports Increase Contrast to WKWebView through this query (it does in current Safari; Inferred) |
| **Bold Text** | [ ] **Remains (Inferred):** weights are set explicitly (74 of 88 declarations are 700 or 800, per the UI review), so bold text mostly changes nothing visible here; there is no web media query for it. When the type scale defines a regular weight, `-apple-system-body` helps. Low priority |
| **Reduce Transparency** | [x] **Fixed:** `prefers-reduced-transparency` makes the blurred bars and bottom nav solid. Safari support is recent (Inferred); the rule is harmless where unsupported |
| **Smart Invert / Classic Invert** | [ ] **Remains (Inferred):** the app has a real dark theme following `prefers-color-scheme`, so Smart Invert is rarely used. Smart Invert inverts everything except images and media; loaf photos are `<img>` and are not double-inverted. Not tested |
| **Differentiate Without Color** | **Observed:** colour-only state was found and fixed in bake mode (done, current). Assessment levels have icons (check, info, alert) and text labels; field errors have text; selected plan cards have a filled radio; the active tab has `aria-current` and a bordered pill. **Remains:** the progress bar segments (filled/empty) have the "N of M" text next to them |
| **Dark mode** | [x] Full dark palette; contrast checked (below) |
| **Zoom (pinch)** | [x] **Observed:** `index.html` viewport is `width=device-width, initial-scale=1.0, viewport-fit=cover`: no `maximum-scale`, no `user-scalable=no`, so pinch zoom is allowed. **Remains (Inferred):** the app shell is a web view with its own scrolling; pinch zoom in a WKWebView follows that meta, so it should work; confirm on a device. iOS's separate Zoom feature (screen magnifier) works regardless |
| **Voice Control** | See 2.1. **Observed:** the app has no hover-only affordances that matter (28 `:hover` rules, all cosmetic; no `@media (hover)` queries; every action is a visible button). **Remains:** icon-only buttons rely on "Show numbers" |
| **Switch Control / Full Keyboard Access** | [x] Everything is a real `button`, `input`, `select` or `summary`, so Tab / Switch scanning reaches it. **Fixed:** modal sheets trap Tab and restore focus; the page behind a sheet is inert. **Observed:** 24 `:focus-visible` rules; two `outline: none` rules (the number-field input and the flour percentage input) rely on a ring drawn on their parent; the number field's is checked in `styles.css`, the flour one is not re-checked |
| **Touch targets (44px)** | [x] The practices doc already requires 44x44 and a "Touch targets" CSS block exists (UX review item 10 measured and was fixed on 2026-11-19). **Remains (Observed in code):** inline links such as the Saved "See all" and the Export action rely on `min-height: 44px` rules; not re-measured here |
| **Orientation** | [x] Info.plist allows portrait and both landscapes on iPhone and all four on iPad; nothing locks orientation. **Inferred:** landscape layout of the bake mode and dialogs is untested (see dialogs above) |
| **Hardware keyboard (iPad / web)** | [x] Tab order follows DOM order, which equals visual order except the bake footer (see 2.2). **Remains:** no keyboard shortcuts; none needed |

### Contrast

Observed with a script over the colour tokens (`:root` and the dark block), and now guarded by `src/lib/ui/contrast.test.ts` (fails if a token drops below 4.5:1 on the page, card or muted surfaces):

- Light palette: every text token is between 4.5:1 and 14.9:1 on every surface I checked (page, card, muted, notice, chip, neutral, help, danger, warning, success tints). The lowest are `--color-text-cool` (4.53 on the neutral surface), `--color-primary-text` (4.54), `--color-text-subtle` (4.59 on neutral).
- Dark palette: all between 5.6:1 and 15:1.
- White text on the primary fill: 5.0:1 in both themes.
- **Remains (Observed):** non-text contrast. Control borders (`--color-border`) are about 1.5:1 against the card in light mode and 1.9:1 in dark. WCAG 1.4.11 asks 3:1 for the boundary of an input if the boundary is what identifies it. Inputs also have a tinted fill, so this is a judgement call; the Increase Contrast block brings borders to at least 4:1 for people who ask for it. A default change would alter the look everywhere, so it is left for the UI token work.
- **Remains (Inferred):** the AlarmKit tint `.orange` and the Live Activity text (below) sit on system backgrounds; check them on a device.

---

## 5. Native iOS pieces (read, not edited)

Files: `ios/App/App/BakeTimerPlugin.swift`, `ios/App/BakeTimerWidget/*.swift`, `ios/App/BakeTimerShared/*.swift`, `ios/App/App/Info.plist`.

**Accessible by default (Inferred, standard behaviour):**

- The system **AlarmKit alert** (Lock Screen and Dynamic Island) is drawn by iOS from the title and buttons the app provides, so VoiceOver, Dynamic Type and contrast are the system's. The alert title is the step name; buttons are "Stop" and "Open app" with SF Symbols.
- The Live Activity uses SwiftUI text styles (`.headline`, `.subheadline`, `.caption`), which scale with Dynamic Type automatically. The countdown uses `Text(timerInterval:countsDown:)`, which VoiceOver reads as a time natively and updates without announcing every second.
- Buttons are SwiftUI `Button(intent:)` with a `Label` (text plus icon), so they have names ("Reset", "Stop").
- Permission strings are in plain language: camera and photo library explain their use ("so you can take a photo of your finished loaf or share dough photos with the baking coach"), notifications and AlarmKit explain the alert.

**Needs attention (list for a native task; not changed):**

1. **Alert wording.** The AlarmKit alert title is only the step title (for example "Autolyse"). A VoiceOver user on the Lock Screen hears the step name but not "timer finished". Consider a title like "Autolyse: time's up". The fallback notification already says "<title> — time's up" (`BakeTimerPlugin.swift`, near line 356).
2. **`lineLimit(1)` on the step title** in `BakeTimerLockScreenView` and in the `.alert` case of `BakeTimerCountdownText`. At large text sizes long step names ("Build levain from fridge starter (12 h)") truncate. Allow 2 to 3 lines.
3. **Compact and minimal Dynamic Island** show only a timer icon and the countdown; the icon is decorative. Fine, but add `.accessibilityLabel("Bake timer")` to the compact and minimal views so the island reads "Bake timer" instead of a bare number.
4. **Tint colour.** `tintColor: .orange` is used for the title text on the Lock Screen view. Orange on a light Lock Screen is low contrast (about 2:1 by estimate, Inferred; not measured). Use a colour that meets 4.5:1 on both light and dark, or the primary text colour.
5. **Button label colour.** The AlarmKit `AlarmButton` text is `.white` over the system's button fill; check contrast in light and dark on a device.
6. **Hard-coded English** strings ("Reset", "Stop", "Open app", "Timer", "--:--"). Fine today (the web app is English only); they would need localizing with the rest.
7. **Haptics and sound.** The alert sound is a custom `BakeTimerAlert.caf`; for deaf and hard-of-hearing users the visual alert on the Lock Screen is the channel, so keep the title meaningful (item 1).
8. `Info.plist` allows all orientations (good). `UIRequiredDeviceCapabilities` lists `armv7` (legacy, harmless).

---

## 6. What the owner might be missing

| Thing | What it implies for this app |
| --- | --- |
| **Voice Control** ("Tap Start timer") | Needs visible text to match names. Mostly met; icon-only buttons need "Show numbers". Useful in a kitchen with floury hands even for people who do not need assistive tech |
| **Switch Control, Full Keyboard Access** | Focus order, focus visibility, no focus traps. Fixed for the sheets; the bake footer order remains |
| **VoiceOver rotor** | The rotor jumps by headings, links, form controls and landmarks. That is why every card has a heading and the footers are named `nav`s |
| **Screen Recognition** | iOS can guess labels for unlabelled controls in apps; do not rely on it. Everything has a real name |
| **Speak Selection / Speak Screen** | Reads text aloud; works with real text (it does). The timer countdown is text, so it works |
| **Magnifier / Zoom** | Independent of the app; needs no layout that breaks when magnified (pinch zoom is allowed) |
| **Haptics / Sound Recognition / LED flash alerts / Mono audio** | The alert is the AlarmKit alarm; sound plus visual. Hearing-impaired users depend on the visual alert and vibration (system) and on a meaningful title |
| **Guided Access / Assistive Access** | A cooking tablet in a kitchen might use Guided Access; the app has no features that break it |
| **Prefers-reduced-data, Low Power Mode** | Not accessibility, but photos are compressed already |
| **Keep awake** | The bake screen keeps the display awake (`useBakeKeepAwake`); good for hands-free reading. Auto-Lock still applies elsewhere |
| **Text and language** | `lang="en"` is set; plain-language copy is a strength. Baker's percentages are explained on first use |
| **Cognitive load** | Many steps and numbers. Done/current markers, one primary button per screen and the undo toast already help; "Previous" as undo is useful |
| **Time limits** | The Undo toast was 8 s (now pauses on focus). Toasts that vanish are an accessibility issue for slow or assistive-tech users; avoid new ones that hold the only copy of information |
| **Motion** | No parallax or autoplay; transitions are short and removed by Reduce Motion |
| **Accessibility Nutrition Labels (App Store)** | Apple now asks apps to declare which accessibility features they support (VoiceOver, Voice Control, Larger Text, Dark Interface, Differentiate Without Color, Sufficient Contrast, Reduced Motion, Captions, Audio Descriptions). You should only tick what you tested. After the on-device pass, VoiceOver, Voice Control, Dark Interface, Differentiate Without Color and Reduced Motion are plausible; Larger Text is not until section 3 is done. Check Apple's current requirements before submitting |
| **Automated checks in the repo** | There is no a11y linter (no new dependencies allowed here). Options later: `eslint-plugin-jsx-a11y` (small, dev only) and an `axe-core` run in a browser test. Both are dependencies, so they need the dependency discussion in CLAUDE.md first |

---

## 7. Remaining work, in order

1. **On-device pass** with [the test script](./accessibility-testing.md): VoiceOver first (it decides if the live-region and focus choices are right), then Larger Text, Reduce Motion, Increase Contrast, Voice Control.
2. **Decide on Dynamic Type** and do it with the type scale (section 3). Fix the timer size and the `nowrap` rows in the same change.
3. **Native fixes** (section 5): alert title wording, line limits, compact/minimal labels, orange tint.
4. **Bake mode order:** consider moving Previous / Next earlier in the DOM or making it reachable by a landmark jump; decide after step 1.
5. **Border contrast default** (3:1 for control outlines) with the colour tokens.
6. Replace the `aria-level="1"` h2 with a real `h1` when the CSS is split.
7. Optional: stepper as `spinbutton`; automated a11y checks (dependency discussion first).

## Technical debt introduced

- `SectionHeading` level 1 via `aria-level` on an `h2` (see above).
- Timer announcement and focus timing use timeouts (`routeEffects.ts`, `CompanionView.tsx`); both degrade gracefully (focus falls back after 1.5 s).
- `useModalSheet` makes every other child of `<body>` inert; if a future overlay is added to `<body>` while a sheet is open it will be inert too.
- Contrast test reads `styles.css` and so will fail when a colour token is changed to something that fails 4.5:1. That is the point, but tell whoever edits the tokens.

## Changelog

- 2026-11-20: First full audit and fix pass.
