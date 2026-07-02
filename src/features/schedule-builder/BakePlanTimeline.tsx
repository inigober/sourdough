import type { TimelineStep } from '../../lib/schedule/types.ts';
import { shouldShowTimelineDateLabel } from '../../lib/schedule/timelineDisplay.ts';
import { TimelineRow } from '../../components/TimelineRow.tsx';

type BakePlanTimelineProps = {
  steps: TimelineStep[];
  mixDateLabel?: string;
  bakeDateLabel?: string;
  embedded?: boolean;
};

export function BakePlanTimeline({
  steps,
  mixDateLabel,
  bakeDateLabel,
  embedded = false,
}: BakePlanTimelineProps) {
  if (steps.length === 0) {
    const emptyContent = (
      <>
        {!embedded ? <h2>Bake schedule</h2> : null}
        <p className="section-copy">Adjust schedule inputs to generate a timeline.</p>
      </>
    );

    if (embedded) {
      return emptyContent;
    }

    return <section className="card bake-plan">{emptyContent}</section>;
  }

  const timelineContent = (
    <>
      {!embedded ? <h2>Bake schedule</h2> : null}
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
    </>
  );

  if (embedded) {
    return timelineContent;
  }

  return (
    <section className="card bake-plan" aria-label="Bake schedule timeline">
      {timelineContent}
    </section>
  );
}
