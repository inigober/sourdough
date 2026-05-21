import type { RecipeInput } from '../recipe/types.ts';
import { getSlapAndFoldDurationMinutes } from './defaults.ts';
import { formatMinutesAsTime } from './time.ts';
import type { ScheduleInput, TimelineStep } from './types.ts';

type MutableStep = {
  id: string;
  label: string;
  startOffsetMinutes: number;
  durationMinutes: number;
  detail?: string;
};

export function buildTimeline(schedule: ScheduleInput, recipeInput: RecipeInput): TimelineStep[] {
  const steps: MutableStep[] = [];
  let offset = 0;

  function appendStep(id: string, label: string, durationMinutes: number, detail?: string): void {
    if (durationMinutes <= 0) {
      return;
    }

    steps.push({ id, label, startOffsetMinutes: offset, durationMinutes, detail });
    offset += durationMinutes;
  }

  function appendAtOffset(
    startOffsetMinutes: number,
    id: string,
    label: string,
    durationMinutes: number,
    detail?: string,
  ): void {
    if (durationMinutes <= 0) {
      return;
    }

    steps.push({ id, label, startOffsetMinutes, durationMinutes, detail });
  }

  if (schedule.autolyseEnabled) {
    appendStep('autolyse', 'Autolyse', schedule.autolyseMinutes, 'Flour and water only');
    appendStep('rest-after-autolyse', 'Rest after autolyse', schedule.restAfterAutolyseMinutes);
  }

  appendStep('mix-levain', 'Mix in levain', schedule.mixMinutes);

  if (schedule.slapAndFoldSlaps > 0) {
    appendStep(
      'slap-and-fold',
      'Slap and fold',
      getSlapAndFoldDurationMinutes(schedule.slapAndFoldSlaps),
      `${schedule.slapAndFoldSlaps} slaps`,
    );
  }

  if (schedule.saltAfterLevain) {
    appendStep('mix-salt', 'Mix in salt', schedule.saltMixMinutes);
    appendStep('rest-after-mix', 'Rest after mixing', schedule.restAfterMixMinutes);
  } else {
    appendStep('rest-before-salt', 'Rest before salt', schedule.restAfterMixMinutes);
    appendStep('mix-salt', 'Mix in salt', schedule.saltMixMinutes);
  }

  const bulkStartOffset = offset;
  const bulkTotalMinutes = Math.round(recipeInput.targetBulkHours * 60);
  const bulkEndOffset = bulkStartOffset + bulkTotalMinutes;
  const preShapeStartOffset = bulkEndOffset - schedule.preShapeMinutesBeforeBulkEnd;
  const shapeStartOffset = bulkEndOffset - schedule.shapeMinutes;

  for (let index = 0; index < schedule.stretchAndFoldSets; index += 1) {
    const foldStart =
      bulkStartOffset + schedule.stretchAndFoldRestMinutes * (index + 1) + index * 2;

    if (foldStart + 2 > preShapeStartOffset) {
      break;
    }

    appendAtOffset(
      foldStart,
      `stretch-fold-${index + 1}`,
      `Stretch and fold ${index + 1}`,
      2,
      `Set ${index + 1} of ${schedule.stretchAndFoldSets}`,
    );
  }

  const coilStartBase =
    schedule.stretchAndFoldSets > 0
      ? bulkStartOffset + schedule.stretchAndFoldRestMinutes * (schedule.stretchAndFoldSets + 1)
      : bulkStartOffset + schedule.coilFoldRestMinutes;

  for (let index = 0; index < schedule.coilFoldSets; index += 1) {
    const foldStart = coilStartBase + index * (schedule.coilFoldRestMinutes + 2);

    if (foldStart + 2 > preShapeStartOffset) {
      break;
    }

    appendAtOffset(
      foldStart,
      `coil-fold-${index + 1}`,
      `Coil fold ${index + 1}`,
      2,
      `Set ${index + 1} of ${schedule.coilFoldSets}`,
    );
  }

  appendAtOffset(
    preShapeStartOffset,
    'pre-shape',
    'Pre-shape',
    Math.max(1, shapeStartOffset - preShapeStartOffset),
    `${schedule.preShapeMinutesBeforeBulkEnd} min before bulk ends`,
  );
  appendAtOffset(
    shapeStartOffset,
    'shape',
    'Shape',
    schedule.shapeMinutes,
    'End of bulk fermentation',
  );

  offset = bulkEndOffset;

  if (schedule.proofingStyle === 'cold' || schedule.proofingStyle === 'both') {
    appendStep(
      'cold-retard',
      'Cold retard',
      Math.round(schedule.coldRetardHours * 60),
      `${schedule.coldRetardHours}h in the fridge`,
    );
  }

  if (schedule.proofingStyle === 'roomTemperature') {
    appendStep(
      'room-proof',
      'Room-temperature proof',
      Math.round(schedule.roomProofHours * 60),
      `${schedule.roomProofHours}h at ${recipeInput.roomTemperatureCelsius}°C`,
    );
  }

  if (schedule.proofingStyle === 'both') {
    appendStep(
      'room-finish-proof',
      'Room-temperature finish proof',
      Math.round(schedule.roomFinishAfterColdHours * 60),
      `After cold retard, at ${recipeInput.roomTemperatureCelsius}°C`,
    );
  }

  if (schedule.bakeMethod === 'dutchOven') {
    appendStep(
      'bake-closed',
      'Bake (Dutch oven, lid on)',
      schedule.dutchOvenClosedMinutes,
      `${schedule.openBakeTempCelsius}°C`,
    );
    appendStep(
      'bake-lid-off',
      'Bake (Dutch oven, lid off)',
      schedule.dutchOvenLidOffMinutes,
      `${schedule.finishTempCelsius}°C`,
    );
    appendStep(
      'bake-out-of-pot',
      'Bake (out of Dutch oven)',
      schedule.dutchOvenOutOfPotMinutes,
      `${schedule.finishTempCelsius}°C`,
    );
  } else {
    appendStep(
      'bake-open',
      'Bake (open oven)',
      schedule.openBakeMinutes,
      `${schedule.openBakeTempCelsius}°C`,
    );
    appendStep(
      'bake-finish',
      'Finish bake',
      schedule.finishMinutes,
      `${schedule.finishTempCelsius}°C`,
    );
  }

  const startMinutes = parseStartMinutes(schedule.startTime);

  return steps
    .sort((left, right) => left.startOffsetMinutes - right.startOffsetMinutes)
    .map((step) => ({
      id: step.id,
      label: step.label,
      detail: step.detail,
      durationMinutes: step.durationMinutes,
      startTime: formatMinutesAsTime(startMinutes + step.startOffsetMinutes),
      endTime: formatMinutesAsTime(startMinutes + step.startOffsetMinutes + step.durationMinutes),
    }));
}

function parseStartMinutes(startTime: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(startTime.trim());
  if (!match) {
    return 9 * 60;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}
