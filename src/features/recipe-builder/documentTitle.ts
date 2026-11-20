import { parseAppRoute } from './appRoutes.ts';
import { WIZARD_STEP_LABELS, isInputWizardStep } from './recipeBuilderSteps.ts';

export const APP_NAME = 'Sourdough Assistant';

/**
 * The browser tab title for a URL. It is also what a screen reader says when the page changes,
 * and what the iOS app switcher shows for the web build, so each screen names itself.
 */
export function getDocumentTitle(pathname: string): string {
  const route = parseAppRoute(pathname);
  const { phase, tab } = route.location;

  if (route.recipeViewId) {
    return withAppName('Recipe');
  }

  if (route.historyDetailId) {
    return withAppName('Bake details');
  }

  if (tab === 'saved') {
    return withAppName('Saved recipes');
  }

  if (tab === 'history') {
    return withAppName('Bake history');
  }

  if (phase === 'companion') {
    return withAppName('Bake mode');
  }

  if (phase === 'schedule') {
    return withAppName('Schedule builder');
  }

  if (phase === 'results') {
    return withAppName('Ingredient summary');
  }

  if (isInputWizardStep(route.wizardStep)) {
    return withAppName(`New recipe: ${WIZARD_STEP_LABELS[route.wizardStep]}`);
  }

  return APP_NAME;
}

function withAppName(screenName: string): string {
  return `${screenName} · ${APP_NAME}`;
}
