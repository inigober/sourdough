import type { AssessmentSection } from './types.ts';

export type AssessmentSummary = {
  /** The one-line verdict: the overall-shape section, which is always first in `assessRecipe`. */
  verdict: AssessmentSection;
  /** Sections after the verdict, shown when the details are opened. */
  notes: AssessmentSection[];
  /** How many of those notes are a warning or a risk. */
  watchCount: number;
};

export function summarizeAssessment(sections: AssessmentSection[]): AssessmentSummary | null {
  const [verdict, ...notes] = sections;
  if (!verdict) {
    return null;
  }

  return {
    verdict,
    notes,
    watchCount: notes.filter((note) => note.level === 'warning' || note.level === 'risk').length,
  };
}

/** Words next to the level icon, so the level never relies on colour alone. */
export const assessmentLevelLabels: Record<AssessmentSection['level'], string> = {
  positive: 'Looks good',
  info: 'Note',
  warning: 'Worth a look',
  risk: 'Needs care',
};
