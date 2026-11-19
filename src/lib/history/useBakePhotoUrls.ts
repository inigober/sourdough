import { useEffect, useMemo, useState } from 'react';

import { getDefaultBakePhotoStore } from './localBakePhotoStorage.ts';
import { createRemoteBakePhotoUrls } from './remoteBakePhotoStorage.ts';

export type BakePhotoRef = {
  id: string;
  /** Set when the photo is in the account's private bucket. */
  photoPath?: string;
};

/**
 * Finds a displayable URL for each bake's photo (bake id -> URL). Photos in the account are
 * shown through short-lived signed links, all signed in one request. Photos kept on this device
 * (signed out, or waiting for an upload) are read from IndexedDB. Bakes without a photo are
 * simply absent from the result, and any lookup trouble just means "no photo shown".
 */
export function useBakePhotoUrls(bakes: BakePhotoRef[]): Map<string, string> {
  const [urls, setUrls] = useState<Map<string, string>>(() => new Map());

  // Re-run only when the set of bakes or their photo paths actually changes.
  const lookupKey = useMemo(
    () => bakes.map((bake) => `${bake.id}|${bake.photoPath ?? ''}`).join(','),
    [bakes],
  );

  useEffect(() => {
    let isCancelled = false;
    const objectUrls: string[] = [];

    async function load(): Promise<void> {
      const found = new Map<string, string>();

      const remoteBakes = bakes.filter((bake) => bake.photoPath);
      if (remoteBakes.length > 0) {
        try {
          const signed = await createRemoteBakePhotoUrls(
            remoteBakes.map((bake) => bake.photoPath as string),
          );
          for (const bake of remoteBakes) {
            const url = signed.get(bake.photoPath as string);
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

            const photo = await store.get(bake.id);
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
