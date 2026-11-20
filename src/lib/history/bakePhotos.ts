import type { BakePhotoStore } from './localBakePhotoStorage.ts';

/**
 * Uploads a photo (and its small list thumbnail, when there is one) to the account and records the
 * photo on the bake. Throws when the photo itself fails; a thumbnail problem is not an error,
 * because the list falls back to the full photo.
 */
export type UploadRemoteBakePhoto = (
  userId: string,
  bakeId: string,
  photo: Blob,
  thumbnail: Blob | null,
) => Promise<void>;

/** Makes the small list thumbnail from a photo. Returns null when it cannot (never throws). */
export type MakeBakePhotoThumbnail = (photo: Blob) => Promise<Blob | null>;

/**
 * What happened to a photo chosen for a bake (when saving it, or later from its detail screen).
 * The bake itself is always saved first.
 * - `uploaded`: in the account.
 * - `kept-on-device`: stored on this device (signed out, or the upload failed and will be retried).
 * - `unchanged`: the upload failed and the bake already had a photo, which stays as it was.
 * - `lost`: could not be stored anywhere; the bake is saved without it.
 */
export type BakePhotoOutcome = 'none' | 'uploaded' | 'kept-on-device' | 'unchanged' | 'lost';

export type BakePhotoContext = 'new-bake' | 'existing-bake';

export function describePhotoOutcome(
  outcome: BakePhotoOutcome,
  wasSignedIn: boolean,
  context: BakePhotoContext = 'new-bake',
): string | null {
  if (outcome === 'lost') {
    return context === 'new-bake'
      ? "Your bake is saved, but the photo couldn't be kept. You can try another photo next time."
      : "The photo couldn't be kept. You can try another photo.";
  }

  if (outcome === 'unchanged') {
    return "The new photo couldn't be uploaded, so your previous photo is unchanged. Please try again.";
  }

  if (outcome === 'kept-on-device' && wasSignedIn) {
    return context === 'new-bake'
      ? "Your bake is saved. The photo hasn't uploaded yet; we'll try again when you open History."
      : "The photo hasn't uploaded yet; we'll try again when you open History.";
  }

  return null;
}

/** A thumbnail is optional: a failure to make one just means the full photo is used in the list. */
async function makeThumbnailOrNull(
  photo: Blob,
  makeThumbnail: MakeBakePhotoThumbnail | undefined,
): Promise<Blob | null> {
  if (!makeThumbnail) {
    return null;
  }

  try {
    return await makeThumbnail(photo);
  } catch {
    return null;
  }
}

/**
 * Stores a photo for a bake that already exists: a bake that was just saved, or an existing one
 * getting a photo added or replaced. Never throws: a photo problem must not turn a saved bake
 * into a failed save.
 *
 * Signed in: uploads to the account (overwriting any earlier photo at the same path, so the old
 * objects are replaced only once the new ones are in). If the upload fails, a bake without a
 * photo keeps the new one on this device for a later retry; a bake that already has a photo
 * reports `unchanged`, because a later retry could not tell the pending photo from the old one.
 * Signed out: stores on this device.
 */
export async function savePhotoForBake(options: {
  photo: Blob;
  bakeId: string;
  userId: string | null;
  /** True when the account already holds a photo for this bake (replacing, not adding). */
  hadRemotePhoto?: boolean;
  store: BakePhotoStore;
  uploadRemote: UploadRemoteBakePhoto;
  makeThumbnail?: MakeBakePhotoThumbnail;
}): Promise<BakePhotoOutcome> {
  const { photo, bakeId, userId, hadRemotePhoto = false, store, uploadRemote, makeThumbnail } = options;
  const thumbnail = await makeThumbnailOrNull(photo, makeThumbnail);

  if (userId) {
    try {
      await uploadRemote(userId, bakeId, photo, thumbnail);
      // A copy still waiting on this device is older than this photo; drop it so a retry
      // cannot overwrite the new photo.
      await store.remove(bakeId).catch(() => undefined);
      return 'uploaded';
    } catch {
      if (hadRemotePhoto) {
        return 'unchanged';
      }
      // Fall through: keep the photo on this device so it can be uploaded later.
    }
  }

  try {
    await store.put(bakeId, photo, thumbnail);
    return 'kept-on-device';
  } catch {
    return 'lost';
  }
}

/**
 * Removes a bake's photo and thumbnail. Signed in: from the account first (if that fails nothing
 * else is touched), then any copy waiting on this device. Signed out: from this device.
 * Never throws.
 */
export async function removePhotoFromBake(options: {
  bakeId: string;
  userId: string | null;
  store: BakePhotoStore;
  removeRemote: (userId: string, bakeId: string) => Promise<void>;
}): Promise<'removed' | 'failed'> {
  const { bakeId, userId, store, removeRemote } = options;

  try {
    if (userId) {
      await removeRemote(userId, bakeId);
    }
    await store.remove(bakeId);
    return 'removed';
  } catch {
    return 'failed';
  }
}

export function describePhotoRemoval(result: 'removed' | 'failed'): string | null {
  return result === 'failed' ? "The photo couldn't be removed. Please try again." : null;
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
  /** Makes a thumbnail for photos saved on this device before thumbnails existed. */
  makeThumbnail?: MakeBakePhotoThumbnail;
}): Promise<void> {
  const { userId, localBakeId, remoteBakeId, remoteHasPhoto, store, uploadRemote, makeThumbnail } =
    options;

  try {
    const photo = await store.get(localBakeId);
    if (!photo) {
      return;
    }

    if (remoteHasPhoto) {
      await store.remove(localBakeId);
      return;
    }

    const thumbnail =
      (await store.getThumbnail(localBakeId)) ?? (await makeThumbnailOrNull(photo, makeThumbnail));

    try {
      await uploadRemote(userId, remoteBakeId, photo, thumbnail);
      await store.remove(localBakeId);
    } catch {
      await store.put(remoteBakeId, photo, thumbnail);
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
  makeThumbnail?: MakeBakePhotoThumbnail;
}): Promise<number> {
  const { userId, remoteBakes, store, uploadRemote, makeThumbnail } = options;
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

      const thumbnail =
        (await store.getThumbnail(bake.id)) ?? (await makeThumbnailOrNull(photo, makeThumbnail));

      try {
        await uploadRemote(userId, bake.id, photo, thumbnail);
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
