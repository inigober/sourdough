import type { RecipeInput } from '../recipe/types.ts';
import type { ScheduleInput } from '../schedule/types.ts';
import type { RecipeBuilderStep } from '../../features/recipe-builder/recipeBuilderSteps.ts';

export const BUILDER_DRAFT_STORAGE_KEY = 'sourdough:builder-draft:v1';

export type BuilderPhase = 'wizard' | 'results' | 'schedule';

export type BuilderDraft = {
  version: 1;
  updatedAt: string;
  phase: BuilderPhase;
  currentStep: RecipeBuilderStep;
  hasCompletedWizard: boolean;
  editingFromResults: boolean;
  hasOpenedSchedule: boolean;
  recipeInput: RecipeInput;
  scheduleInput: ScheduleInput;
  activeSavedRecipeId: string | null;
};

export type BuilderDraftSummary = {
  updatedAt: string;
  phase: BuilderPhase;
  label: string;
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function getDefaultStorage(): StorageLike {
  if (typeof localStorage === 'undefined') {
    throw new Error('localStorage is not available.');
  }

  return localStorage;
}

export function saveBuilderDraft(draft: Omit<BuilderDraft, 'version' | 'updatedAt'>, storage: StorageLike = getDefaultStorage()): void {
  const payload: BuilderDraft = {
    version: 1,
    updatedAt: new Date().toISOString(),
    ...draft,
  };

  storage.setItem(BUILDER_DRAFT_STORAGE_KEY, JSON.stringify(payload));
}

export function getBuilderDraftSummary(storage: StorageLike = getDefaultStorage()): BuilderDraftSummary | null {
  const draft = readBuilderDraft(storage);
  if (!draft) {
    return null;
  }

  if (draft.phase === 'wizard' && draft.currentStep === 'welcome') {
    return null;
  }

  return {
    updatedAt: draft.updatedAt,
    phase: draft.phase,
    label: getDraftLabel(draft),
  };
}

export function loadBuilderDraft(storage: StorageLike = getDefaultStorage()): BuilderDraft | null {
  return readBuilderDraft(storage);
}

export function clearBuilderDraft(storage: StorageLike = getDefaultStorage()): void {
  storage.removeItem(BUILDER_DRAFT_STORAGE_KEY);
}

function readBuilderDraft(storage: StorageLike): BuilderDraft | null {
  const raw = storage.getItem(BUILDER_DRAFT_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isBuilderDraft(parsed)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function getDraftLabel(draft: BuilderDraft): string {
  if (draft.phase === 'schedule') {
    return 'Schedule in progress';
  }

  if (draft.phase === 'results') {
    return 'Ingredient summary';
  }

  return 'Recipe wizard';
}

function isBuilderDraft(value: unknown): value is BuilderDraft {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<BuilderDraft>;
  return (
    candidate.version === 1 &&
    typeof candidate.updatedAt === 'string' &&
    typeof candidate.phase === 'string' &&
    typeof candidate.currentStep === 'string' &&
    typeof candidate.hasCompletedWizard === 'boolean' &&
    typeof candidate.editingFromResults === 'boolean' &&
    typeof candidate.hasOpenedSchedule === 'boolean' &&
    candidate.recipeInput !== undefined &&
    candidate.scheduleInput !== undefined &&
    (candidate.activeSavedRecipeId === null || typeof candidate.activeSavedRecipeId === 'string')
  );
}
