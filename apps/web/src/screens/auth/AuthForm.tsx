import React, { useState } from 'react';
import { ApiError, NetworkError } from '../../data/api/client';
import { useSessionStore } from '../../store/useSessionStore';
import { Button, Field, Input, Panel, Rule, cx } from '../../ui/primitives';

type Mode = 'login' | 'register';

const errorMessage = (error: unknown): string => {
  if (error instanceof NetworkError) return 'Сервер недоступен. Проверьте соединение.';
  if (error instanceof ApiError) {
    const detail = (error.body.details as { message: string }[] | undefined)?.[0]?.message;
    return detail ? `${error.message}: ${detail}` : error.message;
  }
  return 'Что-то пошло не так. Попробуйте ещё раз.';
};

/** Sign-in and sign-up, on the lock screen once it is lifted. */
export const AuthForm: React.FC = () => {
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
    <Panel as="section" className="w-full px-8 pb-8 pt-6">
      <nav className="mb-6 flex justify-center gap-8" aria-label="Вход или регистрация">
        {(registrationEnabled ? (['login', 'register'] as const) : (['login'] as const)).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => switchTo(tab)}
            aria-current={mode === tab}
            className={cx(
              'ui-display border-b pb-1 text-lg transition-colors',
              mode === tab
                ? 'border-frame-bright text-ink'
                : 'border-transparent text-ink-faint hover:text-ink-muted',
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
              autoFocus
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
          <p className="text-center text-xs text-ink-faint">
            Регистрация закрыта. Аккаунт выдаёт администратор.
          </p>
        </>
      )}
    </Panel>
  );
};
