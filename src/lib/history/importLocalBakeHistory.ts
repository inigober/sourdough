import {
  deleteLocalBakeHistorySession,
  listLocalBakeHistorySessions,
} from './localBakeHistoryStorage.ts';
import type { BakeHistorySessionSummary, CreateBakeHistorySessionInput } from './types.ts';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type ImportLocalBakeHistoryOptions = {
  storage?: StorageLike;
  listRemoteSummaries: (userId: string) => Promise<BakeHistorySessionSummary[]>;
  /** Ids of recipes that exist remotely; a history row may only link to one of these. */
  listRemoteRecipeIds: (userId: string) => Promise<string[]>;
  createRemote: (userId: string, input: CreateBakeHistorySessionInput) => Promise<unknown>;
};

/**
 * Copies bakes saved on this device (while signed out) to the signed-in account, then removes
 * each local copy once its upload succeeded. A bake already present remotely (same recipe name
 * and completion time, e.g. after an interrupted earlier import) is not uploaded twice.
 * Throws at the first failure, so the bakes not yet uploaded stay on this device.
 */
export async function importLocalBakeHistoryIfNeeded(
  userId: string,
  options: ImportLocalBakeHistoryOptions,
): Promise<{ imported: number }> {
  const localSessions = listLocalBakeHistorySessions(options.storage);
  if (localSessions.length === 0) {
    return { imported: 0 };
  }

  const remoteSummaries = await options.listRemoteSummaries(userId);
  const remoteRecipeIds = new Set(await options.listRemoteRecipeIds(userId));
  const remoteKeys = new Set(remoteSummaries.map(buildDuplicateKey));

  let imported = 0;

  for (const session of localSessions) {
    if (!remoteKeys.has(buildDuplicateKey(session))) {
      await options.createRemote(userId, {
        savedRecipeId:
          session.savedRecipeId && remoteRecipeIds.has(session.savedRecipeId)
            ? session.savedRecipeId
            : undefined,
        recipeName: session.recipeName,
        recipeInput: session.recipeInput,
        scheduleInput: session.scheduleInput,
        overallNote: session.overallNote,
        overallAssessment: session.overallAssessment,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        steps: session.steps.map((step) => ({
          stepIndex: step.stepIndex,
          stepKey: step.stepKey,
          stepLabel: step.stepLabel,
          plannedStartAt: step.plannedStartAt,
          plannedEndAt: step.plannedEndAt,
          actualStartedAt: step.actualStartedAt,
          actualCompletedAt: step.actualCompletedAt,
        })),
      });
      imported += 1;
    }

    deleteLocalBakeHistorySession(session.id, options.storage);
  }

  return { imported };
}

function buildDuplicateKey(entry: { recipeName: string; completedAt: string }): string {
  return `${entry.recipeName}|${new Date(entry.completedAt).getTime()}`;
}
