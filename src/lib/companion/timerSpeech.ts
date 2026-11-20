/**
 * Spoken wording for the bake timer, used by screen readers.
 *
 * Why this exists: the visible countdown reads "12:30", which VoiceOver says as a clock time.
 * The countdown element is also silent while it ticks (announcing every second would be
 * unbearable), so the baker is told two things in words: when a timer starts and when it ends.
 */

function pluralize(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? '' : 's'}`;
}

/** 750 -> "12 minutes 30 seconds", 3600 -> "1 hour", 0 -> "0 seconds". */
export function formatSpokenDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  const parts: string[] = [];

  if (hours > 0) {
    parts.push(pluralize(hours, 'hour'));
  }
  if (minutes > 0) {
    parts.push(pluralize(minutes, 'minute'));
  }
  if (seconds > 0 || parts.length === 0) {
    parts.push(pluralize(seconds, 'second'));
  }

  return parts.join(' ');
}

/** What a screen reader says when the countdown itself is focused. */
export function formatTimerSpokenRemaining(totalSeconds: number): string {
  return totalSeconds <= 0 ? 'Time is up' : `${formatSpokenDuration(totalSeconds)} remaining`;
}

export function getTimerStartedAnnouncement(stepLabel: string, totalSeconds: number): string {
  return `Timer started for ${stepLabel}: ${formatSpokenDuration(totalSeconds)}.`;
}

export function getTimerFinishedAnnouncement(stepLabel: string): string {
  return `Time's up. The timer for ${stepLabel} has finished.`;
}
