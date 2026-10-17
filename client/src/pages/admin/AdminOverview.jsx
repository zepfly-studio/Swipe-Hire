import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Briefcase, Building2, CalendarClock, IndianRupee, MessageCircle, ShieldAlert, Users } from 'lucide-react';
import { Spinner } from '../../components/ui';
import { cx } from '../../lib/api';
import AdminShell, { dateOf, Pill, useAdminStats } from './AdminShell';
import UserDetail from './UserDetail';

// Chart colours validated for colour-blind separation (green vs blue).
const SERIES = [
  { key: 'candidates', label: 'Candidates', color: '#12866a' },
  { key: 'companies', label: 'Companies', color: '#2563eb' },
];
const nf = new Intl.NumberFormat('en-IN');

function Tile({ icon: Icon, label, value, sub, to, tone = 'brand' }) {
  const body = (
    <>
      <span className={cx('grid size-10 place-items-center rounded-xl', tone === 'blue' ? 'bg-sky-400/10 text-sky-400' : tone === 'amber' ? 'bg-amber-300/15 text-amber-300' : 'bg-brand-500/10 text-brand-500')}>
        <Icon size={19} />
      </span>
      <p className="mt-3 text-3xl font-extrabold tabular-nums">{value}</p>
      <p className="text-sm font-semibold text-white/70">{label}</p>
      {sub && <p className="mt-1 text-xs text-white/45">{sub}</p>}
    </>
  );
  return to ? (
    <Link to={to} className="glass block rounded-3xl p-5 transition hover:-translate-y-0.5 hover:shadow-md">
      {body}
    </Link>
  ) : (
    <div className="glass rounded-3xl p-5">{body}</div>
  );
}

// Stacked daily sign-ups for the last 14 days, with a hover tooltip per day.
function SignupChart({ days }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...days.map((d) => d.candidates + d.companies));
  const H = 160;
  const label = (day) => new Date(day + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs font-semibold text-white/60">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: s.color }} /> {s.label}
          </span>
        ))}
      </div>
      <div className="relative">
        <div className="flex items-end gap-1.5 border-b border-white/10" style={{ height: H }} role="img" aria-label="Sign-ups per day for the last 14 days">
          {days.map((d, i) => {
            const total = d.candidates + d.companies;
            return (
              <div
                key={d.day}
                className="group relative flex h-full flex-1 cursor-default flex-col justify-end"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                <div className={cx('flex flex-col-reverse gap-[2px] transition-opacity', hover != null && hover !== i && 'opacity-50')}>
                  {SERIES.map((s) =>
                    d[s.key] ? (
                      <div key={s.key} className="w-full first:rounded-b-none last:rounded-t-[4px]" style={{ height: Math.max(3, (d[s.key] / max) * (H - 8)), background: s.color }} />
                    ) : null,
                  )}
                  {total === 0 && <div className="h-[2px] w-full bg-white/10" />}
                </div>
                {hover === i && (
                  <div className={cx('pointer-events-none absolute bottom-full z-10 mb-2 w-36 rounded-xl border border-white/10 bg-ink-900 p-2.5 text-xs shadow-lg', i > days.length - 4 ? 'right-0' : 'left-0')}>
                    <p className="font-bold">{label(d.day)}</p>
                    {SERIES.map((s) => (
                      <p key={s.key} className="mt-1 flex items-center justify-between gap-2 text-white/70">
                        <span className="flex items-center gap-1.5">
                          <span className="size-2 rounded-sm" style={{ background: s.color }} />
                          {s.label}
                        </span>
                        <b className="text-white">{d[s.key]}</b>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-1.5 flex gap-1.5 text-[10px] text-white/40">
          {days.map((d, i) => (
            <span key={d.day} className="flex-1 text-center">
              {i % 2 === 0 || i === days.length - 1 ? label(d.day) : ''}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminOverview() {
  const [s, load] = useAdminStats();
  const [open, setOpen] = useState(null);

  return (
    <AdminShell title="Overview" subtitle="Everything happening on Glide Recruit at a glance.">
      {!s ? (
        <Spinner className="py-24" />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile icon={Users} label="Candidates" value={nf.format(s.users.candidates)} sub={`${s.candidates.live} live · ${s.candidates.incomplete} incomplete · ${s.candidates.hidden} hidden`} to="/admin/candidates" />
            <Tile icon={Building2} label="Companies" value={nf.format(s.users.companies)} sub={`${s.companies.completed} set up · ${s.users.recruiters} recruiters`} to="/admin/companies" tone="blue" />
            <Tile icon={Briefcase} label="Open jobs" value={nf.format(s.jobs.open)} sub={`${s.jobs.paused} paused · ${s.jobs.closed} closed`} to="/admin/jobs" />
            <Tile icon={IndianRupee} label="Revenue" value={`₹${nf.format(s.revenue.paid.amount)}`} sub={`${s.revenue.paid.n} paid orders · ${s.revenue.demo.n} demo`} to="/admin/payments" tone="blue" />
            <Tile icon={BadgeCheck} label="Shortlists" value={nf.format(s.activity.shortlists)} sub={`${nf.format(s.activity.swipes)} swipes · ${s.activity.hires} hired`} />
            <Tile icon={MessageCircle} label="Messages" value={nf.format(s.activity.messages)} sub={`${s.activity.interviews} interviews · ${s.activity.tasks} tasks`} tone="blue" />
            <Tile icon={CalendarClock} label="New this week" value={nf.format(s.users.newLast7Days)} sub="accounts created in the last 7 days" />
            <Tile
              icon={ShieldAlert}
              label="Needs attention"
              value={Object.values(s.queues).reduce((a, b) => a + b, 0)}
              sub={`${s.queues.reports} reports · ${s.queues.tickets} support · ${s.queues.jobs} jobs · ${s.queues.verifications} verifications`}
              to={s.queues.reports ? '/admin/reports' : s.queues.tickets ? '/admin/tickets' : '/admin/verifications'}
              tone="amber"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <section className="glass rounded-3xl p-5">
              <h2 className="font-bold">Sign-ups, last 14 days</h2>
              <p className="mb-4 text-sm text-white/50">New candidate and company accounts per day (India time).</p>
              <SignupChart days={s.signupsByDay} />
            </section>
            <section className="glass rounded-3xl p-5">
              <h2 className="mb-3 font-bold">Newest accounts</h2>
              <ul className="divide-y divide-white/[0.06]">
                {s.recent.map((u) => (
                  <li key={u.id}>
                    <button onClick={() => setOpen(u.id)} className="flex w-full items-center gap-3 py-2.5 text-left hover:opacity-80">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{u.name}</p>
                        <p className="truncate text-xs text-white/50">{u.email}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Pill tone={u.role === 'candidate' ? 'green' : 'blue'}>{u.role}</Pill>
                        <span className="text-[11px] text-white/40">{dateOf(u.createdAt)}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      )}
      <UserDetail id={open} onClose={() => setOpen(null)} onChanged={load} />
    </AdminShell>
  );
}
