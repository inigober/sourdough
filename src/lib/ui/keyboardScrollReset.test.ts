import assert from 'node:assert/strict';
import test from 'node:test';

import { installKeyboardScrollReset, isTextEntryElement } from './keyboardScrollReset.ts';

type FakeElement = { tagName: string; type?: string; isContentEditable?: boolean };

function field(tagName: string, type?: string): FakeElement {
  return { tagName, type };
}

function createHarness(options: { isTouchDevice?: boolean } = {}) {
  const listeners = new Map<string, (event: { target: FakeElement }) => void>();
  const scrolledTo: number[] = [];
  const pending: Array<() => void> = [];
  const fakeDocument = {
    activeElement: null as FakeElement | null,
    addEventListener(type: string, listener: (event: { target: FakeElement }) => void) {
      listeners.set(type, listener);
    },
    removeEventListener(type: string) {
      listeners.delete(type);
    },
  };
  const fakeWindow = {
    scrollY: 0,
    scrollTo(x: number, y: number) {
      scrolledTo.push(y);
      fakeWindow.scrollY = y;
    },
  };

  installKeyboardScrollReset({
    document: fakeDocument,
    window: fakeWindow,
    isTouchDevice: options.isTouchDevice ?? true,
    runLater: (callback) => pending.push(callback),
  });

  return {
    fakeDocument,
    fakeWindow,
    scrolledTo,
    focusIn: (target: FakeElement) => listeners.get('focusin')?.({ target }),
    focusOut: (target: FakeElement) => listeners.get('focusout')?.({ target }),
    runPending: () => pending.splice(0).forEach((callback) => callback()),
  };
}

test('isTextEntryElement is true for typing fields and false for buttons and pickers', () => {
  assert.equal(isTextEntryElement(field('INPUT', 'text')), true);
  assert.equal(isTextEntryElement(field('INPUT', 'search')), true);
  assert.equal(isTextEntryElement(field('INPUT')), true);
  assert.equal(isTextEntryElement(field('TEXTAREA')), true);
  assert.equal(isTextEntryElement(field('INPUT', 'checkbox')), false);
  assert.equal(isTextEntryElement(field('INPUT', 'date')), false);
  assert.equal(isTextEntryElement(field('SELECT')), false);
  assert.equal(isTextEntryElement(field('BUTTON')), false);
  assert.equal(isTextEntryElement(null), false);
});

test('the page goes back to where it was when the keyboard closes', () => {
  const harness = createHarness();
  const input = field('INPUT', 'text');

  harness.fakeWindow.scrollY = 40;
  harness.focusIn(input);
  harness.fakeWindow.scrollY = 166; // iOS panned the page for the keyboard

  harness.focusOut(input);
  harness.runPending();

  assert.deepEqual(harness.scrolledTo, [40]);
});

test('moving from one text field to another does not scroll back in between', () => {
  const harness = createHarness();
  const first = field('INPUT', 'text');
  const second = field('INPUT', 'text');

  harness.focusIn(first);
  harness.focusOut(first);
  harness.fakeDocument.activeElement = second; // focus already moved when the delayed check runs
  harness.runPending();

  assert.deepEqual(harness.scrolledTo, []);
});

test('nothing happens when the page did not move', () => {
  const harness = createHarness();
  const input = field('INPUT', 'text');

  harness.fakeWindow.scrollY = 10;
  harness.focusIn(input);
  harness.focusOut(input);
  harness.runPending();

  assert.deepEqual(harness.scrolledTo, []);
});

test('focus in a button or checkbox is ignored', () => {
  const harness = createHarness();
  const button = field('BUTTON');

  harness.fakeWindow.scrollY = 10;
  harness.focusIn(button);
  harness.fakeWindow.scrollY = 90;
  harness.focusOut(button);
  harness.runPending();

  assert.deepEqual(harness.scrolledTo, []);
});

test('it does nothing on a device without touch, so desktop scrolling is never undone', () => {
  const harness = createHarness({ isTouchDevice: false });
  const input = field('INPUT', 'text');

  harness.focusIn(input);
  harness.fakeWindow.scrollY = 200;
  harness.focusOut(input);
  harness.runPending();

  assert.deepEqual(harness.scrolledTo, []);
});
