import { useEffect, useState } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import Illustration from '../../components/Illustration';
import { Button, Spinner, Textarea } from '../../components/ui';
import { api, cx, errorMessage } from '../../lib/api';
import AdminShell, { dateOf, Pager, Pill, useLive } from './AdminShell';
import UserDetail from './UserDetail';

const TABS = [['open', 'Open'], ['answered', 'Answered'], ['closed', 'Closed'], ['', 'All']];
const tone = { open: 'amber', answered: 'blue', closed: 'gray' };
const time = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export default function AdminTickets() {
  const [status, setStatus] = useState('open');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [current, setCurrent] = useState(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState('');
  const [user, setUser] = useState(null);

  const load = (quiet) =>
    api
      .get('/admin/tickets', { params: { status, page } })
      .then(({ data }) => setData(data))
      .catch((err) => quiet || toast.error(errorMessage(err)));
  useLive(() => load(true));
  useEffect(() => {
    setData(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page]);

  // The open conversation picks up new messages too (the reply being typed is kept).
  useLive(() => current && api.get(`/admin/tickets/${current.id}`).then(({ data }) => setCurrent(data.ticket)).catch(() => {}));

  const openTicket = (id) =>
    api
      .get(`/admin/tickets/${id}`)
      .then(({ data }) => {
        setCurrent(data.ticket);
        setReply('');
      })
      .catch((err) => toast.error(errorMessage(err)));

  const send = async (close) => {
    if (!reply.trim()) return toast.error('Write a reply first');
    setBusy(close ? 'close' : 'send');
    try {
      const { data } = await api.post(`/admin/tickets/${current.id}/reply`, { text: reply, close });
      setCurrent(data.ticket);
      setReply('');
      toast.success(close ? 'Replied and closed' : 'Reply sent');
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy('');
    }
  };
  const setTicketStatus = async (s) => {
    await api.patch(`/admin/tickets/${current.id}`, { status: s }).catch((err) => toast.error(errorMessage(err)));
    setCurrent((c) => ({ ...c, status: s }));
    load();
  };

  return (
    <AdminShell title="Support" subtitle="Help requests from candidates and companies. Replies are emailed and shown in their Help & support page.">
      {current ? (
        <div className="glass rounded-3xl p-5">
          <button onClick={() => setCurrent(null)} className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-white/60 hover:text-white">
            <ArrowLeft size={16} /> All requests
          </button>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold">{current.subject}</h2>
              <p className="text-sm text-white/55">
                <button onClick={() => setUser(current.user.id)} className="font-semibold text-brand-500 hover:underline">
                  {current.user.name}
                </button>{' '}
                · {current.user.email} · {current.category}
              </p>
            </div>
            <div className="flex gap-2">
              <Pill tone={tone[current.status]}>{current.status}</Pill>
              {current.status !== 'closed' ? (
                <button className="btn-ghost px-3 py-1.5 text-sm" onClick={() => setTicketStatus('closed')}>
                  Close
                </button>
              ) : (
                <button className="btn-ghost px-3 py-1.5 text-sm" onClick={() => setTicketStatus('open')}>
                  Reopen
                </button>
              )}
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {current.messages.map((m, i) => (
              <div key={i} className={cx('max-w-[85%] rounded-2xl px-4 py-3 text-sm', m.from === 'admin' ? 'ml-auto bg-brand-500/10 ring-1 ring-brand-500/15' : 'bg-white/[0.05]')}>
                <p className="mb-1 text-xs font-bold text-white/50">
                  {m.from === 'admin' ? m.author || 'Support' : current.user.name} · {time(m.at)}
                </p>
                <p className="whitespace-pre-wrap">{m.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-5">
            <Textarea value={reply} onChange={(e) => setReply(e.target.value)} maxLength={3000} placeholder="Write a reply…" className="min-h-28" />
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <Button className="btn-ghost text-sm" loading={busy === 'close'} onClick={() => send(true)}>
                Reply & close
              </Button>
              <Button className="btn-primary text-sm" loading={busy === 'send'} onClick={() => send(false)}>
                <Send size={15} /> Send reply
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {TABS.map(([v, l]) => (
              <button key={l} onClick={() => { setStatus(v); setPage(1); }} className={cx('rounded-full px-3.5 py-1.5 text-sm font-semibold', status === v ? 'bg-brand-500 text-[#fff]' : 'bg-white/[0.06] text-white/60 hover:text-white')}>
                {l}
              </button>
            ))}
          </div>
          {!data ? (
            <Spinner className="py-20" />
          ) : !data.tickets.length ? (
            <div className="glass rounded-3xl p-10 text-center">
              <Illustration name="support" />
              <p className="mt-4 text-white/55">No {status} requests.</p>
            </div>
          ) : (
            <>
              <div className="glass divide-y divide-white/[0.06] overflow-hidden rounded-3xl">
                {data.tickets.map((t) => (
                  <button key={t.id} onClick={() => openTicket(t.id)} className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-white/[0.03]">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{t.subject}</p>
                      <p className="truncate text-sm text-white/55">
                        {t.user.name} · {t.last}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Pill tone={tone[t.status]}>{t.status}</Pill>
                      <span className="text-[11px] text-white/40">{dateOf(t.updatedAt)}</span>
                    </div>
                  </button>
                ))}
              </div>
              <Pager page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
            </>
          )}
        </>
      )}
      <UserDetail id={user} onClose={() => setUser(null)} />
    </AdminShell>
  );
}
