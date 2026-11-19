import type { RecipeInput } from '../recipe/types.ts';
import { normalizeScheduleInput } from '../schedule/normalizeScheduleInput.ts';
import type { ScheduleInput } from '../schedule/types.ts';
import type {
  BakeHistorySession,
  BakeHistorySessionSummary,
  BakeHistoryStep,
  CreateBakeHistorySessionInput,
  UpdateBakeHistorySessionInput,
} from './types.ts';

/**
 * Local-first bake history, used when signed out. Stores the same shape as the remote
 * history row (`BakeHistorySession`) so a later import can copy rows one to one.
 */
export const LOCAL_BAKE_HISTORY_STORAGE_KEY = 'sourdough:bake-history:v1';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function getDefaultStorage(): StorageLike {
  if (typeof localStorage === 'undefined') {
    throw new Error('localStorage is not available.');
  }

  return localStorage;
}

export function listLocalBakeHistorySessions(
  storage: StorageLike = getDefaultStorage(),
): BakeHistorySession[] {
  const raw = storage.getItem(LOCAL_BAKE_HISTORY_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map(normalizeStoredSession)
      .filter((session): session is BakeHistorySession => session !== null)
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  } catch {
    return [];
  }
}

export function listLocalBakeHistorySummaries(
  storage: StorageLike = getDefaultStorage(),
): BakeHistorySessionSummary[] {
  return listLocalBakeHistorySessions(storage).map(toBakeHistorySummary);
}

export function getLocalBakeHistorySession(
  id: string,
  storage: StorageLike = getDefaultStorage(),
): BakeHistorySession | null {
  return listLocalBakeHistorySessions(storage).find((session) => session.id === id) ?? null;
}

export function createLocalBakeHistorySession(
  input: CreateBakeHistorySessionInput,
  storage: StorageLike = getDefaultStorage(),
  now: Date = new Date(),
): BakeHistorySession {
  const nowIso = now.toISOString();
  const session: BakeHistorySession = {
    id: crypto.randomUUID(),
    savedRecipeId: input.savedRecipeId ?? null,
    recipeName: input.recipeName.trim(),
    recipeInput: structuredClone(input.recipeInput),
    scheduleInput: structuredClone(input.scheduleInput),
    overallNote: input.overallNote?.trim() || undefined,
    overallAssessment: input.overallAssessment,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    savedAt: nowIso,
    updatedAt: nowIso,
    steps: input.steps.map((step) => ({
      id: crypto.randomUUID(),
      stepIndex: step.stepIndex,
      stepKey: step.stepKey,
      stepLabel: step.stepLabel,
      plannedStartAt: step.plannedStartAt,
      plannedEndAt: step.plannedEndAt,
      actualStartedAt: step.actualStartedAt,
      actualCompletedAt: step.actualCompletedAt,
    })),
  };

  // setItem can throw (storage full); let it propagate so the caller keeps the bake session.
  writeSessions([session, ...listLocalBakeHistorySessions(storage)], storage);
  return session;
}

export function updateLocalBakeHistorySession(
  id: string,
  input: UpdateBakeHistorySessionInput,
  storage: StorageLike = getDefaultStorage(),
  now: Date = new Date(),
): BakeHistorySession {
  const sessions = listLocalBakeHistorySessions(storage);
  const existing = sessions.find((session) => session.id === id);
  if (!existing) {
    throw new Error('Bake session not found.');
  }

  const updated: BakeHistorySession = { ...existing, updatedAt: now.toISOString() };

  if (input.overallNote !== undefined) {
    updated.overallNote = input.overallNote.trim() || undefined;
  }

  if (input.overallAssessment !== undefined) {
    updated.overallAssessment = input.overallAssessment ?? undefined;
  }

  writeSessions(
    sessions.map((session) => (session.id === id ? updated : session)),
    storage,
  );
  return updated;
}

export function deleteLocalBakeHistorySession(
  id: string,
  storage: StorageLike = getDefaultStorage(),
): boolean {
  const sessions = listLocalBakeHistorySessions(storage);
  const remaining = sessions.filter((session) => session.id !== id);
  if (remaining.length === sessions.length) {
    return false;
  }

  writeSessions(remaining, storage);
  return true;
}

export function toBakeHistorySummary(session: BakeHistorySession): BakeHistorySessionSummary {
  const note = session.overallNote?.trim() ?? '';

  return {
    id: session.id,
    savedRecipeId: session.savedRecipeId,
    recipeName: session.recipeName,
    completedAt: session.completedAt,
    savedAt: session.savedAt,
    overallAssessment: session.overallAssessment,
    overallNotePreview: note ? truncateNotePreview(note) : undefined,
  };
}

function truncateNotePreview(note: string, maxLength = 120): string {
  if (note.length <= maxLength) {
    return note;
  }

  return `${note.slice(0, maxLength - 1).trimEnd()}…`;
}

function writeSessions(sessions: BakeHistorySession[], storage: StorageLike): void {
  if (sessions.length === 0) {
    storage.removeItem(LOCAL_BAKE_HISTORY_STORAGE_KEY);
    return;
  }

  storage.setItem(LOCAL_BAKE_HISTORY_STORAGE_KEY, JSON.stringify(sessions));
}

/** Tolerates older or partial shapes; returns null for rows that cannot be shown at all. */
function normalizeStoredSession(value: unknown): BakeHistorySession | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<BakeHistorySession>;
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.recipeName !== 'string' ||
    typeof candidate.startedAt !== 'string' ||
    typeof candidate.completedAt !== 'string' ||
    !candidate.recipeInput ||
    typeof candidate.recipeInput !== 'object' ||
    !candidate.scheduleInput ||
    typeof candidate.scheduleInput !== 'object'
  ) {
    return null;
  }

  const recipeInput = candidate.recipeInput as RecipeInput;
  const scheduleInput: ScheduleInput = normalizeScheduleInput(
    candidate.scheduleInput as ScheduleInput,
    recipeInput,
  );

  return {
    id: candidate.id,
    savedRecipeId: typeof candidate.savedRecipeId === 'string' ? candidate.savedRecipeId : null,
    recipeName: candidate.recipeName,
    recipeInput,
    scheduleInput,
    overallNote: typeof candidate.overallNote === 'string' ? candidate.overallNote : undefined,
    overallAssessment: candidate.overallAssessment,
    startedAt: candidate.startedAt,
    completedAt: candidate.completedAt,
    savedAt: typeof candidate.savedAt === 'string' ? candidate.savedAt : candidate.completedAt,
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : candidate.completedAt,
    steps: Array.isArray(candidate.steps)
      ? candidate.steps.filter(isStoredStep).sort((a, b) => a.stepIndex - b.stepIndex)
      : [],
  };
}

function isStoredStep(value: unknown): value is BakeHistoryStep {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const step = value as Partial<BakeHistoryStep>;
  return (
    typeof step.id === 'string' &&
    typeof step.stepIndex === 'number' &&
    typeof step.stepLabel === 'string' &&
    typeof step.actualStartedAt === 'string' &&
    typeof step.actualCompletedAt === 'string'
  );
}
