import { getSupabaseClient } from '../auth/supabaseClient.ts';
import {
  BAKE_PHOTO_SIGNED_URL_SECONDS,
  BAKE_PHOTOS_BUCKET,
  buildBakePhotoPath,
  buildBakePhotoThumbnailPath,
} from './bakePhotoPath.ts';

function getClientOrThrow() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase is not configured.');
  }

  return client;
}

/**
 * Uploads a compressed loaf photo to `<userId>/<bakeId>.jpg` in the private bucket, its small list
 * thumbnail to `<userId>/<bakeId>_thumb.jpg`, then records the photo path on the bake. `upsert`
 * lets a retry (or a replaced photo) overwrite the earlier objects. Throws when the photo or the
 * row update fails. A thumbnail problem is ignored: the list then falls back to the full photo.
 */
export async function uploadRemoteBakePhoto(
  userId: string,
  bakeId: string,
  photo: Blob,
  thumbnail: Blob | null,
): Promise<void> {
  const supabase = getClientOrThrow();
  const path = buildBakePhotoPath(userId, bakeId);
  const thumbnailPath = buildBakePhotoThumbnailPath(userId, bakeId);

  const { error: uploadError } = await supabase.storage
    .from(BAKE_PHOTOS_BUCKET)
    .upload(path, photo, { contentType: 'image/jpeg', upsert: true });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  // Never leave an old thumbnail next to a new photo: write the new one, or remove the old one.
  try {
    if (thumbnail) {
      const { error: thumbnailError } = await supabase.storage
        .from(BAKE_PHOTOS_BUCKET)
        .upload(thumbnailPath, thumbnail, { contentType: 'image/jpeg', upsert: true });
      if (thumbnailError) {
        throw new Error(thumbnailError.message);
      }
    } else {
      await supabase.storage.from(BAKE_PHOTOS_BUCKET).remove([thumbnailPath]);
    }
  } catch {
    await supabase.storage
      .from(BAKE_PHOTOS_BUCKET)
      .remove([thumbnailPath])
      .catch(() => undefined);
  }

  const { error: updateError } = await supabase
    .from('bake_sessions')
    .update({ photo_path: path })
    .eq('user_id', userId)
    .eq('id', bakeId);

  if (updateError) {
    throw new Error(updateError.message);
  }
}

/**
 * Short-lived links for photos in the private bucket, signed in one request.
 * Returns path -> URL; paths that could not be signed are left out.
 */
export async function createRemoteBakePhotoUrls(paths: string[]): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  if (paths.length === 0) {
    return urls;
  }

  const supabase = getClientOrThrow();
  const { data, error } = await supabase.storage
    .from(BAKE_PHOTOS_BUCKET)
    .createSignedUrls(paths, BAKE_PHOTO_SIGNED_URL_SECONDS);

  if (error) {
    throw new Error(error.message);
  }

  for (const entry of data ?? []) {
    if (entry.path && entry.signedUrl && !entry.error) {
      urls.set(entry.path, entry.signedUrl);
    }
  }

  return urls;
}

/**
 * Deletes a bake's photo and thumbnail objects. Removing a missing object is not an error, so this
 * is safe to call for any bake. Throws when the request itself fails.
 */
export async function deleteRemoteBakePhoto(userId: string, bakeId: string): Promise<void> {
  const supabase = getClientOrThrow();
  const { error } = await supabase.storage
    .from(BAKE_PHOTOS_BUCKET)
    .remove([buildBakePhotoPath(userId, bakeId), buildBakePhotoThumbnailPath(userId, bakeId)]);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Removes the photo from a bake that stays in history: first clears `photo_path` (so the bake
 * stops pointing at it), then deletes both objects. A failed object cleanup is ignored because
 * the bake no longer references them; throws only when clearing `photo_path` fails.
 */
export async function removeRemoteBakePhoto(userId: string, bakeId: string): Promise<void> {
  const supabase = getClientOrThrow();
  const { error } = await supabase
    .from('bake_sessions')
    .update({ photo_path: null })
    .eq('user_id', userId)
    .eq('id', bakeId);

  if (error) {
    throw new Error(error.message);
  }

  await deleteRemoteBakePhoto(userId, bakeId).catch(() => undefined);
}
