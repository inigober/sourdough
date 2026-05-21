export type CoachTopic = 'autolyse' | 'bulk' | 'shape' | 'proof' | 'bake';

const BAKE_STEP_PREFIX = 'bake-';

export function getCoachTopicForStepId(stepId: string): CoachTopic {
  if (stepId === 'autolyse') {
    return 'autolyse';
  }

  if (stepId === 'shape' || stepId === 'pre-shape') {
    return 'shape';
  }

  if (stepId === 'room-proof' || stepId === 'cold-retard') {
    return 'proof';
  }

  if (stepId.startsWith(BAKE_STEP_PREFIX)) {
    return 'bake';
  }

  return 'bulk';
}
