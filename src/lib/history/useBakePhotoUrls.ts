import { useEffect, useMemo, useState } from 'react';

import { getBakePhotoThumbnailPath } from './bakePhotoPath.ts';
import { getDefaultBakePhotoStore } from './localBakePhotoStorage.ts';
import { createRemoteBakePhotoUrls } from './remoteBakePhotoStorage.ts';

export type BakePhotoRef = {
  id: string;
  /** Set when the photo is in the account's private bucket. */
  photoPath?: string;
};

export type UseBakePhotoUrlsOptions = {
  /**
   * `thumbnail` (the list) asks for the small picture and falls back to the full photo for bakes
   * that have none; `full` (the detail screen, the default) always asks for the full photo.
   */
  size?: 'thumbnail' | 'full';
  /** Change it to look the photos up again, for example after a photo was added or replaced. */
  version?: number;
};

/**
 * Finds a displayable URL for each bake's photo (bake id -> URL). Photos in the account are
 * shown through short-lived signed links, all signed in one request. Photos kept on this device
 * (signed out, or waiting for an upload) are read from IndexedDB. Bakes without a photo are
 * simply absent from the result, and any lookup trouble just means "no photo shown".
 */
export function useBakePhotoUrls(
  bakes: BakePhotoRef[],
  { size = 'full', version = 0 }: UseBakePhotoUrlsOptions = {},
): Map<string, string> {
  const [urls, setUrls] = useState<Map<string, string>>(() => new Map());

  // Re-run only when the set of bakes or their photo paths actually changes.
  const lookupKey = useMemo(
    () => `${size}|${version}|${bakes.map((bake) => `${bake.id}|${bake.photoPath ?? ''}`).join(',')}`,
    [bakes, size, version],
  );

  useEffect(() => {
    let isCancelled = false;
    const objectUrls: string[] = [];

    async function load(): Promise<void> {
      const found = new Map<string, string>();

      const remoteBakes = bakes.filter((bake) => bake.photoPath);
      if (remoteBakes.length > 0) {
        try {
          const signed = await signPhotoUrls(remoteBakes, size);
          for (const bake of remoteBakes) {
            const url = signed.get(bake.id);
            if (url) {
              found.set(bake.id, url);
            }
          }
        } catch {
          // No photo shown; the rest of the bake still works.
        }
      }

      const bakesWithoutUrl = bakes.filter((bake) => !found.has(bake.id));
      if (bakesWithoutUrl.length > 0) {
        try {
          const store = getDefaultBakePhotoStore();
          const storedIds = new Set(await store.keys());

          for (const bake of bakesWithoutUrl) {
            if (!storedIds.has(bake.id)) {
              continue;
            }

            const photo =
              (size === 'thumbnail' ? await store.getThumbnail(bake.id) : null) ??
              (await store.get(bake.id));
            if (photo) {
              const objectUrl = URL.createObjectURL(photo);
              objectUrls.push(objectUrl);
              found.set(bake.id, objectUrl);
            }
          }
        } catch {
          // IndexedDB unavailable: no on-device photos shown.
        }
      }

      if (isCancelled) {
        objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
        return;
      }

      setUrls(found);
    }

    void load();

    return () => {
      isCancelled = true;
      objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
    };
    // `bakes` is covered by lookupKey.
  }, [lookupKey]);

  return urls;
}

/**
 * Signs links for the bakes' photos (bake id -> URL). For thumbnails it signs the thumbnail paths
 * first; a bake whose thumbnail does not exist (a photo from before thumbnails, or a thumbnail
 * that failed to upload) comes back unsigned, and only those are signed again as full photos.
 */
async function signPhotoUrls(
  bakes: Array<{ id: string; photoPath?: string }>,
  size: 'thumbnail' | 'full',
): Promise<Map<string, string>> {
  const urlsByBakeId = new Map<string, string>();
  const withPath = bakes.filter((bake): bake is { id: string; photoPath: string } =>
    Boolean(bake.photoPath),
  );

  let remaining = withPath;
  if (size === 'thumbnail') {
    // If signing thumbnails fails, the full photos below are tried instead.
    const signedThumbnails = await createRemoteBakePhotoUrls(
      withPath.map((bake) => getBakePhotoThumbnailPath(bake.photoPath)),
    ).catch(() => new Map<string, string>());
    for (const bake of withPath) {
      const url = signedThumbnails.get(getBakePhotoThumbnailPath(bake.photoPath));
      if (url) {
        urlsByBakeId.set(bake.id, url);
      }
    }
    remaining = withPath.filter((bake) => !urlsByBakeId.has(bake.id));
  }

  if (remaining.length > 0) {
    const signedPhotos = await createRemoteBakePhotoUrls(remaining.map((bake) => bake.photoPath));
    for (const bake of remaining) {
      const url = signedPhotos.get(bake.photoPath);
      if (url) {
        urlsByBakeId.set(bake.id, url);
      }
    }
  }

  return urlsByBakeId;
}
