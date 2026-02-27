import { useEffect } from 'react';
import { useI18n } from './I18nProvider';
import { legacyRuToEn, legacyRuToEnRegex, legacyRuWordMap } from './legacyRuToEn';

const ATTRS = ['placeholder', 'title', 'aria-label'] as const;
const TEXT_ORIGINAL = new WeakMap<Text, string>();

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const translateByWords = (input: string): string => {
  if (!/[А-Яа-яЁё]/u.test(input)) return input;
  if (input.length > 80) return input;

  const sorted = Object.entries(legacyRuWordMap).sort((a, b) => b[0].length - a[0].length);
  let result = input;

  for (const [ru, en] of sorted) {
    const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(ru)}(?=[^\\p{L}\\p{N}]|$)`, 'gu');
    result = result.replace(pattern, (_, prefix: string) => `${prefix}${en}`);
  }

  return result;
};

const translateToEn = (input: string): string => {
  if (!input) return input;
  if (legacyRuToEn[input]) return legacyRuToEn[input];

  let result = input;
  for (const [regex, replacement] of legacyRuToEnRegex) {
    result = result.replace(regex, replacement);
  }

  if (result !== input) return result;
  return translateByWords(result);
};

const processTextNode = (node: Text, locale: 'ru' | 'en') => {
  const current = node.nodeValue ?? '';
  if (!current.trim()) return;

  if (!TEXT_ORIGINAL.has(node)) {
    TEXT_ORIGINAL.set(node, current);
  }

  const original = TEXT_ORIGINAL.get(node) ?? current;
  node.nodeValue = locale === 'en' ? translateToEn(original) : original;
};

const processElementAttrs = (el: Element, locale: 'ru' | 'en') => {
  for (const attr of ATTRS) {
    const value = el.getAttribute(attr);
    if (!value) continue;

    const originalAttr = `data-i18n-orig-${attr}`;
    if (!el.getAttribute(originalAttr)) {
      el.setAttribute(originalAttr, value);
    }

    const original = el.getAttribute(originalAttr) ?? value;
    el.setAttribute(attr, locale === 'en' ? translateToEn(original) : original);
  }
};

const localizeDom = (locale: 'ru' | 'en') => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let textNode: Node | null = walker.nextNode();
  while (textNode) {
    processTextNode(textNode as Text, locale);
    textNode = walker.nextNode();
  }

  const elements = document.body.querySelectorAll('*');
  elements.forEach((el) => processElementAttrs(el, locale));
};

export const LegacyUiLocalizer: React.FC = () => {
  const { locale } = useI18n();

  useEffect(() => {
    localizeDom(locale);

    const observer = new MutationObserver(() => {
      localizeDom(locale);
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRS as unknown as string[]
    });

    return () => observer.disconnect();
  }, [locale]);

  return null;
};
