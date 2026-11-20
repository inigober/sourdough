import assert from 'node:assert/strict';
import test from 'node:test';

import { assessRecipe } from './assessRecipe.ts';
import { calculateRecipe } from './calculateRecipe.ts';
import { defaultRecipeInput } from './defaults.ts';
import { summarizeAssessment } from './summarizeAssessment.ts';
import type { AssessmentSection } from './types.ts';

const section = (level: AssessmentSection['level'], title: string): AssessmentSection => ({
  level,
  title,
  shortMessage: `${title} short`,
  details: `${title} details`,
});

test('the first section is the verdict and the rest are notes', () => {
  const summary = summarizeAssessment([section('positive', 'Overall'), section('info', 'Rise'), section('risk', 'Hydration')]);

  assert.equal(summary?.verdict.title, 'Overall');
  assert.deepEqual(
    summary?.notes.map((note) => note.title),
    ['Rise', 'Hydration'],
  );
});

test('watch count only counts warnings and risks among the notes', () => {
  const summary = summarizeAssessment([
    section('risk', 'Overall'),
    section('info', 'Rise'),
    section('warning', 'Levain'),
    section('risk', 'Hydration'),
    section('positive', 'Fine'),
  ]);

  // The verdict itself is not counted: it is already on screen.
  assert.equal(summary?.watchCount, 2);
});

test('no sections means no summary', () => {
  assert.equal(summarizeAssessment([]), null);
});

test('real assessments keep the dough-signs reminder in the notes', () => {
  const sections = assessRecipe(defaultRecipeInput, calculateRecipe(defaultRecipeInput));
  const summary = summarizeAssessment(sections);

  assert.ok(summary);
  assert.ok(summary.notes.some((note) => /dough signs/.test(note.details)));
});
