import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

/** Development-only pages, opened with `?kit` or `?specimen`. Not part of the production bundle's main chunk. */
const FontSpecimen = lazy(() => import('./dev/FontSpecimen').then((m) => ({ default: m.FontSpecimen })));
const UiKit = lazy(() => import('./dev/UiKit').then((m) => ({ default: m.UiKit })));
const devPage = import.meta.env.DEV ? new URLSearchParams(window.location.search) : null;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {devPage?.has('specimen') || devPage?.has('kit') ? (
      <Suspense fallback={null}>{devPage.has('kit') ? <UiKit /> : <FontSpecimen />}</Suspense>
    ) : (
      <App />
    )}
  </React.StrictMode>,
);
