import { COACH_MAX_QUESTIONS_PER_BAKE } from './coachLimits.ts';
import type { BakeSession, CoachTranscriptMessage } from './types.ts';

/** One question and one reply per quota slot, so this is a generous upper bound. */
const MAX_TRANSCRIPT_MESSAGES = COACH_MAX_QUESTIONS_PER_BAKE * 2;

export type CoachExchangeInput = {
  question: string;
  hadPhoto: boolean;
  reply: string;
  stepId: string;
  stepLabel: string;
};

/** Reads a persisted transcript defensively: older sessions have none, corrupt entries are dropped. */
export function normalizeCoachTranscript(value: unknown): CoachTranscriptMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const messages = value.filter(isCoachTranscriptMessage).map((message) => ({
    id: message.id,
    role: message.role,
    text: message.text,
    stepId: message.stepId,
    stepLabel: message.stepLabel,
    ...(message.hadPhoto ? { hadPhoto: true } : {}),
    createdAt: message.createdAt,
  }));

  return messages.slice(-MAX_TRANSCRIPT_MESSAGES);
}

/**
 * Records a successful exchange and spends one quota slot in a single update,
 * so the transcript and `coachQuestionsAsked` can never disagree.
 */
export function recordCoachExchange(
  session: BakeSession,
  exchange: CoachExchangeInput,
  now = new Date(),
): BakeSession {
  const createdAt = now.toISOString();
  const base = {
    stepId: exchange.stepId,
    stepLabel: exchange.stepLabel,
    createdAt,
  };

  const transcript: CoachTranscriptMessage[] = [
    ...(session.coachTranscript ?? []),
    {
      ...base,
      id: crypto.randomUUID(),
      role: 'user',
      text: exchange.question,
      ...(exchange.hadPhoto ? { hadPhoto: true } : {}),
    },
    { ...base, id: crypto.randomUUID(), role: 'assistant', text: exchange.reply },
  ];

  return {
    ...session,
    coachQuestionsAsked: session.coachQuestionsAsked + 1,
    coachTranscript: transcript.slice(-MAX_TRANSCRIPT_MESSAGES),
    updatedAt: createdAt,
  };
}

function isCoachTranscriptMessage(value: unknown): value is CoachTranscriptMessage {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<CoachTranscriptMessage>;
  return (
    typeof candidate.id === 'string' &&
    (candidate.role === 'user' || candidate.role === 'assistant') &&
    typeof candidate.text === 'string' &&
    typeof candidate.stepId === 'string' &&
    typeof candidate.stepLabel === 'string' &&
    typeof candidate.createdAt === 'string'
  );
}
