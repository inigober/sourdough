import { formatFlourBlendSummary, getPrimaryFlourType } from './flourBlend.ts';
import { flourProfiles } from './flourProfiles.ts';
import type { AssessmentSection, RecipeFormula, RecipeInput } from './types.ts';

export function assessRecipe(input: RecipeInput, formula: RecipeFormula): AssessmentSection[] {
  return [
    createOverview(input, formula),
    ...getHydrationIssues(input),
    ...getFermentationIssues(input, formula),
    ...getLevainIssues(input),
    ...getFormulaIssues(input, formula),
  ];
}

function createOverview(input: RecipeInput, formula: RecipeFormula): AssessmentSection {
  const flour = flourProfiles[getPrimaryFlourType(input.doughFlours)];
  const flourSummary = formatFlourBlendSummary(input.doughFlours);
  const difficultyScore = getDifficultyScore(input, formula);
  const difficultyLabel = difficultyScore >= 3 ? 'advanced' : difficultyScore >= 1 ? 'moderate' : 'approachable';
  const hydrationLabel = getHydrationLabel(input);

  return {
    level: difficultyScore >= 3 ? 'risk' : difficultyScore >= 1 ? 'warning' : 'positive',
    title: 'Overall recipe shape',
    shortMessage: `${input.hydrationPercent}% hydration loaf (${flourSummary}) with ${difficultyLabel} handling.`,
    details: `This looks like a ${hydrationLabel} formula using ${formula.prefermentedFlourPercent}% prefermented flour for a ${input.targetBulkHours}h target bulk at ${input.roomTemperatureCelsius}C. Use this as a planning estimate and confirm readiness from dough signs.`,
  };
}

function getHydrationIssues(input: RecipeInput): AssessmentSection[] {
  const flour = flourProfiles[getPrimaryFlourType(input.doughFlours)];

  if (input.hydrationPercent >= flour.highHydrationStartsAt) {
    return [
      {
        level: 'risk',
        title: 'High hydration for this flour',
        shortMessage: `${input.hydrationPercent}% is high for ${flour.label}.`,
        details:
          getPrimaryFlourType(input.doughFlours) === 'ryeType1150' ||
            getPrimaryFlourType(input.doughFlours) === 'wholeRye'
            ? 'Expect sticky, paste-like handling. Rye structure will not improve through gluten development in the same way wheat dough does.'
            : 'Expect stickier handling, more spreading risk, and a greater need for strong dough development before shaping.',
      },
    ];
  }

  if (input.hydrationPercent < flour.comfortableHydrationRange.low) {
    return [
      {
        level: 'info',
        title: 'Lower hydration for this flour',
        shortMessage: `${input.hydrationPercent}% is below the comfortable range for ${flour.label}.`,
        details: 'Handling should be easier, but the crumb may be tighter and the dough may feel less extensible.',
      },
    ];
  }

  return [];
}

function getFermentationIssues(input: RecipeInput, formula: RecipeFormula): AssessmentSection[] {
  if (hasLowFermentationConfidence(input, formula)) {
    return [
      {
        level: 'risk',
        title: 'Low fermentation confidence',
        shortMessage: 'The timing estimate needs extra caution.',
        details: 'Watch dough signs more than the clock: rise, aeration, bubbles at the edge, a domed surface, and dough strength.',
      },
    ];
  }

  if (!hasHighFermentationConfidence(input, formula)) {
    return [
      {
        level: 'warning',
        title: 'Fermentation timing is approximate',
        shortMessage: 'The estimate is plausible, but not especially forgiving.',
        details: 'Use the target bulk time as a planning guide, then confirm readiness through dough rise, aeration, and strength.',
      },
    ];
  }

  return [];
}

function getLevainIssues(input: RecipeInput): AssessmentSection[] {
  if (input.levainActivity === 'recentlyRefreshedButNotPeaked') {
    return [
      {
        level: 'warning',
        title: 'Levain may need more time',
        shortMessage: 'A recently refreshed levain may not be ready to mix yet.',
        details: 'If it has not peaked or shown strong rise, the dough may ferment more slowly than estimated.',
      },
    ];
  }

  if (input.levainActivity === 'sleepy' || input.levainActivity === 'inactive') {
    return [
      {
        level: 'risk',
        title: 'Refresh levain before baking',
        shortMessage: 'Sleepy or inactive levain makes the timing estimate unreliable.',
        details: 'Treat this formula as planning only until the levain is refreshed and visibly active.',
      },
    ];
  }

  return [];
}

function getFormulaIssues(input: RecipeInput, formula: RecipeFormula): AssessmentSection[] {
  const sections: AssessmentSection[] = [];

  if (input.saltPercent < 1.8) {
    sections.push({
      level: 'warning',
      title: 'Low salt',
      shortMessage: 'Salt is below the usual wheat sourdough range.',
      details: 'Low salt may make fermentation move faster and flavor feel flatter.',
    });
  }

  if (input.saltPercent > 2.2) {
    sections.push({
      level: 'warning',
      title: 'High salt',
      shortMessage: 'Salt is above the usual wheat sourdough range.',
      details: 'Higher salt may slow fermentation and make the loaf taste saltier.',
    });
  }

  if (formula.prefermentedFlourPercent > 25) {
    sections.push({
      level: 'risk',
      title: 'Aggressive inoculation',
      shortMessage: 'Prefermented flour is high.',
      details: 'A high prefermented flour percentage creates a narrower timing window and more overproofing sensitivity.',
    });
  }

  if (formula.prefermentedFlourPercent < 6) {
    sections.push({
      level: 'warning',
      title: 'Slow fermentation setup',
      shortMessage: 'Prefermented flour is low.',
      details: 'Low prefermented flour can make fermentation slow and more dependent on levain strength.',
    });
  }

  return sections;
}

function getDifficultyScore(input: RecipeInput, formula: RecipeFormula): number {
  let score = 0;

  if (isHighHydrationForFlour(input)) score += 1;
  if (formula.prefermentedFlourPercent > 25) score += 1;
  if (input.roomTemperatureCelsius > 27) score += 1;
  if (input.levainActivity !== 'active' && input.levainActivity !== 'veryActive') score += 1;
  if (
    input.doughFlours.some(
      (entry) =>
        entry.percent >= 20 &&
        (entry.flourType === 'ryeType1150' ||
          entry.flourType === 'wholeRye' ||
          entry.flourType === 'wholeWheat'),
    )
  ) {
    score += 1;
  }
  if (input.numberOfLoaves > 1) score += 1;

  return score;
}

function getHydrationLabel(input: RecipeInput): string {
  const flour = flourProfiles[getPrimaryFlourType(input.doughFlours)];

  if (input.hydrationPercent >= flour.highHydrationStartsAt) {
    return 'high-hydration';
  }

  if (input.hydrationPercent < flour.comfortableHydrationRange.low) {
    return 'lower-hydration';
  }

  return 'balanced';
}

function hasLowFermentationConfidence(input: RecipeInput, formula: RecipeFormula): boolean {
  return (
    input.levainActivity === 'sleepy' ||
    input.levainActivity === 'inactive' ||
    input.roomTemperatureCelsius < 20 ||
    input.roomTemperatureCelsius > 28 ||
    input.targetBulkHours < 3 ||
    input.targetBulkHours > 10 ||
    formula.prefermentedFlourPercent < 6 ||
    formula.prefermentedFlourPercent > 25
  );
}

function hasHighFermentationConfidence(input: RecipeInput, formula: RecipeFormula): boolean {
  return (
    (input.levainActivity === 'active' || input.levainActivity === 'veryActive') &&
    input.roomTemperatureCelsius >= 22 &&
    input.roomTemperatureCelsius <= 26 &&
    input.targetBulkHours >= 4 &&
    input.targetBulkHours <= 8 &&
    formula.prefermentedFlourPercent >= 8 &&
    formula.prefermentedFlourPercent <= 18
  );
}

function isHighHydrationForFlour(input: RecipeInput): boolean {
  return input.hydrationPercent >= flourProfiles[getPrimaryFlourType(input.doughFlours)].highHydrationStartsAt;
}
