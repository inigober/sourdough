import type { FlourType } from './types.ts';

export type FlourFamily = 'wheat' | 'rye';

export type FlourProfile = {
  id: FlourType;
  label: string;
  family: FlourFamily;
  comfortableHydrationRange: {
    low: number;
    high: number;
  };
  highHydrationStartsAt: number;
  fermentationSpeedMultiplier: number;
};

export const flourProfiles: Record<FlourType, FlourProfile> = {
  wheatType550: {
    id: 'wheatType550',
    label: 'Wheat Type 550',
    family: 'wheat',
    comfortableHydrationRange: { low: 65, high: 75 },
    highHydrationStartsAt: 76,
    fermentationSpeedMultiplier: 1,
  },
  wheatType1050: {
    id: 'wheatType1050',
    label: 'Wheat Type 1050',
    family: 'wheat',
    comfortableHydrationRange: { low: 72, high: 82 },
    highHydrationStartsAt: 83,
    fermentationSpeedMultiplier: 0.95,
  },
  pizzaFlour: {
    id: 'pizzaFlour',
    label: 'Pizza flour (Tipo 00 style)',
    family: 'wheat',
    comfortableHydrationRange: { low: 58, high: 68 },
    highHydrationStartsAt: 70,
    fermentationSpeedMultiplier: 1.05,
  },
  wholeWheat: {
    id: 'wholeWheat',
    label: 'Whole wheat',
    family: 'wheat',
    comfortableHydrationRange: { low: 75, high: 88 },
    highHydrationStartsAt: 89,
    fermentationSpeedMultiplier: 0.9,
  },
  ryeType1150: {
    id: 'ryeType1150',
    label: 'Rye Type 1150',
    family: 'rye',
    comfortableHydrationRange: { low: 70, high: 85 },
    highHydrationStartsAt: 86,
    fermentationSpeedMultiplier: 0.85,
  },
  wholeRye: {
    id: 'wholeRye',
    label: 'Whole rye',
    family: 'rye',
    comfortableHydrationRange: { low: 72, high: 90 },
    highHydrationStartsAt: 91,
    fermentationSpeedMultiplier: 0.8,
  },
};
