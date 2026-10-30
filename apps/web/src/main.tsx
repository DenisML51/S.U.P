import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { config as zodConfig } from 'zod';
import App from './App.tsx';
import { readInviteLink } from './useBrowserHistory';
import { ErrorBoundary } from './ui/ErrorBoundary';
import './index.css';

// The page's CSP forbids eval; without this zod would try it once to decide how to compile schemas.
zodConfig({ jitless: true });

/** Development-only design-system showcase, opened with `?kit`. Not part of the production bundle's main chunk. */
const UiKit = lazy(() => import('./dev/UiKit').then((m) => ({ default: m.UiKit })));
/** The same for the Call of Cthulhu kit, opened with `?coc`. */
const CocKit = lazy(() => import('./dev/CocKit').then((m) => ({ default: m.CocKit })));
const devPage = import.meta.env.DEV ? new URLSearchParams(window.location.search) : null;
// An invitation link is taken in before anything is drawn: the address turns back into the app's own.
readInviteLink();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      {devPage?.has('kit') ? (
        <Suspense fallback={null}>
          <UiKit />
        </Suspense>
      ) : devPage?.has('coc') ? (
        <Suspense fallback={null}>
          <CocKit />
        </Suspense>
      ) : (
        <App />
      )}
    </ErrorBoundary>
  </React.StrictMode>,
);
