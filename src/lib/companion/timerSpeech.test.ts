import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatSpokenDuration,
  formatTimerSpokenRemaining,
  getTimerFinishedAnnouncement,
  getTimerStartedAnnouncement,
} from './timerSpeech.ts';

test('spoken durations use words and singular/plural units', () => {
  assert.equal(formatSpokenDuration(750), '12 minutes 30 seconds');
  assert.equal(formatSpokenDuration(3600), '1 hour');
  assert.equal(formatSpokenDuration(3661), '1 hour 1 minute 1 second');
  assert.equal(formatSpokenDuration(45), '45 seconds');
  assert.equal(formatSpokenDuration(60), '1 minute');
});

test('zero and negative durations never produce an empty phrase', () => {
  assert.equal(formatSpokenDuration(0), '0 seconds');
  assert.equal(formatSpokenDuration(-5), '0 seconds');
});

test('the focused countdown says remaining time, or that time is up', () => {
  assert.equal(formatTimerSpokenRemaining(90), '1 minute 30 seconds remaining');
  assert.equal(formatTimerSpokenRemaining(0), 'Time is up');
});

test('start and finish announcements name the step', () => {
  assert.equal(
    getTimerStartedAnnouncement('Bulk fermentation', 5400),
    'Timer started for Bulk fermentation: 1 hour 30 minutes.',
  );
  assert.equal(
    getTimerFinishedAnnouncement('Bulk fermentation'),
    "Time's up. The timer for Bulk fermentation has finished.",
  );
});
