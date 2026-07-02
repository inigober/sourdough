import { migrateBakeSession } from '../companion/migrateBakeSession.ts';
import type { BakeSession } from '../companion/types.ts';
import { normalizeScheduleInput } from '../schedule/normalizeScheduleInput.ts';

export const BAKE_SESSION_STORAGE_KEY = 'sourdough:bake-session:v1';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function getDefaultStorage(): StorageLike {
  if (typeof localStorage === 'undefined') {
    throw new Error('localStorage is not available.');
  }

  return localStorage;
}

export function loadBakeSession(storage: StorageLike = getDefaultStorage()): BakeSession | null {
  const raw = storage.getItem(BAKE_SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isBakeSession(parsed)) {
      return null;
    }

    return migrateBakeSession({
      ...parsed,
      scheduleInput: normalizeScheduleInput(parsed.scheduleInput, parsed.recipeInput),
      scheduleDriftMinutes: parsed.scheduleDriftMinutes ?? 0,
      currentStepStartedAt: parsed.currentStepStartedAt ?? null,
      stepLogs: parsed.stepLogs ?? [],
      coachQuestionsAsked: parsed.coachQuestionsAsked ?? 0,
    });
  } catch {
    return null;
  }
}

export function saveBakeSession(
  session: BakeSession,
  storage: StorageLike = getDefaultStorage(),
): void {
  storage.setItem(BAKE_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearBakeSession(storage: StorageLike = getDefaultStorage()): void {
  storage.removeItem(BAKE_SESSION_STORAGE_KEY);
}

function isBakeSession(value: unknown): value is BakeSession {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<BakeSession>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.recipeName === 'string' &&
    typeof candidate.currentStepIndex === 'number' &&
    typeof candidate.startedAt === 'string' &&
    typeof candidate.updatedAt === 'string' &&
    candidate.recipeInput !== undefined &&
    candidate.scheduleInput !== undefined
  );
}
