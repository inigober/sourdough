import assert from 'node:assert/strict';
import test from 'node:test';

import { getCoachTipForStep } from './coachStepTips.ts';
import { getCoachTip } from './coachTips.ts';

test('step-specific tips cover levain mix and merged display steps', () => {
  const mixLevainTip = getCoachTipForStep('mix-levain-rest-after-levain', 'Mix in levain and rest');
  assert.match(mixLevainTip, /levain/i);
  assert.doesNotMatch(mixLevainTip, /Bulk fermentation builds structure/);

  const buildLevainTip = getCoachTipForStep('build-levain');
  assert.match(buildLevainTip, /levain/i);
  assert.notEqual(buildLevainTip, getCoachTip('bulk'));
});

test('fold steps get fold-specific tips instead of generic bulk advice', () => {
  const stretchTip = getCoachTipForStep('stretch-fold-1');
  assert.match(stretchTip, /stretch/i);
  assert.notEqual(stretchTip, getCoachTip('bulk'));

  const coilTip = getCoachTipForStep('coil-fold-2');
  assert.match(coilTip, /coil/i);
  assert.notEqual(coilTip, getCoachTip('bulk'));
});
