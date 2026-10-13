import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Briefcase, IndianRupee, Layers, MapPin, Pause, Pencil, Play, Plus, Users, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import CompanyShell from '../../components/CompanyShell';
import JobFormModal from '../../components/JobFormModal';
import { Button, Spinner } from '../../components/ui';
import Illustration from '../../components/Illustration';
import { useAuth } from '../../context/AuthContext';
import { api, cx, errorMessage } from '../../lib/api';

const STATUS = {
  open: { label: 'Hiring', cls: 'bg-emerald-400/15 text-emerald-300' },
  paused: { label: 'Paused', cls: 'bg-amber-300/15 text-amber-200' },
  closed: { label: 'Closed', cls: 'bg-white/5 text-white/40' },
};
const MODE = { onsite: 'On-site', hybrid: 'Hybrid', remote: 'Remote' };

function Stat({ value, label }) {
  return (
    <div className="rounded-xl bg-white/[0.04] px-3 py-2 text-center">
      <p className="text-lg font-extrabold">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">{label}</p>
    </div>
  );
}

function JobCard({ job, onEdit, onStatus, busy }) {
  const s = STATUS[job.status];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cx('glass flex flex-col rounded-3xl p-5', job.status === 'closed' && 'opacity-60')}
    >
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-brand-500 to-violet-brand">
          <Briefcase size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold">{job.title}</p>
          <p className="flex flex-wrap items-center gap-x-2 text-sm text-white/50">
            {job.jobLocation && (
              <span className="flex items-center gap-1"><MapPin size={12} />{job.jobLocation}</span>
            )}
            <span>{MODE[job.workMode]}</span>
            <span className="capitalize">{job.jobType?.replace('-', ' ')}</span>
          </p>
        </div>
        <span className={cx('shrink-0 rounded-full px-2.5 py-1 text-xs font-bold', s.cls)}>{s.label}</span>
      </div>

      <p className="mt-3 flex items-center gap-1 text-sm text-white/60">
        <IndianRupee size={13} />
        {job.salaryMin != null ? `${job.salaryMin}–` : 'Up to '}{job.salaryMax} LPA
        {(job.minExperience != null || job.maxExperience != null) && ` · ${job.minExperience ?? 0}–${job.maxExperience ?? '∞'} yrs`}
        {job.openings > 1 && ` · ${job.openings} openings`}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {job.requiredSkills.slice(0, 6).map((sk) => (
          <span key={sk} className="chip">{sk}</span>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        <Stat value={job.stats.swiped} label="Seen" />
        <Stat value={job.stats.shortlisted} label="Shortlist" />
        <Stat value={job.stats.interviewing} label="Interview" />
        <Stat value={job.stats.hired} label="Hired" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-white/5 pt-4">
        {job.status === 'open' && (
          <Link to={`/company/swipe?job=${job.id}`} className="btn-primary py-2 text-sm">
            <Layers size={15} />
            Swipe
          </Link>
        )}
        <Link to={`/company/shortlisted?job=${job.id}`} className="btn-ghost py-2 text-sm">
          <Users size={15} />
          Shortlisted
        </Link>
        <button onClick={() => onEdit(job)} className="btn-ghost py-2 text-sm">
          <Pencil size={15} />
          Edit
        </button>
        <div className="ml-auto flex gap-2">
          {job.status === 'open' && (
            <Button className="btn-ghost px-3 py-2 text-sm" title="Pause" onClick={() => onStatus(job, 'paused')} loading={busy === job.id + 'paused'}>
              <Pause size={15} />
            </Button>
          )}
          {job.status !== 'open' && (
            <Button className="btn-ghost px-3 py-2 text-sm" title="Reopen" onClick={() => onStatus(job, 'open')} loading={busy === job.id + 'open'}>
              <Play size={15} />
            </Button>
          )}
          {job.status !== 'closed' && (
            <Button className="btn-ghost px-3 py-2 text-sm" title="Close job" onClick={() => onStatus(job, 'closed')} loading={busy === job.id + 'closed'}>
              <XCircle size={15} />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function JobsPage() {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState(null);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = () =>
    api
      .get('/company/jobs')
      .then(({ data }) => setJobs(data.jobs))
      .catch((err) => {
        toast.error(errorMessage(err));
        setJobs([]);
      });
  useEffect(() => {
    load();
  }, []);

  const setStatus = async (job, status) => {
    setBusy(job.id + status);
    try {
      await api.patch(`/company/jobs/${job.id}/status`, { status });
      toast.success(status === 'open' ? 'Job reopened' : status === 'paused' ? 'Job paused' : 'Job closed');
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const open = jobs?.filter((j) => j.status === 'open').length ?? 0;

  return (
    <CompanyShell>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Jobs</h1>
          <p className="mt-1 text-white/50">
            {jobs ? `${open} hiring now` : 'Every job has its own swipe feed and pipeline.'}
          </p>
        </div>
        <Button className="btn-primary" onClick={() => setEditing('new')}>
          <Plus size={18} />
          Post a job
        </Button>
      </div>
      {!jobs && <Spinner className="py-20" />}
      {jobs?.length === 0 && (
        <div className="glass rounded-3xl p-10 text-center">
          <Illustration name="no-jobs" />
          <p className="mt-4 text-white/60">No jobs yet. Post your first one!</p>
        </div>
      )}
      <motion.div layout className="grid gap-4 lg:grid-cols-2">
        <AnimatePresence>
          {jobs?.map((job) => (
            <JobCard key={job.id} job={job} onEdit={setEditing} onStatus={setStatus} busy={busy} />
          ))}
        </AnimatePresence>
      </motion.div>
      <JobFormModal job={editing} defaults={{ location: profile?.location }} onClose={() => setEditing(null)} onSaved={load} />
    </CompanyShell>
  );
}
