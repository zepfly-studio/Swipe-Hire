import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, Lock, Mail, ShieldCheck } from 'lucide-react';
import Background from '../../components/Background';
import Logo from '../../components/Logo';
import { Button, Field, Input, Spinner } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { api, errorMessage } from '../../lib/api';

// Admin sign-in at /adminlogin: email + password, then (when two-step is on) a 6-digit code
// emailed to the admin. Only accounts with an admin role get in.
export default function AdminLoginPage() {
  const { loading, user, signIn, logout } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [code, setCode] = useState('');
  const [step, setStep] = useState('password'); // password | code
  const [sentTo, setSentTo] = useState('');
  const [devCode, setDevCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  // Asks the server for the second step; it either emails a code or lets the admin straight in.
  const startSecondStep = async () => {
    setError('');
    setBusy(true);
    try {
      const { data } = await api.post('/admin-auth/send');
      if (data.skip) return navigate('/admin', { replace: true });
      setSentTo(data.sentTo);
      setDevCode(data.devCode || '');
      setStep('code');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  // Already signed in as an admin (e.g. the admin token expired): go straight to the code.
  useEffect(() => {
    if (!loading && user?.isAdmin && !started.current) {
      started.current = true;
      startSecondStep();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  if (loading) return <Spinner className="min-h-dvh" />;

  const submitPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) return setError('Enter your admin email and password');
    setBusy(true);
    try {
      const { data } = await api.post('/auth/login', { email: email.trim(), password });
      if (!data.user?.isAdmin) {
        await api.post('/auth/logout').catch(() => {});
        setError('This account does not have admin access.');
        return;
      }
      started.current = true;
      signIn(data);
      await startSecondStep();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (e) => {
    e?.preventDefault();
    if (!/^\d{6}$/.test(code)) return setError('Enter the 6-digit code');
    setError('');
    setBusy(true);
    try {
      await api.post('/admin-auth/verify', { code });
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  const useOtherAccount = () => {
    logout();
    started.current = false;
    setStep('password');
    setCode('');
    setError('');
  };

  return (
    <div className="relative grid min-h-dvh place-items-center px-4 py-10">
      <Background />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="glass rounded-[28px] p-6 shadow-xl sm:p-8">
          <span className="grid size-12 place-items-center rounded-2xl bg-brand-500 text-[#fff] shadow-lg shadow-brand-500/25">
            {step === 'code' ? <KeyRound size={24} /> : <ShieldCheck size={24} />}
          </span>
          {step === 'password' ? (
            <form onSubmit={submitPassword} noValidate>
              <h1 className="mt-5 text-2xl font-extrabold tracking-tight">Admin login</h1>
              <p className="mt-1 text-sm text-white/55">Sign in to manage Glide Recruit.</p>
              {user && !user.isAdmin && (
                <p className="mt-4 rounded-xl bg-amber-300/10 px-3 py-2 text-sm text-amber-200">
                  You are signed in as {user.email}, which is not an admin account. Sign in with an admin account below.
                </p>
              )}
              <div className="mt-6 space-y-4">
                <Field label="Admin email">
                  <Input icon={Mail} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@company.com" />
                </Field>
                <Field label="Password">
                  <Input
                    icon={Lock}
                    type={show ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    right={
                      <button type="button" onClick={() => setShow((s) => !s)} className="p-2 text-white/40 hover:text-white" aria-label={show ? 'Hide password' : 'Show password'}>
                        {show ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    }
                  />
                </Field>
              </div>
              {error && (
                <p role="alert" className="mt-4 text-sm font-medium text-danger">
                  {error}
                </p>
              )}
              <Button type="submit" loading={busy} className="btn-primary mt-6 w-full">
                Continue
              </Button>
            </form>
          ) : (
            <form onSubmit={submitCode} noValidate>
              <h1 className="mt-5 text-2xl font-extrabold tracking-tight">Check your email</h1>
              <p className="mt-1 text-sm text-white/55">
                We sent a 6-digit code to <b className="text-white">{sentTo}</b>. It expires in 10 minutes.
              </p>
              {devCode && (
                <p className="mt-3 rounded-xl bg-amber-300/10 px-3 py-2 text-sm text-amber-200">
                  Testing mode: your code is <b className="tracking-widest">{devCode}</b>
                </p>
              )}
              <input
                value={code}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setCode(v);
                  setError('');
                }}
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                placeholder="••••••"
                aria-label="6-digit code"
                className="input mt-5 text-center text-2xl font-bold tracking-[0.5em]"
              />
              {error && (
                <p role="alert" className="mt-3 text-sm font-medium text-danger">
                  {error}
                </p>
              )}
              <Button type="submit" loading={busy} className="btn-primary mt-5 w-full">
                Open admin panel
              </Button>
              <div className="mt-4 flex items-center justify-between text-sm">
                <button type="button" onClick={startSecondStep} disabled={busy} className="font-semibold text-brand-500 hover:underline">
                  Send a new code
                </button>
                <button type="button" onClick={useOtherAccount} className="text-white/50 hover:text-white">
                  Use another account
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
