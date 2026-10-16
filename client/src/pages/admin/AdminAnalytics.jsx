import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Spinner } from '../../components/ui';
import { api, cx, errorMessage } from '../../lib/api';
import AdminShell, { useLive } from './AdminShell';
import { CHART, DayBars, RankBars } from './AdminCharts';

const nf = new Intl.NumberFormat('en-IN');
const STAGE_LABEL = { shortlisted: 'Shortlisted', contacted: 'Contacted', task: 'Task sent', interview: 'Interview', hired: 'Hired', rejected: 'Rejected' };

function Card({ title, sub, children, className }) {
  return (
    <section className={cx('glass rounded-3xl p-5', className)}>
      <h2 className="font-bold">{title}</h2>
      {sub && <p className="text-sm text-white/50">{sub}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function AdminAnalytics() {
  const [days, setDays] = useState(30);
  const [d, setD] = useState(null);

  useEffect(() => {
    setD(null);
    api
      .get('/admin/analytics', { params: { days } })
      .then(({ data }) => setD(data))
      .catch((err) => toast.error(errorMessage(err)));
  }, [days]);

  useLive(() => api.get('/admin/analytics', { params: { days } }).then(({ data }) => setD(data)).catch(() => {}), { ms: 30000 });

  const sum = (k) => d?.series.reduce((a, x) => a + x[k], 0) ?? 0;
  const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '–');

  return (
    <AdminShell
      title="Analytics"
      subtitle="How the platform is growing and being used."
      actions={
        <div className="flex gap-1 rounded-xl bg-white/[0.06] p-1">
          {[7, 30, 90].map((n) => (
            <button key={n} onClick={() => setDays(n)} className={cx('rounded-lg px-3 py-1.5 text-sm font-semibold', days === n ? 'bg-ink-900 text-white shadow-sm' : 'text-white/60')}>
              {n} days
            </button>
          ))}
        </div>
      }
    >
      {!d ? (
        <Spinner className="py-24" />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ['New candidates', nf.format(sum('candidates'))],
              ['New companies', nf.format(sum('companies'))],
              ['Swipes', nf.format(sum('swipes'))],
              ['Revenue', `₹${nf.format(sum('revenue'))}`],
            ].map(([l, v]) => (
              <div key={l} className="glass rounded-3xl p-5">
                <p className="text-2xl font-extrabold tabular-nums">{v}</p>
                <p className="text-sm text-white/55">
                  {l} · last {days} days
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Sign-ups" sub="New accounts per day">
              <DayBars data={d.series} series={[{ key: 'candidates', label: 'Candidates', color: CHART.green }, { key: 'companies', label: 'Companies', color: CHART.blue }]} />
            </Card>
            <Card title="Swipes per day" sub="Left and right swipes by companies">
              <DayBars data={d.series} series={[{ key: 'swipes', label: 'Swipes', color: CHART.green }]} />
            </Card>
            <Card title="Shortlists per day" sub="Right swipes">
              <DayBars data={d.series} series={[{ key: 'shortlists', label: 'Shortlists', color: CHART.green }]} />
            </Card>
            <Card title="Messages per day" sub="Chat messages between companies and candidates">
              <DayBars data={d.series} series={[{ key: 'messages', label: 'Messages', color: CHART.blue }]} />
            </Card>
            <Card title="Revenue per day" sub="Paid orders (Razorpay and manual), in rupees">
              <DayBars data={d.series} series={[{ key: 'revenue', label: 'Revenue', color: CHART.green }]} format={(v) => `₹${nf.format(v)}`} />
            </Card>
            <Card title="Hiring funnel" sub="All time">
              <div className="mb-4 grid grid-cols-3 gap-2 text-center">
                {[
                  ['Shortlist rate', pct(d.rates.shortlists, d.rates.swipes)],
                  ['Hire rate', pct(d.rates.hired, d.rates.shortlists)],
                  ['Hired', nf.format(d.rates.hired)],
                ].map(([l, v]) => (
                  <div key={l} className="rounded-2xl bg-white/[0.04] p-3">
                    <p className="text-xl font-extrabold">{v}</p>
                    <p className="text-[11px] font-semibold text-white/50">{l}</p>
                  </div>
                ))}
              </div>
              <RankBars items={d.pipeline.map((p) => ({ label: STAGE_LABEL[p.stage], n: p.n }))} />
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card title="Top candidate skills">
              <RankBars items={d.topCandidateSkills} />
            </Card>
            <Card title="Most wanted skills" sub="In open jobs">
              <RankBars items={d.topJobSkills} color={CHART.blue} />
            </Card>
            <Card title="Candidates by city">
              <RankBars items={d.candidatesByCity} />
            </Card>
            <Card title="Open jobs by city">
              <RankBars items={d.jobsByCity} color={CHART.blue} />
            </Card>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
