import type { ScheduleInput } from './types.ts';

/*
  "Undo changes to this step". The first time a step is edited we remember what each setting that edit
  changed used to be; undo puts exactly those back. This does not depend on which plan the baker
  started from, because it never tries to work out what the plan "should" be.

  Keys are schedule field names. A single per-fold override is tracked as `foldRestMinutesByStep.<step id>`,
  so undoing one fold does not touch another.
*/

export type ScheduleOriginals = Record<string, unknown>;

const FOLD_PREFIX = 'foldRestMinutesByStep.';

/** Adds to `existing` the previous value of every setting that differs between before and after. The earliest value wins. */
export function collectOriginals(
  before: ScheduleInput,
  after: ScheduleInput,
  existing: ScheduleOriginals = {},
): ScheduleOriginals {
  const originals: ScheduleOriginals = { ...existing };
  const keep = (key: string, previous: unknown): void => {
    if (!(key in originals)) {
      originals[key] = previous;
    }
  };

  const beforeRecord = before as unknown as Record<string, unknown>;
  const afterRecord = after as unknown as Record<string, unknown>;
  for (const key of new Set([...Object.keys(beforeRecord), ...Object.keys(afterRecord)])) {
    if (key !== 'foldRestMinutesByStep' && beforeRecord[key] !== afterRecord[key]) {
      keep(key, beforeRecord[key]);
    }
  }

  const beforeFolds = before.foldRestMinutesByStep ?? {};
  const afterFolds = after.foldRestMinutesByStep ?? {};
  for (const stepId of new Set([...Object.keys(beforeFolds), ...Object.keys(afterFolds)])) {
    if (beforeFolds[stepId] !== afterFolds[stepId]) {
      keep(`${FOLD_PREFIX}${stepId}`, beforeFolds[stepId]);
    }
  }

  return originals;
}

export function restoreOriginals(schedule: ScheduleInput, originals: ScheduleOriginals): ScheduleInput {
  const restored: Record<string, unknown> = { ...schedule };
  const folds: Record<string, number> = { ...schedule.foldRestMinutesByStep };

  for (const [key, previous] of Object.entries(originals)) {
    if (key.startsWith(FOLD_PREFIX)) {
      const stepId = key.slice(FOLD_PREFIX.length);
      if (typeof previous === 'number') {
        folds[stepId] = previous;
      } else {
        delete folds[stepId];
      }
    } else if (previous === undefined) {
      delete restored[key];
    } else {
      restored[key] = previous;
    }
  }

  if (Object.keys(folds).length > 0) {
    restored.foldRestMinutesByStep = folds;
  } else {
    delete restored.foldRestMinutesByStep;
  }

  return restored as unknown as ScheduleInput;
}
