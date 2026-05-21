import { buildIngredientRows } from '../recipe/formatIngredients.ts';
import { calculateRecipe } from '../recipe/calculateRecipe.ts';
import type { RecipeInput } from '../recipe/types.ts';
import type { ScheduleInput } from '../schedule/types.ts';
import type { CoachTopic } from './coachTopics.ts';
import { getCoachTipForStep } from './coachStepTips.ts';

export type CoachPromptParts = {
  system: string;
  user: string;
};

export type BuildCoachPromptInput = {
  topic: CoachTopic;
  stepId: string;
  stepLabel: string;
  stepDetail?: string;
  recipeName: string;
  recipeInput: RecipeInput;
  scheduleInput: ScheduleInput;
  userQuestion?: string;
  hasPhoto?: boolean;
};

export function buildCoachPrompt(input: BuildCoachPromptInput): CoachPromptParts {
  const formula = tryCalculateRecipe(input.recipeInput);
  const ingredientSummary = formula
    ? buildIngredientRows(input.recipeInput, formula)
        .map(([name, amount]) => `${name}: ${amount}`)
        .join(', ')
    : 'Ingredient list unavailable from current inputs.';

  const system = [
    'You are a practical sourdough baking coach for a home baker mid-bake.',
    'Reply in 2–4 short sentences. Plain language only.',
    'Give one clear next check or action. No bullet lists unless essential.',
    'Prefer sensory cues (look, feel, smell) over rigid timings.',
    'If unsure, say what to inspect next — do not guess.',
  ].join(' ');

  const contextLines = [
    `Recipe: ${input.recipeName}`,
    `Current step: ${input.stepLabel} (${input.stepId})`,
    input.stepDetail ? `Step detail: ${input.stepDetail}` : null,
    `Coach focus: ${input.topic}`,
    `Default tip for this step: ${getCoachTipForStep(input.stepId, input.stepLabel)}`,
    `Hydration: ${input.recipeInput.hydrationPercent}%`,
    `Room temperature: ${input.recipeInput.roomTemperatureCelsius}°C`,
    `Target bulk: ${input.recipeInput.targetBulkHours}h`,
    `Proofing style: ${input.scheduleInput.proofingStyle}`,
    `Ingredients: ${ingredientSummary}`,
  ].filter(Boolean);

  const userParts = [
    'Bake context:',
    ...contextLines.map((line) => `- ${line}`),
  ];

  if (input.hasPhoto) {
    userParts.push('- The baker attached a photo of their dough for visual guidance.');
  }

  if (input.userQuestion?.trim()) {
    userParts.push('', `Baker question: ${input.userQuestion.trim()}`);
  }

  return {
    system,
    user: userParts.join('\n'),
  };
}

function tryCalculateRecipe(recipeInput: RecipeInput) {
  try {
    return calculateRecipe(recipeInput);
  } catch {
    return null;
  }
}
