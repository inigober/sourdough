import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
  createAppRouteNavigate,
  isKnownAppPath,
  parseAppRoute,
} from './appRoutes.ts';

export function useAppRouter() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const parsed = useMemo(() => parseAppRoute(pathname), [pathname]);
  const routes = useMemo(() => createAppRouteNavigate(navigate), [navigate]);
  const isKnownPath = useMemo(() => isKnownAppPath(pathname), [pathname]);

  return {
    pathname,
    location: parsed.location,
    phase: parsed.location.phase,
    tab: parsed.location.tab,
    wizardStep: parsed.wizardStep,
    historyDetailId: parsed.historyDetailId,
    routes,
    navigate,
    isKnownPath,
  };
}
