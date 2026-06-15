export function formatHistoryDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatHistoryDateTime(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown time';
  }

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatHistoryTimeRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return '—';
  }

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
  };

  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  if (sameDay) {
    return `${start.toLocaleTimeString(undefined, timeOptions)} – ${end.toLocaleTimeString(undefined, timeOptions)}`;
  }

  return `${formatHistoryDateTime(startIso)} – ${formatHistoryDateTime(endIso)}`;
}

export function formatDriftMinutes(driftMinutes: number): string {
  const absolute = Math.abs(driftMinutes);
  const sign = driftMinutes > 0 ? '+' : driftMinutes < 0 ? '−' : '';

  if (absolute >= 60) {
    const hours = Math.floor(absolute / 60);
    const minutes = absolute % 60;
    if (minutes > 0) {
      return `${sign}${hours}h ${minutes}m`;
    }
    return `${sign}${hours}h`;
  }

  return `${sign}${absolute}m`;
}

export function getStartDriftMinutes(plannedStartAt: string | undefined, actualStartedAt: string): number | null {
  if (!plannedStartAt) {
    return null;
  }

  const planned = new Date(plannedStartAt).getTime();
  const actual = new Date(actualStartedAt).getTime();
  if (Number.isNaN(planned) || Number.isNaN(actual)) {
    return null;
  }

  return Math.round((actual - planned) / 60_000);
}
