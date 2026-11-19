import type { BakeCompleteSaveInput, BakeSession } from '../companion/types.ts';
import { savePhotoForNewBake, type BakePhotoOutcome, type UploadRemoteBakePhoto } from './bakePhotos.ts';
import { buildBakeHistoryStepsFromSession } from './buildBakeHistorySteps.ts';
import { getDefaultBakePhotoStore, type BakePhotoStore } from './localBakePhotoStorage.ts';
import { createLocalBakeHistorySession } from './localBakeHistoryStorage.ts';
import { uploadRemoteBakePhoto } from './remoteBakePhotoStorage.ts';
import type { BakeHistorySession, CreateBakeHistorySessionInput } from './types.ts';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type SaveCompletedBakeDestination = 'local' | 'remote';

export type SaveCompletedBakeResult = {
  destination: SaveCompletedBakeDestination;
  /** What happened to the optional loaf photo. The bake is saved whatever this says. */
  photo: BakePhotoOutcome;
};

export type SaveCompletedBakeOptions = {
  session: BakeSession;
  input: BakeCompleteSaveInput;
  /** Signed-in user id. Without one, the bake is saved on this device. */
  userId: string | null;
  completedAt?: string;
  storage?: StorageLike;
  createRemote: (userId: string, input: CreateBakeHistorySessionInput) => Promise<BakeHistorySession>;
  /** Optional compressed loaf photo, saved after the bake itself. */
  photo?: Blob;
  photoStore?: BakePhotoStore;
  uploadRemotePhoto?: UploadRemoteBakePhoto;
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
 * Throws when saving the bake fails. It never touches the stored bake session, so the caller must
 * clear the session only after this resolves. A photo problem never throws: the bake is saved
 * first, then the photo is stored (uploaded, or kept on this device) and the outcome is reported.
 */
export async function saveCompletedBake(
  options: SaveCompletedBakeOptions,
): Promise<SaveCompletedBakeResult> {
  const completedAt = options.completedAt ?? new Date().toISOString();
  const historyInput = buildCompletedBakeHistoryInput(options.session, options.input, completedAt);

  const userId = options.userId;
  const savedBake = userId
    ? await options.createRemote(userId, historyInput)
    : createLocalBakeHistorySession(historyInput, options.storage);

  const photo = options.photo
    ? await savePhotoForNewBake({
        photo: options.photo,
        bakeId: savedBake.id,
        userId,
        store: options.photoStore ?? getDefaultBakePhotoStore(),
        uploadRemote: options.uploadRemotePhoto ?? uploadRemoteBakePhoto,
      })
    : 'none';

  return { destination: userId ? 'remote' : 'local', photo };
}
