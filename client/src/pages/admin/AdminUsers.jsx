import { useEffect, useState } from 'react';
import { Bell, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import Avatar from '../../components/Avatar';
import Modal from '../../components/Modal';
import { Button, Field, Input, Spinner, Textarea } from '../../components/ui';
import { api, cx, errorMessage } from '../../lib/api';
import AdminShell, { dateOf, ExportButton, lpa, Pager, Pill, useCan } from './AdminShell';
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

// Notification (and optional email) to the selected accounts.
function NotifyModal({ ids, onClose }) {
  const [f, setF] = useState({ title: '', body: '', link: '', email: false });
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/admin/announce', { ...f, audience: 'selected', ids });
      toast.success(`Sent to ${data.sent} people`);
      onClose(true);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={Boolean(ids)} onClose={() => onClose(false)}>
      {ids && (
        <div className="space-y-4 overflow-y-auto p-5">
          <h2 className="text-xl font-extrabold">Notify {ids.length} selected</h2>
          <Field label="Title"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={120} /></Field>
          <Field label="Message" hint="Optional"><Textarea value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} maxLength={1000} /></Field>
          <Field label="Opens page" hint="Optional, e.g. /company/plans"><Input value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={f.email} onChange={(e) => setF({ ...f, email: e.target.checked })} className="size-4 accent-[#0f4d42]" /> Also send by email
          </label>
          <div className="flex gap-2">
            <button className="btn-ghost flex-1" onClick={() => onClose(false)}>Cancel</button>
            <Button className="btn-primary flex-1" loading={busy} disabled={!f.title.trim()} onClick={send}>Send</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function AdminUsers({ role }) {
  const cfg = CONFIG[role];
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [notify, setNotify] = useState(null);
  const [bulkBusy, setBulkBusy] = useState('');
  const can = useCan();

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
      .then(({ data }) => {
        setData(data);
        setSelected(new Set());
      })
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

  const toggle = (id) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const bulk = async (action) => {
    const n = selected.size;
    const ask = { suspend: `Suspend ${n} accounts?`, reinstate: `Reinstate ${n} accounts?`, 'verify-email': `Mark ${n} emails as verified?` }[action];
    if (action === 'delete') {
      if (window.prompt(`Permanently delete ${n} accounts and all their data? Type DELETE to confirm.`) !== 'DELETE') return;
    } else if (!window.confirm(ask)) return;
    setBulkBusy(action);
    try {
      const { data } = await api.post('/admin/users/bulk', { action, ids: [...selected] });
      toast.success(`Done for ${data.done}${data.failed.length ? `, ${data.failed.length} skipped (${data.failed[0].message})` : ''}`);
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBulkBusy('');
    }
  };
  const allOnPage = data?.users.length > 0 && data.users.every((u) => selected.has(u.id));
  const exportKind = role === 'candidate' ? 'candidates' : role === 'company' ? 'companies' : null;

  return (
    <AdminShell title={cfg.title} subtitle={cfg.subtitle} actions={exportKind && <ExportButton kind={exportKind} />}>
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

      {selected.size > 0 && (
        <div className="sticky top-16 z-20 mb-3 flex flex-wrap items-center gap-2 rounded-2xl bg-brand-500 px-4 py-2.5 text-sm text-[#fff] shadow-lg lg:top-3">
          <b className="mr-2">{selected.size} selected</b>
          {can('announce') && <button className="rounded-lg bg-[#fff]/15 px-3 py-1.5 font-semibold hover:bg-[#fff]/25" onClick={() => setNotify([...selected])}><Bell size={14} className="mr-1 inline" />Notify</button>}
          {can('users.manage') && <button className="rounded-lg bg-[#fff]/15 px-3 py-1.5 font-semibold hover:bg-[#fff]/25" disabled={bulkBusy} onClick={() => bulk('suspend')}>Suspend</button>}
          {can('users.manage') && <button className="rounded-lg bg-[#fff]/15 px-3 py-1.5 font-semibold hover:bg-[#fff]/25" disabled={bulkBusy} onClick={() => bulk('reinstate')}>Reinstate</button>}
          {can('users.edit') && <button className="rounded-lg bg-[#fff]/15 px-3 py-1.5 font-semibold hover:bg-[#fff]/25" disabled={bulkBusy} onClick={() => bulk('verify-email')}>Mark email verified</button>}
          {can('users.delete') && <button className="rounded-lg bg-red-600 px-3 py-1.5 font-semibold hover:bg-red-700" disabled={bulkBusy} onClick={() => bulk('delete')}>Delete</button>}
          <button className="ml-auto font-semibold underline-offset-2 hover:underline" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}
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
                    <th className="w-10 py-3 pl-4">
                      <input type="checkbox" checked={allOnPage} onChange={() => setSelected(allOnPage ? new Set() : new Set(data.users.map((u) => u.id)))} className="size-4 accent-[#0f4d42]" aria-label="Select all on this page" />
                    </th>
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
                    <tr key={u.id} onClick={() => setOpen(u.id)} className={cx('cursor-pointer transition-colors hover:bg-white/[0.03]', selected.has(u.id) && 'bg-brand-500/[0.05]')}>
                      <td className="py-3 pl-4" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggle(u.id)} className="size-4 accent-[#0f4d42]" aria-label={`Select ${u.name}`} />
                      </td>
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
      <NotifyModal ids={notify} onClose={(sent) => { setNotify(null); if (sent) setSelected(new Set()); }} />
    </AdminShell>
  );
}
