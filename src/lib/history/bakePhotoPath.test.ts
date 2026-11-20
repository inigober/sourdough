import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BAKE_PHOTOS_BUCKET,
  buildBakePhotoPath,
  buildBakePhotoThumbnailPath,
  getBakePhotoThumbnailPath,
} from './bakePhotoPath.ts';

test('a bake photo lives in the user folder as <user_id>/<bake_id>.jpg', () => {
  assert.equal(buildBakePhotoPath('user-1', 'bake-9'), 'user-1/bake-9.jpg');
});

test('the bucket name matches the migration', () => {
  assert.equal(BAKE_PHOTOS_BUCKET, 'bake-photos');
});

test('the thumbnail sits next to the photo in the same user folder', () => {
  assert.equal(buildBakePhotoThumbnailPath('user-1', 'bake-9'), 'user-1/bake-9_thumb.jpg');
  assert.equal(
    getBakePhotoThumbnailPath(buildBakePhotoPath('user-1', 'bake-9')),
    buildBakePhotoThumbnailPath('user-1', 'bake-9'),
  );
});
