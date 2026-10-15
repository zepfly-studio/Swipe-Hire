import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { Spinner } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import AdminShell, { Pager, Pill } from './AdminShell';

const when = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const toneOf = (a) => (/delete|suspend|refund|reject|remove/.test(a) ? 'red' : /settings|admin\./.test(a) ? 'amber' : 'gray');

// Every change made by an admin, newest first.
export default function AdminLogs() {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(q);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    setData(null);
    api
      .get('/admin/logs', { params: { q: query, page } })
      .then(({ data }) => setData(data))
      .catch((err) => toast.error(errorMessage(err)));
  }, [query, page]);

  return (
    <AdminShell title="Activity log" subtitle="Who changed what, and when. Kept for every admin action.">
      <label className="glass relative mb-4 block rounded-3xl p-4">
        <Search size={17} className="pointer-events-none absolute left-7 top-1/2 -translate-y-1/2 text-white/40" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search action, admin email or details" className="input pl-10" aria-label="Search log" />
      </label>
      {!data ? (
        <Spinner className="py-20" />
      ) : !data.logs.length ? (
        <p className="glass rounded-3xl p-10 text-center text-white/50">Nothing logged yet.</p>
      ) : (
        <>
          <div className="glass overflow-hidden rounded-3xl">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-white/[0.08] text-[11px] uppercase tracking-[0.1em] text-white/45">
                  <tr>
                    <th className="px-4 py-3 font-semibold">When</th>
                    <th className="px-4 py-3 font-semibold">Admin</th>
                    <th className="px-4 py-3 font-semibold">Action</th>
                    <th className="px-4 py-3 font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {data.logs.map((l) => (
                    <tr key={l.id}>
                      <td className="whitespace-nowrap px-4 py-3 text-white/60">{when(l.at)}</td>
                      <td className="px-4 py-3">{l.admin}</td>
                      <td className="px-4 py-3">
                        <Pill tone={toneOf(l.action)}>{l.action}</Pill>
                      </td>
                      <td className="px-4 py-3 text-white/75">{l.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <Pager page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
        </>
      )}
    </AdminShell>
  );
}
