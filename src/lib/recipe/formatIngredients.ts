import { formatGrams } from '../../app/format.ts';
import { getFlourIngredientRows } from './flourBlend.ts';
import type { RecipeFormula, RecipeInput } from './types.ts';

export type IngredientRow = readonly [string, number | string];

export function buildIngredientRows(
  recipeInput: RecipeInput,
  formula: RecipeFormula,
): IngredientRow[] {
  // The blend splits the flour added on top of the levain. The levain row already holds its own flour,
  // so splitting the total flour here would count the levain's flour twice.
  const flourRows = getFlourIngredientRows(recipeInput.doughFlours, formula.addedFlourGrams);

  if (flourRows.length > 1) {
    return [
      ...flourRows,
      ['Added water', formula.addedWaterGrams],
      ['Salt', formula.saltGrams],
      ['Levain', formula.levainGrams],
    ];
  }

  return [
    ['Added flour', formula.addedFlourGrams],
    ['Added water', formula.addedWaterGrams],
    ['Salt', formula.saltGrams],
    ['Levain', formula.levainGrams],
  ];
}

export function formatIngredientListAsText(options: {
  recipeName: string;
  rows: IngredientRow[];
}): string {
  const lines = [
    options.recipeName,
    '',
    'Ingredients',
    ...options.rows.map(([label, value]) => {
      const formattedValue = typeof value === 'number' ? formatGrams(value) : value;
      return `${label}: ${formattedValue}`;
    }),
  ];

  return lines.join('\n');
}
