import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { SchedulePresetPicker } from './SchedulePresetPicker.tsx';
import { describePresetChanges } from './schedulePresetCopy.ts';
import { CUSTOM_PLAN_OPTION, SCHEDULE_PRESET_INFO } from '../../lib/schedule/presets.ts';

function render(selectedOptionId: Parameters<typeof SchedulePresetPicker>[0]['selectedOptionId']): string {
  return renderToStaticMarkup(createElement(SchedulePresetPicker, { selectedOptionId, onSelect: () => {} }));
}

describe('SchedulePresetPicker', () => {
  it('shows the three plans and Custom with a plain-language description each', () => {
    const html = render('custom');

    for (const option of [...SCHEDULE_PRESET_INFO, CUSTOM_PLAN_OPTION]) {
      expect(html).toContain(option.label);
      expect(html).toContain(option.description);
    }
    expect(html.match(/type="radio"/g)).toHaveLength(4);
    // One radio group: the four radios share a name, so the arrow keys move between them.
    expect(html.match(/name="schedule-preset"/g)).toHaveLength(4);
    expect(html).toContain('<legend class="visually-hidden">Bake plan</legend>');
  });

  it('checks only Custom and reports it when the baker is on their own values', () => {
    const html = render('custom');

    expect(html).toContain('Current plan: Custom');
    expect(html.match(/checked=""/g)).toHaveLength(1);
    expect(html.match(/schedule-presets__option--selected/g)).toHaveLength(1);
  });

  it('checks the matching plan and names it', () => {
    const html = render('sameDay');

    expect(html).toContain('Current plan: Same day.');
    expect(html).not.toContain('Current plan: Custom');
    expect(html.match(/checked=""/g)).toHaveLength(1);
  });

  it('links the Custom radio, and only that one, to the panel it reveals', () => {
    const html = renderToStaticMarkup(
      createElement(SchedulePresetPicker, {
        selectedOptionId: 'custom',
        onSelect: () => {},
        customPanelId: 'custom-panel',
      }),
    );

    expect(html.match(/aria-controls="custom-panel"/g)).toHaveLength(1);
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
