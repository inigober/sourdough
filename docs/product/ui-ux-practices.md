---
title: UI/UX Practices
status: active
---

# UI/UX Practices

Baseline interaction and layout standards for this app. Use these when building or changing UI.

For product-specific screen flows, see [UX](./ux.md).

## How To Use This Doc

**Default:** Follow these practices unless there is a good reason not to.

**Override:** If you want to break a practice, say so explicitly in your request — for example:

> "Build X, but override: no click-outside dismiss — I want the panel to stay open."

That flags an intentional product choice so we can discuss tradeoffs once instead of re-litigating basics every session.

**When the agent should stop and ask:** If a request conflicts with a practice and you did not mention an override, the agent should flag the conflict before implementing.

---

## Mobile-First Layout

| Practice | Why |
| --- | --- |
| Design for narrow screens first; enhance at wider breakpoints. | Most baking use is on a phone in the kitchen. |
| Related short fields (e.g. dough weight + loaf count) may sit side by side from ~640px up. | Reduces scrolling on desktop without hurting mobile. |
| Multi-field steps and summary cards use responsive columns on desktop (typically 2 cols from 640px, 3 cols for summary groups from 960px). | Better use of horizontal space on wider screens. |
| Long forms use a sticky step header (progress) and sticky footer (Back / Continue). | Navigation stays reachable while scrolling. |
| Popovers, tooltips, and info bubbles clamp to page margins (~20px). | Prevents content clipping off-screen at edges. |

**Override example:** A step intentionally uses a single-column layout on all breakpoints for emphasis.

---

## Interaction Patterns

| Practice | Why |
| --- | --- |
| Info bubbles / popovers close on click outside. | Expected dismiss behavior; reduces trapped overlays. |
| Info bubbles / popovers close on Escape when focused. | Keyboard and screen-reader users need a clear exit. |
| Toggle buttons (including info `i`) open and close on repeat click. | Predictable control behavior. |
| Only one info bubble open at a time is acceptable; closing outside is enough for now. | Avoid over-engineering unless overlap becomes a problem. |
| Destructive actions require a clear, distinct control — not the same symbol as a quantity stepper. | Prevents accidental deletes (e.g. bin for remove, not `−`). |
| Primary navigation actions belong in consistent locations (footer in wizard, clear CTA on welcome). | Reduces hunt time. |
| Wizard footer buttons are labelled text buttons ("Back", "Continue", "View summary" on the last step), not icon-only circles. The accessible name is the visible text. | A label is faster to read than a chevron, and speech-control users can say what they see. |

**Override example:** A comparison panel that must stay open while editing multiple fields — skip click-outside dismiss and say why.

---

## Affordances And Icons

| Practice | Why |
| --- | --- |
| Edit → pen icon (with `aria-label`). | Compact, widely understood; better than text "Edit" in tight rows. |
| Delete / remove → bin/trash icon (with `aria-label`). | Must not look like a numeric decrement button. |
| `+` / `−` are for numeric steppers only. | One symbol, one meaning. |
| Icon-only buttons always have an accessible name (`aria-label` or visible text). | Icons alone are not readable to everyone. |
| Every tappable control has a hit area of at least 44x44 CSS px. The visual size may be smaller: add the control to the "Touch targets" block at the end of `styles.css` (an invisible `::after`) instead of enlarging it. | Easier to tap on mobile with floury hands; 44px is Apple's guideline. |
| Numeric steppers are a `−` button, the value and a `+` button in one row, each button a full 44px square. Stacked up/down chevrons cannot reach 44px. | One symbol, one meaning, and a tappable size. |

**Override example:** A list row uses a text "Remove" link instead of an icon for clarity in a destructive confirmation flow.

---

## Info, Copy, And Progressive Disclosure

| Practice | Why |
| --- | --- |
| Field-level info (`i`) is for non-obvious or contextual detail — not restating the label. | Reduces noise; keeps toggles worth tapping. |
| Step-level onboarding context belongs in visible body copy when it sets expectations (e.g. welcome screen). | Users should not need an extra tap to understand what the app does. |
| Info copy must match what the app actually calculates on that step. | Wrong attribution erodes trust (e.g. do not say salt drives total flour on the flour step if the user has not set salt yet). |
| Hide expert detail behind info toggles; keep primary labels and values scannable. | Aligns with the "clarity over speed" goal. |
| Prefer plain language over jargon; explain baker's percentages when first introduced. | PM learning goal + broader audience. |

**Override example:** Welcome screen uses a dedicated info toggle again because the body copy should stay minimal.

---

## Multi-Step Wizard

| Practice | Why |
| --- | --- |
| Welcome / gate screens are excluded from step count and progress bar. | Progress reflects input work, not marketing copy. |
| Progress shows segment fill + "N of M" + current step name. | User always knows where they are. |
| Live calculated previews belong inside the step content — labeled, below the inputs — not as header chips. | Header tags without context look like noise; previews need a title and explanation. |
| Back preserves entered state. | Avoids punishment for reviewing earlier steps. |
| Results / summary remains editable via clear entry points back into steps. | The summary is a control surface, not a dead end. |

**Override example:** A future "quick mode" skips the wizard entirely — document as a separate flow.

---

## Forms And Validation

| Practice | Why |
| --- | --- |
| Labels stay visible; placeholders are not a substitute for labels. | Accessibility and clarity when values are filled. |
| Validation messages appear next to the affected field. | User knows what to fix without scanning the whole form. |
| Blocking errors prevent Continue only when calculation or the step's required input is impossible. | Warnings inform; errors gate. |
| Never silently clamp or revert what the user typed. Keep their text, show the message next to the field once they leave it, and gate Continue. | Silent rewrites hide mistakes (150% hydration became 110%). |
| Numeric fields use appropriate `min`, `max`, `step`, and suffix (`g`, `%`, `h`, `°C`). | Reduces garbage input and ambiguity. |

---

## Accessibility Basics

| Practice | Why |
| --- | --- |
| Visible focus styles on interactive elements. | Keyboard navigation must be obvious. |
| Semantic controls: `button` for actions, `label` for fields, `nav` for step navigation. | Correct roles for assistive tech. |
| Meaningful heading hierarchy (`h1` → `h2`) per screen. | Screen readers use headings to navigate. |
| Do not rely on color alone for errors/warnings. | Include text and/or iconography. |
| Text is at least 4.5:1 against its background in both the light and the dark palette. Check new colour pairs with a contrast script before adding them. | WCAG AA; kitchens are bright or dark and floury fingers are not precise. |
| Never dim text with `opacity` to de-emphasise it; pick a muted colour token that still passes 4.5:1. | Opacity silently lowers contrast (the old Previous card was 55%). |
| Honour `prefers-reduced-motion`: transitions are switched off in one block at the end of `styles.css`; JS must not force `behavior: 'smooth'` without checking the setting. | Motion can cause discomfort and an explicit smooth scroll ignores the CSS rule. |
| A control's visible text must be part of its accessible name (`aria-label` contains the visible label). | Voice Control and screen-reader users refer to controls by what they see. |

---

## Colour And Dark Mode

The app follows the system setting (`prefers-color-scheme`); there is no in-app switch yet.

| Practice | Why |
| --- | --- |
| Every colour in `styles.css` is a CSS variable defined in `:root`. No hex or `rgb()` literals in rules. | Dark mode only works if one place owns each colour. |
| Add a new colour as a token in `:root` AND in the dark block (`@media (prefers-color-scheme: dark)`, right below `:root`). | A token missing from the dark block stays light and shows up as a white patch. |
| Brown is two tokens: `--color-primary` is a fill (buttons, switches; white text on it), `--color-primary-text` is brown used as text, borders or rings on a surface. Use the second for text. | In dark mode the text brown is lighter, the fill brown is unchanged. |
| Soft grey-brown text is `--color-text-subtle` (4.5:1 or better on every surface); do not introduce lighter greys for text. | The old `#9a8776` was 3.07:1. |
| Overlays use `--color-scrim`, shadows use `--shadow-color-*`. Sticky header and footer fades are built from `--color-bg-rgb`, so they follow the palette. | Prevents a light haze over a dark page. |
| `color-scheme: light dark` is set on `:root`, `index.html` has a `theme-color` per scheme. The PWA manifest keeps one light colour (manifests cannot switch by scheme). | Native controls, scrollbars and the browser chrome match. |

Light and dark ratios were checked with a throwaway script over the main text/surface pairs (all at least 4.5:1). Re-check after changing a token.

---

## Visual Hierarchy

| Practice | Why |
| --- | --- |
| One primary action per screen or footer bar. | Clear next step. |
| Secondary actions visually lighter (e.g. Back). | Reduces competition with Continue. |
| Cards group related content; avoid nested cards without purpose. | Scannable layout on small screens. |
| Collapse advanced or secondary detail on results (e.g. formula breakdown) when it supports scanning. | Summary first, detail on demand. |

---

## Agent Checklist Before Shipping UI

When adding or changing UI, verify:

1. Mobile width (~375px): nothing clips; footer reachable; popovers inside margins.
2. Desktop width (~960px): paired fields and context strips use space sensibly.
3. Info bubble: opens under trigger, closes on outside click (and Escape if implemented).
4. Icons: edit/delete/stepper meanings are distinct; icon buttons have labels.
5. Copy: info text is accurate for the current step and calculation.
6. Overrides: if the user’s request breaks a practice, confirm explicitly rather than silently diverging.
7. Dark mode: view the screen with the system set to dark (or the browser's `prefers-color-scheme` emulation) and look for white patches or unreadable text.
8. Touch targets: every new control is at least 44x44 tappable.

---

## Changelog

Add a line here when a practice is added or changed after a product discussion.

- 2026-05-20: Initial doc from wizard, info bubbles, flour step, and responsive field patterns.
- 2026-05-20: Removed header preview chips; live previews belong in step content with labels.
- 2026-11-19: Forms never silently clamp or revert typed numbers; messages show on blur.
- 2026-11-19: Accessibility pass: full dark theme following the system setting; text contrast at least 4.5:1; 44px hit areas; labelled Back/Continue; steppers are − value + in one row; reduced motion honoured.
