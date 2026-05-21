import { ArrowRightIcon } from './icons.tsx';

type TimelineRowProps = {
  startTime: string;
  endTime?: string;
  dateLabel?: string;
  label: string;
  detail?: string;
};

export function TimelineRow({ startTime, endTime, dateLabel, label, detail }: TimelineRowProps) {
  return (
    <li className="timeline-row">
      <div className="timeline-row__times">
        {dateLabel ? <span className="timeline-row__date">{dateLabel}</span> : null}
        <span className="timeline-row__time">{startTime}</span>
        {endTime ? (
          <>
            <span className="timeline-row__separator" aria-hidden="true">
              <ArrowRightIcon />
            </span>
            <span className="timeline-row__time">{endTime}</span>
          </>
        ) : null}
      </div>
      <div className="timeline-row__content">
        <strong className="timeline-row__label">{label}</strong>
        {detail ? <span className="timeline-row__detail">{detail}</span> : null}
      </div>
    </li>
  );
}
