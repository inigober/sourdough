export function getTimerRemainingSeconds(endsAtIso: string | null, now = Date.now()): number | null {
  if (!endsAtIso) {
    return null;
  }

  const endsAt = new Date(endsAtIso).getTime();
  if (Number.isNaN(endsAt)) {
    return null;
  }

  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

export function formatTimerRemaining(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function createTimerEndsAt(durationMinutes: number, from = Date.now()): string {
  return new Date(from + durationMinutes * 60_000).toISOString();
}
