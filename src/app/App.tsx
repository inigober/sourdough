import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';

import { RecipeBuilder } from '../features/recipe-builder/RecipeBuilder.tsx';

const router = createBrowserRouter([
  { path: '/', element: <RecipeBuilder /> },
  { path: '/history', element: <RecipeBuilder /> },
  { path: '/history/:bakeId', element: <RecipeBuilder /> },
  { path: '/build/:step', element: <RecipeBuilder /> },
  { path: '/bake', element: <RecipeBuilder /> },
  { path: '*', element: <Navigate to="/" replace /> },
]);

export function App() {
  return (
    <main className="app-shell">
      <RouterProvider router={router} />
    </main>
  );
}
