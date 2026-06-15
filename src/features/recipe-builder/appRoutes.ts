import type { AppLocation } from './appLocation.ts';
import type { InputWizardStep, RecipeBuilderStep } from './recipeBuilderSteps.ts';
import { isInputWizardStep } from './recipeBuilderSteps.ts';
import type { BuilderPhase } from './types.ts';

const WIZARD_STEP_SLUGS: Record<InputWizardStep, string> = {
  doughSize: 'dough-size',
  flour: 'flour',
  recipeTargets: 'recipe-targets',
  fermentation: 'fermentation',
};

const SLUG_TO_WIZARD_STEP = Object.fromEntries(
  Object.entries(WIZARD_STEP_SLUGS).map(([step, slug]) => [slug, step as InputWizardStep]),
) as Record<string, InputWizardStep>;

export const APP_ROUTES = {
  home: '/',
  history: '/history',
  historyDetail: (id: string) => `/history/${encodeURIComponent(id)}`,
  buildSummary: '/build/summary',
  buildSchedule: '/build/schedule',
  bake: '/bake',
  buildStep: (step: InputWizardStep) => `/build/${WIZARD_STEP_SLUGS[step]}`,
} as const;

export type ParsedAppRoute = {
  location: AppLocation;
  wizardStep: RecipeBuilderStep;
  historyDetailId: string | null;
};

function normalizePathname(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed.length === 0 ? '/' : trimmed;
}

export function isKnownAppPath(pathname: string): boolean {
  const path = normalizePathname(pathname);

  if (
    path === APP_ROUTES.home ||
    path === APP_ROUTES.history ||
    path === APP_ROUTES.buildSummary ||
    path === APP_ROUTES.buildSchedule ||
    path === APP_ROUTES.bake
  ) {
    return true;
  }

  if (/^\/history\/[^/]+$/.test(path)) {
    return true;
  }

  const buildMatch = path.match(/^\/build\/([^/]+)$/);
  if (buildMatch && SLUG_TO_WIZARD_STEP[buildMatch[1]]) {
    return true;
  }

  return false;
}

export function parseAppRoute(pathname: string): ParsedAppRoute {
  const path = normalizePathname(pathname);

  if (path === APP_ROUTES.home) {
    return {
      location: { tab: 'home', phase: 'wizard' },
      wizardStep: 'welcome',
      historyDetailId: null,
    };
  }

  if (path === APP_ROUTES.history) {
    return {
      location: { tab: 'history', phase: 'wizard' },
      wizardStep: 'welcome',
      historyDetailId: null,
    };
  }

  const historyMatch = path.match(/^\/history\/([^/]+)$/);
  if (historyMatch) {
    return {
      location: { tab: 'history', phase: 'wizard' },
      wizardStep: 'welcome',
      historyDetailId: decodeURIComponent(historyMatch[1]),
    };
  }

  if (path === APP_ROUTES.buildSummary) {
    return {
      location: { tab: 'home', phase: 'results' },
      wizardStep: 'welcome',
      historyDetailId: null,
    };
  }

  if (path === APP_ROUTES.buildSchedule) {
    return {
      location: { tab: 'home', phase: 'schedule' },
      wizardStep: 'welcome',
      historyDetailId: null,
    };
  }

  if (path === APP_ROUTES.bake) {
    return {
      location: { tab: 'home', phase: 'companion' },
      wizardStep: 'welcome',
      historyDetailId: null,
    };
  }

  const buildMatch = path.match(/^\/build\/([^/]+)$/);
  if (buildMatch) {
    const step = SLUG_TO_WIZARD_STEP[buildMatch[1]];
    if (step) {
      return {
        location: { tab: 'home', phase: 'wizard' },
        wizardStep: step,
        historyDetailId: null,
      };
    }
  }

  return {
    location: { tab: 'home', phase: 'wizard' },
    wizardStep: 'welcome',
    historyDetailId: null,
  };
}

export function buildAppPathFromDraft(draft: {
  phase: BuilderPhase;
  currentStep: RecipeBuilderStep;
}): string {
  if (draft.phase === 'results') {
    return APP_ROUTES.buildSummary;
  }

  if (draft.phase === 'schedule') {
    return APP_ROUTES.buildSchedule;
  }

  if (draft.phase === 'companion') {
    return APP_ROUTES.bake;
  }

  if (draft.currentStep === 'welcome') {
    return APP_ROUTES.home;
  }

  if (isInputWizardStep(draft.currentStep)) {
    return APP_ROUTES.buildStep(draft.currentStep);
  }

  return APP_ROUTES.home;
}

export type AppRouteNavigate = {
  toHome: () => void;
  toHistory: () => void;
  toHistoryDetail: (id: string) => void;
  toWizardStep: (step: InputWizardStep) => void;
  toSummary: () => void;
  toSchedule: () => void;
  toBake: () => void;
  toPath: (path: string) => void;
};

export function createAppRouteNavigate(navigate: (path: string) => void): AppRouteNavigate {
  return {
    toHome: () => navigate(APP_ROUTES.home),
    toHistory: () => navigate(APP_ROUTES.history),
    toHistoryDetail: (id) => navigate(APP_ROUTES.historyDetail(id)),
    toWizardStep: (step) => navigate(APP_ROUTES.buildStep(step)),
    toSummary: () => navigate(APP_ROUTES.buildSummary),
    toSchedule: () => navigate(APP_ROUTES.buildSchedule),
    toBake: () => navigate(APP_ROUTES.bake),
    toPath: (path) => navigate(path),
  };
}
