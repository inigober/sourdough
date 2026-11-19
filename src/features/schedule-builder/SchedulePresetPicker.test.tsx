import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { SchedulePresetPicker } from './SchedulePresetPicker.tsx';
import { describePresetChanges } from './schedulePresetCopy.ts';
import { SCHEDULE_PRESET_INFO } from '../../lib/schedule/presets.ts';

function render(selectedPresetId: Parameters<typeof SchedulePresetPicker>[0]['selectedPresetId']): string {
  return renderToStaticMarkup(createElement(SchedulePresetPicker, { selectedPresetId, onSelect: () => {} }));
}

describe('SchedulePresetPicker', () => {
  it('shows the three plans with a plain-language description each', () => {
    const html = render(null);

    for (const preset of SCHEDULE_PRESET_INFO) {
      expect(html).toContain(preset.label);
      expect(html).toContain(preset.description);
    }
    expect(html.match(/type="radio"/g)).toHaveLength(3);
  });

  it('reports Custom and checks nothing when no plan matches', () => {
    const html = render(null);

    expect(html).toContain('Current plan: Custom');
    expect(html).not.toMatch(/checked=""/);
  });

  it('checks the matching plan and names it', () => {
    const html = render('sameDay');

    expect(html).toContain('Current plan: Same day.');
    expect(html.match(/checked=""/g)).toHaveLength(1);
  });
});

describe('describePresetChanges', () => {
  const sameDay = SCHEDULE_PRESET_INFO[1];

  it('lists what would be reset in plain language', () => {
    const message = describePresetChanges(sameDay, [
      { field: 'startTime', from: '10:00', to: '07:00' },
      { field: 'proofingStyle', from: 'cold', to: 'roomTemperature' },
      { field: 'autolyseEnabled', from: true, to: false },
    ]);

    expect(message).toContain('"Same day"');
    expect(message).toContain('Start time: 10:00 to 07:00');
    expect(message).toContain('Proofing style: Cold retard to Room temperature');
    expect(message).toContain('Autolyse: on to off');
  });

  it('caps the list and counts the rest', () => {
    const message = describePresetChanges(
      sameDay,
      Array.from({ length: 8 }, () => ({ field: 'slapAndFolds' as const, from: 50, to: 0 })),
    );

    expect(message).toContain('and 3 more');
  });
});
