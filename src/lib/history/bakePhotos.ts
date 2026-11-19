import type { BakePhotoStore } from './localBakePhotoStorage.ts';

/** Uploads a photo to the account and records it on the bake. Throws when it fails. */
export type UploadRemoteBakePhoto = (userId: string, bakeId: string, photo: Blob) => Promise<void>;

/**
 * What happened to the photo chosen when saving a bake. The bake itself is always saved first.
 * - `uploaded`: in the account.
 * - `kept-on-device`: stored on this device (signed out, or the upload failed and will be retried).
 * - `lost`: could not be stored anywhere; the bake is saved without it.
 */
export type BakePhotoOutcome = 'none' | 'uploaded' | 'kept-on-device' | 'lost';

export function describePhotoOutcome(
  outcome: BakePhotoOutcome,
  wasSignedIn: boolean,
): string | null {
  if (outcome === 'lost') {
    return "Your bake is saved, but the photo couldn't be kept. You can try another photo next time.";
  }

  if (outcome === 'kept-on-device' && wasSignedIn) {
    return "Your bake is saved. The photo hasn't uploaded yet; we'll try again when you open History.";
  }

  return null;
}

/**
 * Stores the photo for a bake that was just saved. Never throws: a photo problem must not turn
 * a saved bake into a failed save.
 */
export async function savePhotoForNewBake(options: {
  photo: Blob;
  bakeId: string;
  userId: string | null;
  store: BakePhotoStore;
  uploadRemote: UploadRemoteBakePhoto;
}): Promise<BakePhotoOutcome> {
  const { photo, bakeId, userId, store, uploadRemote } = options;

  if (userId) {
    try {
      await uploadRemote(userId, bakeId, photo);
      return 'uploaded';
    } catch {
      // Fall through: keep the photo on this device so it can be uploaded later.
    }
  }

  try {
    await store.put(bakeId, photo);
    return 'kept-on-device';
  } catch {
    return 'lost';
  }
}

/**
 * Moves the photo of a bake imported after sign-in into the account. The on-device copy under the
 * old local id is removed only after the upload succeeded. If the upload fails, the photo is kept
 * on this device under the account's bake id, because the local bake itself is removed by the
 * import; `retryPendingPhotoUploads` uploads it later.
 */
export async function moveLocalPhotoToAccount(options: {
  userId: string;
  localBakeId: string;
  remoteBakeId: string;
  remoteHasPhoto: boolean;
  store: BakePhotoStore;
  uploadRemote: UploadRemoteBakePhoto;
}): Promise<void> {
  const { userId, localBakeId, remoteBakeId, remoteHasPhoto, store, uploadRemote } = options;

  try {
    const photo = await store.get(localBakeId);
    if (!photo) {
      return;
    }

    if (remoteHasPhoto) {
      await store.remove(localBakeId);
      return;
    }

    try {
      await uploadRemote(userId, remoteBakeId, photo);
      await store.remove(localBakeId);
    } catch {
      await store.put(remoteBakeId, photo);
      await store.remove(localBakeId);
    }
  } catch {
    // Storage trouble: leave the photo where it is. The bake import carries on without it.
  }
}

/**
 * Uploads photos still waiting on this device for bakes that exist in the account but have no
 * photo yet (an earlier upload failed). Returns how many were uploaded. Never throws.
 */
export async function retryPendingPhotoUploads(options: {
  userId: string;
  remoteBakes: Array<{ id: string; photoPath?: string }>;
  store: BakePhotoStore;
  uploadRemote: UploadRemoteBakePhoto;
}): Promise<number> {
  const { userId, remoteBakes, store, uploadRemote } = options;
  let uploaded = 0;

  try {
    const waitingIds = new Set(await store.keys());
    if (waitingIds.size === 0) {
      return 0;
    }

    for (const bake of remoteBakes) {
      if (!waitingIds.has(bake.id)) {
        continue;
      }

      if (bake.photoPath) {
        // Already in the account (for example the upload worked but the cleanup did not).
        await store.remove(bake.id);
        continue;
      }

      const photo = await store.get(bake.id);
      if (!photo) {
        continue;
      }

      try {
        await uploadRemote(userId, bake.id, photo);
        await store.remove(bake.id);
        uploaded += 1;
      } catch {
        // Still offline or over quota: leave it for the next time History loads.
      }
    }
  } catch {
    return uploaded;
  }

  return uploaded;
}
