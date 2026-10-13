import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Copy, Crown, Mail, Trash2, UserPlus, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import CompanyShell from '../../components/CompanyShell';
import { Button, Field, Input, Spinner } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';

const initials = (name) => name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

export default function TeamPage() {
  const [team, setTeam] = useState(null);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [inviting, setInviting] = useState(false);
  const [lastLink, setLastLink] = useState(null);

  const load = () =>
    api
      .get('/team')
      .then(({ data }) => setTeam(data))
      .catch((err) => toast.error(errorMessage(err)));
  useEffect(() => {
    load();
  }, []);

  const invite = async (e) => {
    e.preventDefault();
    setError('');
    setInviting(true);
    try {
      const { data } = await api.post('/team/invite', { email });
      toast.success(`Invite sent to ${email}`);
      setLastLink(data.devLink ? { email, link: data.devLink } : null);
      setEmail('');
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setInviting(false);
    }
  };

  const removeMember = async (m) => {
    if (!window.confirm(`Remove ${m.name} from your team? They will lose access immediately.`)) return;
    try {
      await api.delete(`/team/members/${m.id}`);
      toast.success(`${m.name} removed`);
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const cancelInvite = async (i) => {
    await api.delete(`/team/invites/${i.id}`).catch(() => {});
    load();
  };

  return (
    <CompanyShell>
      <div className="mx-auto max-w-2xl">
        <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight">
          <Users className="text-brand-500" />
          Team
        </h1>
        <p className="mt-1 mb-8 text-white/50">
          Recruiters on your team share jobs, swipes, pipeline and chats. Up to 10 people.
        </p>

        {!team && <Spinner className="py-20" />}

        {team?.isOwner && (
          <form onSubmit={invite} className="glass mb-6 rounded-3xl p-5">
            <p className="mb-3 flex items-center gap-2 font-bold">
              <UserPlus size={18} className="text-brand-400" />
              Invite a recruiter
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <Field error={error} className="flex-1">
                <Input icon={Mail} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colleague@company.com" aria-label="Email to invite" />
              </Field>
              <Button type="submit" className="btn-primary" loading={inviting} disabled={!email}>
                Send invite
              </Button>
            </div>
            {lastLink && (
              <div className="mt-3 rounded-xl bg-amber-300/10 p-3 text-xs text-amber-100">
                Development mode (no email server). Share this link with {lastLink.email}:
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(lastLink.link).then(() => toast.success('Link copied'))}
                  className="mt-1 flex w-full items-center gap-2 break-all text-left font-mono text-amber-200 hover:underline"
                >
                  <Copy size={12} className="shrink-0" />
                  {lastLink.link}
                </button>
              </div>
            )}
          </form>
        )}

        {team && (
          <section className="glass rounded-3xl p-2">
            <AnimatePresence initial={false}>
              {team.members.map((m) => (
                <motion.div key={m.id} layout exit={{ opacity: 0, x: 30 }} className="flex items-center gap-3 rounded-2xl p-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-brand-500 to-violet-brand text-sm font-extrabold">
                    {initials(m.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {m.name}
                      {m.you && <span className="ml-2 text-xs font-medium text-white/40">(you)</span>}
                    </p>
                    <p className="truncate text-sm text-white/45">{m.email}</p>
                  </div>
                  {m.role === 'owner' ? (
                    <span className="flex items-center gap-1 rounded-full bg-amber-300/15 px-2.5 py-1 text-xs font-bold text-amber-200">
                      <Crown size={12} />
                      Owner
                    </span>
                  ) : (
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold text-white/70">Recruiter</span>
                  )}
                  {team.isOwner && m.role !== 'owner' && (
                    <button onClick={() => removeMember(m)} className="rounded-lg p-2 text-white/35 hover:text-brand-400" aria-label={`Remove ${m.name}`}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </motion.div>
              ))}
              {team.invites.map((i) => (
                <motion.div key={i.id} layout exit={{ opacity: 0, x: 30 }} className="flex items-center gap-3 rounded-2xl p-3 opacity-70">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-dashed border-white/25 text-white/40">
                    <Mail size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{i.email}</p>
                    <p className="text-sm text-white/45">Invite pending</p>
                  </div>
                  {team.isOwner && (
                    <button onClick={() => cancelInvite(i)} className="rounded-lg p-2 text-white/35 hover:text-brand-400" aria-label={`Cancel invite for ${i.email}`}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </section>
        )}
        {team && !team.isOwner && <p className="mt-4 text-center text-sm text-white/40">Only the account owner can invite or remove people.</p>}
      </div>
    </CompanyShell>
  );
}
