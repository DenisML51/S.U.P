import React from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cx } from './primitives';

/* Everything inherits the surrounding ink, so the same text reads on parchment and on a plate. */
const COMPONENTS: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 ml-4 list-disc last:mb-0 marker:opacity-60">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal last:mb-0 marker:opacity-60">{children}</ol>,
  li: ({ children }) => <li className="mb-0.5">{children}</li>,
  h1: ({ children }) => <h4 className="ui-display mb-1 mt-3 text-lg first:mt-0">{children}</h4>,
  h2: ({ children }) => <h4 className="ui-display mb-1 mt-3 text-base first:mt-0">{children}</h4>,
  h3: ({ children }) => <h4 className="mb-1 mt-2 font-semibold first:mt-0">{children}</h4>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  code: ({ children }) => <code className="rounded-sm bg-[color-mix(in_srgb,currentColor_12%,transparent)] px-1 font-mono text-[0.85em]">{children}</code>,
  blockquote: ({ children }) => <blockquote className="my-2 border-l-2 border-[color-mix(in_srgb,currentColor_30%,transparent)] pl-3 italic opacity-80">{children}</blockquote>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="underline underline-offset-2">
      {children}
    </a>
  ),
  table: ({ children }) => <table className="my-2 w-full border-collapse text-left">{children}</table>,
  th: ({ children }) => <th className="border-b border-[color-mix(in_srgb,currentColor_35%,transparent)] py-1 pr-3 font-semibold">{children}</th>,
  td: ({ children }) => <td className="border-b border-[color-mix(in_srgb,currentColor_15%,transparent)] py-1 pr-3 align-top">{children}</td>,
  hr: () => <hr className="my-3 border-[color-mix(in_srgb,currentColor_20%,transparent)]" />,
};

/** Markdown written by the player (notes, descriptions), set in the body face. */
export const Prose: React.FC<{ children: string; className?: string }> = ({ children, className }) => (
  <div className={cx('text-sm leading-relaxed', className)}>
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
      {children}
    </ReactMarkdown>
  </div>
);
