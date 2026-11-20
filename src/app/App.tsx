import { useEffect } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';

import { RecipeBuilder } from '../features/recipe-builder/RecipeBuilder.tsx';
import { installKeyboardScrollResetInBrowser } from '../lib/ui/keyboardScrollReset.ts';
import { useRouteAccessibility } from './routeEffects.ts';

const router = createBrowserRouter([
  { path: '/', element: <RecipeBuilder /> },
  { path: '/saved', element: <RecipeBuilder /> },
  { path: '/history', element: <RecipeBuilder /> },
  { path: '/history/:bakeId', element: <RecipeBuilder /> },
  { path: '/recipe/:recipeId', element: <RecipeBuilder /> },
  { path: '/build/:step', element: <RecipeBuilder /> },
  { path: '/bake', element: <RecipeBuilder /> },
  { path: '*', element: <Navigate to="/" replace /> },
]);

export function App() {
  useRouteAccessibility(router);
  useEffect(() => installKeyboardScrollResetInBrowser(), []);

  return (
    <main className="app-shell">
      <RouterProvider router={router} />
    </main>
  );
}
