import assert from 'node:assert/strict';
import test from 'node:test';

import {
  dismissHistoryBackupNudge,
  isHistoryBackupNudgeDismissed,
} from './historyBackupNudgeStorage.ts';

class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

test('the backup nudge is shown until it is dismissed, then stays dismissed', () => {
  const storage = new MemoryStorage();

  assert.equal(isHistoryBackupNudgeDismissed(storage), false);
  dismissHistoryBackupNudge(storage);
  assert.equal(isHistoryBackupNudgeDismissed(storage), true);
});
