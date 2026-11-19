---
title: Bake history
status: active
---

# Bake history

History works without an account. A finished bake is never lost.

## Where a bake is saved

| State | Saved to | Code |
| --- | --- | --- |
| Signed out | This device (`localStorage`, key `sourdough:bake-history:v1`) | `lib/history/localBakeHistoryStorage.ts` |
| Signed in | Supabase (`bake_sessions`, `bake_session_steps`) | `lib/history/remoteBakeHistoryStorage.ts` |

Both use the same `BakeHistorySession` shape (`lib/history/types.ts`), so a local bake can be uploaded as is. `saveCompletedBake.ts` picks the destination; `useBakeHistory` reads and edits whichever store applies.

Local rows are normalized on read (older or partial shapes get defaults, unusable rows are skipped), per the persisted-data rule in CLAUDE.md.

## Bake complete dialog

- **Save bake** saves (locally or remotely) and only then deletes the bake session.
- **X, Escape, backdrop** mean "not now": the bake session is kept and shows up as "Resume baking" on Home.
- **Don't save** asks for confirmation ("Don't save this bake?") and is the only path that deletes an unsaved bake.
- A failed save (network, storage full) shows the error and keeps the session.
- There is no forced sign-in popup. After the first local saves, the History tab shows an optional, dismissible "Sign in to back up" hint (only when Supabase is configured).

## Import after sign-in

When a signed-in user opens the app, bakes saved on this device are uploaded (`importLocalBakeHistory.ts`) after local recipes are imported, so each bake keeps its link to its recipe. Each local copy is removed only after its upload succeeded. A bake already in the account (same recipe name and completion time) is not uploaded twice. If the upload fails, the bakes stay on this device and History shows an error with "Try again".

## Retention

- **Bake again** (history detail) opens the "When are you mixing?" dialog with the recipe and schedule exactly as that bake was done (`buildBakeAgainStart`). If the original saved recipe was deleted, the new bake is not linked to it.
- Saved recipe cards show "Baked Nx · last: <assessment>" from history (`buildRecipeBakeStats`).

Not built yet (awaiting owner decisions): loaf photo, "tweak recipe from notes".
