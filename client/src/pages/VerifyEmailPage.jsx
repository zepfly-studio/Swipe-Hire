import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MailCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import Background from '../components/Background';
import Logo from '../components/Logo';
import { Button } from '../components/ui';
import { homePath, useAuth } from '../context/AuthContext';
import { api, errorMessage } from '../lib/api';

// After signing up (or logging into an unverified account): enter the 6-digit code from the email.
export default function VerifyEmailPage() {
  const { user, logout, updateSession } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(null); // { sentTo, devCode }
  const [retryIn, setRetryIn] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const input = useRef(null);

  const send = async () => {
    setSending(true);
    try {
      const { data } = await api.post('/auth/email/send');
      if (data.verified) return navigate('/', { replace: true });
      setSent(data);
      setSendError('');
      setRetryIn(data.retryIn ?? 60);
    } catch (err) {
      setSendError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  // Sending on arrival is safe: within a minute the server reuses the same code.
  useEffect(() => {
    send();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (retryIn <= 0) return undefined;
    const t = setTimeout(() => setRetryIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [retryIn]);

  const verify = async (value = code) => {
    if (value.length !== 6) return setError('Enter the 6-digit code from the email');
    setVerifying(true);
    setError('');
    try {
      const { data } = await api.post('/auth/email/verify', { code: value });
      updateSession(data);
      toast.success('Email verified!');
      navigate(homePath(data.user, data.profile), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setCode('');
      input.current?.focus();
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="relative grid min-h-dvh place-items-center px-4 py-10">
      <Background />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo animated tagline />
        </div>
        <div className="glass rounded-[30px] p-6 text-center sm:p-8">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-linear-to-br from-brand-500 to-violet-brand">
            <MailCheck size={26} />
          </span>
          <h1 className="mt-5 text-2xl font-extrabold">Verify your email</h1>
          <p className="mt-2 text-sm text-white/60">
            {sent ? (
              <>
                We sent a 6-digit code to <b className="text-white">{sent.sentTo}</b>. It expires in 15 minutes.
              </>
            ) : sendError ? (
              <span className="font-medium text-brand-400">{sendError}</span>
            ) : (
              'Sending you a code…'
            )}
          </p>

          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              verify();
            }}
          >
            <input
              ref={input}
              value={code}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                setCode(v);
                setError('');
                if (v.length === 6) verify(v);
              }}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={6}
              placeholder="••••••"
              aria-label="6-digit code"
              className="input text-center text-2xl font-bold tracking-[0.5em]"
            />
            {error && <p className="text-sm font-medium text-brand-400">{error}</p>}
            <Button type="submit" className="btn-primary w-full" loading={verifying}>
              Verify email
            </Button>
          </form>

          {sent?.devCode && (
            <p className="mt-4 rounded-xl bg-amber-300/10 px-3 py-2 text-xs text-amber-200">
              Local testing (no email service set up): your code is <b>{sent.devCode}</b>
            </p>
          )}

          <div className="mt-6 space-y-2 text-sm text-white/55">
            <p>
              Didn’t get it? Check your spam folder, or{' '}
              <button onClick={send} disabled={retryIn > 0 || sending} className="font-semibold text-brand-400 hover:text-brand-500 disabled:cursor-default disabled:text-white/40">
                {retryIn > 0 ? `send a new code in ${retryIn}s` : 'send a new code'}
              </button>
            </p>
            <p>
              Wrong email ({user?.email})?{' '}
              <button onClick={logout} className="font-semibold text-brand-400 hover:text-brand-500">
                Log out and sign up again
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
