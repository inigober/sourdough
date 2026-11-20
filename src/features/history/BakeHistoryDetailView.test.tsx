import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BakeHistorySession } from '../../lib/history/types.ts';
import { defaultRecipeInput } from '../../lib/recipe/defaults.ts';
import { createDefaultScheduleInput } from '../../lib/schedule/defaults.ts';

const photoUrls = vi.hoisted(() => ({ current: new Map<string, string>() }));

vi.mock('../../lib/history/useBakePhotoUrls.ts', () => ({
  useBakePhotoUrls: () => photoUrls.current,
}));

import { BakeHistoryDetailView } from './BakeHistoryDetailView.tsx';

const session: BakeHistorySession = {
  id: 'bake-1',
  savedRecipeId: null,
  recipeName: 'Dark wheat moderate hydration',
  recipeInput: defaultRecipeInput,
  scheduleInput: createDefaultScheduleInput(defaultRecipeInput),
  startedAt: '2026-11-12T08:00:00.000Z',
  completedAt: '2026-11-12T20:00:00.000Z',
  savedAt: '2026-11-12T20:00:00.000Z',
  updatedAt: '2026-11-12T20:00:00.000Z',
  photoPath: 'user/bake-1.jpg',
  steps: [],
};

function render(): string {
  return renderToStaticMarkup(
    createElement(BakeHistoryDetailView, {
      session,
      isSaving: false,
      saveError: null,
      onBack: () => {},
      onUpdate: async () => {},
      onDelete: async () => {},
      onBakeAgain: () => {},
      photoActions: { version: 0, onChange: async () => null, onRemove: async () => null },
    }),
  );
}

describe('BakeHistoryDetailView photo', () => {
  beforeEach(() => {
    photoUrls.current = new Map();
  });

  it('shows the loaf photo as a large hero above the bake summary when there is one', () => {
    photoUrls.current = new Map([['bake-1', 'blob:loaf']]);
    const html = render();

    expect(html).toContain('bake-history-detail__photo--hero');
    expect(html.indexOf('bake-history-detail__photo--hero')).toBeLessThan(html.indexOf('bake-history-detail__hero'));
  });

  it('keeps the compact add-a-photo button below the summary when there is no photo', () => {
    const html = render();

    expect(html).not.toContain('bake-history-detail__photo--hero');
    expect(html).toContain('Add a photo of your loaf');
    expect(html.indexOf('bake-history-detail__hero')).toBeLessThan(html.indexOf('Add a photo of your loaf'));
  });
});
