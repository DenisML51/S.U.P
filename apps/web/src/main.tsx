import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

/** Development-only design-system showcase, opened with `?kit`. Not part of the production bundle's main chunk. */
const UiKit = lazy(() => import('./dev/UiKit').then((m) => ({ default: m.UiKit })));
const devPage = import.meta.env.DEV ? new URLSearchParams(window.location.search) : null;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {devPage?.has('kit') ? (
      <Suspense fallback={null}>
        <UiKit />
      </Suspense>
    ) : (
      <App />
    )}
  </React.StrictMode>,
);
