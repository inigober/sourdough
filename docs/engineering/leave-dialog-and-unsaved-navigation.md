---
title: Leave dialog and unsaved navigation
status: decided
---

# Leave dialog and unsaved navigation

This doc explains how the “Save changes?” / “Save recipe” leave flow works, and how to debug reports that **dialog buttons need two clicks** or **Discard changes does nothing on the first try**.

## User flow

Typical path from schedule builder:

```text
[Home] with unsaved edits
       │
       ▼
LeaveRecipeDialog (mode: unsaved) — “Save changes?”
       │
       ├─ Save recipe ──► mode switches to save (same dialog shell) or async save if already saved
       ├─ Discard changes ──► restore state + navigate home
       └─ Keep editing ──► close dialog, stay on builder
```

A separate `SaveRecipeDialog` (footer “Save recipe”, start-bake flow) uses the same `DialogCard` shell but is not part of the leave flow.

## Where the code lives

| Concern | File |
| --- | --- |
| Leave flow state (`leaveDialogMode`, discard flag, blocker) | `src/features/recipe-builder/useAppLocation.ts` |
| Combined unsaved + save-before-leave UI | `src/features/recipe-builder/LeaveRecipeDialog.tsx` |
| Modal shell (`<dialog>`, portal, `showModal`) | `src/components/DialogCard.tsx` |
| Dirty check | `src/lib/recipe/isRecipeDirty.ts` |
| When navigation is blocked | `src/features/recipe-builder/appRoutes.ts` → `shouldBlockUnsavedNavigation` |
| Blocker side-effect (re-open dialog) | `useAppNavigation` `useEffect` on `blocker.state` |

## Two different bug classes (do not confuse them)

Symptoms sound the same (“I had to click twice”) but the causes are different.

### 1. Click / modal timing (Save recipe, Cancel, etc.)

**Symptom:** First tap on a dialog button is ignored or the dialog flashes closed; second tap works.

**Typical causes:**

- Opening or swapping modals in the **same event turn** as the opening click, so the click “falls through” to a backdrop or the page underneath.
- Unmounting one `<dialog>` and mounting another during a button action (unsaved → save).
- Calling `showModal()` in `useEffect` **after paint** instead of `useLayoutEffect` before paint.
- `pointer-events: none` on the modal during a “mount guard” — clicks pass through to the page (made web worse).

**What fixed it:**

1. **`LeaveRecipeDialog`** — one `DialogCard` for both `unsaved` and `save` modes. Switching modes updates content only; the `<dialog>` element does not unmount.
2. **`DialogCard`** — native `<dialog>` with `showModal()` in **`useLayoutEffect`**, rendered via **`createPortal(..., document.body)`**.
3. Plain `onClick` handlers on buttons (no microtask/`setTimeout` deferral wrappers).
4. Backdrop dismiss via native `click` listener where `event.target === dialog`.

**Approaches that did not help (avoid re-adding without a new reason):**

- `queueMicrotask` / `setTimeout(0)` to defer dialog open or button actions.
- `BACKDROP_DISMISS_GRACE_MS` and pointer-started-inside tracking alone.
- Blocking all pointer events for animation frames after mount.

### 2. Route blocker after Discard (Discard changes only)

**Symptom:** Save recipe works; **Discard changes** seems to need two clicks, or the “Save changes?” dialog immediately reappears.

**Cause:** This is usually **not** a click bug. On discard:

1. `restoreToDefaults()` / `restoreFromSavedRecipe()` schedules React state updates.
2. `finishLeaving()` calls `routes.toHome()` in the same synchronous turn.
3. Navigation is still from `/build/schedule` (or another builder path). `isRecipeDirty()` can still be **true** — e.g. for a new draft, `phase !== 'wizard'` until the route actually changes.
4. `useBlocker` blocks the navigation.
5. `useEffect` on `blocker.state === 'blocked'` sets `leaveDialogMode` back to `'unsaved'` → dialog reopens.

The first discard **did** run; the dialog came back because navigation was blocked.

**What fixed it:**

- `isDiscardingChangesRef` in `useAppLocation.ts`, set `true` at the start of `discardUnsavedChanges`.
- `shouldBlockRouteChange` returns `false` while that ref is set.
- Ref cleared when `pathname` leaves builder routes (`!isBuilderPath(pathname)`).

**Related bug:** `confirmSaveRecipe` must read `pendingGoHomeAfterSave` **before** `closeSaveDialog()` clears it.

## Debugging checklist

1. **Which button fails?** Save / Cancel / Discard / Keep editing — discard-only issues point to the route blocker (class 2).
2. **New draft vs saved recipe?** New draft discard stays “dirty” by phase until navigation completes; saved recipe discard can clear dirty via `restoreFromSavedRecipe`.
3. **Home vs tab navigation?** `goHome` opens the dialog without navigating. Tab/history uses `useBlocker` and `blocker.proceed()` on leave.
4. **In DevTools:** After one Discard click, check if URL changed. If not and dialog reopens → blocker (class 2). If URL changed but action wrong → state restore bug.
5. **Do not add mount guards** that set `pointer-events: none` on the whole modal — buttons become unclickable and clicks pass through.

## Rules for future changes

- **Leave flow (unsaved ↔ save):** keep a single modal shell; do not mount two `DialogCard`s for that transition.
- **Modal open:** `useLayoutEffect` + `showModal()`; portal to `document.body`.
- **Discard + navigate:** either bypass the blocker during intentional discard (current ref), or defer navigation until `!isRecipeDirty` after restore — do not call `routes.toHome()` synchronously right after restore without one of these.
- **Standalone save dialog** (footer, bake flow): separate `SaveRecipeDialog` is fine; opening from a click still benefits from `DialogCard`’s layout-effect `showModal`.

## Changelog

| Date | Issue | Resolution |
| --- | --- | --- |
| 2026-07 | Double-click on save/leave dialogs | Single `LeaveRecipeDialog`, native `<dialog>` + `useLayoutEffect` portal |
| 2026-07 | Discard changes reopens dialog | `isDiscardingChangesRef` skips blocker during discard |
