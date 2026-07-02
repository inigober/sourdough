import assert from 'node:assert/strict';
import test from 'node:test';

import { createFlourBlendEntry } from '../recipe/flourBlend.ts';
import { defaultRecipeInput } from '../recipe/defaults.ts';
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

test('pre-shape and shape tips include recipe-specific rise targets', () => {
  const wholeWheatRecipe = {
    ...defaultRecipeInput,
    hydrationPercent: 87,
    doughFlours: [createFlourBlendEntry('wholeWheat', 100)],
  };

  const preShapeTip = getCoachTipForStep('pre-shape', 'Pre-shape', wholeWheatRecipe);
  const shapeTip = getCoachTipForStep('shape', 'Shape', wholeWheatRecipe);

  assert.match(preShapeTip, /25–35%/);
  assert.match(shapeTip, /25–35%/);
});

test('fold steps get fold-specific tips instead of generic bulk advice', () => {
  const stretchTip = getCoachTipForStep('stretch-fold-1');
  assert.match(stretchTip, /stretch/i);
  assert.notEqual(stretchTip, getCoachTip('bulk'));

  const coilTip = getCoachTipForStep('coil-fold-2');
  assert.match(coilTip, /coil/i);
  assert.notEqual(coilTip, getCoachTip('bulk'));
});
