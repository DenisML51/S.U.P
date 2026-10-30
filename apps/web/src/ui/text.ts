import { t } from '../i18n';

/**
 * Markdown reduced to plain text for one-line previews: headings, emphasis, code and list markers
 * are dropped, line breaks become spaces. It is translated first, while it is still the text the
 * dictionary knows.
 */
export function plainText(markdown: string | undefined): string {
  if (!markdown) return '';
  return t(markdown)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__|\*|_|`|~~)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
