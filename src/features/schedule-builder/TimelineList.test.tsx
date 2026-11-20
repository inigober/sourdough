import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { TimelineList } from '../../components/TimelineList.tsx';
import type { TimelineStep } from '../../lib/schedule/types.ts';

function step(id: string, label: string, startTime: string, durationMinutes: number, dateLabel: string): TimelineStep {
  return { id, label, startTime, endTime: startTime, durationMinutes, startOffsetMinutes: 0, dateLabel };
}

const steps = [
  step('autolyse', 'Autolyse', '09:00', 45, 'Bake day −1'),
  step('mix-salt', 'Mix in salt', '10:15', 0, 'Bake day −1'),
  step('bake-closed', 'Bake', '08:00', 19, 'Bake day'),
];

function render(selectedStepId: string | null): string {
  return renderToStaticMarkup(
    createElement(TimelineList, {
      steps,
      selectedStepId,
      isStepSelectable: (candidate: TimelineStep) => candidate.durationMinutes > 0,
      onSelectStep: () => {},
      renderPanel: (candidate: TimelineStep) =>
        createElement('p', { className: 'test-panel' }, `Edit ${candidate.label}`),
    }),
  );
}

// The component tests run in a Node environment (no DOM), so these check the markup the list renders for
// each state. The edit rules themselves (duration, start time, refused edits, merged rows) are tested in
// src/lib/schedule/stepEditPanel.test.ts.
describe('TimelineList', () => {
  it('groups steps under a heading per day', () => {
    const html = render(null);

    expect(html).toContain('>Bake day −1</h3>');
    expect(html).toContain('>Bake day</h3>');
    expect(html.match(/<h3/g)).toHaveLength(2);
  });

  it('makes editable rows collapsed buttons and leaves markers as plain rows', () => {
    const html = render(null);

    expect(html.match(/<button/g)).toHaveLength(2);
    expect(html.match(/aria-expanded="false"/g)).toHaveLength(2);
    expect(html).not.toContain('test-panel');
    expect(html).toMatch(/<div class="timeline-step__main"><span class="timeline-step__time">10:15/);
  });

  it('opens one row and shows its panel underneath', () => {
    const html = render('autolyse');

    expect(html.match(/aria-expanded="true"/g)).toHaveLength(1);
    expect(html.match(/test-panel/g)).toHaveLength(1);
    expect(html).toContain('Edit Autolyse');
    expect(html).toContain('timeline-step--selected');
  });

  it('is a read-only list when no row is selectable', () => {
    expect(renderToStaticMarkup(createElement(TimelineList, { steps }))).not.toContain('<button');
  });
});
