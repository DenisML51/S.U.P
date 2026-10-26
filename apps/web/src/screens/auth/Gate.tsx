import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSessionStore } from '../../store/useSessionStore';
import { cx } from '../../ui/primitives';
import { SettingScope } from '../../ui/theme/SettingScope';
import { useAtLeast } from '../../ui/useBreakpoint';
import { AuthForm } from './AuthForm';
import { Icosahedron } from './Icosahedron';

/**
 * - `boot`: the app is starting; the name writes itself in.
 * - `locked`: nobody is signed in; a lock screen with the name, the form behind any key.
 * - `entering`: signed in, the account is loading; the name with a greeting, the die rolling.
 */
export type GatePhase = 'boot' | 'locked' | 'entering';

const EASE = [0.22, 1, 0.36, 1] as const;
const NAME = 'S.U.P.';
/** How long the name takes to write itself in, so a quick boot never flashes it. */
const INTRO_MS = 1700;

/**
 * Everything before the home page, as one place: the boot splash, the lock screen with the sign-in
 * form, and the moment the account opens. It stays mounted through all three, so the name and the
 * die move between them instead of cutting; leaving, the name rides up and away.
 */
export const Gate: React.FC<{ phase: GatePhase; onIntroDone: () => void }> = ({ phase, onIntroDone }) => {
  const [unlocked, setUnlocked] = useState(false);
  const user = useSessionStore((s) => s.user);
  const locked = phase === 'locked';
  const open = locked && unlocked;
  // A phone keeps the form high, so the keyboard rising under it leaves the button in sight.
  const tablet = useAtLeast('tablet');

  useEffect(() => {
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = setTimeout(onIntroDone, still ? 300 : INTRO_MS);
    return () => clearTimeout(timer);
  }, [onIntroDone]);

  // Any key, click or scroll lifts the lock screen; Escape lowers it again.
  useEffect(() => {
    if (!locked) {
      setUnlocked(false);
      return;
    }
    if (unlocked) {
      const lower = (event: KeyboardEvent) => event.key === 'Escape' && setUnlocked(false);
      window.addEventListener('keydown', lower);
      return () => window.removeEventListener('keydown', lower);
    }
    const lift = (event: Event) => {
      if (event instanceof KeyboardEvent && (event.key === 'Escape' || event.repeat)) return;
      event.preventDefault();
      setUnlocked(true);
    };
    window.addEventListener('keydown', lift);
    window.addEventListener('pointerdown', lift);
    window.addEventListener('wheel', lift, { passive: false });
    return () => {
      window.removeEventListener('keydown', lift);
      window.removeEventListener('pointerdown', lift);
      window.removeEventListener('wheel', lift);
    };
  }, [locked, unlocked]);

  return (
    <SettingScope setting="service" className="ui-service ui-gate relative h-screen overflow-hidden bg-bg max-sm:h-[100dvh]">
      <div className="ui-gate__atmosphere pointer-events-none absolute inset-0" aria-hidden />
      <motion.div
        className="pointer-events-none absolute inset-0 grid place-items-center"
        animate={{
          opacity: open ? 0.4 : 1,
          scale: open ? 1.1 : 1,
          transition: { duration: 0.9, ease: EASE },
        }}
        exit={{ opacity: 0, scale: 1.35, transition: { duration: 0.7, ease: EASE } }}
      >
        <Icosahedron draw spin={phase === 'entering' ? 10 : 1} className="ui-gate__die" />
      </motion.div>

      {/* The name stands in the middle; once the lock is lifted it steps up over the form. */}
      <motion.div
        className="absolute inset-x-0 flex justify-center"
        initial={false}
        animate={{
          top: open ? (tablet ? '27vh' : '12vh') : '50vh',
          y: '-50%',
          scale: open ? (tablet ? 0.6 : 0.5) : 1,
        }}
        transition={{ duration: 0.9, ease: EASE }}
        exit={{ opacity: 0, y: '-130%', transition: { duration: 0.55, ease: [0.55, 0, 0.75, 0.2] } }}
      >
        <div className="relative">
          <GateName small={open} loading={!locked} />
          <AnimatePresence>
            {phase === 'entering' && user && (
              <motion.p
                key="greeting"
                className="absolute inset-x-0 top-full mt-8 whitespace-nowrap text-center text-sm text-ink-muted"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.3 } }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
              >
                С возвращением, <span className="text-ink">{user.displayName}</span>
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <AnimatePresence>
        {locked && (
          <motion.div
            key="lock"
            className="pointer-events-none absolute inset-0"
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
          >
            <LockScreen open={open} />
          </motion.div>
        )}
      </AnimatePresence>
    </SettingScope>
  );
};

// ------------------------------------------------------------------------------------------------

/** The service name, written in letter by letter; a light runs along the hairline under it while loading. */
const GateName: React.FC<{ small: boolean; loading: boolean }> = ({ small, loading }) => (
  <div className="flex flex-col items-center" aria-label="S.U.P. — Система управления персонажем">
    <span className="ui-gate__name flex leading-none" aria-hidden>
      {[...NAME].map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: '0.25em', filter: 'blur(10px)' }}
          animate={{
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            transition: { duration: 0.7, ease: EASE, delay: 0.25 + i * 0.09 },
          }}
        >
          {char}
        </motion.span>
      ))}
    </span>
    <motion.span
      className={cx('ui-gate__rule', loading && 'ui-gate__rule--loading')}
      initial={{ scaleX: 0 }}
      animate={{
        scaleX: small ? 0 : 1,
        transition: { duration: small ? 0.4 : 0.9, ease: EASE, delay: small ? 0 : 0.6 },
      }}
      aria-hidden
    />
    <motion.span
      className="ui-gate__tagline"
      initial={{ opacity: 0 }}
      animate={{ opacity: small ? 0 : 1, transition: { duration: small ? 0.3 : 0.8, delay: small ? 0 : 1 } }}
      aria-hidden
    >
      Система управления персонажем
    </motion.span>
  </div>
);

// ------------------------------------------------------------------------------------------------

/** The hint while locked; once lifted, the form rises under the name. */
const LockScreen: React.FC<{ open: boolean }> = ({ open }) => (
  <AnimatePresence>
    {open ? (
      <motion.div
        key="form"
        className="ui-gate__form pointer-events-auto absolute inset-x-0 top-[38vh] mx-auto w-full max-w-[380px] max-sm:top-[20vh] max-sm:px-6"
        initial={{ opacity: 0, y: 48 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE, delay: 0.2 } }}
        exit={{ opacity: 0, y: 32, transition: { duration: 0.3 } }}
      >
        <AuthForm />
      </motion.div>
    ) : (
      <motion.p
        key="hint"
        className="ui-gate__hint absolute inset-x-0 bottom-[9vh] text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.5 } }}
        exit={{ opacity: 0, transition: { duration: 0.2 } }}
      >
        {/* A phone has no keys to press: the screen itself is touched. */}
        <span className="[@media(hover:none)]:hidden">Нажмите любую клавишу, чтобы войти</span>
        <span className="hidden [@media(hover:none)]:inline">Коснитесь экрана, чтобы войти</span>
      </motion.p>
    )}
  </AnimatePresence>
);
