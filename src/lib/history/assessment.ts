import type { BakeSessionAssessment } from './types.ts';

export const LOAF_ASSESSMENT_OPTIONS: Array<{
  value: BakeSessionAssessment;
  label: string;
}> = [
  { value: 'great', label: 'Great loaf' },
  { value: 'ok', label: 'OK' },
  { value: 'needsWork', label: 'Needs work' },
];

export function getLoafAssessmentLabel(assessment: BakeSessionAssessment | undefined): string | null {
  if (!assessment) {
    return null;
  }

  return LOAF_ASSESSMENT_OPTIONS.find((option) => option.value === assessment)?.label ?? null;
}
