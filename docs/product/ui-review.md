---
title: UI review, making the app look professional and sleek
status: review
date: 2026-11-20
---

# UI review: from good prototype to a polished product

Scope: the web build (dev server, fresh storage, then one saved recipe, one local bake in History and one seeded bake session) at 390x844 in light and dark, plus 768 and 1100 wide on Home, the wizard and the schedule builder. Code reading of `src/styles.css` (5,186 lines, 103 KB) and `src/components/`. This is a review only. Nothing was changed. The iOS app, a physical device, VoiceOver and Dynamic Type were not exercised (see "What I could not verify").

Convention (same as the [UX review](./ux-review-commercial-viability.md)): **Observed** = I saw it in the running app, measured it in the page, or counted it with grep. **Inferred** = reasoned from code or general knowledge, not seen running. Effort: S = under a day, M = 1 to 3 days, L = a week or more (my estimate, not measured).

For the owner (a PM learning engineering): the UX review asked "can a stranger trust this?". This review asks "does it look like it was designed by one person with a system?". Today the answer is "almost, and then the details give it away". The good news is that the causes are few and nameable: weight and size scales that were never fixed, one "card" look reused for everything, nesting, and no motion or pressed state. Most of this is tokens and a handful of components, not a redesign.

---

## 1. Honest verdict

The app has a real visual identity already: warm cream and toffee brown, rounded cards, one confident primary colour, tabular numbers on the timer, a calm tone. The dark theme is a proper warm-brown theme, not an inverted light one. There are no hard-coded colours outside `:root` (Observed: zero hex or `rgb()` literals in rules below line 205), which is rare and is the best thing about the CSS. The bake-mode timer, the ingredient breakdown card and the recipe view's schedule list are already at a professional level.

What makes it read as a prototype, in order of how much it matters:

1. **Everything is bold and nothing has a size system.** 74 of 88 `font-weight` declarations are 700 or 800, inputs and selects are 800, and there are 27 distinct `font-size` values (11 of them between 0.72rem and 0.92rem). Without a regular weight and a short scale there is no hierarchy to look at, so every screen looks equally loud.
2. **One surface treatment is used for everything, and it nests.** A 28px-radius card with an 80px blur shadow contains tinted boxes that contain white inputs that contain pills. Saved recipes, Home templates, History search and the wizard steps all show card-in-card (or card-in-card-in-card). Pro apps use one container level and separate rows with hairlines.
3. **The same data is drawn two ways.** The schedule builder and the history detail draw each timeline step as its own tinted, bordered card (15 or more boxes in a row). The recipe view draws the same data as a clean hairline list. The recipe view is the better one.
4. **It is static.** There are no `@keyframes`, 4 `transition` declarations, no `:active` (pressed) rule at all, and 17 `:hover` rules that stick on touch screens. Dialogs and sheets appear without animation. On a phone, buttons give no feedback when pressed. This is the biggest "web page in a frame" tell on iOS.
5. **One real layout bug on a core screen** (History detail overflows at 390px, section 3, problem 1), and a handful of small content slips (coach copy, stray separators).

Everything else (buttons, radii, spacing, colour roles) is the same disease: values chosen per component instead of from a scale.

---

## 2. Top problems, ranked

### 1. History detail is wider than the phone for any long recipe name. BLOCKER. Effort S

- Observed: at 390px, `/history/:id` for a bake named "dark wheat moderate hydration" (the app's own auto-generated name length) made `.page-shell` 444px wide. The edit pen, the "Bake again" button and every card were clipped on the right (`.app-shell` has `overflow-x: clip`, so there is no scroll and no way to reach them). With the title replaced by "Loaf", the width went back to 362px.
- Cause (Observed in the page): `.main-screen` is `display: grid` with no column template (`styles.css` line 737), so its only child `.page-shell` is a grid item with `min-width: auto`. The long `nowrap` title in `.screen-chrome__title` (line 593) then sets the minimum width. Setting `min-width: 0` on `.page-shell` in the browser fixed it immediately (362px, title ellipsised, pen visible).
- Fix: `.main-screen { grid-template-columns: minmax(0, 1fr); }`. The recipe view and bake mode did not overflow with the same name, so they are fine.

### 2. No type scale and no weight hierarchy. MAJOR. Effort M

- Observed: 157 `font-size` declarations and 27 distinct values: `0.92rem` (27 times), `0.9rem` (15), `0.78rem` (15), `0.86rem` (14), `0.95rem` (13), `0.88rem` (12), `1rem` (11), `0.82rem` (9), then a long tail down to 0.72rem and up to `clamp(2.5rem, 14vw, 3.5rem)`. Eleven sizes sit within 0.72 to 0.92rem (a 3px range), so the differences are noise.
- Observed: `font-weight` is 800 (41), 700 (33), 600 (6), 650 (3), 500 (3), 750 (1), 900 (1). There is no 400 anywhere in rules except via inheritance. Inputs and selects are weight 800 (line 3309). In the Formula breakdown card every label and value is bold, so labels do not recede from values.
- Also: 14 distinct `line-height` values (1 to 1.6) and 8 distinct `letter-spacing` values.
- Phone titles are 1.55 to 2rem, desktop titles 2 to 3.2rem (`.hero h1`, `.screen-chrome__title`), while wizard card titles are 1.35rem: on a laptop the page title is 51px next to 22px card titles.
- Fix: the type scale in section 6.1, three weights (400, 600, 700), then a mechanical replace per bucket. Do the labels and inputs first; they give the biggest visual calming.

### 3. Card in card in card. MAJOR. Effort M

- Observed: `.card` is radius 28px, 24px padding, shadow `0 24px 80px` (line 1598). Inside it sit `.field-card` boxes (17 uses, tinted `--color-surface-muted`, radius 14), and inside those white inputs (radius 14) and stepper buttons. Examples: every wizard step, the Saved tab (card, then tinted recipe card, then two full-width pills), Home (Start from a template card, then bordered template cards each with a photo), History (card, then SEARCH tinted card, FILTER tinted card, then bake cards), the schedule builder (Choose a plan card, plan cards).
- The practices doc already says "avoid nested cards without purpose". The tint plus border plus shadow stack makes each level look like a separate floating object, which is the "template" feel.
- Fix (design-system work): one container level. Page background, then white "grouped" containers (radius 16, 1px border, no big shadow), with rows inside separated by hairlines (the ingredient breakdown card already does this well). Fields in a wizard step sit directly on the step card on a hairline, not each in its own tinted box. Keep the tint only for genuine callouts (the levain panel, assessment verdict).

### 4. Timelines are stacks of cards. MAJOR. Effort M

- Observed: `BakePlanTimeline` and `TimelineRow` render each step as a bordered, tinted, 14px-radius box with 12px gaps (`.timeline-row`, line 327). A 14-step bake is 14 boxes, about 2,900px of page. The recipe view renders the same steps as a hairline list with time on the left and duration on the right, and it reads at a glance.
- Fix: reuse the recipe view's list for the builder and history, add a thin vertical spine with dots for "day change" markers (Bake day −2, −1, 0) and keep the card only for the selected or editable step. This is also the natural home for the "tap a step to edit" feature the UX doc lists as not built.

### 5. Buttons: all full-width pills, all heavy, and stacked. MAJOR. Effort M

- Observed: 67 elements use `.wizard-button` (even on Home, History, dialogs), 39 secondary and 27 primary. A dialog is Cancel plus Save as two full-width pills (Save recipe, Update, Bake complete); the Start baking dialog stacks three (Start now, Cancel, Start baking); each Saved card stacks Start baking and Duplicate full width; History's sync banner shows Sign in and Not now as two roughly 200px outlined pills.
- Footers have three layers: an underlined brown "Save recipe" link, then Back and Start baking. The link looks like a hyperlink in a web page, not an action. Its label also says "Save recipe" while the dialog it opens says "Update saved recipe".
- There are two icon-button classes (`.icon-button` with 5 variants and `.wizard-icon-button` with 3) and a separate `.reference-chip`, `.page-shell__secondary-link`, `.flour-add-button`: five button grammars.
- Fix: three button variants (primary filled, secondary tinted or outlined, tertiary text), one height (48px), one radius, weight 600. Dialog actions become a row (Cancel text button, primary) or an iOS-style sheet. Rename `.wizard-button` to `.button`. Move "Save recipe" into the footer as the secondary button or into an overflow action.

### 6. No motion and no pressed state. MAJOR. Effort M

- Observed: 0 `@keyframes`, 0 `animation`, 0 `:active`, 4 `transition` (2 on transforms, 1 background). Dialogs (`<dialog>` modal) and the coach sheet appear instantly. 17 `:hover` rules apply on touch devices and stick after a tap (inferred: iOS applies `:hover` after tap).
- The reduced-motion block exists (line 4102), so adding motion is safe.
- Fix: `:active` on every tappable (opacity 0.7 or scale 0.98, 80ms), wrap `:hover` in `@media (hover: hover)`, dialog fade/scale and sheet slide-up (200ms, ease-out), accordion height animation for Customise and Amounts, a 150ms colour transition on selection cards. All inside `prefers-reduced-motion: no-preference`.

### 7. Selects look like text inputs. MAJOR. Effort S

- Observed: `select { appearance: none; padding-right: 28px }` (line 3327) with no replacement chevron anywhere (grep for a select chevron finds none). "Levain activity", "Levain type", "Levain flour", the flour picker and the History filter look identical to a typed field.
- Fix: add a chevron as a `background-image` data-URI (or a wrapper with an icon). The 28px right padding is already reserved. On iOS the native picker opens, so the control just needs to say "tap for options".

### 8. Colour roles are diluted (three browns, blue, green with several meanings). MAJOR. Effort M

- Observed in `:root`: `--color-primary #a15b2a`, `--color-accent #9c5a2b`, `--color-primary-border #8f4f24`, `--color-primary-text-strong #8f4f24`, three near-identical browns doing similar jobs. 80 colour tokens in light and 64 overridden in dark; several are named by where they were first used (`--color-danger-text-photo`, `--color-danger-text-failure`, `--color-warning-text-alt`, `--color-text-cool`, `--color-text-chip`). 11 danger tokens, 5 success, 5 help, 5 border, 6 text.
- Observed in use: blue is the only cool hue, and it marks the info "i" buttons and the coach sparkle. Green means "success" (assessment verdict, Bake complete dialog tint), "starter" (levain panel), and "now" (Current step label, Timer panel). Blue also means "water" in the ingredient icon chips. A user cannot learn what a colour means.
- Fix: collapse to roles (section 6.4). Decide one meaning per hue: brown is brand and "now", green is success only, blue is info and AI, ingredient chips use a separate small illustration palette.

### 9. It does not feel like an iOS app in the web view. MAJOR. Effort M

- Observed: modal dialogs are centred cards (Save recipe, Start baking, Bake complete), while the coach is a bottom sheet with no grabber. Titles are inline sticky headers, not large titles that collapse. The bottom bar is a bordered pill on the active tab, which on a tablet stretches three items across 700px. No swipe-back (inferred: the in-page back chevron is the only way back). No `-webkit-tap-highlight-color`, `-webkit-touch-callout`, `user-select` or `overscroll-behavior` anywhere, so long-press text selection on buttons, a grey tap flash (inferred) and page rubber-banding all expose the web view.
- Fix (see section 5): sheet presentation for Save recipe, Start baking, Bake complete; grabber and drag-to-dismiss on the coach sheet; flat bottom bar with filled icon plus tinted label for the active tab; the tap, callout and overscroll CSS; keep one in-page back button and add edge-swipe only if the owner wants it (it needs router work).

### 10. Empty and first-run states are bare. MINOR. Effort S-M

- Observed: History with no bakes shows the Search box and the Filter select above one line of grey text, so a user with nothing sees two controls that do nothing. The Saved tab with one recipe is a card with 60% blank screen below. Home with no recipes goes straight from the filled button to a card of six photos with no illustration, and "Hour by hour" copy sits right of a 24px title that wraps to two lines.
- Observed content slips: the signed-out coach sheet shows "Sign in to ask the baking coach..." and, below it, "You have used all 5 coach questions for this bake" (false for a signed-out user). History rows show "Baked Thu, 19 Nov 2026 ·" with a dangling separator when there is no second item. The Bake complete dialog is tinted green (`.dialog-card--success`).
- Fix: show Search and Filter only from about 6 bakes (the Saved tab already hides its search under 9 recipes); real empty states with one illustration or icon, one line, one button; fix the three copy and separator slips.

### 11. Wide screens and the PWA. MINOR. Effort S

- Observed at 1100: the wizard progress bar stops at about 75% of the card width; the Home "New recipe" button is a small left-aligned pill at 768 but full-width at 390; page titles jump to 51px; Home content is a 960px column on a blank page. Plan cards go 3-up with Custom orphaned on a second row.
- Fix: cap the app at a phone-like column (about 560 to 640px) centred on tablets and desktop, or accept a responsive layout deliberately. This depends on question 2 in section 9.

### 12. `styles.css` is one 5,186-line file with 35 selectors defined twice. MAJOR (blocks everything above). Effort L

- Counts (Observed, grep): 103,439 bytes, 665 top-level rules, 486 distinct class names, 8 `@media` min/max-width blocks plus one dark and one reduced-motion block, 4 `!important`. 35 selectors are defined more than once; 22 of those have a later block (after line 3780) overriding an earlier one, for example `.companion__timer-value` (3 times: lines 3233, 3788, 3918), `.companion__current`, `.companion__previous`, `.number-field__stepper`, `.input-row--stepper`, `.app-shell`, `.app-header`, `.app-bottom-nav` (746, 4949), `.saved-recipe-card__buttons`, `:root` (8, 4212), `body` (211, 4224). About 38 class names in the CSS never appear in `src` (see appendix). 1,405 lines (27%) are blocks appended per feature after line 3780 with comment banners.
- Why it blocks polish: to change what a button or card looks like you have to find and reconcile up to three definitions, and any parallel change collides in the same file.
- Fix: section 7.

---

## 3. What the design system looks like as built (counts)

| Area | What is there (Observed) | Verdict |
| --- | --- | --- |
| Colour | 80 light tokens, 64 dark overrides, all in `:root`; 0 literals in rules | Strong discipline, too many near-duplicate tokens, named by use site |
| Brand | Toffee brown `#a15b2a` fill with cream text 5.19:1; `--color-accent #9c5a2b`, `#8f4f24` x2 | Coherent, but three browns |
| Type | `Inter, ui-sans-serif, system-ui, -apple-system...`; no `@font-face`, no font `<link>` | Effectively the system font. Inter renders only where installed |
| Font sizes | 27 distinct values, 157 declarations | Ad hoc |
| Weights | 800 x41, 700 x33, 600 x6, 650 x3, 500 x3, 750, 900 | Almost everything bold |
| Line height / tracking | 14 values / 8 values | Ad hoc |
| Radius | 14 distinct non-zero values: 6, 8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 999. `--radius-card` (16px) is used twice; `.card` is 28px | Not a scale |
| Spacing | `gap`: 14 distinct (1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 20, 24, 28px); 64 distinct `padding` strings; `--space-card` defined, never used | Not a scale. 8, 10 and 12 are used interchangeably |
| Elevation | 7 distinct shadows, from `0 1px 3px` to `0 24px 80px` (the card default) | Too many, and the card shadow is very diffuse |
| Borders | 1px everywhere, five border tokens | Fine |
| Icons | 31 icons, one 20x20 viewBox, round caps; stroke 1.35 (x11), 1.5, 1.75 (x8), 2 (x6); rendered at 1.125rem or 1.25rem | One family, four stroke weights. The loaf icon on "Start baking" renders so small it reads as a padlock |
| Buttons | 67 `.wizard-button`, plus 5 other button grammars | Named after the wizard, used everywhere |
| Motion | 0 keyframes, 4 transitions, reduced-motion block present | Missing |
| Breakpoints | 640 (min and max), 960, 480, 360, 340 | 640 is both `min-width` and `max-width` |
| z-index | 1, 20, 25, 30, 100, 110, 120 | Fine, undocumented |
| Dark theme | Warm, readable; cards `#241d17` on `#1a1511` | Good. Depth comes from borders only, so nested cards are barely distinguishable (see wizard step in dark) |

Typeface: the stack lists Inter first, but nothing loads it. On this Mac the headings rendered in a font that looked like Inter (inferred: Inter is installed locally). On an iPhone, with no Inter, the app falls back to SF Pro. So the screens you are designing against on a Mac may not be what ships. Decide (section 9, question 2) whether to ship a webfont or to drop `Inter` from the stack and design in the system font.

---

## 4. Screen by screen

**Home.** Observed. Title wraps to two lines at 24px beside a Sign in pill; the promise line is good copy. Filled New recipe, then Resume baking card, Saved recipes card with slim rows, then Start from a template. With a saved recipe and a running bake it is clear and short. Gaps: the template section is a card containing six bordered cards with PNG photos (about 130 to 150 KB each, 1.6 MB for six; `public/templates`), so six cards nested in one. The photos are the warmest thing in the app and deserve to be the hero (full-bleed 16:9 or square tiles in a horizontal scroll, text overlaid or below, no inner border). The slim saved row truncates the recipe name ("dark wheat moderate...") to make room for a Start baking pill.

**Wizard steps (dough size, flour, hydration, fermentation).** Observed. Segmented progress plus "1 of 4 · Dough size" is clear; labelled Back and Continue are good. Problems: each field is a tinted box with a blue circular info button, the stepper is a bordered group and the unit sits outside it ("900 [-|900|+] g"); half the dough-size and hydration steps is empty card; the flour step stacks four differently sized tinted boxes (read-only total, total flour with an info button, flour picker, "Your blend") with a brown pen on a read-only value; the selects look like text fields (problem 7). In dark the nested tints blur together.

**Summary.** Observed. Four input summary cards, then Ingredients (the strongest component in the app: icon, name, right-aligned amount, hairlines, a green-edged levain panel with a 1:15:15 ratio pill), Formula breakdown, and Recipe assessment (one-line verdict, details disclosure). Gaps: the page title "Ingredient summary" has no recipe name; the four input cards are each a bordered card (a single grouped list "Dough size / Flour blend / Hydration & salt / Fermentation" with chevrons would take half the height); Formula breakdown has every row bold; the footer stacks a link on top of the primary button.

**Schedule builder.** Observed. The preset picker is a clear idea, but the selected state is only a thin brown border and tint (no radio or check), so "Custom is selected" is easy to miss; the "Customise" rows use right-pointing chevrons that rotate open (fine, iOS-like) but then the opened section is a stack of tinted field boxes again; the timeline is 14 boxes (problem 4); Export is a small underlined link that reveals three more underlined links, partly hidden behind the footer fade until scrolled. The page is 2,910px tall now (the earlier review measured 6,300px), which is a real improvement.

**Saved tab.** Observed. A card with explanatory copy, then a tinted recipe card with two full-width pills. Heavy for a list row. Professional: a list of rows (name, "Updated 20 Nov · Baked 1x, last: OK"), swipe or overflow for Duplicate, tap to open, Start baking inside the recipe view. The page is 60% empty with one recipe, which is expected, but the empty area needs an intent (a New recipe button, or the templates).

**Recipe view.** Observed. Clean: ingredient card, schedule as a hairline list with day group headings in brown, Edit recipe link plus Start baking in the footer. The title in the header truncates ("dark wheat moderate hydr...") because it sits in one `nowrap` line next to the home button; long names should wrap to two lines or live in the body as a title.

**History list.** Observed. A card with a sync banner (two pills about 200px wide), then Search and Filter as two tinted cards, then bake cards with a photo placeholder tile, name, date, a bold "Assessment · OK" line, hydration and weight, a note excerpt. The first bake starts below the first screenful. With photos this could be the best screen, because a loaf photo is the product's reward. Professional: photo-first rows (square thumbnail, name, date, a coloured rating dot), search as a compact bar above the list, the sync prompt as a single dismissible line.

**History detail.** Observed. Overflows at 390px (problem 1). After the fix: a hero with date and assessment, a full-width "Bake again", an empty "Loaf photo" card, notes, recipe ingredients, planned schedule and step timings as card stacks. The empty "Add a photo" card is the first thing you see on a bake that has no photo; move it to a thin row.

**Bake mode.** Observed. The best screen. Large tabular timer, big step title, "Next up", the Full schedule list. Gaps: "Step 3 of 14" and "About this bake" sit apart with a blank band between them; the web banner is a permanent bordered notice; Previous is a cold grey card (`--color-surface-neutral #f4efe8`) in a warm app; "Current step" and the Timer panel are green while the rest of the brand is brown; the Amounts button text is about 4px inset from the other text; the coach button is a blue circle; the header truncates the title. Dark mode is good here.

**Dialogs and sheets.** Observed. Native `<dialog>` modals centred, almost full width on a phone (Start baking, Bake complete), tinted green for Bake complete. Native date and time inputs are the right call on iOS. The coach is a bottom sheet with a 24px top radius (good) but no grabber. Using one sheet component for all of them gives the most native feel for the least work.

---

## 5. iOS feel inside the web view

| Topic | Observed or inferred | Recommendation |
| --- | --- | --- |
| Safe areas | Observed in code: 21 `env(safe-area-inset-*)` uses, a dedicated top-inset block (line 4205) with an opaque band under the status bar | Good. Keep |
| Navigation | Inline sticky titles, a circular back button, a home icon on every wizard step | Large title that collapses is the iOS idiom (inferred); optional. Priority is lower than sheets and motion |
| Bottom bar | Three tabs, bordered pill on the active tab, 3rem tall, blur background | Flat bar, filled glyph plus tinted label on the active tab, no border on the item. Cap its width on tablets |
| Sheets | Centred dialogs; coach is a real sheet | One sheet component with a grabber and a 200ms slide for Save recipe, Start baking, Bake complete, coach |
| Pressed states | None (0 `:active` rules) | Add. This is the single highest-impact "feels native" change |
| Haptics | Not available in the web view (and a native bridge for them is out of scope here) | A BakeTimer-style Capacitor plugin could add haptics later. Not needed now |
| Text and gestures | No tap-highlight, callout, user-select or overscroll rules | Add global rules (quick win 4) |
| Dynamic Type | Font sizes are in `rem`, which follows the root size, not the iOS setting (inferred; not tested) | A type scale in tokens makes a later `-apple-system-body` experiment possible |
| Inputs | 16px inputs (no zoom on focus); native date and time pickers | Good. Keep 16px |
| Scrolling | Sticky header and footer with blur and gradient fades | Good, but the header fade shows a soft grey edge on scroll; test on device |

Native or branded? The app is already branded (warm, rounded, brown). The best answer is "branded surfaces, native behaviours": keep the palette and cards, adopt the iOS patterns for sheets, lists, pressed states and motion. That is a question for the owner (section 9).

---

## 6. Design system foundation (proposal for the owner to approve)

The aim is fewer values with clear roles, not a new look. Every number below is a proposal and is meant to replace a bucket of today's values. Nothing here changes a screen until it is applied.

### 6.1 Type scale

One family. Three weights: 400 body, 600 labels and buttons, 700 titles. `font-variant-numeric: tabular-nums` for amounts and times.

| Token | Size / line | Weight | Use | Replaces (today) |
| --- | --- | --- | --- | --- |
| `--text-xs` | 12px / 16 | 600, +0.06em caps for eyebrows | Eyebrow labels (DOUGH SIZE), nav labels, badges | 0.72, 0.76, 0.78, 0.8rem |
| `--text-sm` | 14px / 20 | 400 or 600 | Helper text, meta lines, list sublines, field labels | 0.82, 0.84, 0.85, 0.86, 0.88, 0.9, 0.92rem |
| `--text-md` | 16px / 24 | 400, 600 for buttons and inputs | Body, inputs (16px prevents iOS zoom), buttons | 0.95, 0.98, 1, 1.05rem |
| `--text-lg` | 18px / 24 | 600 | List titles, card titles in rows | 1.1, 1.15rem |
| `--title-3` | 20px / 26 | 700 | Card and section headings | 1.2, 1.25, 1.35rem |
| `--title-2` | 24px / 30 | 700, -0.02em | Screen titles on phone, dialog titles | 1.5, 1.55rem, `clamp` titles |
| `--title-1` | 30px / 36 | 700, -0.02em | Home hero title, tablet and desktop screen titles | 1.85, 2rem, up to 3.2rem |
| `--display` | 56px / 1 | 700, tabular | Bake timer only | 3.5rem and `clamp(2.5rem, 14vw, 3.5rem)` |

Eight tokens replace 27 values. Retire weights 500, 650, 750, 800, 900.

### 6.2 Spacing and radius

| Token | Value | Use |
| --- | --- | --- |
| `--space-1` | 4px | Icon and label gaps |
| `--space-2` | 8px | Tight groups, chip gaps |
| `--space-3` | 12px | Row gaps, control padding |
| `--space-4` | 16px | Default card padding and gap |
| `--space-5` | 20px | Page gutter (today `--app-shell-pad-inline`), section gap |
| `--space-6` | 24px | Large card padding |
| `--space-8` | 32px | Between major blocks |
| `--space-12` | 48px | Bottom page padding |

Retire 1, 2, 3, 5, 6, 10, 14, 18, 28px.

| Token | Value | Use | Replaces |
| --- | --- | --- | --- |
| `--radius-sm` | 8px | Chips, small badges, thumbnails | 6, 8, 9, 10, 11 |
| `--radius-md` | 12px | Inputs, buttons that are not pills, rows, nested panels | 12, 14 |
| `--radius-lg` | 16px | Cards and grouped containers | 16, 18, 20 |
| `--radius-xl` | 24px | Dialogs, sheets (top corners), hero containers | 22, 24, 28 |
| `--radius-pill` | 999px | Primary and secondary buttons, tabs, ratio chips | 999 |

Rule: an inner radius is the outer radius minus the padding between them, so nested shapes look concentric.

### 6.3 Elevation

| Level | Light | Dark | Use |
| --- | --- | --- | --- |
| 0 canvas | `--color-bg` | `#1a1511` | Page |
| 1 container | surface plus 1px border, no shadow | surface `#241d17` plus border | Cards, grouped lists |
| 2 raised | `0 4px 16px` at 10% | surface +4% lighter, border | Sticky header, bottom bar, popovers |
| 3 overlay | `0 16px 48px` at 16% | surface +8% lighter | Dialogs, sheets, toasts |

Replaces 7 shadows. In dark mode use lighter surfaces for height, not heavier shadows.

### 6.4 Colour roles

Keep the existing palette values; give each a single role and remove the duplicates. About 30 roles instead of 80.

| Role | Tokens | Notes |
| --- | --- | --- |
| Canvas and surfaces | `--bg`, `--surface`, `--surface-sunken`, `--surface-raised` | `surface-sunken` replaces `surface-muted`, `-notice`, `-chip`, `-neutral`, `hover-accent`, `hover-stepper` |
| Borders | `--border-subtle`, `--border`, `--border-strong` | Replaces five |
| Text | `--text`, `--text-secondary`, `--text-tertiary` | Replaces `muted`, `body`, `neutral`, `notice`, `chip`, `subtle`; all at least 4.5:1 |
| Brand | `--brand`, `--brand-text`, `--on-brand`, `--brand-tint` | Merges primary, accent, primary-border, primary-text-strong, tint-primary, row-active |
| Semantic | `--success`, `--warning`, `--danger`, `--info`, each with `-text`, `-bg`, `-border` (12) | Replaces about 30 |
| Ingredient chips | `--ingredient-flour`, `--ingredient-water`, `--ingredient-starter`, `--ingredient-salt` | Illustration colours only, never reused for status |
| Utility | `--focus-ring`, `--scrim`, `--shadow` | |

Meanings (proposal): brown means brand and "now", green means success only, blue means info and AI, red means danger. Warm grey replaces `--color-surface-neutral` for Previous (so it stays warm).

### 6.5 Components to build or tighten first

`Button` (3 variants, 1 height), `IconButton` (one class), `Card` (one level), `ListRow` (hairline, chevron or value), `Field` (label, control, hint, no tinted box), `Select` (with chevron), `Sheet` (grabber, slide, used by all modals), `Chip`, `Timeline` (list with spine), `EmptyState`. Several exist as components already (`DialogCard`, `StepLayout`, `NumberField`, `RecipeCard`, `TimelineRow`); this is mostly restyling them from tokens.

---

## 7. CSS health and what a cleanup involves

Counts are in problem 12 and the table in section 3. In practice a cleanup is:

1. **Split, do not rewrite.** Cut `styles.css` into ordered files imported in the same order (`tokens.css`, `base.css`, `layout.css`, `components/*.css`, `features/*.css`). Pure move, no value changes. Check with a before and after screenshot set (light, dark, 390 and 768) and by diffing computed styles of a sample of selectors in the page. Vite handles CSS `@import` with no new dependency.
2. **Fold the 22 overriding blocks into their originals** as each feature file is touched, and delete what they shadow.
3. **Delete dead classes** (appendix). Each one has zero references in `src`. Run the unit tests and a screenshot pass after.
4. **Add the new tokens beside the old ones** (additive, no visual change), then migrate bucket by bucket (font-size, weight, radius, gap and padding, shadow), then delete the old tokens when grep shows zero uses.
5. **Rename** `.wizard-button*` to `.button*` and collapse `.icon-button` and `.wizard-icon-button` (about 70 JSX call sites: a mechanical find and replace, which is also a good first TypeScript refactor to learn on).

What is already healthy and should be kept: all colours in tokens, dark theme as one block, reduced-motion block, `focus-visible` styling (24 rules), 44px touch targets via `--touch-target-min` (used 18 times), no inline `style={{}}` in JSX (0 found).

---

## 8. Quick wins (each under a day)

1. **Fix the History detail overflow**: `.main-screen { grid-template-columns: minmax(0, 1fr); }`. Observed to work in the page.
2. **Add a chevron to every `<select>`** (data-URI `background-image` in the `select` rule; padding is already reserved).
3. **Pressed states**: `:active` on `.wizard-button`, `.icon-button`, `.wizard-icon-button`, `.app-bottom-nav__item`, row and card buttons; wrap `:hover` rules in `@media (hover: hover)`.
4. **Native-web-view CSS**: `-webkit-tap-highlight-color: transparent`, `-webkit-touch-callout: none` on buttons and nav, `user-select: none` on chrome (not on text), `overscroll-behavior-y: none` on `html`.
5. **Calm the weight**: inputs, selects and formula labels from 800 to 600 or 500; titles stay 700. Do it as a global replace of 800 and 750 and 650 and 900 to 700 or 600, then look at three screens.
6. **History screen**: show Search and Filter only from about 6 bakes; turn the sync banner into one dismissible line; remove the dangling "·"; shrink the empty "Add a photo" card to a row.
7. **Fix the coach signed-out copy** (do not show "You have used all 5 coach questions" to a signed-out user) and the "Save recipe" versus "Update saved recipe" label.
8. **Make the wizard progress bar fill the content width** at 960px and up.
9. **Flatten the template list on Home**: remove the outer card, keep the six photo tiles.
10. **Delete the two unused tokens** (`--radius-button`, `--space-card`) and the dead classes (appendix).
11. **Merge the three browns** (`--color-accent`, `--color-primary-text-strong` into one of `--color-primary` and `--color-primary-text`) after checking contrast.
12. **Warm the Previous card in bake mode** (replace `--color-surface-neutral` with `--color-surface-muted`) and drop the green tint from `.dialog-card--success`.
13. **Dialog and sheet motion** (fade and slide, 200ms, inside `prefers-reduced-motion: no-preference`).
14. **Serve the template photos as WebP or AVIF at 2x of the displayed size** (six PNGs at about 1.6 MB total).

---

## 9. What a professional version of each screen looks like

- **Home:** one title at 30px, the promise in 14px secondary text, one filled New recipe button, then "Continue baking" if a session exists. Templates are a horizontal row of photo tiles (full-bleed images, name below, no inner card). Saved recipes are a short list of hairline rows.
- **Wizard:** the card holds the question, one-line help and the fields directly. Fields sit on hairlines with label on the left or above, control on the right, info as a quiet text-tertiary glyph. A live preview line under the inputs. Steppers as a single bordered group with the unit inside the field.
- **Summary:** recipe name as the title. Inputs as one grouped list with chevrons. Ingredients card as is. Formula breakdown as plain rows (label secondary, value primary). Assessment as a coloured one-line banner with a disclosure. Footer: one primary action, one secondary.
- **Schedule builder:** plan picker as radio cards with a visible selected mark; the timeline as a hairline list with a day spine and tap-a-step-to-edit; Customise as grouped rows that open in place; Export as a share-sheet style action.
- **Saved:** rows, not cards, with an overflow menu for Duplicate. Empty state with one illustration and "New recipe".
- **Recipe view:** as it is, plus the recipe name wrapped in the body (not truncated in the header) and optionally a hero photo from the last bake.
- **History:** photo-first rows with a rating dot, compact search, sync as a single line. Detail: photo at the top (or a quiet add-photo row), notes, tabbed or collapsible planned versus actual timings.
- **Bake mode:** as it is, with Previous in warm neutral, "Step 3 of 14" and the title on one line, the web banner dismissible per session, brand brown for "now" instead of green.
- **Dialogs and sheets:** one sheet with a grabber, a title, content, one primary button and a text Cancel; Bake complete without the green tint, photo first.

---

## 10. Things NOT worth doing yet

- A full redesign, a new logo or an illustration system. The palette and tone are the asset.
- A component library or a CSS framework (Tailwind, Material and the like). The problem is values, not tooling; CSS variables are enough and add no dependency.
- Animated page transitions between routes or a Lottie-style celebration on Bake complete. Pressed states, sheets and accordions first.
- Custom icon redraw. Normalise stroke to one or two weights and size the loaf icon properly; that is enough.
- Pixel-perfect tablet and desktop layouts before the owner decides whether the web build is a product (question 2).
- Dynamic Type support before the type scale exists.
- Per-screen light and dark art direction. Fix the tokens and both themes follow.

---

## 11. Phased plan, and how to run it in parallel without merge pain

`styles.css` is one file that every visual change touches, so parallel agents would collide on it. The order below removes that: do the file split and the shared primitives serially first, then fan out by feature file.

| Phase | Work | Who | Conflict risk | Estimate (inferred) |
| --- | --- | --- | --- | --- |
| 0 | Quick wins 1 to 8 (small, mostly independent, land one PR each in order) | One agent, serial | Low, each edit is a few lines | 1 to 2 days |
| 1 | Split `styles.css` into ordered files with no value changes; add new tokens beside old; screenshot baseline (light, dark; 390, 768) | One agent. Needs the owner's approval (CLAUDE.md: no broad refactors without approval) | None if nothing else is in flight. Freeze CSS work during this phase | 1 to 2 days |
| 2 | Primitives from tokens, in this order: type scale and weights, radius and spacing, elevation, then Button, IconButton, Card, Field, Select, Sheet. One PR per primitive, merged in order | One agent, serial. These change the global look, so they must land before features | Medium; this is the shared layer | 3 to 4 days |
| 3 | Screens in parallel, each agent owns a disjoint set of files: (A) wizard and fields, (B) summary, ingredients and assessment, (C) schedule builder and timeline, (D) Home, Saved, History and recipe view, (E) bake mode and dialogs and sheets. Each folds in overriding duplicates and deletes dead classes in its own files | Up to five agents | Low if the split exists: agents touch different `features/*.css` files and different `.tsx` folders. `tokens.css` is append-only and owned by the orchestrator. Shared components in `src/components/` are changed only in phase 2 | 3 to 5 days |
| 4 | Motion, pressed states on everything missed, iOS sheet polish, light and dark pass at 390 and 768, then one device pass | One agent plus the owner on a phone | Low | 2 days |

Rules that keep merges clean: merge primitives before any feature work; each agent opens one PR per feature file group; nobody edits `tokens.css` except the orchestrator; every PR carries before and after screenshots in light and dark; run `npm run build` and `npm test` before merging; delete old tokens only when grep shows zero uses.

---

## 12. Benchmarks (recollection only, not checked in this review)

I did not open any other app. From general knowledge: Apple's own apps (Reminders, Notes, Health) use grouped inset lists with hairlines, large collapsing titles, sheets with a grabber and 17pt body text; Things 3 and Bear are restrained, with a few weights and very little chrome; Paprika and Mela are plain recipe lists with a photo-led detail view; kitchen apps with a cook mode tend to use very large type and a single primary action. The common thread is one container level, a short type scale and visible pressed states. Treat this as direction, not research.

---

## 13. Open questions for the owner

1. **Brand direction:** keep "warm bakery" (cream, toffee, soft rounded cards) and refine it, or move to something crisper and more modern? My recommendation is keep and refine; the palette is the strongest asset.
2. **Webfont or system font?** Today it is effectively the system font (SF Pro on iPhone). A custom face for titles (for example a warm serif for the app name and screen titles only) adds character for tens of KB, a self-hosted file, and a flash-of-fallback risk. System font is free, fast and native. If you want a webfont, say which; I would not add one until the scale is in.
3. **Is the web or PWA build a product, or only the iOS app's engine?** It decides whether tablet and desktop layouts (problem 11) get any work.
4. **Native feel or branded feel on iOS?** Recommendation: branded colours, native behaviours (sheets, pressed states, motion).
5. **Keep blue for info and the coach, or move everything to brown and neutral?** Blue is the only cool hue and gives "help" a distinct meaning, but it fragments the palette.
6. **Is green "success only"?** Today it also means "now" (current step) and "starter". I propose brown for "now".
7. **Photography:** should the user's loaf photo become the hero of History and recipe cards? That changes the History design more than any token.
8. **Large collapsing titles and edge-swipe back:** worth the router and CSS work, or is the current in-page back button fine?
9. **Dynamic Type and larger text:** a stated goal for a kitchen app, or later?
10. **Order of work:** quick wins first (recommended), or start with the split and tokens?

---

## What I could not verify

- Anything on the iOS app or a physical device: safe areas on the Dynamic Island, sheet behaviour, pressed-state feel, the native bake timers, keep-awake, rendering of the loaf icon at device scale.
- VoiceOver and Dynamic Type.
- Signed-in screens (history with remote photos, cloud sync, the coach answering), Supabase flows, the Auth modal. I did not sign in or create accounts.
- Whether `:hover` really sticks after a tap in WKWebView (inferred from general knowledge).
- The Export button behind the footer fade on a real phone (seen in the emulated viewport only).
- A noted aside outside the UI scope: after loading `/build/schedule` directly in a fresh tab, the builder showed default values (80% hydration) rather than the wizard values and "Update recipe" overwrote the saved 76% recipe with 80%. I did not investigate whether this is a draft-persistence bug or a side effect of my direct-URL navigation, so treat it as unconfirmed.
- Effort estimates are my guesses, not measurements.

---

## Appendix: class names in `styles.css` with no reference in `src` (cleanup candidates)

Found by comparing every class selector in the CSS with the strings in all `.ts` and `.tsx` files and `index.html`. I re-checked 14 of them with a second script (0 hits in `.ts` and `.tsx`). Names that are built dynamically in JSX (about 22 modifier classes) are excluded. Verify each before deleting, and run `npm test` and a screenshot pass after.

`app-header--home-only`, `app-header__title`, `button-icon`, `companion__complete`, `companion__footer` (also in a grouped selector), `companion__time-separator`, `edit-chip-button`, `flour-alloc-field`, `flour-alloc-input`, `flour-alloc-suffix`, `flour-blend-total`, `flour-blend-total__warning`, `flour-context-banners`, `flour-gram-stepper`, `flour-summary-line`, `flour-summary-line__stack`, `hero__title-row`, `metadata-grid`, `recipe-view__amounts`, `recipe-view__totals`, `reference-chip__hint`, `reference-chip__label-row`, `reference-chip__value-row`, `return-to-summary`, `saved-recipe-card__delete`, `saved-recipes__create`, `saved-recipes__header`, `schedule-export__message`, `schedule-starter-prep__note`, `welcome-section__header--with-action`, `welcome-top-bar__action`, `welcome-top-bar__email`, `welcome-top-bar__label`, `wizard-icon-button--primary`, `wizard-nav--triple`, `wizard-shell__content`, `wizard-shell__footer` (also in a grouped selector), `wizard-step`.
