/** Name of the private Supabase Storage bucket holding loaf photos (see the bake_photos migration). */
export const BAKE_PHOTOS_BUCKET = 'bake-photos';

/** Bucket upload cap, in bytes. Must match `file_size_limit` in the bake_photos migration. */
export const BAKE_PHOTO_BUCKET_MAX_BYTES = 1_048_576;

/** Signed photo links stay valid this long. The bucket is private, so every view signs afresh. */
export const BAKE_PHOTO_SIGNED_URL_SECONDS = 3600;

/**
 * Where a bake's photo lives in the bucket: `<user_id>/<bake_id>.jpg`. The first folder must be
 * the signed-in user's id; the storage policies only allow access to that folder.
 */
export function buildBakePhotoPath(userId: string, bakeId: string): string {
  return `${userId}/${bakeId}.jpg`;
}
