import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, LogIn, UserPlus } from 'lucide-react';
import { ApiError, NetworkError } from '../data/api/client';
import { useSessionStore } from '../store/useSessionStore';

type Mode = 'login' | 'register';

const errorMessage = (error: unknown): string => {
  if (error instanceof NetworkError) return 'Сервер недоступен. Проверьте соединение.';
  if (error instanceof ApiError) {
    const details = (error.body.details as { message: string }[] | undefined)?.[0]?.message;
    return details ? `${error.message}: ${details}` : error.message;
  }
  return 'Что-то пошло не так. Попробуйте ещё раз.';
};

const inputClass =
  'w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all';

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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1
        className="font-black tracking-[0.1em] text-8xl leading-none bg-gradient-to-b from-white via-white to-blue-500/50 bg-clip-text text-transparent mb-4"
        style={{ fontFamily: "'Orbitron', sans-serif" }}
      >
        S<span className="font-sans">.</span>U<span className="font-sans">.</span>P<span className="font-sans">.</span>
      </h1>
      <p
        className="text-blue-400/80 text-xs font-black tracking-[0.5em] uppercase mb-12 text-center"
        style={{ fontFamily: "'Orbitron', sans-serif" }}
      >
        Система Управления Персонажем
      </p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-dark-card border border-dark-border rounded-3xl shadow-2xl overflow-hidden"
      >
        {registrationEnabled && (
          <div className="flex p-1 m-6 mb-0 bg-dark-bg/50 border border-dark-border rounded-2xl">
            {(['login', 'register'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setMode(tab);
                  setError(null);
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  mode === tab ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {tab === 'login' ? 'Вход' : 'Регистрация'}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={submit} className="p-6 space-y-4">
          <AnimatePresence initial={false}>
            {isRegister && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Имя игрока</label>
                <input
                  className={inputClass}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  autoComplete="nickname"
                  maxLength={64}
                  required
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Email</label>
            <input
              className={inputClass}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Пароль</label>
            <input
              className={inputClass}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              minLength={isRegister ? 8 : undefined}
              required
            />
            {isRegister && <p className="text-[10px] text-gray-500 mt-2">Не короче 8 символов</p>}
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isRegister ? (
              <UserPlus className="w-4 h-4" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            {isRegister ? 'Создать аккаунт' : 'Войти'}
          </button>

          {!registrationEnabled && (
            <p className="text-[10px] text-gray-500 text-center">Регистрация закрыта. Аккаунт выдаёт администратор.</p>
          )}
        </form>
      </motion.div>
    </div>
  );
};
