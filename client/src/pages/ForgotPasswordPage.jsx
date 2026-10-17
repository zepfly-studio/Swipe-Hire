import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, KeyRound, Lock, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import Background from '../components/Background';
import Logo from '../components/Logo';
import { Button, Field, Input } from '../components/ui';
import { homePath, useAuth } from '../context/AuthContext';
import { api, errorMessage } from '../lib/api';

// "Forgot password": email -> 6-digit code sent to it -> code + new password, then signed in.
export default function ForgotPasswordPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get('email') || '');
  const [step, setStep] = useState('email'); // email | reset
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [devCode, setDevCode] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const sendCode = async (e) => {
    e?.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setErrors({ email: 'Enter the email you signed up with' });
    setErrors({});
    setBusy(true);
    try {
      const { data } = await api.post('/auth/password/forgot', { email: email.trim() });
      setDevCode(data.devCode || '');
      setStep('reset');
      toast.success('Check your email for the code');
    } catch (err) {
      setErrors({ [err.response?.data?.field || 'email']: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const reset = async (e) => {
    e.preventDefault();
    const er = {};
    if (!/^\d{6}$/.test(code.trim())) er.code = 'Enter the 6-digit code from the email';
    if (password.length < 6) er.password = 'At least 6 characters';
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const { data } = await api.post('/auth/password/reset', { email: email.trim(), code: code.trim(), password });
      signIn(data);
      toast.success('Password changed. You are logged in.');
      navigate(homePath(data.user, data.profile), { replace: true });
    } catch (err) {
      setErrors({ [err.response?.data?.field || 'code']: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative grid min-h-dvh place-items-center px-4 py-10">
      <Background />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Link to="/" aria-label="Glide Recruit home">
            <Logo />
          </Link>
        </div>
        <div className="glass rounded-[28px] p-6 shadow-xl sm:p-8">
          <span className="grid size-12 place-items-center rounded-2xl bg-brand-500 text-[#fff] shadow-lg shadow-brand-500/25">
            <KeyRound size={24} />
          </span>
          {step === 'email' ? (
            <form onSubmit={sendCode} noValidate>
              <h1 className="mt-5 text-2xl font-extrabold tracking-tight">Forgot password?</h1>
              <p className="mt-1 text-sm text-white/55">Enter your email and we'll send you a code to set a new password.</p>
              <div className="mt-6">
                <Field label="Email" error={errors.email}>
                  <Input icon={Mail} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </Field>
              </div>
              <Button type="submit" loading={busy} className="btn-primary mt-6 w-full py-3.5">
                Send code
              </Button>
            </form>
          ) : (
            <form onSubmit={reset} noValidate>
              <h1 className="mt-5 text-2xl font-extrabold tracking-tight">Set a new password</h1>
              <p className="mt-1 text-sm text-white/55">
                If <b className="text-white/80">{email.trim()}</b> has an account, a 6-digit code is on its way. It expires in 15 minutes.
              </p>
              {devCode && <p className="mt-3 rounded-xl bg-amber-300/10 px-3 py-2 text-sm text-amber-200">Testing mode: your code is {devCode}</p>}
              <div className="mt-6 space-y-4">
                <Field label="Code" error={errors.code}>
                  <Input
                    icon={KeyRound}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="6-digit code"
                    aria-label="6-digit code"
                  />
                </Field>
                <Field label="New password" error={errors.password}>
                  <Input
                    icon={Lock}
                    type={show ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    right={
                      <button type="button" onClick={() => setShow((s) => !s)} className="grid h-8 w-8 place-items-center rounded-lg text-white/40 hover:text-white" aria-label={show ? 'Hide password' : 'Show password'}>
                        {show ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    }
                  />
                </Field>
              </div>
              <Button type="submit" loading={busy} className="btn-primary mt-6 w-full py-3.5">
                Change password
              </Button>
              <button type="button" onClick={() => sendCode()} disabled={busy} className="mt-3 w-full text-center text-sm font-semibold text-white/55 hover:text-white">
                Send a new code
              </button>
            </form>
          )}
        </div>
        <Link to="/auth?mode=login" className="mt-6 flex items-center justify-center gap-1.5 text-sm font-semibold text-white/55 hover:text-white">
          <ArrowLeft size={15} /> Back to log in
        </Link>
      </div>
    </div>
  );
}
