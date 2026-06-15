import { describeBreadStyle } from '../recipe/describeBreadStyle.ts';
import type { RecipeInput } from '../recipe/types.ts';
import { getBakeDateIso, getMixDateIso, getTodayIsoDate, formatBakeDateShort } from '../schedule/dates.ts';
import { createDefaultScheduleInput } from '../schedule/defaults.ts';
import type { ScheduleInput } from '../schedule/types.ts';
import type { SavedRecipe, SavedRecipeSummary, UpsertSavedRecipeInput } from './types.ts';

export const SAVED_RECIPES_STORAGE_KEY = 'sourdough:saved-recipes:v1';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function getDefaultStorage(): StorageLike {
  if (typeof localStorage === 'undefined') {
    throw new Error('localStorage is not available.');
  }

  return localStorage;
}

export function generateDefaultRecipeName(
  recipeInput: RecipeInput,
  _scheduleInput?: ScheduleInput,
): string {
  return describeBreadStyle(recipeInput);
}

export function listSavedRecipeSummaries(storage: StorageLike = getDefaultStorage()): SavedRecipeSummary[] {
  return readSavedRecipes(storage)
    .map(toSavedRecipeSummary)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function listLocalSavedRecipes(storage: StorageLike = getDefaultStorage()): SavedRecipe[] {
  return readSavedRecipes(storage);
}

export function getSavedRecipe(
  id: string,
  storage: StorageLike = getDefaultStorage(),
): SavedRecipe | null {
  return readSavedRecipes(storage).find((recipe) => recipe.id === id) ?? null;
}

export function upsertSavedRecipe(
  input: UpsertSavedRecipeInput,
  storage: StorageLike = getDefaultStorage(),
): SavedRecipe {
  const recipes = readSavedRecipes(storage);
  const now = new Date().toISOString();
  const existing = input.id ? recipes.find((recipe) => recipe.id === input.id) : undefined;
  const scheduleInput = normalizeScheduleInput(input.scheduleInput ?? existing?.scheduleInput, input.recipeInput);

  const savedRecipe: SavedRecipe = {
    id: existing?.id ?? crypto.randomUUID(),
    name: input.name.trim() || generateDefaultRecipeName(input.recipeInput, scheduleInput),
    recipeInput: structuredClone(input.recipeInput),
    scheduleInput,
    savedAt: existing?.savedAt ?? now,
    updatedAt: now,
  };

  const nextRecipes = existing
    ? recipes.map((recipe) => (recipe.id === existing.id ? savedRecipe : recipe))
    : [savedRecipe, ...recipes];

  writeSavedRecipes(storage, nextRecipes);
  return savedRecipe;
}

export function duplicateSavedRecipe(
  id: string,
  storage: StorageLike = getDefaultStorage(),
): SavedRecipe | null {
  const source = getSavedRecipe(id, storage);
  if (!source) {
    return null;
  }

  const scheduleInput = source.scheduleInput
    ? { ...source.scheduleInput, mixDate: getTodayIsoDate() }
    : undefined;

  return upsertSavedRecipe(
    {
      name: generateDefaultRecipeName(source.recipeInput, scheduleInput),
      recipeInput: source.recipeInput,
      scheduleInput,
    },
    storage,
  );
}

export function deleteSavedRecipe(id: string, storage: StorageLike = getDefaultStorage()): boolean {
  const recipes = readSavedRecipes(storage);
  const nextRecipes = recipes.filter((recipe) => recipe.id !== id);

  if (nextRecipes.length === recipes.length) {
    return false;
  }

  writeSavedRecipes(storage, nextRecipes);
  return true;
}

export function clearAllSavedRecipes(storage: StorageLike = getDefaultStorage()): void {
  storage.removeItem(SAVED_RECIPES_STORAGE_KEY);
}

function normalizeScheduleInput(
  scheduleInput: ScheduleInput | undefined,
  recipeInput: RecipeInput,
): ScheduleInput | undefined {
  if (!scheduleInput) {
    return undefined;
  }

  return {
    ...scheduleInput,
    mixDate: scheduleInput.mixDate || getMixDateIso(scheduleInput),
  };
}

function readSavedRecipes(storage: StorageLike): SavedRecipe[] {
  const raw = storage.getItem(SAVED_RECIPES_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isSavedRecipe).map((recipe) => ({
      ...recipe,
      scheduleInput: recipe.scheduleInput
        ? normalizeScheduleInput(recipe.scheduleInput, recipe.recipeInput)
        : undefined,
    }));
  } catch {
    return [];
  }
}

function writeSavedRecipes(storage: StorageLike, recipes: SavedRecipe[]): void {
  storage.setItem(SAVED_RECIPES_STORAGE_KEY, JSON.stringify(recipes));
}

export function toSavedRecipeSummary(recipe: SavedRecipe): SavedRecipeSummary {
  const schedule = recipe.scheduleInput ?? createDefaultScheduleInput(recipe.recipeInput);

  return {
    id: recipe.id,
    name: recipe.name,
    breadStyle: describeBreadStyle(recipe.recipeInput),
    bakeDateLabel: formatBakeDateShort(getBakeDateIso(schedule, recipe.recipeInput)),
    hasSchedule: Boolean(recipe.scheduleInput),
    savedAt: recipe.savedAt,
    updatedAt: recipe.updatedAt,
  };
}

function isSavedRecipe(value: unknown): value is SavedRecipe {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<SavedRecipe>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.savedAt === 'string' &&
    typeof candidate.updatedAt === 'string' &&
    candidate.recipeInput !== undefined &&
    typeof candidate.recipeInput === 'object'
  );
}
