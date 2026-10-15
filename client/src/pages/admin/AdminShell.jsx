import { useEffect, useState } from 'react';
import { Navigate, NavLink, useNavigate } from 'react-router-dom';
import { Briefcase, Building2, ExternalLink, IndianRupee, LayoutDashboard, LogOut, ShieldCheck, UserCog, Users } from 'lucide-react';
import Background from '../../components/Background';
import Logo from '../../components/Logo';
import { Spinner } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { api, cx } from '../../lib/api';

const LINKS = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/candidates', label: 'Candidates', icon: Users },
  { to: '/admin/companies', label: 'Companies', icon: Building2 },
  { to: '/admin/recruiters', label: 'Recruiters', icon: UserCog },
  { to: '/admin/jobs', label: 'Jobs', icon: Briefcase },
  { to: '/admin/verifications', label: 'Verifications', icon: ShieldCheck, badge: true },
  { to: '/admin/payments', label: 'Payments', icon: IndianRupee },
];

// Only signed-in admins get in; everyone else goes to the admin login page.
export function AdminGuard({ children }) {
  const { loading, user } = useAuth();
  if (loading) return <Spinner className="min-h-dvh" />;
  if (!user || !user.isAdmin) return <Navigate to="/adminlogin" replace />;
  return children;
}

// Admin layout: sidebar on desktop, scrollable tabs on phones.
export default function AdminShell({ title, subtitle, actions, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState(0);

  useEffect(() => {
    document.title = `${title} · Glide Recruit Admin`;
  }, [title]);
  useEffect(() => {
    api
      .get('/admin/verifications')
      .then(({ data }) => setPending(data.companies.length))
      .catch(() => {});
  }, []);

  const signOut = () => {
    logout();
    navigate('/adminlogin', { replace: true });
  };

  const item = (l, mobile = false) => (
    <NavLink
      key={l.to}
      to={l.to}
      end={l.end}
      className={({ isActive }) =>
        cx(
          'flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
          isActive ? 'bg-brand-500 text-[#fff] shadow-md shadow-brand-500/20' : 'text-white/60 hover:bg-white/[0.06] hover:text-white',
          mobile && 'py-2',
        )
      }
    >
      <l.icon size={17} />
      {l.label}
      {l.badge && pending > 0 && <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-amber-300 px-1.5 text-[11px] font-bold text-[#fff]">{pending}</span>}
    </NavLink>
  );

  return (
    <div className="min-h-dvh lg:flex">
      <Background />
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-white/[0.08] bg-ink-900/90 p-4 backdrop-blur-xl lg:flex">
        <div className="px-2 pb-1 pt-2">
          <Logo />
        </div>
        <p className="mb-6 ml-2 mt-2 w-fit rounded-full bg-brand-500/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-brand-500">Admin panel</p>
        <nav className="flex flex-col gap-1" aria-label="Admin">
          {LINKS.map((l) => item(l))}
        </nav>
        <div className="mt-auto space-y-1 border-t border-white/[0.08] pt-4">
          <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/60 hover:bg-white/[0.06] hover:text-white">
            <ExternalLink size={17} /> Open website
          </a>
          <button onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-danger hover:bg-red-500/10">
            <LogOut size={17} /> Log out
          </button>
          <p className="truncate px-3 pt-2 text-xs text-white/40" title={user?.email}>
            {user?.email}
          </p>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-ink-900/90 backdrop-blur-xl lg:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Logo />
            <button onClick={signOut} className="btn-ghost px-3 py-1.5 text-sm" aria-label="Log out">
              <LogOut size={16} />
            </button>
          </div>
          <nav className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-2" aria-label="Admin">
            {LINKS.map((l) => item(l, true))}
          </nav>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
              {subtitle && <p className="mt-1 text-white/55">{subtitle}</p>}
            </div>
            {actions}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

// Small shared pieces for the admin pages.
export function Pager({ page, pages, total, onPage }) {
  if (pages <= 1) return <p className="mt-4 text-sm text-white/45">{total} total</p>;
  return (
    <div className="mt-4 flex items-center justify-between gap-3 text-sm">
      <span className="text-white/45">
        {total} total · page {page} of {pages}
      </span>
      <div className="flex gap-2">
        <button className="btn-ghost px-3 py-1.5 text-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </button>
        <button className="btn-ghost px-3 py-1.5 text-sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}

export function Pill({ tone = 'gray', children }) {
  const tones = {
    gray: 'bg-white/[0.07] text-white/70',
    green: 'bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/20',
    blue: 'bg-sky-400/10 text-sky-300 ring-1 ring-sky-400/20',
    amber: 'bg-amber-300/15 text-amber-200 ring-1 ring-amber-300/25',
    red: 'bg-red-500/10 text-danger ring-1 ring-red-500/20',
  };
  return <span className={cx('inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold', tones[tone])}>{children}</span>;
}

export const dateOf = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '–');
export const lpa = (min, max) => (min == null && max == null ? '–' : max && max !== min ? `₹${min ?? 0}–${max} LPA` : `₹${min ?? max} LPA`);
