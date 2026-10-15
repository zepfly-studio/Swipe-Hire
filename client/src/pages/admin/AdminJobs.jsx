import { useEffect, useState } from 'react';
import { BadgeCheck, Search, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Spinner } from '../../components/ui';
import { api, cx, errorMessage } from '../../lib/api';
import AdminShell, { dateOf, lpa, Pager, Pill } from './AdminShell';
import UserDetail from './UserDetail';

const STATUSES = [['', 'All'], ['open', 'Open'], ['paused', 'Paused'], ['closed', 'Closed']];
const tone = { open: 'green', paused: 'amber', closed: 'gray' };

// Every job on the platform; admins can pause, close, reopen or delete one.
export default function AdminJobs() {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [company, setCompany] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(q);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [q]);
  const load = () =>
    api
      .get('/admin/jobs', { params: { q: query, status, page } })
      .then(({ data }) => setData(data))
      .catch((err) => toast.error(errorMessage(err)));
  useEffect(() => {
    setData(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, status, page]);

  const setJobStatus = async (j, next) => {
    try {
      await api.patch(`/admin/jobs/${j.id}`, { status: next });
      setData((d) => ({ ...d, jobs: d.jobs.map((x) => (x.id === j.id ? { ...x, status: next } : x)) }));
      toast.success(`Job ${next === 'open' ? 'reopened' : next}`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };
  const remove = async (j) => {
    if (!window.confirm(`Delete "${j.title}" at ${j.company.name}? Shortlists made for it stay in the company's pipeline.`)) return;
    try {
      await api.delete(`/admin/jobs/${j.id}`);
      toast.success('Job deleted');
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <AdminShell title="Jobs" subtitle="Every job posted by every company.">
      <div className="glass mb-4 space-y-3 rounded-3xl p-4">
        <label className="relative block">
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search job title, company, city or skill" className="input pl-10" aria-label="Search jobs" />
        </label>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map(([v, label]) => (
            <button
              key={v || 'all'}
              onClick={() => {
                setStatus(v);
                setPage(1);
              }}
              className={cx('rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors', status === v ? 'bg-brand-500 text-[#fff]' : 'bg-white/[0.06] text-white/60 hover:text-white')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {!data ? (
        <Spinner className="py-20" />
      ) : !data.jobs.length ? (
        <p className="glass rounded-3xl p-10 text-center text-white/50">No jobs match.</p>
      ) : (
        <>
          <div className="grid gap-3 lg:grid-cols-2">
            {data.jobs.map((j) => (
              <div key={j.id} className="glass rounded-3xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold">{j.title}</p>
                    <button onClick={() => setCompany(j.company.id)} className="flex items-center gap-1 truncate text-sm font-semibold text-brand-500 hover:underline">
                      {j.company.name}
                      {j.company.verified && <BadgeCheck size={14} className="text-sky-400" />}
                    </button>
                  </div>
                  <Pill tone={tone[j.status]}>{j.status}</Pill>
                </div>
                <p className="mt-2 text-sm text-white/60">
                  {[j.jobLocation, j.workMode, j.jobType].filter(Boolean).join(' · ')} · {lpa(j.salaryMin, j.salaryMax)} · {j.minExperience ?? 0}–{j.maxExperience ?? '∞'} yrs · {j.openings} opening
                  {j.openings === 1 ? '' : 's'}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {j.requiredSkills.slice(0, 6).map((s) => (
                    <span key={s} className="rounded-lg bg-sky-400/10 px-2 py-0.5 text-xs font-semibold text-sky-400">
                      {s}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/55">
                  <span>
                    <b className="text-white">{j.stats.seen}</b> seen
                  </span>
                  <span>
                    <b className="text-white">{j.stats.shortlisted}</b> shortlisted
                  </span>
                  <span>
                    <b className="text-white">{j.stats.hired}</b> hired
                  </span>
                  <span className="ml-auto">Posted {dateOf(j.createdAt)}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-white/[0.06] pt-3">
                  {j.status !== 'open' && (
                    <button className="btn-ghost px-3 py-1.5 text-sm" onClick={() => setJobStatus(j, 'open')}>
                      Reopen
                    </button>
                  )}
                  {j.status === 'open' && (
                    <button className="btn-ghost px-3 py-1.5 text-sm" onClick={() => setJobStatus(j, 'paused')}>
                      Pause
                    </button>
                  )}
                  {j.status !== 'closed' && (
                    <button className="btn-ghost px-3 py-1.5 text-sm" onClick={() => setJobStatus(j, 'closed')}>
                      Close
                    </button>
                  )}
                  <button className="ml-auto flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold text-danger hover:bg-red-500/10" onClick={() => remove(j)}>
                    <Trash2 size={15} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Pager page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
        </>
      )}
      <UserDetail id={company} onClose={() => setCompany(null)} onChanged={load} />
    </AdminShell>
  );
}
