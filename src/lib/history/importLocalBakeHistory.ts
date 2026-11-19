import { moveLocalPhotoToAccount, type UploadRemoteBakePhoto } from './bakePhotos.ts';
import type { BakePhotoStore } from './localBakePhotoStorage.ts';
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
  /** Resolves with the created bake (its `id` is needed to attach a photo). */
  createRemote: (userId: string, input: CreateBakeHistorySessionInput) => Promise<{ id: string } | void>;
  /** When given, loaf photos kept on this device are moved to the account along with their bakes. */
  photos?: { store: BakePhotoStore; uploadRemote: UploadRemoteBakePhoto };
};

/**
 * Copies bakes saved on this device (while signed out) to the signed-in account, then removes
 * each local copy once its upload succeeded. A bake already present remotely (same recipe name
 * and completion time, e.g. after an interrupted earlier import) is not uploaded twice.
 * Loaf photos follow their bake: the on-device photo is deleted only after its upload succeeded,
 * and a failed photo upload never blocks the bake import (see `moveLocalPhotoToAccount`).
 * Throws at the first bake failure, so the bakes not yet uploaded stay on this device.
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
  const remoteByKey = new Map(remoteSummaries.map((summary) => [buildDuplicateKey(summary), summary]));

  let imported = 0;

  for (const session of localSessions) {
    const existingRemote = remoteByKey.get(buildDuplicateKey(session));
    let remoteBakeId = existingRemote?.id;

    if (!existingRemote) {
      const created = await options.createRemote(userId, {
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
      remoteBakeId = created?.id;
      imported += 1;
    }

    if (options.photos && remoteBakeId) {
      await moveLocalPhotoToAccount({
        userId,
        localBakeId: session.id,
        remoteBakeId,
        remoteHasPhoto: Boolean(existingRemote?.photoPath),
        store: options.photos.store,
        uploadRemote: options.photos.uploadRemote,
      });
    }

    deleteLocalBakeHistorySession(session.id, options.storage);
  }

  return { imported };
}

function buildDuplicateKey(entry: { recipeName: string; completedAt: string }): string {
  return `${entry.recipeName}|${new Date(entry.completedAt).getTime()}`;
}
