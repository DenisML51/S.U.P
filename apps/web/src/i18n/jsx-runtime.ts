import { jsx as reactJsx, jsxs as reactJsxs } from 'react/jsx-runtime';
import { localized } from './localize';

/**
 * The JSX runtime of the app (`jsxImportSource`): React's, with the texts of every element in the
 * language of the page. Prose opts out with its own pragma: it translates its markdown whole.
 */
export { Fragment } from 'react/jsx-runtime';
export type { JSX } from 'react/jsx-runtime';
export const jsx = localized(reactJsx);
export const jsxs = localized(reactJsxs);
