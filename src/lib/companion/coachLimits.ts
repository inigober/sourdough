export const COACH_MAX_QUESTIONS_PER_BAKE = 5;

export function getCoachQuestionsRemaining(questionsAsked: number): number {
  return Math.max(0, COACH_MAX_QUESTIONS_PER_BAKE - questionsAsked);
}

export function canAskCoachQuestion(questionsAsked: number): boolean {
  return questionsAsked < COACH_MAX_QUESTIONS_PER_BAKE;
}

export function formatCoachQuestionsRemaining(questionsAsked: number): string {
  const remaining = getCoachQuestionsRemaining(questionsAsked);
  if (remaining === 0) {
    return 'No coach questions left this bake';
  }

  return `${remaining} of ${COACH_MAX_QUESTIONS_PER_BAKE} questions left`;
}

/** True when the next question is the last one, so the sheet can say so before it bites. */
export function isLastCoachQuestion(questionsAsked: number): boolean {
  return getCoachQuestionsRemaining(questionsAsked) === 1;
}

export function coachQuestionLimitMessage(): string {
  return `You have used all ${COACH_MAX_QUESTIONS_PER_BAKE} coach questions for this bake. Use the tips above and trust what you see in the dough.`;
}
