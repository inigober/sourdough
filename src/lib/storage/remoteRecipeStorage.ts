import type { RecipeInput } from '../recipe/types.ts';
import { getTodayIsoDate, getMixDateIso } from '../schedule/dates.ts';
import { createDefaultScheduleInput } from '../schedule/defaults.ts';
import type { ScheduleInput } from '../schedule/types.ts';
import { getSupabaseClient } from '../auth/supabaseClient.ts';
import { generateDefaultRecipeName, toSavedRecipeSummary } from './recipeStorage.ts';
import type { SavedRecipe, SavedRecipeSummary, UpsertSavedRecipeInput } from './types.ts';

type SavedRecipeRow = {
  id: string;
  user_id: string;
  name: string;
  recipe_input: RecipeInput;
  schedule_input: ScheduleInput | null;
  saved_at: string;
  updated_at: string;
};

function getClientOrThrow() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase is not configured.');
  }

  return client;
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

function rowToSavedRecipe(row: SavedRecipeRow): SavedRecipe {
  const recipeInput = structuredClone(row.recipe_input);
  const scheduleInput = row.schedule_input
    ? normalizeScheduleInput(row.schedule_input, recipeInput)
    : undefined;

  return {
    id: row.id,
    name: row.name,
    recipeInput,
    scheduleInput,
    savedAt: row.saved_at,
    updatedAt: row.updated_at,
  };
}

export async function listRemoteRecipeSummaries(userId: string): Promise<SavedRecipeSummary[]> {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase
    .from('saved_recipes')
    .select('id, name, recipe_input, schedule_input, saved_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data as SavedRecipeRow[]).map(rowToSavedRecipe).map(toSavedRecipeSummary);
}

export async function getRemoteSavedRecipe(userId: string, id: string): Promise<SavedRecipe | null> {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase
    .from('saved_recipes')
    .select('id, name, recipe_input, schedule_input, saved_at, updated_at, user_id')
    .eq('user_id', userId)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return rowToSavedRecipe(data as SavedRecipeRow);
}

export async function upsertRemoteSavedRecipe(
  userId: string,
  input: UpsertSavedRecipeInput,
): Promise<SavedRecipe> {
  const supabase = getClientOrThrow();
  const now = new Date().toISOString();
  const existing = input.id ? await getRemoteSavedRecipe(userId, input.id) : null;
  const scheduleInput = normalizeScheduleInput(input.scheduleInput ?? existing?.scheduleInput, input.recipeInput);

  const payload = {
    id: existing?.id ?? input.id ?? crypto.randomUUID(),
    user_id: userId,
    name: input.name.trim() || generateDefaultRecipeName(input.recipeInput, scheduleInput),
    recipe_input: structuredClone(input.recipeInput),
    schedule_input: scheduleInput ?? null,
    saved_at: existing?.savedAt ?? now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from('saved_recipes')
    .upsert(payload, { onConflict: 'id' })
    .select('id, name, recipe_input, schedule_input, saved_at, updated_at, user_id')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToSavedRecipe(data as SavedRecipeRow);
}

export async function importRemoteSavedRecipe(userId: string, recipe: SavedRecipe): Promise<SavedRecipe> {
  const supabase = getClientOrThrow();
  const scheduleInput = normalizeScheduleInput(recipe.scheduleInput, recipe.recipeInput);

  const payload = {
    id: recipe.id,
    user_id: userId,
    name: recipe.name,
    recipe_input: structuredClone(recipe.recipeInput),
    schedule_input: scheduleInput ?? null,
    saved_at: recipe.savedAt,
    updated_at: recipe.updatedAt,
  };

  const { data, error } = await supabase
    .from('saved_recipes')
    .upsert(payload, { onConflict: 'id' })
    .select('id, name, recipe_input, schedule_input, saved_at, updated_at, user_id')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToSavedRecipe(data as SavedRecipeRow);
}

export async function duplicateRemoteSavedRecipe(
  userId: string,
  id: string,
): Promise<SavedRecipe | null> {
  const source = await getRemoteSavedRecipe(userId, id);
  if (!source) {
    return null;
  }

  const scheduleInput = source.scheduleInput
    ? { ...source.scheduleInput, mixDate: getTodayIsoDate() }
    : undefined;

  return upsertRemoteSavedRecipe(userId, {
    name: generateDefaultRecipeName(source.recipeInput, scheduleInput),
    recipeInput: source.recipeInput,
    scheduleInput,
  });
}

export async function deleteRemoteSavedRecipe(userId: string, id: string): Promise<boolean> {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase
    .from('saved_recipes')
    .delete()
    .eq('user_id', userId)
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }

  return (data?.length ?? 0) > 0;
}
