import type { CoachTopic } from './coachTopics.ts';

export const coachTips: Record<CoachTopic, string> = {
  autolyse:
    'Mix only flour and water, then rest. The goal is hydration and early gluten development without salt or levain interfering. Stop when the dough feels evenly moist with no dry pockets — you do not need a smooth, developed dough yet.',
  bulk:
    'Bulk fermentation builds structure and flavor. Watch the dough, not just the clock: look for rise, a domed surface, visible bubbles, and edges pulling away from the bowl. Folds add strength; fewer folds suit stronger flour or higher hydration.',
  shape:
    'Shape when the dough has enough strength to hold tension but still feels alive. Use confident, floured hands, build surface tension on the counter, and avoid degassing more than you need to. A shaky, slack dough usually needs more bulk time, not more aggressive shaping.',
  proof:
    'Proof until the dough looks full and slightly jiggly, not exhausted. Press gently with a floured finger: slow spring-back often means ready. Cold proof slows fermentation — allow time to warm up before baking if the dough feels very firm.',
  bake:
    'Score decisively just before loading. Steam helps oven spring early; later baking develops color and crispness. Trust color, aroma, and internal temperature over the timer alone — schedules are guides, not guarantees.',
};

export function getCoachTip(topic: CoachTopic): string {
  return coachTips[topic];
}
