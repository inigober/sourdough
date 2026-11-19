---
title: Bake history
status: current
date: 2026-11-19
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

## History screen

- A list of completed bakes with the recipe name, the baked date, and the loaf assessment. Search matches the recipe name and notes; the filter narrows by assessment (Great loaf, OK, Needs work, No assessment).
- The detail view shows notes and assessment (editable with the pen), the recipe snapshot and ingredient list, the planned schedule, step timings with start drift, **Bake again**, and Delete (with confirmation).
- The bake snapshot is what was baked, not the saved recipe as it is today, so later edits to the recipe never rewrite history.

## Retention

- **Bake again** (history detail) opens the "When are you mixing?" dialog with the recipe and schedule exactly as that bake was done (`buildBakeAgainStart`). If the original saved recipe was deleted, the new bake is not linked to it.
- Saved recipe cards show "Baked Nx · last: <assessment>" from history (`buildRecipeBakeStats`).

## Loaf photo

An optional photo of the finished loaf, added in the Bake complete dialog ("Add a photo of your loaf").

- The photo is compressed on the device when chosen (JPEG, longest side about 1280 px, under about 250 KB; `compressBakePhoto.ts`) and the dialog previews exactly what will be saved. It is held in the dialog until **Save bake** and is not written into the bake session, so closing the dialog drops it.
- **Signed out:** the photo is stored in IndexedDB on this device (`localBakePhotoStorage.ts`), keyed by the local bake id.
- **Signed in:** the photo is uploaded to the private Supabase Storage bucket `bake-photos` at `<user_id>/<bake_id>.jpg`, and the path is stored in `bake_sessions.photo_path`. It is shown through short-lived signed links.
- **The bake is saved first.** If the photo upload fails, the bake is still saved, a short message appears, and the photo is kept on this device and retried each time History loads (`retryPendingPhotoUploads`).
- **Import after sign-in** moves each local photo to the account. The on-device copy is deleted only after its upload succeeded; if the upload fails, the photo stays on this device under the account bake's id and is retried later.
- **Deleting a bake** deletes its photo (on this device, and in the bucket).
- Old bakes and bakes without a photo have no `photoPath` and show no photo.
- Photos show as a small thumbnail in the History list and full width on the bake detail screen (tap to enlarge). Adding or replacing a photo on an existing bake is not built yet.

Needs the `bake_photos` migration on the Supabase project before the app update ships; see [Supabase operations](../engineering/supabase-ops.md#bake-photos-supabase-storage).

## Ideas not built yet

- "Tweak recipe from notes": prefill recipe changes from a bake's notes.
- Photo comparison between bakes.
- Adding, replacing or removing a photo from the history detail screen.
