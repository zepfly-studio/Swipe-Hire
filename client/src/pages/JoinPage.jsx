import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, User, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import Background from '../components/Background';
import Logo from '../components/Logo';
import { Button, Field, Input, Spinner } from '../components/ui';
import { homePath, useAuth } from '../context/AuthContext';
import { api, errorMessage } from '../lib/api';

// Accept a team invite: the recruiter only picks a name and password.
export default function JoinPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', password: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get(`/auth/invite/${encodeURIComponent(token)}`)
      .then(({ data }) => setInvite(data))
      .catch((err) => setError(errorMessage(err)));
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Please enter your name');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setSaving(true);
    try {
      const { data } = await api.post('/auth/accept-invite', { token, ...form });
      signIn(data);
      toast.success(`Welcome to ${invite.companyName}!`);
      navigate(homePath(data.user, data.profile), { replace: true });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative grid min-h-dvh place-items-center px-4 py-10">
      <Background />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo animated tagline />
        </div>
        <div className="glass rounded-[30px] p-6 sm:p-8">
          {!invite && !error && <Spinner className="py-10" />}
          {error && (
            <div className="text-center">
              <h1 className="text-xl font-extrabold">Invite not valid</h1>
              <p className="mt-2 text-white/55">{error}</p>
              <Link to="/auth" className="btn-ghost mt-6">Go to login</Link>
            </div>
          )}
          {invite && (
            <form onSubmit={submit} className="space-y-4">
              <div className="text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-linear-to-br from-brand-500 to-violet-brand">
                  <Users size={24} />
                </span>
                <h1 className="mt-4 text-2xl font-extrabold">Join {invite.companyName}</h1>
                <p className="mt-1 text-sm text-white/55">as a recruiter · {invite.email}</p>
              </div>
              <Field label="Your name">
                <Input icon={User} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Your full name" autoComplete="name" />
              </Field>
              <Field label="Choose a password">
                <Input
                  icon={Lock}
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                />
              </Field>
              <Button type="submit" className="btn-primary w-full" loading={saving}>
                Join team
              </Button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
