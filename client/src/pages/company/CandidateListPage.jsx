import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BadgeCheck, Briefcase, CalendarPlus, ClipboardList, Copy, FileText, Heart, Layers, Mail, MapPin, MessageCircle, Phone, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import CompanyShell from '../../components/CompanyShell';
import Modal from '../../components/Modal';
import Avatar from '../../components/Avatar';
import ResumeViewer from '../../components/ResumeViewer';
import ScheduleInterviewModal from '../../components/ScheduleInterviewModal';
import SendTaskModal from '../../components/SendTaskModal';
import { TaskCard } from '../TasksPage';
import { CandidateDetails, MatchBadge, expLabel } from '../../components/CandidateDetails';
import { Button, ChipSelect, Spinner, StagePill, STAGE_STYLES, Textarea } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { api, cx, errorMessage } from '../../lib/api';
import Illustration from '../../components/Illustration';

const CONFIG = {
  wishlist: {
    endpoint: '/company/wishlist',
    title: 'Wishlist',
    subtitle: 'Candidates you saved to look at again',
    empty: 'Tap the heart on a candidate card to save them here.',
    icon: Heart,
    art: 'empty-wishlist',
  },
  shortlisted: {
    endpoint: '/company/shortlisted',
    title: 'Shortlisted',
    subtitle: 'Everyone you shortlisted. Tap a candidate for full details, message them, send a task or schedule an interview.',
    empty: 'Swipe right on a candidate to shortlist them and unlock their contact details.',
    icon: Users,
    art: 'empty-pipeline',
  },
};

// Pipeline rows are per (candidate, job); wishlist rows are per candidate.
const rowKey = (c) => c.swipeId || c.id;


function ContactRow({ icon: Icon, value, href }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2 text-sm">
      <Icon size={15} className="shrink-0 text-emerald-400" />
      <a href={href} className="min-w-0 flex-1 truncate hover:underline">
        {value}
      </a>
      <button
        onClick={() => navigator.clipboard?.writeText(value).then(() => toast.success('Copied'))}
        className="text-white/40 hover:text-white"
        aria-label="Copy"
      >
        <Copy size={14} />
      </button>
    </div>
  );
}

const STAGE_OPTIONS = ['shortlisted', 'contacted', 'task', 'interview', 'hired', 'rejected'].map((s) => ({
  value: s,
  label: STAGE_STYLES[s].label,
}));

// Stage, private notes and next actions for a shortlisted candidate.
function PipelineControls({ c, onStage, onNotes, onSchedule, onTask }) {
  const [notes, setNotes] = useState(c.notes ?? '');
  const dirty = notes !== (c.notes ?? '');
  return (
    <div className="space-y-4 rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/5">
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">Stage</p>
        <ChipSelect layoutId={`stage-${rowKey(c)}`} options={STAGE_OPTIONS} value={c.stage} onChange={(s) => onStage(c, s)} />
      </div>
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">Private notes</p>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => dirty && onNotes(c, notes)}
          maxLength={2000}
          placeholder="Only your team can see these notes"
        />
        {dirty && <p className="mt-1 text-xs text-white/40">Saves when you click outside the box</p>}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Link to={`/messages?with=${c.id}`} className="btn-ghost justify-center px-2 py-2.5 text-sm">
          <MessageCircle size={16} />
          Message
        </Link>
        <Button className="btn-ghost justify-center px-2 py-2.5 text-sm" onClick={() => onTask(c)}>
          <ClipboardList size={16} />
          Send task
        </Button>
        <Button className="btn-primary justify-center px-2 py-2.5 text-sm" onClick={() => onSchedule(c)}>
          <CalendarPlus size={16} />
          Interview
        </Button>
      </div>
    </div>
  );
}

// Tasks already sent to this candidate, shown in their details.
function CandidateTasks({ candidateId, version }) {
  const [tasks, setTasks] = useState(null);
  const load = () =>
    api
      .get('/tasks', { params: { candidateId } })
      .then(({ data }) => setTasks(data.tasks.filter((t) => t.status !== 'cancelled')))
      .catch(() => setTasks([]));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateId, version]);
  if (!tasks?.length) return null;
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">Tasks</p>
      {tasks.map((t) => (
        <TaskCard key={t.id} task={t} isCompany compact onChanged={load} />
      ))}
    </div>
  );
}

function CandidateModal({ c, onClose, onShortlist, onRemove, onResume, busy, onStage, onNotes, onSchedule, onTask, taskVersion }) {
  return (
    <Modal open={Boolean(c)} onClose={onClose} className="sm:max-w-xl">
      {c && (
        <>
          <div className="flex items-start gap-4 border-b border-white/10 p-5">
            <Avatar src={c.avatarUrl} name={c.name} size="lg" />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xl font-extrabold">{c.name}</h2>
              <p className="truncate text-sm text-white/55">{c.headline}</p>
              <div className="mt-2">
                <MatchBadge score={c.matchScore} />
              </div>
            </div>
            <button onClick={onClose} className="btn-ghost p-2" aria-label="Close">
              <X size={18} />
            </button>
          </div>
          <div className="no-scrollbar flex-1 space-y-6 overflow-y-auto p-5">
            {c.contact && (
              <div className="space-y-2">
                <ContactRow icon={Mail} value={c.contact.email} href={`mailto:${c.contact.email}`} />
                <ContactRow icon={Phone} value={c.contact.phone} href={`tel:${c.contact.phone}`} />
              </div>
            )}
            {c.stage && onStage && <PipelineControls key={rowKey(c)} c={c} onStage={onStage} onNotes={onNotes} onSchedule={onSchedule} onTask={onTask} />}
            {c.stage && onStage && <CandidateTasks candidateId={c.id} version={taskVersion} />}
            {!onStage && c.swipe === 'right' && (
              <Link to={`/messages?with=${c.id}`} className="btn-ghost w-full">
                <MessageCircle size={17} />
                Message
              </Link>
            )}
            <Button className="btn-ghost w-full" onClick={() => onResume(c)}>
              <FileText size={18} />
              View resume
            </Button>
            <CandidateDetails c={c} />
          </div>
          {(onShortlist || onRemove) && (
            <div className="flex gap-3 border-t border-white/10 p-4">
              {onRemove && (
                <Button className="btn-ghost flex-1" onClick={() => onRemove(c)} disabled={busy}>
                  <Heart size={17} />
                  Remove
                </Button>
              )}
              {onShortlist && !c.swipe && (
                <Button className="btn-primary flex-1" onClick={() => onShortlist(c)} loading={busy}>
                  <BadgeCheck size={17} />
                  Shortlist
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

export default function CandidateListPage({ kind }) {
  const cfg = CONFIG[kind];
  const { setProfile } = useAuth();
  const [items, setItems] = useState(null);
  const [open, setOpen] = useState(null);
  const [resume, setResume] = useState(null);
  const [busy, setBusy] = useState(false);
  const [params, setParams] = useSearchParams();
  const jobFilter = kind === 'shortlisted' ? params.get('job') || '' : '';
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    if (kind === 'shortlisted') api.get('/company/jobs').then(({ data }) => setJobs(data.jobs)).catch(() => {});
  }, [kind]);

  useEffect(() => {
    setItems(null);
    api
      .get(cfg.endpoint, { params: jobFilter ? { jobId: jobFilter } : {} })
      .then(({ data }) => setItems(data.candidates))
      .catch((err) => {
        toast.error(errorMessage(err));
        setItems([]);
      });
  }, [cfg.endpoint, jobFilter]);

  const update = (id, patch) => {
    setItems((list) => list.map((c) => (rowKey(c) === id ? { ...c, ...patch } : c)));
    setOpen((o) => ((o && rowKey(o) === id) ? { ...o, ...patch } : o));
  };

  const remove = async (c) => {
    setBusy(true);
    try {
      await api.put(`/company/wishlist/${c.id}`, { wishlisted: false });
      setItems((list) => list.filter((x) => x.id !== c.id));
      setOpen(null);
      toast.success('Removed from wishlist');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const shortlist = async (c) => {
    setBusy(true);
    try {
      const { data } = await api.post('/company/swipe', { candidateId: c.id, action: 'right' });
      setProfile((p) => ({ ...p, swipesLeft: data.swipesLeft }));
      update(c.id, { swipe: 'right', contact: data.contact });
      toast.success(`${c.name.split(' ')[0]} shortlisted!`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const patchPipeline = async (c, patch, okMessage) => {
    const before = { stage: c.stage, notes: c.notes };
    update(rowKey(c), patch);
    try {
      await api.patch(`/company/pipeline/${c.swipeId}`, patch);
      toast.success(okMessage, { id: 'pipeline' });
    } catch (err) {
      update(rowKey(c), before);
      toast.error(errorMessage(err));
    }
  };
  const setStage = (c, stage) => stage !== c.stage && patchPipeline(c, { stage }, `Moved to ${STAGE_STYLES[stage].label}`);
  const setNotes = (c, notes) => patchPipeline(c, { notes }, 'Notes saved');

  const [stageFilter, setStageFilter] = useState('all');
  const [scheduling, setScheduling] = useState(null);
  const [tasking, setTasking] = useState(null);
  const [taskVersion, setTaskVersion] = useState(0);
  const isPipeline = kind === 'shortlisted';
  const counts = items ? Object.fromEntries(STAGE_OPTIONS.map((s) => [s.value, items.filter((c) => c.stage === s.value).length])) : {};
  const visibleItems = isPipeline && stageFilter !== 'all' ? items?.filter((c) => c.stage === stageFilter) : items;

  return (
    <CompanyShell>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight">
            <cfg.icon className="text-brand-500" />
            {cfg.title}
            {items?.length > 0 && <span className="rounded-full bg-white/10 px-3 py-0.5 text-base text-white/60">{items.length}</span>}
          </h1>
          <p className="mt-1 text-white/50">{cfg.subtitle}</p>
        </div>
        {isPipeline && jobs.length > 1 && (
          <label className="relative w-full sm:w-64">
            <Briefcase size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-400" />
            <select
              value={jobFilter}
              onChange={(e) => setParams(e.target.value ? { job: e.target.value } : {})}
              className="input appearance-none py-2.5 pl-10 text-sm font-semibold"
              aria-label="Filter by job"
            >
              <option value="" className="bg-ink-800">All jobs</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id} className="bg-ink-800">
                  {j.title}
                  {j.status !== 'open' ? ` (${j.status})` : ''}
                </option>
              ))}
            </select>
          </label>
        )}
      </motion.div>

      {!items && <Spinner className="py-24" />}

      {items?.length === 0 && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass mx-auto max-w-md rounded-3xl p-10 text-center">
          <Illustration name={cfg.art} />
          <p className="mt-5 text-white/60">{cfg.empty}</p>
          <Link to="/company/swipe" className="btn-primary mt-6">
            <Layers size={18} />
            Start swiping
          </Link>
        </motion.div>
      )}

      {isPipeline && items?.length > 0 && (
        <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4">
          {[{ value: 'all', label: 'All' }, ...STAGE_OPTIONS].map((s) => {
            const n = s.value === 'all' ? items.length : counts[s.value];
            const active = stageFilter === s.value;
            return (
              <button
                key={s.value}
                onClick={() => setStageFilter(s.value)}
                className={cx(
                  'relative flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                  active ? 'text-white' : 'bg-white/[0.05] text-white/55 hover:text-white',
                )}
              >
                {active && (
                  <motion.span layoutId="stage-tab" className="absolute inset-0 rounded-full bg-white/[0.12]" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
                )}
                <span className="relative">{s.label}</span>
                <span className="relative rounded-full bg-white/10 px-1.5 text-xs">{n}</span>
              </button>
            );
          })}
        </div>
      )}

      {isPipeline && items?.length > 0 && visibleItems.length === 0 && (
        <p className="py-16 text-center text-white/45">Nobody in this stage yet.</p>
      )}

      {visibleItems?.length > 0 && (
        <motion.div layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {visibleItems.map((c, i) => (
              <motion.div
                layout
                key={rowKey(c)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setOpen(c))}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 10) * 0.05 } }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ y: -4 }}
                onClick={() => setOpen(c)}
                className="glass cursor-pointer rounded-3xl p-5 text-left transition-colors hover:border-white/20 focus-visible:outline-2 focus-visible:outline-brand-500"
              >
                <div className="flex items-start gap-3">
                  <Avatar src={c.avatarUrl} name={c.name} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{c.name}</p>
                    <p className="truncate text-sm text-white/50">{c.headline}</p>
                  </div>
                  {c.swipe === 'right' && kind === 'wishlist' && <BadgeCheck size={20} className="shrink-0 text-emerald-400" />}
                  {isPipeline && <StagePill stage={c.stage} />}
                  {c.swipe === 'right' || isPipeline ? (
                    <Link
                      to={`/messages?with=${c.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="-mr-1 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-brand-500 transition hover:bg-brand-500 hover:text-white"
                      aria-label={`Message ${c.name}`}
                      title="Message"
                    >
                      <MessageCircle size={17} />
                    </Link>
                  ) : null}
                </div>
                {isPipeline && c.job && (
                  <p className="mt-3 flex items-center gap-1.5 truncate text-xs font-semibold text-violet-300">
                    <Briefcase size={12} />
                    {c.job.title}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <MatchBadge score={c.matchScore} />
                  {c.location && (
                    <span className="chip">
                      <MapPin size={12} />
                      {c.location}
                    </span>
                  )}
                  {c.experienceYears != null && (
                    <span className="chip">
                      <Briefcase size={12} />
                      {expLabel(c.experienceYears)}
                    </span>
                  )}
                </div>
                {c.contact?.email && (
                  <p className="mt-4 flex items-center gap-2 truncate text-sm text-emerald-300">
                    <Mail size={14} />
                    {c.contact.email}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {c.skills?.slice(0, 4).map((s) => (
                    <span key={s} className="rounded-md bg-white/[0.05] px-2 py-0.5 text-xs text-white/60">
                      {s}
                    </span>
                  ))}
                  {c.skills?.length > 4 && <span className="px-1 text-xs text-white/40">+{c.skills.length - 4}</span>}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <CandidateModal
        c={open}
        busy={busy}
        onClose={() => setOpen(null)}
        onResume={setResume}
        onRemove={kind === 'wishlist' ? remove : undefined}
        onShortlist={kind === 'wishlist' ? shortlist : undefined}
        onStage={isPipeline ? setStage : undefined}
        onNotes={setNotes}
        onSchedule={setScheduling}
        onTask={setTasking}
        taskVersion={taskVersion}
      />
      <ResumeViewer url={resume?.resumeUrl} name={resume?.name} onClose={() => setResume(null)} />
      <ScheduleInterviewModal
        candidate={scheduling}
        onClose={() => setScheduling(null)}
        onScheduled={() => scheduling && update(rowKey(scheduling), { stage: 'interview' })}
      />
      <SendTaskModal
        candidate={tasking}
        onClose={() => setTasking(null)}
        onSent={() => {
          if (tasking && ['shortlisted', 'contacted'].includes(tasking.stage)) update(rowKey(tasking), { stage: 'task' });
          setTaskVersion((v) => v + 1);
        }}
      />
    </CompanyShell>
  );
}
