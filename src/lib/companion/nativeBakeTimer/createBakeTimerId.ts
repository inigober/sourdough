import type { BakeSession } from '../types.ts';
import type { TimelineStep } from '../../schedule/types.ts';

/** Stable native timer id; a new id is used when the baker jumps to a different step. */
export function createBakeTimerId(session: BakeSession, step: TimelineStep): string {
  return `${session.id}:${step.id}`;
}
