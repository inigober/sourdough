import type { RecipeInput } from './types.ts';
import type { ScheduleInput } from '../schedule/types.ts';
import type { SavedRecipe } from '../storage/types.ts';
import type { RecipeBuilderStep } from '../../features/recipe-builder/recipeBuilderSteps.ts';

type BuilderPhase = 'wizard' | 'results' | 'schedule' | 'companion';

export function isRecipeDirty(options: {
  phase: BuilderPhase;
  currentStep: RecipeBuilderStep;
  recipeInput: RecipeInput;
  scheduleInput: ScheduleInput;
  hasOpenedSchedule: boolean;
  hasCompletedWizard: boolean;
  activeSavedRecipe: SavedRecipe | null;
}): boolean {
  const { phase, currentStep, recipeInput, scheduleInput, hasOpenedSchedule, hasCompletedWizard, activeSavedRecipe } =
    options;

  if (phase === 'companion') {
    return false;
  }

  if (phase === 'wizard' && currentStep === 'welcome') {
    return false;
  }

  if (activeSavedRecipe) {
    const recipeChanged = !stableEqual(recipeInput, activeSavedRecipe.recipeInput);
    const savedSchedule = activeSavedRecipe.scheduleInput;

    if (!hasOpenedSchedule) {
      return recipeChanged;
    }

    if (!savedSchedule) {
      return true;
    }

    return recipeChanged || !stableEqual(scheduleInput, savedSchedule);
  }

  return hasCompletedWizard || phase !== 'wizard' || currentStep !== 'welcome';
}

function stableEqual<T>(left: T, right: T): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
