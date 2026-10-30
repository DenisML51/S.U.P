import React from 'react';
import { IconPrev } from '../../ui/icons';

/** The service name, in the service's own theme; with `onHome` it leads back to the home page. */
export const Wordmark: React.FC<{ onHome?: () => void }> = ({ onHome }) =>
  onHome ? (
    <button
      type="button"
      onClick={onHome}
      className="ui-wordmark-home group -ml-7 flex min-w-0 items-center gap-2 text-left max-lg:-ml-1"
      aria-label="На главную"
      title="На главную"
    >
      <IconPrev width={18} height={18} className="text-ink-faint transition-transform group-hover:-translate-x-0.5 group-hover:text-frame-bright" />
      <WordmarkText />
    </button>
  ) : (
    <WordmarkText />
  );

const WordmarkText: React.FC = () => (
  <div className="flex h-10 w-80 min-w-0 flex-col justify-center max-sm:w-auto" aria-label="S.U.P. — Система управления персонажем">
    <span className="ui-display ui-wordmark text-[1.65rem] leading-none tracking-[0.08em] text-frame-bright" aria-hidden>
      S.U.P.
    </span>
    <span className="mt-1 whitespace-nowrap text-[10px] uppercase tracking-[0.28em] text-ink-faint max-sm:hidden" aria-hidden>
      Система управления персонажем
    </span>
  </div>
);
