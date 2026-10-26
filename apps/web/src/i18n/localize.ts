import { hasCyrillic, t, translating } from './index';

/** Props of an element that are never shown as they are, or hold what the player typed. */
const KEEP = new Set([
  'children',
  'value',
  'defaultValue',
  'className',
  'style',
  'id',
  'name',
  'href',
  'src',
  'htmlFor',
  'type',
  'role',
  'download',
]);
/** Props a component shows (or hands to an element that does) that are always plain text. */
const SHOWN = ['title', 'label', 'placeholder', 'alt', 'aria-label', 'aria-description'];

const text = (value: unknown): value is string => typeof value === 'string' && hasCyrillic(value);

/**
 * The props of an element with its texts in the language of the page: the text children of any
 * element (so a motion.div or a toast is translated too), and every text prop of an HTML or SVG
 * element. Unchanged props are returned as they are.
 */
function localizeProps(type: unknown, props: Record<string, unknown>): Record<string, unknown> {
  let out = props;
  const set = (key: string, value: unknown) => {
    if (out === props) out = { ...props };
    out[key] = value;
  };
  const children = props.children;
  if (text(children)) set('children', t(children));
  else if (Array.isArray(children) && children.some(text))
    set(
      'children',
      children.map((child) => (text(child) ? t(child) : child)),
    );
  if (typeof type === 'string') {
    for (const key in props) if (!KEEP.has(key) && text(props[key])) set(key, t(props[key] as string));
  } else {
    for (const key of SHOWN) if (text(props[key])) set(key, t(props[key] as string));
  }
  return out;
}

/** Wraps an element factory of React so its texts are translated; in Russian it is returned as is. */
export function localized<F extends (type: never, props: never, ...rest: never[]) => unknown>(factory: F): F {
  if (!translating) return factory;
  return ((type: unknown, props: Record<string, unknown>, ...rest: unknown[]) =>
    (factory as unknown as (...args: unknown[]) => unknown)(
      type,
      props ? localizeProps(type, props) : props,
      ...rest,
    )) as unknown as F;
}
