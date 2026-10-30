import { jsxDEV as reactJsxDEV } from 'react/jsx-dev-runtime';
import { localized } from './localize';

/** The development twin of `jsx-runtime`. */
export { Fragment } from 'react/jsx-dev-runtime';
export type { JSX } from 'react/jsx-dev-runtime';
export const jsxDEV = localized(reactJsxDEV);
