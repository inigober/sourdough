import { getSupabaseClient } from '../auth/supabaseClient.ts';
import {
  BAKE_PHOTO_SIGNED_URL_SECONDS,
  BAKE_PHOTOS_BUCKET,
  buildBakePhotoPath,
} from './bakePhotoPath.ts';

function getClientOrThrow() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase is not configured.');
  }

  return client;
}

/**
 * Uploads a compressed loaf photo to `<userId>/<bakeId>.jpg` in the private bucket, then records
 * the path on the bake. `upsert` lets a retry overwrite an earlier partial upload. Throws on failure.
 */
export async function uploadRemoteBakePhoto(
  userId: string,
  bakeId: string,
  photo: Blob,
): Promise<void> {
  const supabase = getClientOrThrow();
  const path = buildBakePhotoPath(userId, bakeId);

  const { error: uploadError } = await supabase.storage
    .from(BAKE_PHOTOS_BUCKET)
    .upload(path, photo, { contentType: 'image/jpeg', upsert: true });

  if (uploadError) {
    throw new Error(uploadError.message);
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
 * Deletes a bake's photo object. Removing a missing object is not an error, so this is safe to
 * call for any bake. Throws when the request itself fails.
 */
export async function deleteRemoteBakePhoto(userId: string, bakeId: string): Promise<void> {
  const supabase = getClientOrThrow();
  const { error } = await supabase.storage
    .from(BAKE_PHOTOS_BUCKET)
    .remove([buildBakePhotoPath(userId, bakeId)]);

  if (error) {
    throw new Error(error.message);
  }
}
