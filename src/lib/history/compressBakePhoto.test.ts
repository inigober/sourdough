import assert from 'node:assert/strict';
import test from 'node:test';

import { computeScaledDimensions } from '../companion/compressCoachPhoto.ts';
import { BAKE_PHOTO_BUCKET_MAX_BYTES } from './bakePhotoPath.ts';
import {
  BAKE_PHOTO_MAX_BYTES,
  BAKE_PHOTO_MAX_DIMENSION,
  BAKE_PHOTO_START_QUALITY,
  buildQualityLadder,
  encodeWithinBudget,
} from './compressBakePhoto.ts';

type Attempt = { width: number; height: number; quality: number; size: number };

/** Fake encoder: size shrinks with quality and with the pixel count. */
function fakeEncoder(sizeAtFullQuality: number, fullPixels: number, attempts: Attempt[]) {
  return async (width: number, height: number, quality: number): Promise<Attempt> => {
    const size = Math.round(sizeAtFullQuality * quality * ((width * height) / fullPixels));
    const attempt = { width, height, quality, size };
    attempts.push(attempt);
    return attempt;
  };
}

test('the photo budget stays far below the storage bucket limit', () => {
  assert.ok(BAKE_PHOTO_MAX_BYTES <= 250_000);
  assert.ok(BAKE_PHOTO_MAX_BYTES * 3 < BAKE_PHOTO_BUCKET_MAX_BYTES);
});

test('a phone photo is scaled so the longest side is 1280px', () => {
  assert.deepEqual(computeScaledDimensions(4032, 3024, BAKE_PHOTO_MAX_DIMENSION), {
    width: 1280,
    height: 960,
  });
});

test('quality ladder steps down from the start to the floor and ends on the floor', () => {
  const ladder = buildQualityLadder(0.85, 0.55, 0.07);

  assert.equal(ladder[0], 0.85);
  assert.equal(ladder[ladder.length - 1], 0.55);
  for (let index = 1; index < ladder.length; index += 1) {
    assert.ok(ladder[index] < ladder[index - 1]);
  }
});

test('keeps the first quality when it already fits the budget', async () => {
  const attempts: Attempt[] = [];
  const result = await encodeWithinBudget(
    { width: 1000, height: 1000 },
    fakeEncoder(200_000, 1_000_000, attempts),
  );

  assert.equal(attempts.length, 1);
  assert.equal(result.quality, BAKE_PHOTO_START_QUALITY);
  assert.ok(result.size <= BAKE_PHOTO_MAX_BYTES);
});

test('lowers the quality until the photo fits, without shrinking it', async () => {
  const attempts: Attempt[] = [];
  const result = await encodeWithinBudget(
    { width: 1000, height: 1000 },
    fakeEncoder(400_000, 1_000_000, attempts),
  );

  assert.ok(result.size <= BAKE_PHOTO_MAX_BYTES);
  assert.ok(result.quality < BAKE_PHOTO_START_QUALITY);
  assert.equal(result.width, 1000);
  assert.ok(attempts.length > 1);
});

test('shrinks the image when the lowest quality is still over budget', async () => {
  const attempts: Attempt[] = [];
  const result = await encodeWithinBudget(
    { width: 1280, height: 960 },
    fakeEncoder(700_000, 1280 * 960, attempts),
  );

  assert.ok(result.size <= BAKE_PHOTO_MAX_BYTES);
  assert.ok(result.width < 1280);
  assert.equal(result.quality, 0.55);
});

test('throws when no attempt fits the budget', async () => {
  await assert.rejects(
    encodeWithinBudget({ width: 1280, height: 960 }, fakeEncoder(10_000_000, 1280 * 960, [])),
    /still too large/,
  );
});
