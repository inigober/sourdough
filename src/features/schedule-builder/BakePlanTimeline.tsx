import type { TimelineStep } from '../../lib/schedule/types.ts';
import { shouldShowTimelineDateLabel } from '../../lib/schedule/timelineDisplay.ts';
import { TimelineRow } from '../../components/TimelineRow.tsx';

type BakePlanTimelineProps = {
  steps: TimelineStep[];
  mixDateLabel?: string;
  bakeDateLabel?: string;
};

export function BakePlanTimeline({ steps, mixDateLabel, bakeDateLabel }: BakePlanTimelineProps) {
  if (steps.length === 0) {
    return (
      <section className="card bake-plan">
        <h2>Bake schedule</h2>
        <p className="section-copy">Adjust schedule inputs to generate a timeline.</p>
      </section>
    );
  }

  return (
    <section className="card bake-plan" aria-label="Bake schedule timeline">
      <h2>Bake schedule</h2>
      <p className="section-copy">
        {mixDateLabel && bakeDateLabel
          ? `Clock times on mix day (${mixDateLabel}). Oven-bake on ${bakeDateLabel}.`
          : 'Times move forward from your start time. No calendar day is attached.'}
      </p>
      <ol className="timeline-list bake-plan__list">
        {steps.map((step, index) => (
          <TimelineRow
            key={step.id}
            startTime={step.startTime}
            endTime={step.endTime}
            dateLabel={step.dateLabel}
            showDateLabel={shouldShowTimelineDateLabel(steps, index)}
            label={step.label}
            detail={step.detail}
          />
        ))}
      </ol>
    </section>
  );
}
