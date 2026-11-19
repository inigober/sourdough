/** Remembers that the user dismissed the optional "Sign in to back up your bakes" hint. */
export const HISTORY_BACKUP_NUDGE_DISMISSED_KEY = 'sourdough:history-backup-nudge-dismissed';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function resolveStorage(storage?: StorageLike): StorageLike | null {
  if (storage) {
    return storage;
  }

  return typeof localStorage === 'undefined' ? null : localStorage;
}

export function isHistoryBackupNudgeDismissed(storage?: StorageLike): boolean {
  return resolveStorage(storage)?.getItem(HISTORY_BACKUP_NUDGE_DISMISSED_KEY) === 'true';
}

export function dismissHistoryBackupNudge(storage?: StorageLike): void {
  resolveStorage(storage)?.setItem(HISTORY_BACKUP_NUDGE_DISMISSED_KEY, 'true');
}
