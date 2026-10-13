import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarCheck, CalendarClock, CalendarPlus, Clock, MapPin, MessageCircle, Phone, Video, X } from 'lucide-react';
import toast from 'react-hot-toast';
import AppShell from '../components/AppShell';
import Modal from '../components/Modal';
import { Button, Spinner, Textarea, VerifiedBadge } from '../components/ui';
import Illustration from '../components/Illustration';
import { useAuth } from '../context/AuthContext';
import { usePoll } from '../hooks/usePoll';
import { api, cx, errorMessage } from '../lib/api';

const MODE = {
  video: { label: 'Video call', icon: Video },
  phone: { label: 'Phone call', icon: Phone },
  'in-person': { label: 'In person', icon: MapPin },
};

const when = (d) =>
  new Date(d).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

// "Add to Google Calendar" link for a confirmed interview.
function calendarLink(iv) {
  const start = new Date(iv.chosenSlot);
  const end = new Date(start.getTime() + iv.durationMins * 60000);
  const f = (d) => d.toISOString().replace(/[-:]|\.\d{3}/g, '');
  const details = [iv.note, iv.meetingLink && `Join: ${iv.meetingLink}`].filter(Boolean).join('\n');
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Interview: ${iv.with.name}`,
    dates: `${f(start)}/${f(end)}`,
    details,
    location: iv.location || iv.meetingLink || '',
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

function InterviewCard({ iv, isCompany, onChanged, onCancel }) {
  const [picking, setPicking] = useState(null);
  const Mode = MODE[iv.mode];
  const past = iv.chosenSlot && new Date(iv.chosenSlot) < Date.now();

  const accept = async (slot) => {
    setPicking(slot);
    try {
      await api.post(`/interviews/${iv.id}/accept`, { slot });
      toast.success('Interview confirmed! Added to your interviews.');
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setPicking(null);
    }
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-3xl p-5">
      <div className="flex items-start gap-3">
        <span
          className={cx(
            'grid h-11 w-11 shrink-0 place-items-center rounded-2xl',
            iv.status === 'confirmed' ? 'bg-emerald-400/15 text-emerald-300' : iv.status === 'cancelled' ? 'bg-white/5 text-white/30' : 'bg-amber-300/15 text-amber-200',
          )}
        >
          {iv.status === 'confirmed' ? <CalendarCheck size={20} /> : <CalendarClock size={20} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-bold">
            <span className="truncate">{iv.with.name}</span>
            {iv.with.verified && <VerifiedBadge />}
          </p>
          <p className="truncate text-sm text-white/50">{iv.jobTitle ? `For ${iv.jobTitle}` : iv.with.subtitle}</p>
        </div>
        <span
          className={cx(
            'shrink-0 rounded-full px-2.5 py-1 text-xs font-bold',
            iv.status === 'confirmed' ? 'bg-emerald-400/15 text-emerald-300' : iv.status === 'cancelled' ? 'bg-white/5 text-white/40' : 'bg-amber-300/15 text-amber-200',
          )}
        >
          {iv.status === 'proposed' ? (isCompany ? 'Waiting for reply' : 'Pick a time') : iv.status === 'confirmed' ? (past ? 'Done' : 'Confirmed') : 'Cancelled'}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-sm text-white/65">
        <span className="chip"><Mode.icon size={13} />{Mode.label}</span>
        <span className="chip"><Clock size={13} />{iv.durationMins} min</span>
        {iv.location && <span className="chip"><MapPin size={13} />{iv.location}</span>}
      </div>
      {iv.note && <p className="mt-3 rounded-2xl bg-white/[0.04] p-3 text-sm text-white/70">“{iv.note}”</p>}

      {iv.status === 'confirmed' && (
        <div className="mt-4 rounded-2xl bg-emerald-400/[0.07] p-4 ring-1 ring-emerald-400/20">
          <p className="text-lg font-extrabold text-emerald-300">{when(iv.chosenSlot)}</p>
          {!past && (
            <div className="mt-3 flex flex-wrap gap-2">
              {iv.meetingLink && (
                <a href={iv.meetingLink} target="_blank" rel="noreferrer" className="btn-primary py-2 text-sm">
                  <Video size={16} />
                  Join video call
                </a>
              )}
              <a href={calendarLink(iv)} target="_blank" rel="noreferrer" className="btn-ghost py-2 text-sm">
                <CalendarPlus size={16} />
                Add to calendar
              </a>
            </div>
          )}
        </div>
      )}

      {iv.status === 'proposed' && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-white/40">
            {isCompany ? 'Times you offered' : 'Choose a time that suits you'}
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {iv.slots.map((s) =>
              isCompany ? (
                <span key={s} className="rounded-xl bg-white/[0.05] px-3 py-2.5 text-center text-sm font-semibold">{when(s)}</span>
              ) : (
                <Button
                  key={s}
                  className="btn-ghost justify-center py-2.5 text-sm hover:border-brand-500/60 hover:bg-brand-500/10"
                  disabled={new Date(s) < Date.now() || Boolean(picking)}
                  loading={picking === s}
                  onClick={() => accept(s)}
                >
                  {when(s)}
                </Button>
              ),
            )}
          </div>
        </div>
      )}

      {iv.status !== 'cancelled' && !past && (
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <Link to={`/messages?with=${iv.with.id}`} className="flex items-center gap-1.5 font-semibold text-white/60 hover:text-white">
            <MessageCircle size={15} />
            {isCompany ? 'Message candidate' : 'Ask for another time'}
          </Link>
          <button onClick={() => onCancel(iv)} className="flex items-center gap-1.5 font-semibold text-white/40 hover:text-brand-400">
            <X size={15} />
            Cancel interview
          </button>
        </div>
      )}
    </motion.div>
  );
}

function CancelModal({ iv, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    setSaving(true);
    try {
      await api.post(`/interviews/${iv.id}/cancel`, { reason });
      toast.success('Interview cancelled');
      onDone();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal open={Boolean(iv)} onClose={onClose}>
      {iv && (
        <div className="space-y-4 p-6">
          <h2 className="text-xl font-extrabold">Cancel interview with {iv.with.name}?</h2>
          <p className="text-sm text-white/55">They will be notified. You can agree on a new time in chat.</p>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="Reason (optional)" />
          <div className="flex gap-3">
            <Button className="btn-ghost flex-1" onClick={onClose}>Keep it</Button>
            <Button className="btn-primary flex-1" onClick={submit} loading={saving}>Cancel interview</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function InterviewsPage() {
  const { user } = useAuth();
  const isCompany = user.role === 'company';
  const [items, setItems] = useState(null);
  const [cancelling, setCancelling] = useState(null);

  const load = () => api.get('/interviews').then(({ data }) => setItems(data.interviews)).catch(() => setItems((i) => i ?? []));
  usePoll(load, 30000);

  const now = Date.now();
  const groups = items && [
    {
      title: isCompany ? 'Waiting for the candidate' : 'Needs your reply',
      list: items.filter((i) => i.status === 'proposed'),
    },
    {
      title: 'Upcoming',
      list: items.filter((i) => i.status === 'confirmed' && new Date(i.chosenSlot) >= now).sort((a, b) => new Date(a.chosenSlot) - new Date(b.chosenSlot)),
    },
    {
      title: 'Past & cancelled',
      list: items.filter((i) => i.status === 'cancelled' || (i.status === 'confirmed' && new Date(i.chosenSlot) < now)),
    },
  ];

  return (
    <AppShell>
      <h1 className="mb-1 text-3xl font-extrabold tracking-tight">Interviews</h1>
      <p className="mb-8 text-white/50">
        {isCompany ? 'Invite candidates from your Shortlisted page or from chat.' : 'Companies that want to meet you will appear here.'}
      </p>
      {!items && <Spinner className="py-20" />}
      {items?.length === 0 && (
        <div className="glass mx-auto max-w-md rounded-3xl p-10 text-center">
          <Illustration name="no-interviews" />
          <p className="mt-4 text-white/60">No interviews yet.</p>
          {isCompany && (
            <Link to="/company/shortlisted" className="btn-primary mt-5">
              Open shortlisted
            </Link>
          )}
        </div>
      )}
      <div className="space-y-10">
        {groups?.map(
          (g) =>
            g.list.length > 0 && (
              <section key={g.title}>
                <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-white/40">
                  {g.title} · {g.list.length}
                </h2>
                <div className="grid gap-4 lg:grid-cols-2">
                  {g.list.map((iv) => (
                    <InterviewCard key={iv.id} iv={iv} isCompany={isCompany} onChanged={load} onCancel={setCancelling} />
                  ))}
                </div>
              </section>
            ),
        )}
      </div>
      <CancelModal iv={cancelling} onClose={() => setCancelling(null)} onDone={load} />
    </AppShell>
  );
}
