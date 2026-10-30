import React, { useState } from 'react';
import { DisplayNameSchema, PasswordSchema } from '@itd/schema';
import { toast } from 'react-hot-toast';
import { useSessionStore } from '../../store/useSessionStore';
import { Button, Field, Input } from '../../ui/primitives';

const messageOf = (error: unknown, fallback: string) => (error instanceof Error && error.message ? error.message : fallback);

/** The account's name as the table sees it, changed in place. */
const NameForm: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const { user, updateDisplayName } = useSessionStore();
  const [name, setName] = useState(user?.displayName ?? '');
  const [busy, setBusy] = useState(false);
  const parsed = DisplayNameSchema.safeParse(name);

  const save = async () => {
    if (!parsed.success) return;
    setBusy(true);
    try {
      await updateDisplayName(parsed.data);
      toast.success('Имя изменено');
      onDone();
    } catch (error) {
      toast.error(messageOf(error, 'Не удалось изменить имя'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="mt-3 flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <Field label="Имя за столом" className="min-w-0 flex-1" error={name && !parsed.success ? parsed.error.issues[0]?.message : undefined}>
        {(props) => <Input {...props} value={name} maxLength={64} onChange={(e) => setName(e.target.value)} autoFocus />}
      </Field>
      <Button type="submit" variant="primary" size="sm" disabled={!parsed.success || busy}>
        Сохранить
      </Button>
    </form>
  );
};

/** A new password, given the current one; the other devices are signed out. */
const PasswordForm: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const changePassword = useSessionStore((s) => s.changePassword);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const strong = PasswordSchema.safeParse(next);
  const matches = next === again;
  const ready = current.length > 0 && strong.success && matches;

  const save = async () => {
    if (!ready) return;
    setBusy(true);
    try {
      await changePassword(current, next);
      toast.success('Пароль изменён; на других устройствах нужно войти заново');
      onDone();
    } catch (error) {
      toast.error(messageOf(error, 'Не удалось сменить пароль'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="mt-3 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <Field label="Текущий пароль">
        {(props) => (
          <Input {...props} type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} autoFocus />
        )}
      </Field>
      <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <Field label="Новый пароль" error={next && !strong.success ? strong.error.issues[0]?.message : undefined}>
          {(props) => <Input {...props} type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />}
        </Field>
        <Field label="Ещё раз" error={again && !matches ? 'Пароли не совпадают' : undefined}>
          {(props) => <Input {...props} type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} />}
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" variant="primary" size="sm" disabled={!ready || busy}>
          Сменить пароль
        </Button>
      </div>
    </form>
  );
};

/** Name and password of the account, each opened in place when asked for. */
export const AccountEditors: React.FC = () => {
  const [open, setOpen] = useState<'name' | 'password' | null>(null);
  const toggle = (what: 'name' | 'password') => setOpen((current) => (current === what ? null : what));
  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <button type="button" className="text-sm text-ink-muted underline-offset-4 hover:text-ink hover:underline" onClick={() => toggle('name')}>
          Изменить имя
        </button>
        <button type="button" className="text-sm text-ink-muted underline-offset-4 hover:text-ink hover:underline" onClick={() => toggle('password')}>
          Сменить пароль
        </button>
      </div>
      {open === 'name' && <NameForm onDone={() => setOpen(null)} />}
      {open === 'password' && <PasswordForm onDone={() => setOpen(null)} />}
    </div>
  );
};
