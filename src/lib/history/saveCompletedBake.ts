import type { BakeCompleteSaveInput, BakeSession } from '../companion/types.ts';
import { buildBakeHistoryStepsFromSession } from './buildBakeHistorySteps.ts';
import { createLocalBakeHistorySession } from './localBakeHistoryStorage.ts';
import type { BakeHistorySession, CreateBakeHistorySessionInput } from './types.ts';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type SaveCompletedBakeDestination = 'local' | 'remote';

export type SaveCompletedBakeOptions = {
  session: BakeSession;
  input: BakeCompleteSaveInput;
  /** Signed-in user id. Without one, the bake is saved on this device. */
  userId: string | null;
  completedAt?: string;
  storage?: StorageLike;
  createRemote: (userId: string, input: CreateBakeHistorySessionInput) => Promise<BakeHistorySession>;
};

export function buildCompletedBakeHistoryInput(
  session: BakeSession,
  input: BakeCompleteSaveInput,
  completedAt: string,
): CreateBakeHistorySessionInput {
  return {
    savedRecipeId: session.savedRecipeId ?? undefined,
    recipeName: session.recipeName,
    recipeInput: session.recipeInput,
    scheduleInput: session.scheduleInput,
    overallNote: input.note,
    overallAssessment: input.assessment,
    startedAt: session.startedAt,
    completedAt,
    steps: buildBakeHistoryStepsFromSession(session, completedAt),
  };
}

/**
 * Saves a finished bake to history: remotely when signed in, otherwise on this device.
 * Throws when saving fails. It never touches the stored bake session, so the caller must
 * clear the session only after this resolves.
 */
export async function saveCompletedBake(
  options: SaveCompletedBakeOptions,
): Promise<SaveCompletedBakeDestination> {
  const completedAt = options.completedAt ?? new Date().toISOString();
  const historyInput = buildCompletedBakeHistoryInput(options.session, options.input, completedAt);

  if (options.userId) {
    await options.createRemote(options.userId, historyInput);
    return 'remote';
  }

  createLocalBakeHistorySession(historyInput, options.storage);
  return 'local';
}
