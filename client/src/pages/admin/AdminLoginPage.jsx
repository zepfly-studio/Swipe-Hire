import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import Background from '../../components/Background';
import Logo from '../../components/Logo';
import { Button, Field, Input, Spinner } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { api, errorMessage } from '../../lib/api';

// Separate sign-in for admins at /adminlogin. Any account can try, but only emails listed
// in the server's ADMIN_EMAILS get in; others are signed straight back out.
export default function AdminLoginPage() {
  const { loading, user, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) return <Spinner className="min-h-dvh" />;
  if (user?.isAdmin) return <Navigate to="/admin" replace />;

  const submit = async (e) => {
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
      signIn(data);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative grid min-h-dvh place-items-center px-4 py-10">
      <Background />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <form onSubmit={submit} className="glass rounded-[28px] p-6 shadow-xl sm:p-8" noValidate>
          <span className="grid size-12 place-items-center rounded-2xl bg-brand-500 text-[#fff] shadow-lg shadow-brand-500/25">
            <ShieldCheck size={24} />
          </span>
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
            Log in to admin
          </Button>
        </form>
      </div>
    </div>
  );
}
