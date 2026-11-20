import { useId, type ReactNode } from 'react';

import { PenIcon } from './icons.tsx';

type TimelineRowProps = {
  startTime: string;
  label: string;
  /** Quiet second line, for example "30 min · until 17:45". */
  meta?: string;
  detail?: string;
  /** Makes the row a button that opens `children` underneath it. Leave off for a plain row. */
  onSelect?: () => void;
  isSelected?: boolean;
  /** The expanded content (flat, never a nested card). Rendered only while the row is selected. */
  children?: ReactNode;
};

/**
 * One step of a day-spine timeline: time on the left, a dot on the spine, name and detail on the right.
 * Self-contained so any screen can list steps the same way. The spine and hairlines come from the
 * `timeline-step` classes in styles/features/timeline.css.
 */
export function TimelineRow({
  startTime,
  label,
  meta,
  detail,
  onSelect,
  isSelected = false,
  children,
}: TimelineRowProps) {
  const panelId = useId();
  const content = (
    <>
      <span className="timeline-step__time">{startTime}</span>
      <span className="timeline-step__body">
        <span className="timeline-step__label">{label}</span>
        {meta ? <span className="timeline-step__meta">{meta}</span> : null}
        {detail ? <span className="timeline-step__detail">{detail}</span> : null}
      </span>
      {onSelect ? <PenIcon className="timeline-step__edit-icon" /> : null}
    </>
  );

  return (
    <li className={isSelected ? 'timeline-step timeline-step--selected' : 'timeline-step'}>
      {onSelect ? (
        <button
          type="button"
          className="timeline-step__main timeline-step__main--button"
          aria-expanded={isSelected}
          aria-controls={isSelected ? panelId : undefined}
          onClick={onSelect}
        >
          {content}
        </button>
      ) : (
        <div className="timeline-step__main">{content}</div>
      )}
      {isSelected && children ? (
        <div id={panelId} className="timeline-step__panel">
          {children}
        </div>
      ) : null}
    </li>
  );
}
