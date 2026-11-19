import { buildIngredientRows } from '../recipe/formatIngredients.ts';
import { calculateRecipe } from '../recipe/calculateRecipe.ts';
import type { RecipeInput } from '../recipe/types.ts';
import type { ScheduleInput } from '../schedule/types.ts';
import type { CoachTopic } from './coachTopics.ts';
import { formatCoachLiveContextLines, type CoachLiveContext } from './coachLiveContext.ts';
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
  /** Optional: where the bake actually is right now. Omitted when no live session is available. */
  liveContext?: CoachLiveContext | null;
};

export function buildCoachPrompt(input: BuildCoachPromptInput): CoachPromptParts {
  const formula = tryCalculateRecipe(input.recipeInput);
  const ingredientSummary = formula
    ? buildIngredientRows(input.recipeInput, formula)
        .map(([name, amount]) => `${name}: ${amount}`)
        .join(', ')
    : 'Ingredient list unavailable from current inputs.';

  const systemParts = [
    'You are a practical sourdough baking coach for a home baker mid-bake.',
    'Reply in 2–4 short sentences. Plain language only.',
    'Give one clear next check or action. No bullet lists unless essential.',
    'Prefer sensory cues (look, feel, smell) over rigid timings.',
    'If unsure, say what to inspect next — do not guess.',
    `The recipe's planned hydration is ${input.recipeInput.hydrationPercent}%. It was chosen deliberately and the app has already calculated every ingredient amount.`,
    'Never recommend adding or removing water, flour, salt, or starter, and never suggest changing the hydration or any ingredient amount. Do this even if the dough feels wetter or drier than expected.',
    'If the dough feels sticky, wet, stiff or slack, explain what is normal for this step and suggest technique only (wet hands, a rest, a fold, warmth or cold, waiting for the next step), or tell the baker to keep following the plan.',
    'When bake progress details are given, use them to judge timing, and favour what the dough looks and feels like over the clock if the baker is behind or ahead of plan.',
  ];

  if (input.topic === 'autolyse') {
    systemParts.push(
      'This is autolyse: flour and water only, so a sticky, shaggy dough is expected and nothing needs adding.',
    );
  }

  if (input.hasPhoto) {
    systemParts.push('A dough photo is attached — describe what you see and tie it to the bake context.');
  }

  const system = systemParts.join(' ');

  const contextLines = [
    `Recipe: ${input.recipeName}`,
    `Current step: ${input.stepLabel} (${input.stepId})`,
    input.stepDetail ? `Step detail: ${input.stepDetail}` : null,
    `Coach focus: ${input.topic}`,
    `Default tip for this step: ${getCoachTipForStep(input.stepId, input.stepLabel, input.recipeInput)}`,
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

  if (input.liveContext) {
    userParts.push('', 'Bake progress right now:', ...formatCoachLiveContextLines(input.liveContext).map((line) => `- ${line}`));
  }

  if (input.hasPhoto) {
    userParts.push('', '- The baker attached a photo of their dough for visual guidance.');
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
