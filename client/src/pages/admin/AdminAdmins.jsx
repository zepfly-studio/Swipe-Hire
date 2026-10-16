import { useEffect, useState } from 'react';
import { Trash2, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Field, Input, Spinner } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { api, errorMessage } from '../../lib/api';
import AdminShell, { Pill, useLive } from './AdminShell';

const ROLES = {
  super: 'Everything, including settings, plans and the admin team. Set in the server’s ADMIN_EMAILS.',
  moderator: 'Suspends accounts, handles reports, reviews videos and resumes, approves jobs and company verification, reads chats.',
  support: 'Answers help requests, edits profiles, resets passwords, marks emails verified, handles reports.',
  finance: 'Payments, refunds, manual payments, swipe credits and CSV exports.',
};

export default function AdminAdmins() {
  const { user } = useAuth();
  const [list, setList] = useState(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('moderator');
  const [busy, setBusy] = useState(false);

  const load = (quiet) => api.get('/admin/admins').then(({ data }) => setList(data.admins)).catch((err) => quiet || toast.error(errorMessage(err)));
  useLive(() => load(true));
  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    setBusy(true);
    try {
      await api.post('/admin/admins', { email, role });
      toast.success(`${email} is now a ${role}`);
      setEmail('');
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  const remove = (a) =>
    window.confirm(`Remove admin access for ${a.email}? Their normal account stays.`) &&
    api.delete(`/admin/admins/${a.id}`).then(() => {
      toast.success('Admin access removed');
      load();
    }).catch((err) => toast.error(errorMessage(err)));

  return (
    <AdminShell title="Admin team" subtitle="Who can open this panel and what each role may do.">
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <section className="glass rounded-3xl p-5">
          {!list ? (
            <Spinner className="py-10" />
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {list.map((a) => (
                <li key={a.email} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">
                      {a.name} {a.email === user?.email && <span className="text-xs font-semibold text-white/45">(you)</span>}
                    </p>
                    <p className="truncate text-sm text-white/55">{a.email}</p>
                  </div>
                  <Pill tone={a.role === 'super' ? 'amber' : 'blue'}>{a.role}</Pill>
                  {a.fixed ? (
                    <span className="w-8" title="Set in the server environment" />
                  ) : (
                    <button onClick={() => remove(a)} className="rounded-lg p-1.5 text-danger hover:bg-red-500/10" aria-label={`Remove ${a.email}`}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
        <div className="space-y-4">
          <section className="glass space-y-3 rounded-3xl p-5">
            <h2 className="font-bold">Add an admin</h2>
            <p className="text-sm text-white/55">The person must already have a Glide Recruit account with a verified email.</p>
            <Field label="Their email">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" />
            </Field>
            <Field label="Role">
              <div className="grid grid-cols-3 gap-2">
                {['moderator', 'support', 'finance'].map((r) => (
                  <button key={r} onClick={() => setRole(r)} className={`rounded-xl py-2 text-sm font-semibold capitalize ${role === r ? 'bg-brand-500 text-[#fff]' : 'bg-white/[0.06] text-white/60'}`}>
                    {r}
                  </button>
                ))}
              </div>
            </Field>
            <Button className="btn-primary w-full" loading={busy} disabled={!email} onClick={add}>
              <UserPlus size={16} /> Add admin
            </Button>
          </section>
          <section className="glass rounded-3xl p-5">
            <h2 className="mb-2 font-bold">Roles</h2>
            <ul className="space-y-2 text-sm">
              {Object.entries(ROLES).map(([r, t]) => (
                <li key={r}>
                  <b className="capitalize">{r}:</b> <span className="text-white/60">{t}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
