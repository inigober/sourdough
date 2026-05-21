import { getCoachTopicForStepId } from './coachTopics.ts';
import { getCoachTip } from './coachTips.ts';

const STEP_TIPS: Record<string, string> = {
  'refresh-starter':
    'Refresh your starter with a 1:3:3 feeding and keep it warm. You want it visibly active before building levain — look for bubbles, a slight rise, and a fresh, tangy smell. A sluggish starter here will slow the whole bake.',
  'build-levain':
    'Build levain to the ratio and amount in your recipe detail. Mix until no dry flour remains, then mark the jar level so you can see rise. It should roughly double and look aerated before mix — not just barely puffy at the scheduled time.',
  autolyse:
    'Mix only flour and water, then rest. The goal is hydration and early gluten development without salt or levain interfering. Stop when the dough feels evenly moist with no dry pockets — you do not need a smooth, developed dough yet.',
  'mix-levain':
    'Work the levain in until the dough looks evenly distributed with no streaks of unmixed levain. Use wet hands or a gentle squeeze-and-fold motion rather than aggressive kneading — you are incorporating, not developing fully yet.',
  'rest-after-levain':
    'Let the dough relax after levain is mixed in. Cover the bowl and leave it alone — this brief rest helps hydration equalize before salt or the next mix step.',
  'mix-salt':
    'Sprinkle salt over the dough and mix until you cannot feel grains and the dough feels cohesive. Salt tightens gluten, so the dough may feel firmer — that is expected.',
  'rest-after-salt':
    'Cover and rest after salt is incorporated. The dough should feel smoother and less sticky as salt fully hydrates and gluten settles.',
  'mix-levain-rest-after-levain':
    'Mix levain in until evenly distributed with no streaks, then cover and rest. Use wet hands and gentle folding — incorporate without overworking. The rest lets hydration equalize before the next bulk step.',
  'mix-salt-rest-after-salt':
    'Mix salt in until fully dissolved and the dough feels cohesive, then cover and rest. Salt tightens gluten, so the dough may firm up — the rest helps it relax before continuing bulk fermentation.',
  'slap-and-fold':
    'Slap the dough onto the counter and fold it over itself with confidence. You are building strength quickly — stop when the dough holds together and feels less shaggy, not when it is tearing or overheating from friction.',
  'rest-after-slap':
    'Cover the bowl and let the dough recover after slap-and-folds. It should relax slightly and spread back into the bowl before the next set of folds or rest period.',
  'pre-shape':
    'Turn the dough out gently and shape a loose round or batard. Build light surface tension without degassing aggressively — the goal is structure for the final shape, not a tight final form yet.',
  shape:
    'Shape when the dough has enough strength to hold tension but still feels alive. Use confident, floured hands, build surface tension on the counter, and avoid degassing more than you need to.',
  'cold-retard':
    'Place the shaped dough in the fridge for a slow proof. Cold dough firms up — allow time to warm slightly before baking if it feels very tight. A full, jiggly cold proof is the goal, not a rock-hard loaf.',
  'room-proof':
    'Proof until the dough looks full and slightly jiggly, not exhausted. Press gently with a floured finger: slow spring-back often means ready. Watch volume and surface tension, not just the clock.',
  'bake-closed':
    'Score decisively and load into a preheated Dutch oven with the lid on. Steam trapped inside helps oven spring — listen for activity in the first minutes rather than opening the lid early.',
  'bake-lid-off':
    'Remove the lid to develop color and crust. The loaf should have risen and set its shape — if still pale and soft, give it another minute covered before browning.',
  'bake-out-of-pot':
    'Finish directly on the stone or rack for a crisp bottom and even browning. Watch color and aroma — the crust should sound hollow when tapped.',
  'bake-open':
    'Load at your starting bake temperature with steam if your setup allows. Early baking is about expansion; later minutes are about color and crust development.',
  'bake-finish':
    'Lower to your finish temperature for the last segment. Trust color, aroma, and internal temperature over the timer alone — schedules are guides, not guarantees.',
};

export function getCoachTipForStep(stepId: string, stepLabel?: string): string {
  if (STEP_TIPS[stepId]) {
    return STEP_TIPS[stepId];
  }

  if (/^stretch-fold-\d+$/.test(stepId)) {
    return 'Stretch one side of the dough up and fold it over the center, then rotate the bowl and repeat. Add strength without tearing the dough — if it resists or tears easily, wait for the next set rather than forcing it.';
  }

  if (/^coil-fold-\d+$/.test(stepId)) {
    return 'Lift the dough from the center so it coils under itself in the bowl. Coil folds are gentler than stretch-and-folds — stop when the dough feels stronger and holds shape, not when it is stretched thin.';
  }

  const topic = getCoachTopicForStepId(stepId);
  const fallback = getCoachTip(topic);

  if (stepLabel) {
    return `${fallback} (This step: ${stepLabel}.)`;
  }

  return fallback;
}
