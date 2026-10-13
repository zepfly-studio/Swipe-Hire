import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Ban, CalendarClock, ClipboardList, ExternalLink, FolderGit2, Globe, Link2, MessageCircle, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import AppShell from '../components/AppShell';
import Avatar from '../components/Avatar';
import Illustration from '../components/Illustration';
import { localInputValue } from '../components/ScheduleInterviewModal';
import { Button, Field, Input, Spinner, Textarea, VerifiedBadge } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { usePoll } from '../hooks/usePoll';
import { api, cx, errorMessage } from '../lib/api';

const STATUS = {
  assigned: { label: 'Waiting', cls: 'bg-amber-300/15 text-amber-200' },
  submitted: { label: 'Submitted', cls: 'bg-emerald-400/15 text-emerald-300' },
  overdue: { label: 'Deadline passed', cls: 'bg-brand-500/15 text-brand-400' },
  cancelled: { label: 'Cancelled', cls: 'bg-white/5 text-white/40' },
};

const when = (d) => new Date(d).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

// "2 days 4 h left" / "45 min left"
function timeLeft(due) {
  const ms = new Date(due) - Date.now();
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3600000);
  if (h >= 24) return `${Math.floor(h / 24)} day${h >= 48 ? 's' : ''}${h % 24 ? ` ${h % 24} h` : ''} left`;
  if (h >= 1) return `${h} h left`;
  return `${Math.max(1, Math.round(ms / 60000))} min left`;
}

function LinkRow({ icon: Icon, label, href }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2 text-sm hover:bg-white/[0.07]"
    >
      <Icon size={15} className="shrink-0 text-violet-300" />
      <span className="shrink-0 font-semibold">{label}</span>
      <span className="min-w-0 flex-1 truncate text-white/55">{href.replace(/^https?:\/\//, '')}</span>
      <ExternalLink size={14} className="shrink-0 text-white/40" />
    </a>
  );
}

function SubmitForm({ task, onDone }) {
  const [form, setForm] = useState({
    liveUrl: task.submission?.liveUrl ?? '',
    repoUrl: task.submission?.repoUrl ?? '',
    note: task.submission?.note ?? '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: undefined }));
  };
  const submit = async () => {
    if (!form.liveUrl.trim() && !form.repoUrl.trim()) return setErrors({ liveUrl: 'Add your live link or GitHub repo link' });
    setSaving(true);
    try {
      await api.post(`/tasks/${task.id}/submit`, form);
      toast.success(task.submission ? 'Submission updated' : 'Task submitted! The company has been notified.');
      onDone();
    } catch (err) {
      const field = err.response?.data?.field;
      if (field) setErrors({ [field]: errorMessage(err) });
      else toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="space-y-4 rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Live link" error={errors.liveUrl}>
          <Input icon={Globe} value={form.liveUrl} onChange={set('liveUrl')} placeholder="my-app.vercel.app" />
        </Field>
        <Field label="GitHub repo" error={errors.repoUrl}>
          <Input icon={FolderGit2} value={form.repoUrl} onChange={set('repoUrl')} placeholder="github.com/you/project" />
        </Field>
      </div>
      <Field label="Note for the company" hint="Optional">
        <Textarea value={form.note} onChange={set('note')} maxLength={1000} placeholder="Login: demo@test.com / demo123" />
      </Field>
      <Button className="btn-primary w-full sm:w-auto" onClick={submit} loading={saving}>
        <Send size={17} />
        {task.submission ? 'Update submission' : 'Submit task'}
      </Button>
    </div>
  );
}

function ExtendDeadline({ task, onDone }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(() => localInputValue(new Date(Math.max(Date.now(), new Date(task.dueAt)) + 2 * 86400000)));
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/tasks/${task.id}`, { dueAt: new Date(value).toISOString() });
      toast.success('Deadline updated');
      setOpen(false);
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-ghost py-2 text-sm">
        <CalendarClock size={15} />
        Change deadline
      </button>
    );
  }
  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <input type="datetime-local" value={value} min={localInputValue(new Date())} onChange={(e) => setValue(e.target.value)} className="input flex-1 py-2" aria-label="New deadline" />
      <Button className="btn-primary py-2 text-sm" onClick={save} loading={saving}>
        Save
      </Button>
      <button onClick={() => setOpen(false)} className="btn-ghost py-2 text-sm">
        Cancel
      </button>
    </div>
  );
}

// One task. Company: candidate, submission, deadline/cancel. Candidate: brief + submit form.
export function TaskCard({ task, isCompany, onChanged, compact = false }) {
  const s = STATUS[task.status] ?? STATUS.assigned;
  const left = timeLeft(task.dueAt);
  const canSubmit = !isCompany && ['assigned', 'submitted'].includes(task.status) && left;
  const [expanded, setExpanded] = useState(!isCompany && task.status === 'assigned');

  const cancel = async () => {
    if (!window.confirm(`Cancel "${task.title}"? The candidate will be told they don't need to submit it.`)) return;
    try {
      await api.post(`/tasks/${task.id}/cancel`);
      toast.success('Task cancelled');
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={cx('glass rounded-3xl', compact ? 'p-4' : 'p-5')}>
      {!compact && (
        <div className="mb-4 flex items-center gap-3">
          <Avatar src={task.with.avatarUrl} name={task.with.name} company={!isCompany} size="md" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate font-bold">
              {task.with.name}
              {task.with.verified && <VerifiedBadge />}
            </p>
            <p className="truncate text-sm text-white/50">{task.jobTitle ? `For ${task.jobTitle}` : task.with.subtitle}</p>
          </div>
          <Link to={`/messages?with=${task.with.id}`} className="btn-ghost p-2.5" aria-label={`Message ${task.with.name}`} title="Message">
            <MessageCircle size={17} />
          </Link>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="flex items-center gap-2 text-lg font-extrabold">
          <ClipboardList size={18} className="shrink-0 text-brand-500" />
          {task.title}
        </h3>
        <span className={cx('rounded-full px-2.5 py-1 text-xs font-bold', s.cls)}>{s.label}</span>
      </div>
      <p className={cx('mt-1 flex items-center gap-1.5 text-sm', left && left.includes('min') ? 'font-semibold text-brand-400' : 'text-white/55')}>
        <CalendarClock size={14} />
        Due {when(task.dueAt)}
        {left && task.status !== 'cancelled' && <span className="font-semibold">· {left}</span>}
      </p>

      <button onClick={() => setExpanded((v) => !v)} className="mt-3 text-sm font-semibold text-brand-400 hover:text-brand-500">
        {expanded ? 'Hide details' : 'Show task details'}
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <p className="mt-3 whitespace-pre-wrap break-words rounded-2xl bg-white/[0.03] p-4 text-sm leading-relaxed text-white/75">{task.description}</p>
            {task.briefUrl && (
              <div className="mt-2">
                <LinkRow icon={Link2} label="Reference" href={task.briefUrl} />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {task.submission && (
        <div className="mt-4 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">
            {isCompany ? 'Submission' : 'Your submission'} · {when(task.submission.at)}
          </p>
          <LinkRow icon={Globe} label="Live" href={task.submission.liveUrl} />
          <LinkRow icon={FolderGit2} label="GitHub" href={task.submission.repoUrl} />
          {task.submission.note && <p className="whitespace-pre-wrap break-words rounded-xl bg-white/[0.04] px-3 py-2 text-sm text-white/70">{task.submission.note}</p>}
        </div>
      )}

      {canSubmit && (
        <div className="mt-4">
          <SubmitForm task={task} onDone={onChanged} />
        </div>
      )}
      {!isCompany && task.status === 'overdue' && (
        <p className="mt-4 rounded-xl bg-brand-500/10 px-3 py-2 text-sm text-brand-400">The deadline has passed. Message the company if you need more time.</p>
      )}

      {isCompany && task.status !== 'cancelled' && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
          <ExtendDeadline task={task} onDone={onChanged} />
          <button onClick={cancel} className="btn-ghost py-2 text-sm text-white/60">
            <Ban size={15} />
            Cancel task
          </button>
        </div>
      )}
    </motion.div>
  );
}

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'assigned', label: 'Waiting' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'overdue', label: 'Deadline passed' },
];

export default function TasksPage() {
  const { user } = useAuth();
  const isCompany = user.role === 'company';
  const [tasks, setTasks] = useState(null);
  const [filter, setFilter] = useState('all');

  const load = () =>
    api
      .get('/tasks')
      .then(({ data }) => setTasks(data.tasks))
      .catch((err) => {
        toast.error(errorMessage(err), { id: 'tasks' });
        setTasks((t) => t ?? []);
      });
  usePoll(load, 30000);

  const active = tasks?.filter((t) => t.status !== 'cancelled' || isCompany) ?? [];
  const visible = filter === 'all' ? active : active.filter((t) => t.status === filter);

  return (
    <AppShell>
      <h1 className="mb-1 text-3xl font-extrabold tracking-tight">Tasks</h1>
      <p className="mb-6 text-white/50">
        {isCompany
          ? 'Assignments you sent to shortlisted candidates. Send one from the Shortlisted page.'
          : 'Assignments from companies. Submit your live link and GitHub repo before the deadline.'}
      </p>
      {!tasks && <Spinner className="py-20" />}
      {tasks?.length === 0 && (
        <div className="glass mx-auto max-w-md rounded-3xl p-10 text-center">
          <Illustration name="no-jobs" />
          <p className="mt-4 text-white/60">{isCompany ? 'No tasks sent yet.' : 'No tasks yet. When a company sends you one, it shows up here.'}</p>
          {isCompany && (
            <Link to="/company/shortlisted" className="btn-primary mt-5">
              Open shortlisted
            </Link>
          )}
        </div>
      )}
      {active.length > 0 && (
        <>
          <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4">
            {FILTERS.map((f) => {
              const n = f.value === 'all' ? active.length : active.filter((t) => t.status === f.value).length;
              return (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={cx(
                    'flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                    filter === f.value ? 'bg-white/[0.12] text-white' : 'bg-white/[0.05] text-white/55 hover:text-white',
                  )}
                >
                  {f.label}
                  <span className="rounded-full bg-white/10 px-1.5 text-xs">{n}</span>
                </button>
              );
            })}
          </div>
          {visible.length === 0 && <p className="py-12 text-center text-white/45">Nothing here.</p>}
          <div className="grid gap-4 lg:grid-cols-2">
            {visible.map((t) => (
              <TaskCard key={t.id} task={t} isCompany={isCompany} onChanged={load} />
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
