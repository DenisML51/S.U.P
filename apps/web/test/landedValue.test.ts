// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { LandedValue } from '../src/ui/RollingDie';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const container = document.createElement('div');
document.body.append(container);
const root = createRoot(container);
const show = (landed: boolean, value: string) =>
  act(() => root.render(React.createElement(LandedValue, { landed, children: value })));

afterEach(() => act(() => root.render(null)));

describe('a value waiting for its dice', () => {
  it('hides the new value of a throw in the very render that brings it', async () => {
    await show(true, '45');
    expect(container.textContent).toBe('45');
    expect(container.firstElementChild?.classList.contains('invisible')).toBe(false);

    // A new throw: its value arrives with the dice not yet down — never seen before they land.
    await show(false, '70');
    const hidden = container.firstElementChild!;
    expect(hidden.textContent).toBe('70');
    expect(hidden.classList.contains('invisible')).toBe(true);
    expect(hidden.getAttribute('aria-hidden')).toBe('true');

    await show(true, '70');
    expect(container.firstElementChild?.classList.contains('invisible')).toBe(false);
  });
});
