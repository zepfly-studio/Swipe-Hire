import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Spinner } from '../../components/ui';
import { api, cx, errorMessage } from '../../lib/api';
import AdminShell, { dateOf, ExportButton, Pager, Pill, useCan, useLive } from './AdminShell';
import UserDetail from './UserDetail';

const FILTERS = [
  ['', '', 'All'],
  ['paid', '', 'Paid'],
  ['created', '', 'Not completed'],
  ['refunded', '', 'Refunded'],
  ['', 'razorpay', 'Razorpay'],
  ['', 'manual', 'Manual'],
  ['', 'demo', 'Demo'],
];

export default function AdminPayments() {
  const [filter, setFilter] = useState(0);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [company, setCompany] = useState(null);
  const [status, mode] = FILTERS[filter];
  const can = useCan();

  const load = (quiet) =>
    api
      .get('/admin/payments', { params: { status, mode, page } })
      .then(({ data }) => setData(data))
      .catch((err) => quiet || toast.error(errorMessage(err)));
  useLive(() => load(true));
  useEffect(() => {
    setData(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, mode, page]);

  const refund = async (p) => {
    if (!window.confirm(`Mark ₹${p.amount} from ${p.company.name} as refunded?\n\nReturn the money yourself from the ${p.mode === 'razorpay' ? 'Razorpay dashboard' : 'bank / UPI'}.`)) return;
    const removeSwipes = window.confirm(`Also take back the ${p.swipes} swipes from ${p.company.name}?`);
    const note = window.prompt('Note (optional)', '') ?? '';
    try {
      await api.post(`/admin/payments/${p.id}/refund`, { removeSwipes, note });
      toast.success('Marked as refunded');
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <AdminShell title="Payments" subtitle="Swipe-credit orders from every company. Demo orders are test purchases with no real money. Manual payments are recorded from a company's page." actions={<ExportButton kind="payments" />}>
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f, i) => (
          <button
            key={f[2]}
            onClick={() => {
              setFilter(i);
              setPage(1);
            }}
            className={cx('rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors', filter === i ? 'bg-brand-500 text-[#fff]' : 'bg-white/[0.06] text-white/60 hover:text-white')}
          >
            {f[2]}
          </button>
        ))}
      </div>
      {!data ? (
        <Spinner className="py-20" />
      ) : !data.payments.length ? (
        <p className="glass rounded-3xl p-10 text-center text-white/50">No payments yet.</p>
      ) : (
        <>
          <div className="glass overflow-hidden rounded-3xl">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-white/[0.08] text-[11px] uppercase tracking-[0.1em] text-white/45">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Company</th>
                    <th className="px-4 py-3 font-semibold">Plan</th>
                    <th className="px-4 py-3 text-right font-semibold">Amount</th>
                    <th className="px-4 py-3 text-right font-semibold">Swipes</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Order</th>
                    <th />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {data.payments.map((p) => (
                    <tr key={p.id}>
                      <td className="whitespace-nowrap px-4 py-3 text-white/70">{dateOf(p.createdAt)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setCompany(p.company.id)} className="font-bold text-brand-500 hover:underline">
                          {p.company.name}
                        </button>
                      </td>
                      <td className="px-4 py-3 capitalize">{p.plan}</td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums">₹{p.amount}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{p.swipes}</td>
                      <td className="px-4 py-3">
                        <span className="flex gap-1">
                          <Pill tone={p.status === 'paid' ? 'green' : p.status === 'refunded' ? 'red' : 'gray'}>{p.status === 'paid' ? 'Paid' : p.status === 'refunded' ? 'Refunded' : 'Not completed'}</Pill>
                          {p.mode !== 'razorpay' && <Pill tone="amber">{p.mode}</Pill>}
                          {p.couponCode && <Pill tone="blue">{p.couponCode}</Pill>}
                        </span>
                      </td>
                      <td className="max-w-[180px] truncate px-4 py-3 font-mono text-xs text-white/50" title={p.paymentId || p.orderId}>
                        {p.paymentId || p.orderId}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {p.status === 'paid' && can('credits') && (
                          <button className="rounded-lg px-2 py-1 text-xs font-semibold text-danger hover:bg-red-500/10" onClick={() => refund(p)}>
                            Refund
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <Pager page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
        </>
      )}
      <UserDetail id={company} onClose={() => setCompany(null)} />
    </AdminShell>
  );
}
