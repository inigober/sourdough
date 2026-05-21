import type { TimelineStep } from '../../lib/schedule/types.ts';

type BakePlanTimelineProps = {
  steps: TimelineStep[];
};

export function BakePlanTimeline({ steps }: BakePlanTimelineProps) {
  if (steps.length === 0) {
    return (
      <section className="card bake-plan">
        <h2>Bake plan</h2>
        <p className="section-copy">Adjust schedule inputs to generate a timeline.</p>
      </section>
    );
  }

  return (
    <section className="card bake-plan" aria-label="Bake plan timeline">
      <h2>Bake plan</h2>
      <p className="section-copy">Times move forward from your start time. No calendar day is attached.</p>
      <ol className="bake-plan__list">
        {steps.map((step) => (
          <li key={step.id} className="bake-plan__item">
            <div className="bake-plan__times">
              <span className="bake-plan__time">{step.startTime}</span>
              <span className="bake-plan__time-separator">→</span>
              <span className="bake-plan__time">{step.endTime}</span>
            </div>
            <div className="bake-plan__content">
              <strong>{step.label}</strong>
              {step.detail ? <span className="bake-plan__detail">{step.detail}</span> : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
