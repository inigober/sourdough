import assert from 'node:assert/strict';
import test from 'node:test';

import {
  COACH_PHOTO_MAX_BYTES,
  COACH_PHOTO_MAX_DIMENSION,
  computeScaledDimensions,
} from './compressCoachPhoto.ts';

test('computeScaledDimensions keeps images within the max edge', () => {
  assert.deepEqual(computeScaledDimensions(4032, 3024, COACH_PHOTO_MAX_DIMENSION), {
    width: 1024,
    height: 768,
  });
});

test('computeScaledDimensions does not upscale small images', () => {
  assert.deepEqual(computeScaledDimensions(800, 600, COACH_PHOTO_MAX_DIMENSION), {
    width: 800,
    height: 600,
  });
});

test('computeScaledDimensions handles portrait photos', () => {
  assert.deepEqual(computeScaledDimensions(3024, 4032, COACH_PHOTO_MAX_DIMENSION), {
    width: 768,
    height: 1024,
  });
});

test('coach photo byte budget stays modest for API cost control', () => {
  assert.ok(COACH_PHOTO_MAX_BYTES <= 400_000);
});
