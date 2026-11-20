import type { ReactNode } from 'react';

import { formatMinutesReadable } from '../lib/schedule/stepEditPanel.ts';
import { groupStepsByDayLabel } from '../lib/schedule/timelineDisplay.ts';
import type { TimelineStep } from '../lib/schedule/types.ts';
import { TimelineRow } from './TimelineRow.tsx';

type TimelineListProps = {
  steps: TimelineStep[];
  /** Id of the row that is open, if any. */
  selectedStepId?: string | null;
  /** Rows for which this returns true are buttons; the others stay plain rows. Leave off for a read-only list. */
  isStepSelectable?: (step: TimelineStep) => boolean;
  onSelectStep?: (step: TimelineStep) => void;
  /** Content shown under the open row. */
  renderPanel?: (step: TimelineStep) => ReactNode;
};

function getStepMeta(step: TimelineStep): string | undefined {
  if (step.durationMinutes <= 0) {
    return undefined;
  }

  // Details such as "30 min rest" already say the length; do not repeat it.
  const until = `until ${step.endTime}`;
  return step.detail?.includes(`${step.durationMinutes} min`)
    ? until
    : `${formatMinutesReadable(step.durationMinutes)} · ${until}`;
}

/**
 * The steps as a hairline-separated list with a day spine: a heading per day ("Bake day −1" or the
 * real date), then one row per step. Steps without a day label are listed without a heading.
 */
export function TimelineList({
  steps,
  selectedStepId = null,
  isStepSelectable,
  onSelectStep,
  renderPanel,
}: TimelineListProps) {
  return (
    <div className="timeline-days">
      {groupStepsByDayLabel(steps).map((group, groupIndex) => (
        <section key={group.label ?? `group-${groupIndex}`} className="timeline-day">
          {group.label ? <h3 className="timeline-day__label">{group.label}</h3> : null}
          <ol className="timeline-day__steps">
            {group.steps.map((step) => {
              const isSelectable = Boolean(onSelectStep && isStepSelectable?.(step));
              return (
                <TimelineRow
                  key={step.id}
                  startTime={step.startTime}
                  label={step.label}
                  meta={getStepMeta(step)}
                  detail={step.detail}
                  onSelect={isSelectable ? () => onSelectStep?.(step) : undefined}
                  isSelected={selectedStepId === step.id}
                >
                  {renderPanel?.(step)}
                </TimelineRow>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
