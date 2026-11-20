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
- There is no forced sign-in popup. After the first local saves, the History tab shows an optional hint on one line, "Saved on this device. Sign in to back up", with a dismiss button (only when Supabase is configured).

## Import after sign-in

When a signed-in user opens the app, bakes saved on this device are uploaded (`importLocalBakeHistory.ts`) after local recipes are imported, so each bake keeps its link to its recipe. Each local copy is removed only after its upload succeeded. A bake already in the account (same recipe name and completion time) is not uploaded twice. If the upload fails, the bakes stay on this device and History shows an error with "Try again".

## History screen

- A list of completed bakes. Each row has a square thumbnail (a loaf icon when there is no photo), the recipe name, the baked date and assessment, and one muted line from the bake's recipe snapshot: hydration, loaf size and flour, for example `78% · 900 g · Wheat Type 1050` or `75% · 2 × 450 g · 70% Wheat Type 1050 + 30% Whole wheat`. Loaf size is the weight per loaf when there are several loaves, otherwise the dough weight. The line is built by `buildBakeSummaryLine` (`lib/history/bakeSummaryLine.ts`); the summary carries `recipeFacts` for both signed-in and signed-out lists, and older rows simply skip the parts they lack. Search and Filter appear only from six bakes (`shouldShowHistorySearch`); a shorter list needs neither. Search matches the recipe name and notes; the filter narrows by assessment (Great loaf, OK, Needs work, No assessment). The date and the assessment each sit on their own line, so no separator can dangle. On the detail screen a bake with no photo shows one compact "Add a photo of your loaf" button instead of an empty card.
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
- Old bakes and bakes without a photo have no `photoPath` and show no photo.
- **Thumbnails.** When a photo is saved, a small thumbnail (about 320 px, JPEG, under about 20 KB; `createBakePhotoThumbnail`) is saved next to it: in the bucket at `<user_id>/<bake_id>_thumb.jpg` (same private bucket and folder, so the existing storage policies cover it and no migration is needed), and in IndexedDB under `<bake_id>:thumb` for signed-out bakes. The History list loads only thumbnails, so it does not download full photos; the detail screen loads the full photo (tap to enlarge). A bake without a thumbnail (photos from before thumbnails, or a thumbnail that failed to save) falls back to the full photo in the list. Import after sign-in and the upload retry carry the thumbnail along, and make one for older on-device photos that lack it.
- **Add, replace or remove from the detail screen.** The "Loaf photo" card on a bake's detail screen offers "Add a photo of this loaf" (no photo yet), or "Replace photo" and "Remove photo" (with confirmation). It reuses the same picker as the Bake complete dialog (compressed on the device, then **Save photo**). Replacing uploads the new photo and thumbnail over the same paths, so the old objects are overwritten only once the new ones are in. Messages are non-blocking and worded like the save flow: if adding while signed in fails to upload, the photo is kept on this device and retried when History loads; if replacing fails, the previous photo stays and the message says so (nothing is queued, since a retry could not tell the new photo from the old one). Removing clears `photo_path` first, then deletes the photo and thumbnail objects.
- **Deleting a bake** deletes both objects (and both on-device copies when signed out).

Needs the `bake_photos` migration on the Supabase project before the app update ships; see [Supabase operations](../engineering/supabase-ops.md#bake-photos-supabase-storage).

## Ideas not built yet

- "Tweak recipe from notes": prefill recipe changes from a bake's notes.
- Photo comparison between bakes.
- Creating thumbnails for photos saved before thumbnails existed (they use the full photo in the list until the bake gets a new photo).
