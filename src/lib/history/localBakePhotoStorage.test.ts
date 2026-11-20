import assert from 'node:assert/strict';
import test from 'node:test';

import { createMemoryBakePhotoStore } from './localBakePhotoStorage.ts';

const photo = new Blob(['full'], { type: 'image/jpeg' });
const thumbnail = new Blob(['small'], { type: 'image/jpeg' });

test('a photo and its thumbnail are stored and read back separately', async () => {
  const store = createMemoryBakePhotoStore();
  await store.put('bake-1', photo, thumbnail);

  assert.equal(await store.get('bake-1'), photo);
  assert.equal(await store.getThumbnail('bake-1'), thumbnail);
  assert.deepEqual(await store.keys(), ['bake-1']);
});

test('a photo saved without a thumbnail reads back as null, not as the full photo', async () => {
  const store = createMemoryBakePhotoStore();
  await store.put('bake-1', photo);

  assert.equal(await store.getThumbnail('bake-1'), null);
});

test('replacing a photo without a thumbnail drops the old thumbnail', async () => {
  const store = createMemoryBakePhotoStore();
  await store.put('bake-1', photo, thumbnail);
  await store.put('bake-1', photo);

  assert.equal(await store.getThumbnail('bake-1'), null);
});

test('removing a photo removes its thumbnail too', async () => {
  const store = createMemoryBakePhotoStore();
  await store.put('bake-1', photo, thumbnail);
  await store.remove('bake-1');

  assert.equal(await store.get('bake-1'), null);
  assert.equal(await store.getThumbnail('bake-1'), null);
  assert.deepEqual(await store.keys(), []);
});
