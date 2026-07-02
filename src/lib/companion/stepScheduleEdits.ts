import type { ScheduleInput } from '../schedule/types.ts';

export type StepScheduleEdit = {
  scheduleField: keyof ScheduleInput;
  label: string;
  suffix: string;
  min: number;
  max?: number;
  step: number;
};

const STEP_EDITS: Record<string, StepScheduleEdit> = {
  'build-levain': {
    scheduleField: 'levainBuildHours',
    label: 'Levain build time',
    suffix: 'h',
    min: 3,
    max: 12,
    step: 0.5,
  },
  autolyse: {
    scheduleField: 'autolyseMinutes',
    label: 'Autolyse time',
    suffix: 'min',
    min: 0,
    step: 5,
  },
  'rest-after-levain': {
    scheduleField: 'restAfterLevainMinutes',
    label: 'Rest time',
    suffix: 'min',
    min: 0,
    step: 5,
  },
  'rest-after-salt': {
    scheduleField: 'restAfterSaltMinutes',
    label: 'Rest time',
    suffix: 'min',
    min: 0,
    step: 5,
  },
  'slap-and-fold': {
    scheduleField: 'restAfterSlapAndFoldMinutes',
    label: 'Rest after slaps',
    suffix: 'min',
    min: 0,
    step: 5,
  },
  'room-proof': {
    scheduleField: 'roomProofHours',
    label: 'Proof time',
    suffix: 'h',
    min: 0.5,
    max: 6,
    step: 0.25,
  },
  'bake-closed': {
    scheduleField: 'dutchOvenClosedMinutes',
    label: 'Bake time',
    suffix: 'min',
    min: 10,
    step: 5,
  },
  'bake-lid-off': {
    scheduleField: 'dutchOvenLidOffMinutes',
    label: 'Bake time',
    suffix: 'min',
    min: 5,
    step: 5,
  },
  'bake-out-of-pot': {
    scheduleField: 'dutchOvenOutOfPotMinutes',
    label: 'Bake time',
    suffix: 'min',
    min: 3,
    step: 1,
  },
  'bake-open': {
    scheduleField: 'openBakeMinutes',
    label: 'Bake time',
    suffix: 'min',
    min: 10,
    step: 5,
  },
  'bake-finish': {
    scheduleField: 'finishMinutes',
    label: 'Bake time',
    suffix: 'min',
    min: 5,
    step: 5,
  },
};

export function getStepScheduleEdit(stepId: string): StepScheduleEdit | null {
  if (STEP_EDITS[stepId]) {
    return STEP_EDITS[stepId];
  }

  if (stepId === 'mix-levain-rest-after-levain') {
    return STEP_EDITS['rest-after-levain'];
  }

  if (stepId === 'mix-salt-rest-after-salt') {
    return STEP_EDITS['rest-after-salt'];
  }

  if (/^stretch-fold-\d+$/.test(stepId)) {
    return {
      scheduleField: 'stretchAndFoldRestMinutes',
      label: 'Rest between folds',
      suffix: 'min',
      min: 10,
      step: 5,
    };
  }

  if (/^coil-fold-\d+$/.test(stepId)) {
    return {
      scheduleField: 'coilFoldRestMinutes',
      label: 'Rest between folds',
      suffix: 'min',
      min: 10,
      step: 5,
    };
  }

  return null;
}

export function applyStepScheduleEdit(
  schedule: ScheduleInput,
  edit: StepScheduleEdit,
  value: number,
): ScheduleInput {
  return {
    ...schedule,
    [edit.scheduleField]: value,
  };
}
