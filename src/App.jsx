import { RouterProvider } from 'react-router/dom';
import { AppProviders } from '@/app/providers.jsx';
import { createAppRouter } from '@/app/router.js';

const router = createAppRouter();

/** Raiz do app: providers globais e o roteador. */
export default function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
