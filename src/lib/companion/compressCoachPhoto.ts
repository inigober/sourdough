/** Longest edge for coach vision — enough for dough texture without huge token cost. */
export const COACH_PHOTO_MAX_DIMENSION = 1024;

/** JPEG quality starting point before stepping down to meet byte budget. */
export const COACH_PHOTO_JPEG_QUALITY = 0.82;

/** Target payload size for the compressed data URL (base64 inflates ~33%). */
export const COACH_PHOTO_MAX_BYTES = 350_000;

const MIN_JPEG_QUALITY = 0.55;
const QUALITY_STEP = 0.07;

export type CompressCoachPhotoOptions = {
  maxDimension?: number;
  quality?: number;
  maxBytes?: number;
};

export function computeScaledDimensions(
  width: number,
  height: number,
  maxDimension: number,
): { width: number; height: number } {
  if (width <= 0 || height <= 0 || maxDimension <= 0) {
    return { width: Math.max(width, 1), height: Math.max(height, 1) };
  }

  const longestEdge = Math.max(width, height);
  if (longestEdge <= maxDimension) {
    return { width, height };
  }

  const scale = maxDimension / longestEdge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function loadImageFromFile(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not read that image.'));
    };

    image.src = objectUrl;
  });
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error('Could not compress image.'));
      },
      'image/jpeg',
      quality,
    );
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('Could not encode image.'));
    };
    reader.onerror = () => reject(new Error('Could not encode image.'));
    reader.readAsDataURL(blob);
  });
}

async function renderCoachPhotoJpeg(
  image: HTMLImageElement,
  width: number,
  height: number,
  quality: number,
  maxBytes: number,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not compress image.');
  }

  context.drawImage(image, 0, 0, width, height);

  let currentQuality = quality;
  let blob = await canvasToJpegBlob(canvas, currentQuality);

  while (blob.size > maxBytes && currentQuality > MIN_JPEG_QUALITY) {
    currentQuality = Math.max(MIN_JPEG_QUALITY, currentQuality - QUALITY_STEP);
    blob = await canvasToJpegBlob(canvas, currentQuality);
  }

  return blob;
}

export async function compressCoachPhoto(
  file: Blob,
  options: CompressCoachPhotoOptions = {},
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Choose an image file.');
  }

  const maxDimension = options.maxDimension ?? COACH_PHOTO_MAX_DIMENSION;
  const maxBytes = options.maxBytes ?? COACH_PHOTO_MAX_BYTES;
  const quality = options.quality ?? COACH_PHOTO_JPEG_QUALITY;

  const image = await loadImageFromFile(file);
  const targetSize = computeScaledDimensions(image.naturalWidth, image.naturalHeight, maxDimension);

  const alreadySmallJpeg =
    file.type === 'image/jpeg' &&
    file.size <= maxBytes &&
    targetSize.width === image.naturalWidth &&
    targetSize.height === image.naturalHeight;

  if (alreadySmallJpeg) {
    return blobToDataUrl(file);
  }

  let blob = await renderCoachPhotoJpeg(image, targetSize.width, targetSize.height, quality, maxBytes);

  if (blob.size > maxBytes) {
    const smaller = computeScaledDimensions(targetSize.width, targetSize.height, Math.round(maxDimension * 0.75));
    blob = await renderCoachPhotoJpeg(image, smaller.width, smaller.height, MIN_JPEG_QUALITY, maxBytes);
  }

  if (blob.size > maxBytes) {
    throw new Error('That image is still too large after compression. Try a closer crop or a different photo.');
  }

  return blobToDataUrl(blob);
}
