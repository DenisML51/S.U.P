import React from 'react';

/** The service name in the service's own type; its colour follows the focused hero's setting. */
export const Wordmark: React.FC = () => (
  <div className="flex h-10 w-80 flex-col justify-center" aria-label="S.U.P. — Система управления персонажем">
    <span className="ui-display ui-morph text-[1.65rem] leading-none tracking-[0.08em] text-frame-bright" aria-hidden>
      S.U.P.
    </span>
    <span className="ui-morph mt-1 whitespace-nowrap text-[10px] uppercase tracking-[0.28em] text-ink-faint" aria-hidden>
      Система управления персонажем
    </span>
  </div>
);
