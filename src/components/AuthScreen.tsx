import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';
import { useI18n } from '../i18n/I18nProvider';

interface AuthScreenProps {
  embedded?: boolean;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ embedded = false }) => {
  const { registerRequestCode, registerVerifyCode, pendingRegistrationEmail, login } = useAuthStore();
  const { t } = useI18n();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const sendRegistrationCode = async () => {
    setError('');
    if (password !== confirmPassword) {
      setError(t('auth.passwordsMismatch'));
      return;
    }
    setLoading(true);
    try {
      await registerRequestCode(name, email, password);
    } catch {
      setError(t('auth.errorSendCode'));
    } finally {
      setLoading(false);
    }
  };

  const submitRegistrationCode = async () => {
    setError('');
    setLoading(true);
    try {
      await registerVerifyCode(code);
    } catch {
      setError(t('auth.errorCode'));
    } finally {
      setLoading(false);
    }
  };

  const submitLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch {
      setError(t('auth.errorLogin'));
    } finally {
      setLoading(false);
    }
  };

  const passwordsMatch = !confirmPassword || password === confirmPassword;

  const card = (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="w-full max-w-md bg-gradient-to-b from-dark-card to-dark-bg/90 border border-dark-border rounded-3xl p-6 md:p-7 space-y-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
    >
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-black tracking-wide bg-gradient-to-r from-blue-300 to-purple-400 bg-clip-text text-transparent">
            {t('auth.title')}
          </h1>
          <p className="text-xs uppercase tracking-[0.25em] text-gray-500">{t('auth.subtitle')}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 bg-black/20 p-1 rounded-xl border border-white/5">
          <button
            className={`rounded-lg p-2.5 text-sm transition-all ${mode === 'login' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' : 'text-gray-300 hover:bg-white/5'}`}
            onClick={() => setMode('login')}
          >
            {t('auth.login')}
          </button>
          <button
            className={`rounded-lg p-2.5 text-sm transition-all ${mode === 'register' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' : 'text-gray-300 hover:bg-white/5'}`}
            onClick={() => setMode('register')}
          >
            {t('auth.register')}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {mode === 'login' ? (
          <motion.div
            key="login-form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-3"
          >
            <p className="text-sm text-gray-400">{t('auth.loginHint')}</p>
            <input
              className="w-full bg-black/30 border border-dark-border rounded-xl p-3"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.emailPlaceholder')}
            />
            <input
              className="w-full bg-black/30 border border-dark-border rounded-xl p-3"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.passwordPlaceholder')}
            />
            <button
              className="w-full bg-blue-600 hover:bg-blue-500 rounded-xl p-3 font-semibold disabled:opacity-50"
              onClick={submitLogin}
              disabled={loading || !email || !password}
            >
              {loading ? t('auth.loggingIn') : t('auth.loginAction')}
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="register-form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-3"
          >
            {!pendingRegistrationEmail ? (
              <>
                <p className="text-sm text-gray-400">{t('auth.registerHint')}</p>
                <input
                  className="w-full bg-black/30 border border-dark-border rounded-xl p-3"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('auth.namePlaceholder')}
                />
                <input
                  className="w-full bg-black/30 border border-dark-border rounded-xl p-3"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.emailPlaceholder')}
                />
                <input
                  className="w-full bg-black/30 border border-dark-border rounded-xl p-3"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.passwordMinPlaceholder')}
                />
                <input
                  className={`w-full bg-black/30 border rounded-xl p-3 ${passwordsMatch ? 'border-dark-border' : 'border-red-500/60'}`}
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('auth.confirmPasswordPlaceholder')}
                />
                {!passwordsMatch ? <p className="text-xs text-red-400">{t('auth.passwordsMismatch')}</p> : null}
                <button
                  className="w-full bg-blue-600 hover:bg-blue-500 rounded-xl p-3 font-semibold disabled:opacity-50"
                  onClick={sendRegistrationCode}
                  disabled={loading || !name || !email || password.length < 8 || !confirmPassword || password !== confirmPassword}
                >
                  {loading ? t('auth.sending') : t('auth.sendCode')}
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-400">{t('auth.codeSentTo')} {pendingRegistrationEmail}</p>
                <input
                  className="w-full bg-black/30 border border-dark-border rounded-xl p-3 tracking-[0.4em]"
                  type="text"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder={t('auth.codePlaceholder')}
                />
                <button
                  className="w-full bg-blue-600 hover:bg-blue-500 rounded-xl p-3 font-semibold disabled:opacity-50"
                  onClick={submitRegistrationCode}
                  disabled={loading || code.length !== 6}
                >
                  {loading ? t('auth.verifying') : t('auth.confirmCreate')}
                </button>
              </>
            )}
          </motion.div>
        )}
        </AnimatePresence>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </motion.div>
  );

  if (embedded) {
    return <div className="w-full flex justify-center px-4">{card}</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-dark-bg">
      {card}
    </div>
  );
};
