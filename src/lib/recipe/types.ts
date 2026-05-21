export type FlourType =
  | 'wheatType550'
  | 'wheatType1050'
  | 'pizzaFlour'
  | 'wholeWheat'
  | 'ryeType1150'
  | 'wholeRye';

export type LevainType = 'stiffLevain' | 'standard100' | 'liquidLevain' | 'customHydration';

export type LevainActivity =
  | 'veryActive'
  | 'active'
  | 'recentlyRefreshedButNotPeaked'
  | 'sleepy'
  | 'inactive';

export type FlourBlendEntry = {
  id: string;
  flourType: FlourType;
  percent: number;
};

export type RecipeInput = {
  finalDoughWeightGrams: number;
  numberOfLoaves: number;
  hydrationPercent: number;
  saltPercent: number;
  doughFlours: FlourBlendEntry[];
  levainFlourType: FlourType;
  targetBulkHours: number;
  roomTemperatureCelsius: number;
  levainType: LevainType;
  levainHydrationPercent: number;
  levainActivity: LevainActivity;
};

export type RecipeFormula = {
  totalFlourGrams: number;
  totalWaterGrams: number;
  addedFlourGrams: number;
  addedWaterGrams: number;
  saltGrams: number;
  levainGrams: number;
  levainFlourGrams: number;
  levainWaterGrams: number;
  overallHydrationPercent: number;
  prefermentedFlourPercent: number;
  perLoafDoughWeightGrams: number;
  estimatedBakedLoafWeightGrams: {
    low: number;
    high: number;
  };
};

export type RecipeValidationIssue = {
  field: keyof RecipeInput | 'formula' | 'doughFlours';
  level: 'error' | 'warning';
  message: string;
};

export type AssessmentSection = {
  level: 'positive' | 'info' | 'warning' | 'risk';
  title: string;
  shortMessage: string;
  details: string;
};
