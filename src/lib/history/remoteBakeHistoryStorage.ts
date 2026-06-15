import { getSupabaseClient } from '../auth/supabaseClient.ts';
import type {
  BakeHistorySession,
  BakeHistorySessionSummary,
  CreateBakeHistorySessionInput,
  UpdateBakeHistorySessionInput,
} from './types.ts';

type BakeSessionRow = {
  id: string;
  saved_recipe_id: string | null;
  recipe_name: string;
  recipe_input: BakeHistorySession['recipeInput'];
  schedule_input: BakeHistorySession['scheduleInput'];
  overall_note: string | null;
  overall_assessment: BakeHistorySession['overallAssessment'] | null;
  started_at: string;
  completed_at: string;
  saved_at: string;
  updated_at: string;
};

type BakeSessionStepRow = {
  id: string;
  step_index: number;
  step_key: string;
  step_label: string;
  planned_start_at: string | null;
  planned_end_at: string | null;
  actual_started_at: string;
  actual_completed_at: string;
};

function getClientOrThrow() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase is not configured.');
  }

  return client;
}

export async function createRemoteBakeHistorySession(
  userId: string,
  input: CreateBakeHistorySessionInput,
): Promise<BakeHistorySession> {
  const supabase = getClientOrThrow();
  const now = new Date().toISOString();

  const sessionPayload = {
    user_id: userId,
    saved_recipe_id: input.savedRecipeId ?? null,
    recipe_name: input.recipeName.trim(),
    recipe_input: structuredClone(input.recipeInput),
    schedule_input: structuredClone(input.scheduleInput),
    overall_note: input.overallNote?.trim() || null,
    overall_assessment: input.overallAssessment ?? null,
    started_at: input.startedAt,
    completed_at: input.completedAt,
    saved_at: now,
    updated_at: now,
  };

  const { data: sessionData, error: sessionError } = await supabase
    .from('bake_sessions')
    .insert(sessionPayload)
    .select(
      'id, saved_recipe_id, recipe_name, recipe_input, schedule_input, overall_note, overall_assessment, started_at, completed_at, saved_at, updated_at',
    )
    .single();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  const bakeSession = sessionData as BakeSessionRow;
  const stepPayload = input.steps.map((step) => ({
    bake_session_id: bakeSession.id,
    step_index: step.stepIndex,
    step_key: step.stepKey,
    step_label: step.stepLabel,
    planned_start_at: step.plannedStartAt ?? null,
    planned_end_at: step.plannedEndAt ?? null,
    actual_started_at: step.actualStartedAt,
    actual_completed_at: step.actualCompletedAt,
  }));

  const { data: stepsData, error: stepsError } = await supabase
    .from('bake_session_steps')
    .insert(stepPayload)
    .select(
      'id, step_index, step_key, step_label, planned_start_at, planned_end_at, actual_started_at, actual_completed_at',
    );

  if (stepsError) {
    await supabase.from('bake_sessions').delete().eq('id', bakeSession.id).eq('user_id', userId);
    throw new Error(stepsError.message);
  }

  const steps = ((stepsData as BakeSessionStepRow[]) ?? [])
    .slice()
    .sort((a, b) => a.step_index - b.step_index)
    .map((step) => ({
      id: step.id,
      stepIndex: step.step_index,
      stepKey: step.step_key,
      stepLabel: step.step_label,
      plannedStartAt: step.planned_start_at ?? undefined,
      plannedEndAt: step.planned_end_at ?? undefined,
      actualStartedAt: step.actual_started_at,
      actualCompletedAt: step.actual_completed_at,
    }));

  return {
    id: bakeSession.id,
    savedRecipeId: bakeSession.saved_recipe_id,
    recipeName: bakeSession.recipe_name,
    recipeInput: structuredClone(bakeSession.recipe_input),
    scheduleInput: structuredClone(bakeSession.schedule_input),
    overallNote: bakeSession.overall_note ?? undefined,
    overallAssessment: bakeSession.overall_assessment ?? undefined,
    startedAt: bakeSession.started_at,
    completedAt: bakeSession.completed_at,
    savedAt: bakeSession.saved_at,
    updatedAt: bakeSession.updated_at,
    steps,
  };
}

export async function getRemoteBakeHistorySession(
  userId: string,
  sessionId: string,
): Promise<BakeHistorySession | null> {
  const supabase = getClientOrThrow();
  const { data: sessionData, error: sessionError } = await supabase
    .from('bake_sessions')
    .select(
      'id, saved_recipe_id, recipe_name, recipe_input, schedule_input, overall_note, overall_assessment, started_at, completed_at, saved_at, updated_at',
    )
    .eq('user_id', userId)
    .eq('id', sessionId)
    .maybeSingle();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  if (!sessionData) {
    return null;
  }

  const bakeSession = sessionData as BakeSessionRow;
  const { data: stepsData, error: stepsError } = await supabase
    .from('bake_session_steps')
    .select(
      'id, step_index, step_key, step_label, planned_start_at, planned_end_at, actual_started_at, actual_completed_at',
    )
    .eq('bake_session_id', sessionId)
    .order('step_index', { ascending: true });

  if (stepsError) {
    throw new Error(stepsError.message);
  }

  const steps = ((stepsData as BakeSessionStepRow[]) ?? []).map((step) => ({
    id: step.id,
    stepIndex: step.step_index,
    stepKey: step.step_key,
    stepLabel: step.step_label,
    plannedStartAt: step.planned_start_at ?? undefined,
    plannedEndAt: step.planned_end_at ?? undefined,
    actualStartedAt: step.actual_started_at,
    actualCompletedAt: step.actual_completed_at,
  }));

  return {
    id: bakeSession.id,
    savedRecipeId: bakeSession.saved_recipe_id,
    recipeName: bakeSession.recipe_name,
    recipeInput: structuredClone(bakeSession.recipe_input),
    scheduleInput: structuredClone(bakeSession.schedule_input),
    overallNote: bakeSession.overall_note ?? undefined,
    overallAssessment: bakeSession.overall_assessment ?? undefined,
    startedAt: bakeSession.started_at,
    completedAt: bakeSession.completed_at,
    savedAt: bakeSession.saved_at,
    updatedAt: bakeSession.updated_at,
    steps,
  };
}

function rowToSummary(row: {
  id: string;
  recipe_name: string;
  completed_at: string;
  saved_at: string;
  overall_assessment: BakeHistorySession['overallAssessment'] | null;
  overall_note: string | null;
}): BakeHistorySessionSummary {
  const note = row.overall_note?.trim() ?? '';

  return {
    id: row.id,
    recipeName: row.recipe_name,
    completedAt: row.completed_at,
    savedAt: row.saved_at,
    overallAssessment: row.overall_assessment ?? undefined,
    overallNotePreview: note ? truncateNotePreview(note) : undefined,
  };
}

function truncateNotePreview(note: string, maxLength = 120): string {
  if (note.length <= maxLength) {
    return note;
  }

  return `${note.slice(0, maxLength - 1).trimEnd()}…`;
}

export async function listRemoteBakeHistorySummaries(
  userId: string,
): Promise<BakeHistorySessionSummary[]> {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase
    .from('bake_sessions')
    .select('id, recipe_name, completed_at, saved_at, overall_assessment, overall_note')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data as Array<{
    id: string;
    recipe_name: string;
    completed_at: string;
    saved_at: string;
    overall_assessment: BakeHistorySession['overallAssessment'] | null;
    overall_note: string | null;
  }> | null) ?? []).map(rowToSummary);
}

export async function updateRemoteBakeHistorySession(
  userId: string,
  sessionId: string,
  input: UpdateBakeHistorySessionInput,
): Promise<BakeHistorySession> {
  const supabase = getClientOrThrow();
  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    updated_at: now,
  };

  if (input.overallNote !== undefined) {
    payload.overall_note = input.overallNote.trim() || null;
  }

  if (input.overallAssessment !== undefined) {
    payload.overall_assessment = input.overallAssessment;
  }

  const { error } = await supabase
    .from('bake_sessions')
    .update(payload)
    .eq('user_id', userId)
    .eq('id', sessionId);

  if (error) {
    throw new Error(error.message);
  }

  const session = await getRemoteBakeHistorySession(userId, sessionId);
  if (!session) {
    throw new Error('Bake session not found after update.');
  }

  return session;
}

export async function deleteRemoteBakeHistorySession(userId: string, sessionId: string): Promise<boolean> {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase
    .from('bake_sessions')
    .delete()
    .eq('user_id', userId)
    .eq('id', sessionId)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }

  return (data?.length ?? 0) > 0;
}
