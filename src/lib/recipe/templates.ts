import { createFlourBlendEntry } from './flourBlend.ts';
import { levainHydrationPresets } from './defaults.ts';
import type { RecipeInput } from './types.ts';

export type RecipeTemplateId =
  | 'country-loaf'
  | 'focaccia'
  | 'pizza'
  | 'ciabatta'
  | 'pan-de-cristal'
  | 'pain-de-champagne';

export type RecipeTemplate = {
  id: RecipeTemplateId;
  name: string;
  description: string;
  recipeInput: RecipeInput;
};

export const recipeTemplates: readonly RecipeTemplate[] = [
  {
    id: 'country-loaf',
    name: 'Country-style loaf',
    description: 'Everyday boule on strong wheat flour with moderate hydration.',
    recipeInput: {
      finalDoughWeightGrams: 900,
      numberOfLoaves: 1,
      hydrationPercent: 76,
      saltPercent: 2,
      doughFlours: [createFlourBlendEntry('wheatType1050', 100)],
      levainFlourType: 'wheatType1050',
      targetBulkHours: 6,
      roomTemperatureCelsius: 22,
      levainType: 'standard100',
      levainHydrationPercent: levainHydrationPresets.standard100,
      levainActivity: 'active',
    },
  },
  {
    id: 'focaccia',
    name: 'Focaccia',
    description: 'Pan-sized sheet with higher hydration and a shorter bulk.',
    recipeInput: {
      finalDoughWeightGrams: 1200,
      numberOfLoaves: 1,
      hydrationPercent: 80,
      saltPercent: 2.2,
      doughFlours: [createFlourBlendEntry('wheatType1050', 100)],
      levainFlourType: 'wheatType1050',
      targetBulkHours: 4.5,
      roomTemperatureCelsius: 24,
      levainType: 'standard100',
      levainHydrationPercent: levainHydrationPresets.standard100,
      levainActivity: 'active',
    },
  },
  {
    id: 'pizza',
    name: 'Pizza',
    description: 'Four dough balls on pizza flour for same-day bakes.',
    recipeInput: {
      finalDoughWeightGrams: 1000,
      numberOfLoaves: 4,
      hydrationPercent: 65,
      saltPercent: 2.4,
      doughFlours: [createFlourBlendEntry('pizzaFlour', 100)],
      levainFlourType: 'pizzaFlour',
      targetBulkHours: 4,
      roomTemperatureCelsius: 24,
      levainType: 'standard100',
      levainHydrationPercent: levainHydrationPresets.standard100,
      levainActivity: 'active',
    },
  },
  {
    id: 'ciabatta',
    name: 'Ciabatta',
    description: 'Slack, wet dough with an open crumb and shorter schedule.',
    recipeInput: {
      finalDoughWeightGrams: 900,
      numberOfLoaves: 2,
      hydrationPercent: 85,
      saltPercent: 2,
      doughFlours: [createFlourBlendEntry('wheatType1050', 100)],
      levainFlourType: 'wheatType1050',
      targetBulkHours: 4,
      roomTemperatureCelsius: 24,
      levainType: 'standard100',
      levainHydrationPercent: levainHydrationPresets.standard100,
      levainActivity: 'active',
    },
  },
  {
    id: 'pan-de-cristal',
    name: 'Pan de cristal',
    description: 'Very wet dough for a holey, glassy crumb in a wide sheet.',
    recipeInput: {
      finalDoughWeightGrams: 1100,
      numberOfLoaves: 1,
      hydrationPercent: 90,
      saltPercent: 2.1,
      doughFlours: [createFlourBlendEntry('wheatType1050', 100)],
      levainFlourType: 'wheatType1050',
      targetBulkHours: 3.5,
      roomTemperatureCelsius: 24,
      levainType: 'standard100',
      levainHydrationPercent: levainHydrationPresets.standard100,
      levainActivity: 'active',
    },
  },
  {
    id: 'pain-de-champagne',
    name: 'Pain de champagne',
    description: 'Lighter flour blend with moderate hydration and longer bulk.',
    recipeInput: {
      finalDoughWeightGrams: 800,
      numberOfLoaves: 1,
      hydrationPercent: 75,
      saltPercent: 2,
      doughFlours: [
        createFlourBlendEntry('wheatType550', 40),
        createFlourBlendEntry('wheatType1050', 60),
      ],
      levainFlourType: 'wheatType1050',
      targetBulkHours: 7,
      roomTemperatureCelsius: 21,
      levainType: 'standard100',
      levainHydrationPercent: levainHydrationPresets.standard100,
      levainActivity: 'active',
    },
  },
];

export function getRecipeTemplate(id: string): RecipeTemplate | undefined {
  return recipeTemplates.find((template) => template.id === id);
}

export function cloneTemplateRecipeInput(template: RecipeTemplate): RecipeInput {
  return {
    ...template.recipeInput,
    doughFlours: template.recipeInput.doughFlours.map((entry) => ({
      ...entry,
      id: crypto.randomUUID(),
    })),
  };
}
