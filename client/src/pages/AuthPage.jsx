import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Building2, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import toast from 'react-hot-toast';
import Background from '../components/Background';
import Logo from '../components/Logo';
import ThemeToggle from '../components/ThemeToggle';
import { Button, Field, Input } from '../components/ui';
import { homePath, useAuth } from '../context/AuthContext';
import { api, cx, errorMessage } from '../lib/api';

const ROLES = [
  { value: 'candidate', label: 'I want a job', sub: 'Get discovered by companies', icon: Briefcase },
  { value: 'company', label: "I'm hiring", sub: 'Swipe through candidates', icon: Building2 },
];

export default function AuthPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  // Links from the landing page can preselect a tab: /auth?mode=login, /auth?role=company
  const [params] = useSearchParams();
  const [mode, setMode] = useState(params.get('mode') === 'login' ? 'login' : 'register');
  const [role, setRole] = useState(params.get('role') === 'company' ? 'company' : 'candidate');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (mode === 'register' && !form.name.trim()) er.name = 'Please enter your name';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) er.email = 'Please enter a valid email';
    if (form.password.length < 6) er.password = 'At least 6 characters';
    setErrors(er);
    if (Object.keys(er).length) return;

    setLoading(true);
    try {
      const { data } =
        mode === 'register'
          ? await api.post('/auth/register', { ...form, role })
          : await api.post('/auth/login', { email: form.email, password: form.password });
      signIn(data);
      toast.success(mode === 'register' ? 'Account created!' : `Welcome back, ${data.user.name.split(' ')[0]}!`);
      navigate(homePath(data.user, data.profile), { replace: true });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-dvh">
      <div className="absolute right-4 top-4 z-30">
        <ThemeToggle />
      </div>
      <Background />
      <div className="mx-auto grid min-h-dvh max-w-6xl items-center gap-10 px-4 py-8 lg:grid-cols-2">
        <motion.section
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="hidden lg:block"
        >
          <Logo animated tagline />
          <h1 className="mt-10 text-5xl font-extrabold leading-[1.05] tracking-tight">
            Hiring at the
            <br />
            speed of a <span className="text-gradient">swipe.</span>
          </h1>
          <p className="mt-5 max-w-md text-lg text-white/55">
            Companies swipe through resumes and 15-second intro videos. Candidates get discovered without sending a hundred applications.
          </p>
          <motion.img
            src="/illustrations/hero-swipe.webp"
            alt="A candidate card being swiped right on a phone"
            width={960}
            height={674}
            className="mt-8 w-full max-w-[460px] select-none"
            draggable={false}
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 160, damping: 20, delay: 0.1 }}
          className="mx-auto w-full max-w-md"
        >
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo animated tagline />
          </div>
          <motion.div layout className="glass rounded-[30px] p-6 shadow-2xl shadow-black/40 sm:p-8">
            <div className="relative mb-7 grid grid-cols-2 rounded-2xl bg-white/[0.05] p-1">
              {['register', 'login'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m);
                    setErrors({});
                  }}
                  className={cx('relative rounded-xl py-2.5 text-sm font-semibold transition-colors', mode === m ? 'text-white' : 'text-white/50')}
                >
                  {mode === m && (
                    <motion.span
                      layoutId="auth-tab"
                      className="absolute inset-0 rounded-xl bg-linear-to-r from-brand-500 to-violet-brand shadow-lg shadow-brand-500/30"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className="relative">{m === 'register' ? 'Create account' : 'Log in'}</span>
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.h2
                key={mode}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="text-2xl font-extrabold"
              >
                {mode === 'register' ? 'Join Swipe Hire' : 'Welcome back'}
              </motion.h2>
            </AnimatePresence>
            <p className="mb-6 mt-1 text-sm text-white/50">
              {mode === 'register' ? 'It takes less than 2 minutes.' : 'Log in to continue where you left off.'}
            </p>

            <form onSubmit={submit} className="space-y-4" noValidate>
              <AnimatePresence initial={false}>
                {mode === 'register' && (
                  <motion.div
                    key="register-fields"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4 overflow-hidden"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      {ROLES.map((r) => {
                        const active = role === r.value;
                        return (
                          <motion.button
                            type="button"
                            key={r.value}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => setRole(r.value)}
                            className={cx(
                              'relative rounded-2xl border p-4 text-left transition-colors',
                              active ? 'border-brand-500/70 bg-brand-500/10' : 'border-white/10 bg-white/[0.03] hover:border-white/20',
                            )}
                          >
                            <motion.span
                              animate={active ? { rotate: [0, -12, 8, 0], scale: [1, 1.15, 1] } : {}}
                              transition={{ duration: 0.5 }}
                              className={cx(
                                'grid h-10 w-10 place-items-center rounded-xl',
                                active ? 'bg-linear-to-br from-brand-500 to-violet-brand' : 'bg-white/[0.06] text-white/60',
                              )}
                            >
                              <r.icon size={19} />
                            </motion.span>
                            <p className="mt-3 text-sm font-bold">{r.label}</p>
                            <p className="text-xs text-white/45">{r.sub}</p>
                          </motion.button>
                        );
                      })}
                    </div>
                    <Field label={role === 'company' ? 'Your name' : 'Full name'} error={errors.name}>
                      <Input icon={User} value={form.name} onChange={set('name')} placeholder="Riya Sharma" autoComplete="name" />
                    </Field>
                  </motion.div>
                )}
              </AnimatePresence>

              <Field label={role === 'company' && mode === 'register' ? 'Work email' : 'Email'} error={errors.email}>
                <Input icon={Mail} type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" autoComplete="email" />
              </Field>
              <Field label="Password" error={errors.password}>
                <Input
                  icon={Lock}
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  placeholder="At least 6 characters"
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  right={
                    <button
                      type="button"
                      onClick={() => setShowPw((s) => !s)}
                      className="grid h-8 w-8 place-items-center rounded-lg text-white/40 hover:text-white"
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />
              </Field>

              <Button type="submit" loading={loading} className="btn-primary mt-2 w-full py-3.5">
                {mode === 'register' ? 'Create account' : 'Log in'}
              </Button>
            </form>
          </motion.div>
        </motion.section>
      </div>
    </div>
  );
}
