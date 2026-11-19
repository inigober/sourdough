import {
  canvasToJpegBlob,
  computeScaledDimensions,
  loadImageFromFile,
  MIN_JPEG_QUALITY,
  QUALITY_STEP,
} from '../companion/compressCoachPhoto.ts';

/**
 * Loaf photos kept with a finished bake. Small on purpose: the photo is stored in the user's
 * account (Supabase Storage), so each one should stay far below the storage bucket's own cap.
 */
export const BAKE_PHOTO_MAX_DIMENSION = 1280;
export const BAKE_PHOTO_START_QUALITY = 0.85;
export const BAKE_PHOTO_MAX_BYTES = 250_000;

/** After the quality ladder fails at full size, retry at these fractions of the target size. */
const SHRINK_FACTORS = [0.75, 0.56];

export type EncodedPhoto = { size: number };

/** Draws the photo at this size and encodes it as JPEG. Injected so the budget logic is testable. */
export type PhotoEncoder<T extends EncodedPhoto> = (
  width: number,
  height: number,
  quality: number,
) => Promise<T>;

/** JPEG qualities to try, from the starting quality down to the floor. */
export function buildQualityLadder(
  startQuality: number,
  minQuality: number = MIN_JPEG_QUALITY,
  step: number = QUALITY_STEP,
): number[] {
  const qualities: number[] = [];
  let quality = startQuality;

  while (quality > minQuality) {
    qualities.push(quality);
    quality -= step;
  }

  qualities.push(minQuality);
  return qualities;
}

/**
 * Finds the best-looking encoding that fits the byte budget: first lowers the JPEG quality at
 * the target size, then shrinks the image, using the lowest quality at each smaller size.
 * Throws when even the smallest attempt is over budget.
 */
export async function encodeWithinBudget<T extends EncodedPhoto>(
  target: { width: number; height: number },
  encode: PhotoEncoder<T>,
  options: { maxBytes?: number; startQuality?: number } = {},
): Promise<T> {
  const maxBytes = options.maxBytes ?? BAKE_PHOTO_MAX_BYTES;
  const startQuality = options.startQuality ?? BAKE_PHOTO_START_QUALITY;

  for (const quality of buildQualityLadder(startQuality)) {
    const encoded = await encode(target.width, target.height, quality);
    if (encoded.size <= maxBytes) {
      return encoded;
    }
  }

  for (const factor of SHRINK_FACTORS) {
    const width = Math.max(1, Math.round(target.width * factor));
    const height = Math.max(1, Math.round(target.height * factor));
    const encoded = await encode(width, height, MIN_JPEG_QUALITY);
    if (encoded.size <= maxBytes) {
      return encoded;
    }
  }

  throw new Error('That photo is still too large after compression. Try a different photo.');
}

/** Compresses a chosen image file to a small JPEG (longest side ~1280px, under ~250 KB). */
export async function compressBakePhoto(file: Blob): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Choose an image file.');
  }

  const image = await loadImageFromFile(file);
  const target = computeScaledDimensions(
    image.naturalWidth,
    image.naturalHeight,
    BAKE_PHOTO_MAX_DIMENSION,
  );

  const isAlreadySmallJpeg =
    file.type === 'image/jpeg' &&
    file.size <= BAKE_PHOTO_MAX_BYTES &&
    target.width === image.naturalWidth &&
    target.height === image.naturalHeight;
  if (isAlreadySmallJpeg) {
    return file;
  }

  return encodeWithinBudget(target, async (width, height, quality) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not compress image.');
    }

    context.drawImage(image, 0, 0, width, height);
    return canvasToJpegBlob(canvas, quality);
  });
}
