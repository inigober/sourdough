import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { BakeHistorySessionSummary } from '../../lib/history/types.ts';
import { BakeHistoryView } from './BakeHistoryView.tsx';

function makeEntries(count: number, assessment?: BakeHistorySessionSummary['overallAssessment']) {
  return Array.from({ length: count }, (_, index): BakeHistorySessionSummary => ({
    id: `bake-${index}`,
    recipeName: `Loaf ${index}`,
    completedAt: '2026-11-12T20:00:00.000Z',
    savedAt: '2026-11-12T20:00:00.000Z',
    overallAssessment: assessment,
  }));
}

function render(entries: BakeHistorySessionSummary[], overrides: { canSignIn?: boolean } = {}): string {
  return renderToStaticMarkup(
    createElement(BakeHistoryView, {
      isSignedIn: false,
      canSignIn: overrides.canSignIn ?? false,
      entries,
      loadError: null,
      onOpenAuth: () => {},
      onOpenEntry: () => {},
      onRetryLoad: () => {},
    }),
  );
}

describe('BakeHistoryView', () => {
  it('hides Search and Filter on a short list and shows them from six bakes', () => {
    expect(render(makeEntries(5))).not.toContain('bake-history__filters');
    expect(render(makeEntries(6))).toContain('bake-history__filters');
  });

  it('shows the backup reminder as one line with a Sign in link and a dismiss button', () => {
    const html = render(makeEntries(1), { canSignIn: true });

    expect(html).toContain('Saved on this device.');
    expect(html).toContain('Sign in to back up');
    expect(html).toContain('aria-label="Dismiss backup reminder"');
    expect(html).not.toContain('Not now');
  });

  it('does not leave a separator after the date when a bake has no assessment', () => {
    expect(render(makeEntries(1))).not.toContain('saved-recipe-card__meta-sep');
    expect(render(makeEntries(1, 'ok'))).not.toContain('saved-recipe-card__meta-sep');
  });
});
