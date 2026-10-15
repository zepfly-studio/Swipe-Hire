import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import toast from 'react-hot-toast';
import Avatar from '../../components/Avatar';
import { Spinner } from '../../components/ui';
import { api, cx, errorMessage } from '../../lib/api';
import AdminShell, { dateOf, lpa, Pager, Pill } from './AdminShell';
import UserDetail from './UserDetail';

const CONFIG = {
  candidate: {
    title: 'Candidates',
    subtitle: 'Every job seeker on the platform.',
    search: 'Search name, email, role, city, skill or phone',
    filters: [['all', 'All'], ['live', 'Live'], ['incomplete', 'Incomplete'], ['hidden', 'Hidden'], ['unverified', 'Email not verified'], ['suspended', 'Suspended']],
  },
  company: {
    title: 'Companies',
    subtitle: 'Company accounts (owners). Open one to see its team, jobs, credits and payments.',
    search: 'Search company, owner name, email, city or industry',
    filters: [['all', 'All'], ['verified-company', 'Verified'], ['pending-verification', 'Pending verification'], ['incomplete', 'Not set up'], ['unverified', 'Email not verified'], ['suspended', 'Suspended']],
  },
  recruiter: {
    title: 'Recruiters',
    subtitle: 'Team members invited by a company owner.',
    search: 'Search name, email or company',
    filters: [['all', 'All'], ['suspended', 'Suspended']],
  },
};

function Status({ u, role }) {
  if (u.suspended) return <Pill tone="red">Suspended</Pill>;
  if (!u.emailVerified) return <Pill tone="amber">Email not verified</Pill>;
  if (role === 'candidate') {
    if (u.step < 3) return <Pill tone="amber">Step {u.step + 1} of 4</Pill>;
    return u.openToWork ? <Pill tone="green">Live</Pill> : <Pill>Hidden</Pill>;
  }
  if (role === 'company') {
    if (!u.completed) return <Pill tone="amber">Not set up</Pill>;
    if (u.verification === 'verified') return <Pill tone="blue">Verified</Pill>;
    if (u.verification === 'pending') return <Pill tone="amber">Pending</Pill>;
    return <Pill tone="green">Active</Pill>;
  }
  return <Pill tone="green">Active</Pill>;
}

export default function AdminUsers({ role }) {
  const cfg = CONFIG[role];
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);

  // Search waits for a pause in typing.
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(q);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const load = () =>
    api
      .get('/admin/users', { params: { role, status, q: query, page } })
      .then(({ data }) => setData(data))
      .catch((err) => toast.error(errorMessage(err)));
  useEffect(() => {
    setData(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, status, query, page]);
  useEffect(() => {
    setStatus('all');
    setQ('');
    setPage(1);
  }, [role]);

  return (
    <AdminShell title={cfg.title} subtitle={cfg.subtitle}>
      <div className="glass mb-4 space-y-3 rounded-3xl p-4">
        <label className="relative block">
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={cfg.search} className="input pl-10" aria-label="Search" />
        </label>
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {cfg.filters.map(([v, label]) => (
            <button
              key={v}
              onClick={() => {
                setStatus(v);
                setPage(1);
              }}
              className={cx('shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors', status === v ? 'bg-brand-500 text-[#fff]' : 'bg-white/[0.06] text-white/60 hover:text-white')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {!data ? (
        <Spinner className="py-20" />
      ) : !data.users.length ? (
        <p className="glass rounded-3xl p-10 text-center text-white/50">No {cfg.title.toLowerCase()} match.</p>
      ) : (
        <>
          <div className="glass overflow-hidden rounded-3xl">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-white/[0.08] text-[11px] uppercase tracking-[0.1em] text-white/45">
                  <tr>
                    <th className="px-4 py-3 font-semibold">{role === 'company' ? 'Company' : 'Name'}</th>
                    {role === 'candidate' && (
                      <>
                        <th className="px-4 py-3 font-semibold">Role & city</th>
                        <th className="px-4 py-3 font-semibold">Exp · salary</th>
                        <th className="px-4 py-3 text-right font-semibold">Shortlists</th>
                      </>
                    )}
                    {role === 'company' && (
                      <>
                        <th className="px-4 py-3 font-semibold">Owner</th>
                        <th className="px-4 py-3 text-right font-semibold">Open jobs</th>
                        <th className="px-4 py-3 text-right font-semibold">Shortlists</th>
                        <th className="px-4 py-3 text-right font-semibold">Credits</th>
                      </>
                    )}
                    {role === 'recruiter' && <th className="px-4 py-3 font-semibold">Company</th>}
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {data.users.map((u) => (
                    <tr key={u.id} onClick={() => setOpen(role === 'recruiter' ? u.id : u.id)} className="cursor-pointer transition-colors hover:bg-white/[0.03]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar src={u.avatarUrl} name={role === 'company' ? u.companyName || u.name : u.name} size="sm" company={role === 'company'} />
                          <div className="min-w-0">
                            <p className="truncate font-bold">{role === 'company' ? u.companyName || 'Not set up yet' : u.name}</p>
                            <p className="truncate text-xs text-white/50">{role === 'company' ? [u.industry, u.location].filter(Boolean).join(' · ') || '–' : u.email}</p>
                          </div>
                        </div>
                      </td>
                      {role === 'candidate' && (
                        <>
                          <td className="px-4 py-3">
                            <p className="truncate font-semibold">{u.headline || '–'}</p>
                            <p className="text-xs text-white/50">{u.location || '–'}</p>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {u.experienceYears != null ? (u.experienceYears ? `${u.experienceYears} yrs` : 'Fresher') : '–'}
                            <p className="text-xs text-white/50">{u.expectedSalary != null ? lpa(u.expectedSalary) : '–'}</p>
                          </td>
                          <td className="px-4 py-3 text-right font-bold tabular-nums">{u.shortlists}</td>
                        </>
                      )}
                      {role === 'company' && (
                        <>
                          <td className="px-4 py-3">
                            <p className="truncate font-semibold">{u.name}</p>
                            <p className="truncate text-xs text-white/50">{u.email}</p>
                          </td>
                          <td className="px-4 py-3 text-right font-bold tabular-nums">{u.openJobs}</td>
                          <td className="px-4 py-3 text-right font-bold tabular-nums">{u.shortlists}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{u.swipesLeft ?? '–'}</td>
                        </>
                      )}
                      {role === 'recruiter' && <td className="px-4 py-3 font-semibold">{u.companyName || '–'}</td>}
                      <td className="px-4 py-3">
                        <Status u={u} role={role} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-white/60">{dateOf(u.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <Pager page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
        </>
      )}
      <UserDetail id={open} onClose={() => setOpen(null)} onChanged={load} />
    </AdminShell>
  );
}
