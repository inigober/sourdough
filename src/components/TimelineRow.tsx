type TimelineRowProps = {
  startTime: string;
  endTime?: string;
  dateLabel?: string;
  showDateLabel?: boolean;
  label: string;
  detail?: string;
};

export function TimelineRow({
  startTime,
  endTime,
  dateLabel,
  showDateLabel = true,
  label,
  detail,
}: TimelineRowProps) {
  const timeLabel = endTime ? `${startTime} – ${endTime}` : startTime;
  const isDated = Boolean(showDateLabel && dateLabel);

  return (
    <li className={isDated ? 'timeline-row timeline-row--dated' : 'timeline-row'}>
      <div className="timeline-row__layout">
        <div className="timeline-row__time-col">
          {isDated ? <span className="timeline-row__date">{dateLabel}</span> : null}
          <span className="timeline-row__time">{timeLabel}</span>
        </div>
        <div className={`timeline-row__content-col${isDated ? ' timeline-row__content-col--dated' : ''}`}>
          <strong className="timeline-row__label">{label}</strong>
          {detail ? <p className="timeline-row__detail">{detail}</p> : null}
        </div>
      </div>
    </li>
  );
}
