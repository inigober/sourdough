import type { BakeSessionAssessment } from '../history/types.ts';
import type { RecipeInput } from '../recipe/types.ts';
import type { ScheduleInput } from '../schedule/types.ts';

export type BakeCompleteSaveInput = {
  note: string;
  assessment?: BakeSessionAssessment;
  /** Optional compressed loaf photo. Held in the dialog until saving; never stored in the session. */
  photo?: Blob;
};

export type BakeSessionStepLog = {
  stepIndex: number;
  stepId: string;
  stepLabel: string;
  actualStartedAt: string;
  actualCompletedAt: string;
};

/**
 * One saved coach message. Photos are NOT stored (data URLs would crowd the single
 * localStorage entry that holds the bake session), only a flag that one was shared.
 */
export type CoachTranscriptMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  /** Step the baker was on when this message was sent. */
  stepId: string;
  stepLabel: string;
  hadPhoto?: boolean;
  createdAt: string;
};

export type BakeSession = {
  id: string;
  savedRecipeId: string | null;
  recipeName: string;
  recipeInput: RecipeInput;
  scheduleInput: ScheduleInput;
  /** Bumped when companion timeline shape changes; used to migrate resumed sessions. */
  timelineVersion?: number;
  currentStepIndex: number;
  scheduleDriftMinutes: number;
  currentStepStartedAt: string | null;
  activeTimerEndsAt: string | null;
  stepLogs: BakeSessionStepLog[];
  coachQuestionsAsked: number;
  /** Optional: sessions saved before the transcript existed do not have it. Normalized on load. */
  coachTranscript?: CoachTranscriptMessage[];
  startedAt: string;
  updatedAt: string;
};

export type BakeSessionSummary = {
  recipeName: string;
  currentStepIndex: number;
  updatedAt: string;
};
