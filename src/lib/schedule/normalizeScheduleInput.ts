import { createDefaultScheduleInput } from './defaults.ts';
import { getDefaultLevainBuildHours } from './levainPrep.ts';
import type { RecipeInput } from '../recipe/types.ts';
import type { ScheduleInput } from './types.ts';

export function normalizeScheduleInput(
  schedule: ScheduleInput | undefined,
  recipeInput: RecipeInput,
): ScheduleInput {
  const defaults = createDefaultScheduleInput(recipeInput);
  const base = schedule ?? defaults;

  return {
    ...defaults,
    ...base,
    includeStarterPrep: base.includeStarterPrep ?? defaults.includeStarterPrep,
    starterFromFridge: base.starterFromFridge ?? defaults.starterFromFridge,
    levainBuildHours: base.levainBuildHours ?? getDefaultLevainBuildHours(),
    levainBufferPercent: base.levainBufferPercent ?? defaults.levainBufferPercent,
  };
}
