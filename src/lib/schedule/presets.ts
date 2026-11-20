import type { RecipeInput } from '../recipe/types.ts';
import { createDefaultScheduleInput, getDefaultFoldSets, getDefaultRoomProofHours } from './defaults.ts';
import { getShapeEndOffset, parseTimeToMinutes } from './scheduleTiming.ts';
import { formatMinutesAsTime } from './time.ts';
import type { ScheduleInput } from './types.ts';

// Schedule presets turn the ~25 schedule fields into three plain-language choices.
//
// A preset only owns the fields that define the *shape of the day* (start time, autolyse, mixing
// rests, folds, pre-shape, cold vs room proofing). Oven method and temperatures, starter prep and
// `mixDate` stay as they are: they come from the recipe, not from the kind of day the baker wants.
//
// Nothing about a preset is stored. A schedule "is" a preset when its current values equal what the
// preset would set, so saved recipes and bake sessions keep exactly the shape they have today.

export type SchedulePresetId = 'simpleOvernight' | 'sameDay' | 'weekendDeepFerment';

export type SchedulePresetInfo = {
  id: SchedulePresetId;
  label: string;
  /** One plain-language sentence for the picker. */
  description: string;
};

export const SCHEDULE_PRESET_INFO: readonly SchedulePresetInfo[] = [
  {
    id: 'simpleOvernight',
    label: 'Simple overnight',
    description: 'Mix and fold during the day, rest the dough in the fridge overnight, bake the next morning.',
  },
  {
    id: 'sameDay',
    label: 'Same day',
    description: 'Mix in the morning and bake the same evening. No fridge, so less depth of flavor.',
  },
  {
    id: 'weekendDeepFerment',
    label: 'Weekend deep ferment',
    description: 'A long, slow rest in the fridge for the most flavor. Mix one day, bake around midday the next day.',
  },
];

/** The plan picker has the presets plus a fourth option, Custom, where every step is set by hand. */
export type SchedulePlanOptionId = SchedulePresetId | 'custom';

export const CUSTOM_PLAN_OPTION: { id: 'custom'; label: string; description: string } = {
  id: 'custom',
  label: 'Custom',
  description: 'Set every step yourself: starter prep, mixing, folds, proofing and baking.',
};

/**
 * Which plan option is selected. Custom wins when the values match no preset, and also when the
 * baker chose Custom on purpose (or has started editing), even if the values happen to equal a
 * preset: otherwise the fields they are typing into would disappear mid-edit.
 */
export function getSelectedPlanOptionId(
  matchedPresetId: SchedulePresetId | null,
  customChosen: boolean,
): SchedulePlanOptionId {
  return customChosen || matchedPresetId === null ? 'custom' : matchedPresetId;
}

type FoldPlan = 'stretchOnly' | 'full';

type SchedulePresetSpec = {
  autolyse: 'whenRecommended' | 'always';
  autolyseMinutes: number;
  foldPlan: FoldPlan;
  // Cold presets fix the clock time of the bake and a target fridge time; the start time is worked out
  // from the recipe's bulk length, so the fridge time stays sensible for short and long bulks.
  proofing:
    | { style: 'cold'; bakeTime: string; coldRetardHours: number }
    // Room-temperature presets fix the start time; the proof length follows the room temperature.
    | { style: 'roomTemperature'; startTime: string };
};

const presetSpecs: Record<SchedulePresetId, SchedulePresetSpec> = {
  simpleOvernight: {
    autolyse: 'whenRecommended',
    autolyseMinutes: 45,
    foldPlan: 'stretchOnly',
    proofing: { style: 'cold', bakeTime: '08:00', coldRetardHours: 14 },
  },
  sameDay: {
    autolyse: 'whenRecommended',
    autolyseMinutes: 30,
    foldPlan: 'stretchOnly',
    proofing: { style: 'roomTemperature', startTime: '07:00' },
  },
  weekendDeepFerment: {
    autolyse: 'always',
    autolyseMinutes: 60,
    foldPlan: 'full',
    proofing: { style: 'cold', bakeTime: '12:00', coldRetardHours: 20 },
  },
};

const MINUTES_PER_DAY = 24 * 60;
const START_TIME_ROUNDING_MINUTES = 15;
const FLOAT_TOLERANCE = 1e-6;

/** Every field a preset may set. Used to decide whether the user has edited the plan. */
export const SCHEDULE_PRESET_FIELDS = [
  'startTime',
  'autolyseEnabled',
  'autolyseMinutes',
  'saltAfterLevain',
  'restAfterLevainMinutes',
  'restAfterSaltMinutes',
  'slapAndFolds',
  'restAfterSlapAndFoldMinutes',
  'stretchAndFoldSets',
  'stretchAndFoldRestMinutes',
  'coilFoldSets',
  'coilFoldRestMinutes',
  'preShapeMinutesBeforeBulkEnd',
  'proofingStyle',
  'desiredBakeTime',
  'roomProofHours',
] as const satisfies readonly (keyof ScheduleInput)[];

export type SchedulePresetField = (typeof SCHEDULE_PRESET_FIELDS)[number];

export type SchedulePresetChange = {
  field: SchedulePresetField;
  from: ScheduleInput[SchedulePresetField];
  to: ScheduleInput[SchedulePresetField];
};

function getStretchOnlyFoldSets(recipeInput: RecipeInput): number {
  // Without coil folds or slap and folds, wetter doughs get one extra stretch-and-fold set.
  if (recipeInput.hydrationPercent <= 72) {
    return 2;
  }

  return recipeInput.hydrationPercent < 80 ? 3 : 4;
}

/**
 * The fields a preset sets for this recipe. Only fields that affect the timeline are included, so a
 * hidden value (for example the autolyse time while autolyse is off) never counts as a difference.
 */
export function getSchedulePresetPatch(
  presetId: SchedulePresetId,
  recipeInput: RecipeInput,
): Partial<ScheduleInput> {
  const spec = presetSpecs[presetId];
  const defaults = createDefaultScheduleInput(recipeInput);
  const autolyseEnabled = spec.autolyse === 'always' ? true : defaults.autolyseEnabled;
  const foldDefaults = getDefaultFoldSets(recipeInput);
  const slapAndFolds = spec.foldPlan === 'full' ? foldDefaults.slapAndFolds : 0;
  const stretchAndFoldSets =
    spec.foldPlan === 'full' ? foldDefaults.stretchAndFoldSets : getStretchOnlyFoldSets(recipeInput);
  const coilFoldSets = spec.foldPlan === 'full' ? foldDefaults.coilFoldSets : 0;

  const patch: Partial<ScheduleInput> = {
    autolyseEnabled,
    saltAfterLevain: true,
    restAfterLevainMinutes: 30,
    restAfterSaltMinutes: 30,
    slapAndFolds,
    stretchAndFoldSets,
    coilFoldSets,
    preShapeMinutesBeforeBulkEnd: 30,
  };

  if (autolyseEnabled) {
    patch.autolyseMinutes = spec.autolyseMinutes;
  }

  if (slapAndFolds > 0) {
    patch.restAfterSlapAndFoldMinutes = 30;
  }

  if (stretchAndFoldSets > 0) {
    patch.stretchAndFoldRestMinutes = 30;
  }

  if (coilFoldSets > 0) {
    patch.coilFoldRestMinutes = 30;
  }

  if (spec.proofing.style === 'roomTemperature') {
    patch.startTime = spec.proofing.startTime;
    patch.proofingStyle = 'roomTemperature';
    patch.roomProofHours = getDefaultRoomProofHours(recipeInput.roomTemperatureCelsius);
    return patch;
  }

  patch.proofingStyle = 'cold';
  patch.desiredBakeTime = spec.proofing.bakeTime;
  patch.startTime = getStartTimeForColdRetard(
    { ...defaults, ...patch },
    recipeInput,
    spec.proofing.bakeTime,
    spec.proofing.coldRetardHours,
  );

  return patch;
}

/**
 * Cold retard hours = 24h - (clock time when shaping ends) + (bake time), so for a target fridge time
 * the shaping end is `bakeTime - retard` on the clock, and the start is that minus the time until shaping.
 */
function getStartTimeForColdRetard(
  scheduleWithPresetFolds: ScheduleInput,
  recipeInput: RecipeInput,
  bakeTime: string,
  coldRetardHours: number,
): string {
  const shapeEndClockMinutes = parseTimeToMinutes(bakeTime) - Math.round(coldRetardHours * 60) + MINUTES_PER_DAY;
  const startMinutes = shapeEndClockMinutes - getShapeEndOffset(scheduleWithPresetFolds, recipeInput);
  const wrapped = ((startMinutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const rounded = Math.round(wrapped / START_TIME_ROUNDING_MINUTES) * START_TIME_ROUNDING_MINUTES;

  return formatMinutesAsTime(rounded % MINUTES_PER_DAY);
}

function areValuesEqual(
  left: ScheduleInput[SchedulePresetField] | undefined,
  right: ScheduleInput[SchedulePresetField] | undefined,
): boolean {
  if (typeof left === 'number' && typeof right === 'number') {
    return Math.abs(left - right) < FLOAT_TOLERANCE;
  }

  return left === right;
}

/** The settings a preset would change on this schedule. Empty means the schedule already matches it. */
export function getSchedulePresetChanges(
  schedule: ScheduleInput,
  presetId: SchedulePresetId,
  recipeInput: RecipeInput,
): SchedulePresetChange[] {
  const patch = getSchedulePresetPatch(presetId, recipeInput);
  const changes: SchedulePresetChange[] = [];

  for (const field of SCHEDULE_PRESET_FIELDS) {
    const target = patch[field];
    if (target !== undefined && !areValuesEqual(schedule[field], target)) {
      changes.push({ field, from: schedule[field], to: target });
    }
  }

  return changes;
}

/** The preset the schedule currently matches, or null for "Custom". */
export function findMatchingSchedulePresetId(
  schedule: ScheduleInput,
  recipeInput: RecipeInput,
): SchedulePresetId | null {
  const match = SCHEDULE_PRESET_INFO.find(
    (preset) => getSchedulePresetChanges(schedule, preset.id, recipeInput).length === 0,
  );

  return match?.id ?? null;
}

/**
 * True when the user (or an older version of the app) has changed the plan away from both the
 * presets and the untouched starting values for this recipe. Used to decide whether choosing a
 * preset needs a confirmation.
 */
export function hasEditedScheduleValues(schedule: ScheduleInput, recipeInput: RecipeInput): boolean {
  if (findMatchingSchedulePresetId(schedule, recipeInput) !== null) {
    return false;
  }

  const defaults = createDefaultScheduleInput(recipeInput);
  return SCHEDULE_PRESET_FIELDS.some((field) => !areValuesEqual(schedule[field], defaults[field]));
}
