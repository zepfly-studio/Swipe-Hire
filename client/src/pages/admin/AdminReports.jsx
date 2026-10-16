import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import Illustration from '../../components/Illustration';
import { Spinner } from '../../components/ui';
import { api, cx, errorMessage } from '../../lib/api';
import AdminShell, { dateOf, Pager, Pill, useLive } from './AdminShell';
import UserDetail from './UserDetail';

const REASONS = { fake: 'Fake profile', spam: 'Spam', abuse: 'Abusive behaviour', scam: 'Scam / asks for money', inappropriate: 'Inappropriate content', other: 'Other' };
const TABS = [['open', 'Open'], ['resolved', 'Resolved'], ['dismissed', 'Dismissed'], ['', 'All']];

export default function AdminReports() {
  const [status, setStatus] = useState('open');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);

  const load = (quiet) =>
    api
      .get('/admin/reports', { params: { status, page } })
      .then(({ data }) => setData(data))
      .catch((err) => quiet || toast.error(errorMessage(err)));
  useLive(() => load(true));
  useEffect(() => {
    setData(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page]);

  const decide = async (r, next) => {
    const resolution = window.prompt(next === 'resolved' ? 'What did you do? (e.g. "Suspended the account")' : 'Why is it dismissed? (optional)', '');
    if (resolution === null) return;
    try {
      await api.patch(`/admin/reports/${r.id}`, { status: next, resolution });
      toast.success(next === 'resolved' ? 'Report resolved' : 'Report dismissed');
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <AdminShell title="Reports" subtitle="Users reporting fake profiles, spam, scams or abuse. Open the reported account to suspend or delete it.">
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map(([v, l]) => (
          <button key={l} onClick={() => { setStatus(v); setPage(1); }} className={cx('rounded-full px-3.5 py-1.5 text-sm font-semibold', status === v ? 'bg-brand-500 text-[#fff]' : 'bg-white/[0.06] text-white/60 hover:text-white')}>
            {l}
          </button>
        ))}
      </div>
      {!data ? (
        <Spinner className="py-20" />
      ) : !data.reports.length ? (
        <div className="glass rounded-3xl p-10 text-center">
          <Illustration name="reports" />
          <p className="mt-4 text-white/55">No {status || ''} reports.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {data.reports.map((r) => (
              <div key={r.id} className="glass rounded-3xl p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={r.reason === 'scam' || r.reason === 'abuse' ? 'red' : 'amber'}>{REASONS[r.reason]}</Pill>
                  <Pill tone={r.status === 'open' ? 'amber' : r.status === 'resolved' ? 'green' : 'gray'}>{r.status}</Pill>
                  {r.targetReports > 1 && <Pill tone="red">{r.targetReports} reports on this account</Pill>}
                  <span className="ml-auto text-xs text-white/45">{dateOf(r.createdAt)}</span>
                </div>
                <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <b>{r.reporter.name}</b>
                  <span className="text-white/45">({r.reporter.role})</span>
                  <ArrowRight size={14} className="text-white/40" />
                  <button onClick={() => setOpen(r.target.id)} className="font-bold text-brand-500 hover:underline">
                    {r.target.name}
                  </button>
                  <span className="text-white/45">({r.target.role || 'deleted'})</span>
                </p>
                {r.details && <p className="mt-2 rounded-xl bg-white/[0.04] p-3 text-sm text-white/75">“{r.details}”</p>}
                {r.resolution && (
                  <p className="mt-2 text-sm text-white/55">
                    <b>{r.handledBy || 'Admin'}:</b> {r.resolution}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.target.id && r.target.role && (
                    <button className="btn-ghost px-3 py-1.5 text-sm" onClick={() => setOpen(r.target.id)}>
                      Open account
                    </button>
                  )}
                  {r.status === 'open' ? (
                    <>
                      <button className="btn-primary px-3 py-1.5 text-sm" onClick={() => decide(r, 'resolved')}>
                        Mark resolved
                      </button>
                      <button className="btn-ghost px-3 py-1.5 text-sm" onClick={() => decide(r, 'dismissed')}>
                        Dismiss
                      </button>
                    </>
                  ) : (
                    <button className="btn-ghost px-3 py-1.5 text-sm" onClick={() => api.patch(`/admin/reports/${r.id}`, { status: 'open' }).then(load)}>
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Pager page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
        </>
      )}
      <UserDetail id={open} onClose={() => setOpen(null)} onChanged={load} />
    </AdminShell>
  );
}
