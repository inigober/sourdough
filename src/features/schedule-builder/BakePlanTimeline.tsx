import { useState } from 'react';

import { TimelineList } from '../../components/TimelineList.tsx';
import type { StepChange, StepEditResult } from '../../lib/schedule/stepEditPanel.ts';
import type { TimelineStep } from '../../lib/schedule/types.ts';
import { StepEditPanel } from './StepEditPanel.tsx';

type BakePlanTimelineProps = {
  steps: TimelineStep[];
  caption?: string;
  embedded?: boolean;
  /**
   * Turns on tap-to-edit. Rows for which `isStepEditable` is true open an inline panel, and the panel
   * reports changes through `onEditStep`. Leave both off for a read-only timeline (bake history).
   */
  isStepEditable?: (step: TimelineStep) => boolean;
  onEditStep?: (stepId: string, change: StepChange) => StepEditResult;
  /** Shows an "Undo changes" button in the open row's panel when the baker has edited that step. */
  canResetStep?: (stepId: string) => boolean;
  onResetStep?: (stepId: string) => void;
};

export function BakePlanTimeline({
  steps,
  caption,
  embedded = false,
  isStepEditable,
  onEditStep,
  canResetStep,
  onResetStep,
}: BakePlanTimelineProps) {
  // One row open at a time; tapping the open row closes it.
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const canEdit = Boolean(isStepEditable && onEditStep);

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
        {caption ?? 'Times move forward from your start time. No calendar day is attached.'}
        {canEdit ? ' Tap a step to change when it starts or how long it takes.' : ''}
      </p>
      <TimelineList
        steps={steps}
        selectedStepId={selectedStepId}
        isStepSelectable={canEdit ? isStepEditable : undefined}
        onSelectStep={(step) => setSelectedStepId((current) => (current === step.id ? null : step.id))}
        renderPanel={(step) =>
          onEditStep ? <StepEditPanel
              step={step}
              onApply={(change) => onEditStep(step.id, change)}
              onReset={canResetStep?.(step.id) && onResetStep ? () => onResetStep(step.id) : undefined}
            /> : null
        }
      />
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
