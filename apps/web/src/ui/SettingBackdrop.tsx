import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SETTING_ART } from './art';
import { SETTING_LIST, type Theme } from './theme/settings';
import { SettingScope } from './theme/SettingScope';
import { cx } from './primitives';

const FADE = 700;

/**
 * The atmospheres awake: the one shown and those still fading out of it. The rest sleep — their
 * contents are not styled, laid out or painted, so a step between settings costs only the two
 * atmospheres it moves between.
 */
const useAwake = (setting: Theme) => {
  const [fading, setFading] = useState<Theme[]>([]);
  const last = useRef(setting);
  useEffect(() => {
    const before = last.current;
    if (before === setting) return;
    last.current = setting;
    setFading((list) => [...list.filter((id) => id !== setting && id !== before), before]);
    window.setTimeout(() => setFading((list) => (last.current === before ? list : list.filter((id) => id !== before))), FADE + 50);
  }, [setting]);
  return (id: Theme) => id === setting || fading.includes(id);
};

/**
 * Screen atmosphere of each setting. All of them are mounted at once and cross-fade, so moving
 * between characters of different settings morphs the atmosphere instead of swapping it; those not
 * shown sleep once they have faded: their animations held still, their contents skipped.
 */
export const SettingBackdrop: React.FC<{ setting: Theme; className?: string; strength?: number; frame?: boolean }> = ({
  setting,
  className,
  frame,
  // Atmosphere, not decoration: by default it stays well behind the content.
  strength = 0.45,
}) => {
  const awake = useAwake(setting);
  // The pictures themselves never change: a step between settings re-renders only the layers' styles.
  const scenes = useMemo(
    () =>
      Object.fromEntries(
        SETTING_LIST.map(({ id }) => {
          const { Backdrop } = SETTING_ART[id];
          return [id, <Backdrop frame={frame} />];
        }),
      ) as Record<Theme, React.ReactNode>,
    [frame],
  );
  return (
    <div className={cx('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden>
      {SETTING_LIST.map(({ id }) => (
        // An atmosphere falls asleep in one change, once it has faded out: marked dormant and its
        // contents skipped together, so nothing in it is worked out again while it is still seen.
        <SettingScope
          key={id}
          setting={id}
          className="absolute inset-0"
          data-dormant={awake(id) ? undefined : ''}
          style={{
            opacity: id === setting ? strength : 0,
            contentVisibility: awake(id) ? undefined : 'hidden',
            transition: `opacity ${FADE}ms`,
          }}
        >
          {scenes[id]}
        </SettingScope>
      ))}
    </div>
  );
};
