import type { RecipeBuilderStep } from './recipeBuilderSteps.ts';

export const fieldInfo = {
  finalDoughWeightGrams:
    'Total mass of dough before baking, including flour, water, salt, and levain. This is what you are aiming to mix, not the baked loaf weight.',
  numberOfLoaves:
    'How you plan to divide the dough. The formula stays the same; per-loaf weights are calculated from this number.',
  totalFlourInRecipe:
    'Estimated from your dough weight and hydration. Hydration is set on the next step as a baker’s percentage of this total flour.',
  hydrationPercent:
    'Water as a percentage of total flour. Higher hydration usually means a more open crumb and stickier handling, but the right range depends on your flour.',
  saltPercent:
    'Salt as a percentage of total flour. Most wheat sourdough sits around 1.8–2.2%. Salt affects flavor, fermentation speed, and dough strength.',
  targetBulkHours:
    'Your target bulk fermentation time at room temperature. The app uses this to estimate prefermented flour and levain amount — watch dough signs, not only the clock.',
  roomTemperatureCelsius:
    'Air temperature where the dough ferments. Warmer rooms speed fermentation; cooler rooms slow it. The model uses room temperature, not dough temperature.',
  levainActivity:
    'How strong your levain looks right now. Sleepy or inactive levain makes timing estimates less reliable until you refresh it.',
  levainType:
    'Preset levain styles set hydration automatically. Choose custom hydration only if you know the exact hydration of your starter.',
  levainHydrationPercent:
    'Levain water divided by levain flour, as a percentage. This affects how much of the levain counts as flour vs water in the final dough.',
  levainFlourType:
    'Flour in the levain itself. Matching the main dough flour keeps things simple; rye or wholegrain levain can speed fermentation and change flavor.',
} as const;

export const stepInfo: Record<RecipeBuilderStep, string> = {
  welcome:
    'You will set dough size, flour blend, hydration, fermentation context, and handling choices. The app calculates ingredients and gives rule-based coaching at the end.',
  doughSize:
    'Start with how much dough you want and how many loaves. Flour blend is next, then hydration and salt.',
  flour:
    'Choose one or more flours that make up 100% of the flour in the dough. Hydration and salt are on the next step.',
  recipeTargets:
    'Hydration and salt are baker’s percentages based on total flour weight from your blend and dough size.',
  fermentation:
    'Bulk time, temperature, and levain details drive how much prefermented flour the recipe needs.',
};

/** Short, issue-focused copy for summary rows — omit when undefined (no info button). */
export const summarySectionInfo: Partial<Record<'fermentation', string>> = {
  fermentation:
    'Weak levain, unusual bulk time, or room temperature outside a comfortable range may show timing warnings in the assessment.',
};

export const assessmentInfo =
  'Rule-based coaching from your recipe inputs and formula. Warnings and risks appear here when the recipe needs extra caution.';
