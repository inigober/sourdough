export type CoachTopic = 'autolyse' | 'bulk' | 'shape' | 'proof' | 'bake';

const BAKE_STEP_PREFIX = 'bake-';

const QUICK_QUESTIONS_BY_TOPIC: Record<CoachTopic, string[]> = {
  autolyse: ['Is sticky dough normal here?', 'I see dry flour pockets', 'How long can I leave it?'],
  bulk: ['Is my dough ready?', 'It feels too wet', 'It feels too stiff', 'Is it rising enough?'],
  shape: ['Is my dough ready to shape?', 'It is too sticky to shape', 'Is the surface tight enough?'],
  proof: ['Is my dough ready?', 'How do I do the poke test?', 'It looks flat'],
  bake: ['How do I know it is done?', 'The crust is browning too fast', 'The crust looks pale'],
};

const STARTER_STEP_QUICK_QUESTIONS = [
  'Is my starter active enough?',
  'How do I know the levain is ready?',
  'My kitchen is cold',
];

/** Tap-to-fill questions for the coach sheet, so a baker with floury hands can type less. */
export function getCoachQuickQuestions(stepId: string): string[] {
  if (stepId === 'refresh-starter' || stepId === 'build-levain') {
    return STARTER_STEP_QUICK_QUESTIONS;
  }

  return QUICK_QUESTIONS_BY_TOPIC[getCoachTopicForStepId(stepId)];
}

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
