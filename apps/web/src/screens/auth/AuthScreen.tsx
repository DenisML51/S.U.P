import React, { useState } from 'react';
import { DEFAULT_SETTING } from '@itd/schema';
import { ApiError, NetworkError } from '../../data/api/client';
import { useSessionStore } from '../../store/useSessionStore';
import { Button, Field, Input, Panel, Rule, cx } from '../../ui/primitives';
import { SettingBackdrop } from '../../ui/SettingBackdrop';
import { SettingScope } from '../../ui/theme/SettingScope';

type Mode = 'login' | 'register';

const errorMessage = (error: unknown): string => {
  if (error instanceof NetworkError) return 'Сервер недоступен. Проверьте соединение.';
  if (error instanceof ApiError) {
    const detail = (error.body.details as { message: string }[] | undefined)?.[0]?.message;
    return detail ? `${error.message}: ${detail}` : error.message;
  }
  return 'Что-то пошло не так. Попробуйте ещё раз.';
};

/** Sign-in and sign-up. The service's own face: the default setting, nothing character-specific. */
export const AuthScreen: React.FC = () => {
  const { login, register, registrationEnabled } = useSessionStore();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isRegister = mode === 'register' && registrationEnabled;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isRegister) await register(email, password, displayName);
      else await login(email, password);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const switchTo = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  return (
    <SettingScope setting={DEFAULT_SETTING} className="relative grid h-screen place-items-center overflow-hidden bg-bg">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 50% 40%, rgb(var(--c-surface-2) / 0.5), rgb(var(--c-bg-deep)) 70%)' }}
      />
      <SettingBackdrop setting={DEFAULT_SETTING} />

      <div className="relative z-10 flex w-full max-w-[400px] flex-col items-center">
        <h1 className="ui-display text-6xl leading-none text-frame-bright">S.U.P.</h1>
        <p className="mt-3 text-[11px] uppercase tracking-[0.32em] text-ink-muted">Система управления персонажем</p>

        <Panel as="section" className="mt-10 w-full px-8 pb-8 pt-6">
          <nav className="mb-6 flex justify-center gap-8" aria-label="Вход или регистрация">
            {(registrationEnabled ? (['login', 'register'] as const) : (['login'] as const)).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => switchTo(tab)}
                aria-current={mode === tab}
                className={cx(
                  'ui-display border-b pb-1 text-lg transition-colors',
                  mode === tab ? 'border-frame-bright text-ink' : 'border-transparent text-ink-faint hover:text-ink-muted',
                )}
              >
                {tab === 'login' ? 'Вход' : 'Регистрация'}
              </button>
            ))}
          </nav>

          <form onSubmit={submit} className="space-y-4" noValidate={false}>
            {isRegister && (
              <Field label="Имя игрока">
                {(props) => (
                  <Input
                    {...props}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    autoComplete="nickname"
                    maxLength={64}
                    required
                  />
                )}
              </Field>
            )}
            <Field label="Email">
              {(props) => (
                <Input
                  {...props}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              )}
            </Field>
            <Field label="Пароль" hint={isRegister ? 'Не короче 8 символов' : undefined}>
              {(props) => (
                <Input
                  {...props}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  minLength={isRegister ? 8 : undefined}
                  required
                />
              )}
            </Field>

            {error && (
              <p role="alert" className="border-l-2 border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}

            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submitting}>
              {submitting ? 'Минуту…' : isRegister ? 'Создать аккаунт' : 'Войти'}
            </Button>
          </form>

          {!registrationEnabled && (
            <>
              <Rule className="my-5" />
              <p className="text-center text-xs text-ink-faint">Регистрация закрыта. Аккаунт выдаёт администратор.</p>
            </>
          )}
        </Panel>
      </div>
    </SettingScope>
  );
};
