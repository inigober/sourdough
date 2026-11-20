import type { AppMainTab } from '../../components/AppBottomNav.tsx';
import type { InputWizardStep, RecipeBuilderStep } from './recipeBuilderSteps.ts';
import { isInputWizardStep } from './recipeBuilderSteps.ts';
import type { BuilderPhase } from './types.ts';

export type AppLocation = {
  tab: AppMainTab;
  phase: BuilderPhase;
};

export type AppScreen =
  | { kind: 'welcome'; tab: 'home' }
  | { kind: 'welcome'; tab: 'saved' }
  | { kind: 'welcome'; tab: 'history'; historyId: string | null }
  | { kind: 'recipe'; recipeId: string }
  | { kind: 'wizard'; step: InputWizardStep }
  | { kind: 'results' }
  | { kind: 'schedule' }
  | { kind: 'companion' };

export function resolveAppScreen(
  location: AppLocation,
  currentStep: RecipeBuilderStep,
  historyDetailId: string | null,
  recipeViewId: string | null = null,
): AppScreen {
  if (location.phase === 'companion') {
    return { kind: 'companion' };
  }

  if (location.phase === 'schedule') {
    return { kind: 'schedule' };
  }

  if (location.phase === 'results') {
    return { kind: 'results' };
  }

  if (currentStep === 'welcome') {
    if (recipeViewId && location.tab === 'home') {
      return { kind: 'recipe', recipeId: recipeViewId };
    }

    if (location.tab === 'history') {
      return { kind: 'welcome', tab: 'history', historyId: historyDetailId };
    }

    if (location.tab === 'saved') {
      return { kind: 'welcome', tab: 'saved' };
    }

    return { kind: 'welcome', tab: 'home' };
  }

  if (isInputWizardStep(currentStep)) {
    return { kind: 'wizard', step: currentStep };
  }

  return { kind: 'welcome', tab: 'home' };
}

export function showWelcomeBottomNav(screen: AppScreen): boolean {
  return screen.kind === 'welcome' && (screen.tab !== 'history' || screen.historyId === null);
}

export function showHomeButton(location: AppLocation, currentStep: RecipeBuilderStep): boolean {
  return location.phase !== 'wizard' || currentStep !== 'welcome';
}
