import { useEffect, useState } from 'react';
import { Bell, Megaphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Field, Input, Textarea } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import AdminShell, { dateOf, useCan } from './AdminShell';

const AUDIENCE = { all: 'Everyone', candidates: 'All candidates', companies: 'All companies (owners and recruiters)' };

// Send an in-app notification (and optionally an email) to a group of users.
export default function AdminAnnounce() {
  const can = useCan();
  const [form, setForm] = useState({ audience: 'all', title: '', body: '', link: '', email: false });
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState([]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e }));

  const loadHistory = () => can('logs') && api.get('/admin/logs', { params: { q: 'announce' } }).then(({ data }) => setHistory(data.logs.filter((l) => l.action === 'announce'))).catch(() => {});
  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = async () => {
    if (!form.title.trim()) return toast.error('Add a title');
    if (!window.confirm(`Send "${form.title}" to ${AUDIENCE[form.audience].toLowerCase()}${form.email ? ' by notification and email' : ''}?`)) return;
    setBusy(true);
    try {
      const { data } = await api.post('/admin/announce', form);
      toast.success(`Sent to ${data.sent} people`);
      setForm({ audience: form.audience, title: '', body: '', link: '', email: false });
      loadHistory();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminShell title="Announcements" subtitle="Tell users about new features, offers or downtime. They see it in the notification bell; email is optional.">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <section className="glass space-y-4 rounded-3xl p-5">
          <Field label="Send to" as="div">
            <div className="grid grid-cols-3 gap-2">
              {[['all', 'Everyone'], ['candidates', 'Candidates'], ['companies', 'Companies']].map(([v, l]) => (
                <button key={v} type="button" onClick={() => setForm((f) => ({ ...f, audience: v }))} className={`rounded-xl py-2 text-sm font-semibold ${form.audience === v ? 'bg-brand-500 text-[#fff]' : 'bg-white/[0.06] text-white/60'}`}>
                  {l}
                </button>
              ))}
            </div>
          </Field>
          <p className="-mt-2 text-xs text-white/50">{AUDIENCE[form.audience]}. To message specific people, select them in Candidates or Companies and use “Notify”.</p>
          <Field label="Title">
            <Input value={form.title} onChange={set('title')} maxLength={120} placeholder="e.g. New: Growth plan with 350 swipes" />
          </Field>
          <Field label="Message" hint="Optional">
            <Textarea value={form.body} onChange={set('body')} maxLength={1000} placeholder="A few lines about it" />
          </Field>
          <Field label="Opens page" hint="Optional, a page on this site, e.g. /company/plans">
            <Input value={form.link} onChange={set('link')} placeholder="/company/plans" />
          </Field>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={form.email} onChange={set('email')} className="size-4 accent-[#0f4d42]" />
            Also send by email
          </label>
          <Button className="btn-primary w-full" loading={busy} onClick={send}>
            <Megaphone size={17} /> Send announcement
          </Button>
        </section>
        <div className="space-y-4">
          <section className="glass rounded-3xl p-5">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-white/45">Preview</p>
            <div className="flex gap-3 rounded-2xl bg-brand-500/[0.06] p-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-500/15 text-brand-500">
                <Bell size={17} />
              </span>
              <div className="min-w-0">
                <p className="font-bold">{form.title || 'Your title'}</p>
                <p className="line-clamp-2 text-sm text-white/60">{form.body || 'Your message'}</p>
                <p className="mt-0.5 text-xs text-white/40">just now</p>
              </div>
            </div>
          </section>
          {history.length > 0 && (
            <section className="glass rounded-3xl p-5">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-white/45">Sent before</p>
              <ul className="space-y-2 text-sm">
                {history.slice(0, 8).map((h) => (
                  <li key={h.id} className="rounded-xl bg-white/[0.04] px-3 py-2">
                    <p className="font-semibold">{h.summary}</p>
                    <p className="text-xs text-white/45">
                      {dateOf(h.at)} · {h.admin}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
