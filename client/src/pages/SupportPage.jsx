import { useEffect, useState } from 'react';
import { ArrowLeft, LifeBuoy, Plus, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import AppShell from '../components/AppShell';
import Illustration from '../components/Illustration';
import { Button, Field, Input, Select, Spinner, Textarea } from '../components/ui';
import { api, cx, errorMessage } from '../lib/api';

const CATEGORIES = { account: 'Account & login', payment: 'Payments & credits', bug: 'Something is not working', other: 'Something else' };
const STATUS = { open: ['Waiting for reply', 'bg-amber-300/15 text-amber-200'], answered: ['Answered', 'bg-sky-400/10 text-sky-300'], closed: ['Closed', 'bg-white/[0.07] text-white/60'] };
const when = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

// Help & support: users write to the Glide Recruit team and see replies here.
export default function SupportPage() {
  const [tickets, setTickets] = useState(null);
  const [current, setCurrent] = useState(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ subject: '', category: 'Account & login', message: '' });
  const [errors, setErrors] = useState({});
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () =>
    api
      .get('/support/tickets')
      .then(({ data }) => {
        setTickets(data.tickets);
        setCurrent((c) => (c ? data.tickets.find((t) => t.id === c.id) || null : null));
      })
      .catch(() => setTickets([]));
  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    const e = {};
    if (!form.subject.trim()) e.subject = 'Please add a subject';
    if (!form.message.trim()) e.message = 'Please describe how we can help';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const category = Object.keys(CATEGORIES).find((k) => CATEGORIES[k] === form.category) || 'other';
      const { data } = await api.post('/support/tickets', { subject: form.subject, message: form.message, category });
      toast.success('Sent! We usually reply within one working day.');
      setForm({ subject: '', category: 'Account & login', message: '' });
      setCreating(false);
      await load();
      setCurrent(data.ticket);
    } catch (err) {
      const field = err.response?.data?.field;
      if (field) setErrors({ [field]: errorMessage(err) });
      else toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  const send = async () => {
    if (!reply.trim()) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/support/tickets/${current.id}/reply`, { text: reply });
      setCurrent(data.ticket);
      setReply('');
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight">
              <LifeBuoy className="text-brand-500" /> Help & support
            </h1>
            <p className="mt-1 text-white/55">Write to the Glide Recruit team. We reply here and by email.</p>
          </div>
          {!creating && !current && (
            <button className="btn-primary" onClick={() => setCreating(true)}>
              <Plus size={17} /> New request
            </button>
          )}
        </div>

        {creating ? (
          <section className="glass space-y-4 rounded-3xl p-5 sm:p-6">
            <button onClick={() => setCreating(false)} className="flex items-center gap-1.5 text-sm font-semibold text-white/60 hover:text-white">
              <ArrowLeft size={16} /> Back
            </button>
            <Field label="What is it about?">
              <Select options={Object.values(CATEGORIES)} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </Field>
            <Field label="Subject" error={errors.subject}>
              <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} maxLength={120} placeholder="e.g. My video won't upload" />
            </Field>
            <Field label="Message" error={errors.message}>
              <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} maxLength={3000} className="min-h-36" placeholder="Tell us what happened and what you expected." />
            </Field>
            <Button className="btn-primary w-full" loading={busy} onClick={create}>
              <Send size={16} /> Send to support
            </Button>
          </section>
        ) : current ? (
          <section className="glass rounded-3xl p-5 sm:p-6">
            <button onClick={() => setCurrent(null)} className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-white/60 hover:text-white">
              <ArrowLeft size={16} /> All requests
            </button>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 className="text-xl font-extrabold">{current.subject}</h2>
              <span className={cx('rounded-full px-2.5 py-1 text-xs font-bold', STATUS[current.status][1])}>{STATUS[current.status][0]}</span>
            </div>
            <div className="mt-5 space-y-3">
              {current.messages.map((m, i) => (
                <div key={i} className={cx('max-w-[85%] rounded-2xl px-4 py-3 text-sm', m.from === 'user' ? 'ml-auto bg-brand-500/10 ring-1 ring-brand-500/15' : 'bg-white/[0.05]')}>
                  <p className="mb-1 text-xs font-bold text-white/50">
                    {m.from === 'user' ? 'You' : 'Glide Recruit support'} · {when(m.at)}
                  </p>
                  <p className="whitespace-pre-wrap">{m.text}</p>
                </div>
              ))}
            </div>
            <div className="mt-5">
              <Textarea value={reply} onChange={(e) => setReply(e.target.value)} maxLength={3000} placeholder={current.status === 'closed' ? 'Write to reopen this request…' : 'Write a reply…'} />
              <div className="mt-3 flex justify-end">
                <Button className="btn-primary" loading={busy} disabled={!reply.trim()} onClick={send}>
                  <Send size={16} /> Send
                </Button>
              </div>
            </div>
          </section>
        ) : !tickets ? (
          <Spinner className="py-20" />
        ) : !tickets.length ? (
          <div className="glass rounded-3xl p-10 text-center">
            <Illustration name="support" />
            <p className="mt-4 font-bold">No requests yet</p>
            <p className="mt-1 text-sm text-white/55">Stuck with something? Send us a request and we’ll help.</p>
            <button className="btn-primary mt-5" onClick={() => setCreating(true)}>
              <Plus size={17} /> New request
            </button>
          </div>
        ) : (
          <div className="glass divide-y divide-white/[0.06] overflow-hidden rounded-3xl">
            {tickets.map((t) => (
              <button key={t.id} onClick={() => setCurrent(t)} className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-white/[0.03]">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{t.subject}</p>
                  <p className="truncate text-sm text-white/55">{t.messages.at(-1)?.text}</p>
                </div>
                <span className={cx('shrink-0 rounded-full px-2.5 py-1 text-xs font-bold', STATUS[t.status][1])}>{STATUS[t.status][0]}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
