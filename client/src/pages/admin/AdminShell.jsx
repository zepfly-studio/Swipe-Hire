import { useEffect, useRef, useState } from 'react';
import { Navigate, NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart3, Briefcase, Building2, Crown, Download, ExternalLink, FileSearch, Flag, History, IndianRupee, LayoutDashboard, LifeBuoy, ListChecks, LogOut, Plug,
  Megaphone, Settings, ShieldCheck, UserCog, Users, UsersRound,
} from 'lucide-react';
import Background from '../../components/Background';
import Logo from '../../components/Logo';
import { Spinner } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { api, cx } from '../../lib/api';

// Sidebar sections. `perm` hides a link from admins whose role can't use it; `badge` is a queue count.
const GROUPS = [
  {
    title: null,
    links: [
      { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true, perm: 'view' },
      { to: '/admin/analytics', label: 'Analytics', icon: BarChart3, perm: 'view' },
    ],
  },
  {
    title: 'People',
    links: [
      { to: '/admin/candidates', label: 'Candidates', icon: Users, perm: 'view' },
      { to: '/admin/companies', label: 'Companies', icon: Building2, perm: 'view' },
      { to: '/admin/recruiters', label: 'Recruiters', icon: UserCog, perm: 'view' },
    ],
  },
  {
    title: 'Moderation',
    links: [
      { to: '/admin/reports', label: 'Reports', icon: Flag, perm: 'reports', badge: 'reports' },
      { to: '/admin/review', label: 'Uploads', icon: FileSearch, perm: 'review' },
      { to: '/admin/jobs', label: 'Jobs', icon: Briefcase, perm: 'view', badge: 'jobs' },
      { to: '/admin/verifications', label: 'Verifications', icon: ShieldCheck, perm: 'view', badge: 'verifications' },
      { to: '/admin/tickets', label: 'Support', icon: LifeBuoy, perm: 'tickets', badge: 'tickets' },
    ],
  },
  {
    title: 'Business',
    links: [
      { to: '/admin/payments', label: 'Payments', icon: IndianRupee, perm: 'payments' },
      { to: '/admin/plans', label: 'Plans', icon: Crown, perm: 'settings' },
      { to: '/admin/announce', label: 'Announcements', icon: Megaphone, perm: 'announce' },
    ],
  },
  {
    title: 'Site',
    links: [
      { to: '/admin/settings', label: 'Settings', icon: Settings, perm: 'settings' },
      { to: '/admin/content', label: 'Content & lists', icon: ListChecks, perm: 'settings' },
      { to: '/admin/integrations', label: 'Integrations', icon: Plug, perm: 'settings' },
      { to: '/admin/admins', label: 'Admin team', icon: UsersRound, perm: 'admins' },
      { to: '/admin/logs', label: 'Activity log', icon: History, perm: 'logs' },
    ],
  },
];

export const useCan = () => {
  const { user } = useAuth();
  return (p) => Boolean(user?.adminPerms?.includes(p));
};

// Downloads a CSV export (needs the "export" permission).
export async function downloadExport(kind) {
  const res = await api.get(`/admin/export/${kind}`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `glide-recruit-${kind}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function ExportButton({ kind }) {
  const can = useCan();
  const [busy, setBusy] = useState(false);
  if (!can('export')) return null;
  return (
    <button
      className="btn-ghost px-3.5 py-2 text-sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await downloadExport(kind).catch(() => {});
        setBusy(false);
      }}
    >
      <Download size={16} /> {busy ? 'Preparing…' : 'Export CSV'}
    </button>
  );
}

// Only signed-in admins get in; everyone else goes to the admin login page.
// Keeps a page current without a reload: runs `refresh` every few seconds while the tab is
// visible, and straight away when the admin comes back to the tab. `refresh` should update
// quietly (no spinner, no error toasts). Pass `paused` while a form on the page is being edited.
export function useLive(refresh, { ms = 12000, paused = false } = {}) {
  const ref = useRef(refresh);
  ref.current = refresh;
  useEffect(() => {
    if (paused) return undefined;
    const tick = () => document.visibilityState === 'visible' && ref.current();
    const t = setInterval(tick, ms);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [ms, paused]);
}

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
  const [queues, setQueues] = useState({});
  const can = useCan();

  // Sidebar badges (open reports, tickets...) stay current on every page.
  const loadQueues = () =>
    api
      .get('/admin/stats')
      .then(({ data }) => setQueues(data.queues || {}))
      .catch(() => {});
  useEffect(() => {
    loadQueues();
  }, []);
  useLive(loadQueues);

  const signOut = () => {
    api.post('/admin-auth/logout').catch(() => {});
    logout();
    navigate('/adminlogin', { replace: true });
  };
  const groups = GROUPS.map((g) => ({ ...g, links: g.links.filter((l) => can(l.perm)) })).filter((g) => g.links.length);

  const item = (l, mobile = false) => (
    <NavLink
      key={l.to}
      to={l.to}
      end={l.end}
      className={({ isActive }) =>
        cx(
          'flex shrink-0 items-center gap-3 rounded-xl px-3 py-[7px] text-sm font-semibold transition-colors',
          isActive ? 'bg-brand-500 text-[#fff] shadow-md shadow-brand-500/20' : 'text-white/60 hover:bg-white/[0.06] hover:text-white',
          mobile && 'py-2',
        )
      }
    >
      <l.icon size={17} />
      {l.label}
      {l.badge && queues[l.badge] > 0 && <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-amber-300 px-1.5 text-[11px] font-bold text-[#fff]">{queues[l.badge]}</span>}
    </NavLink>
  );

  return (
    <div className="min-h-dvh lg:flex">
      <Background />
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-white/[0.08] bg-ink-900/90 p-4 backdrop-blur-xl lg:flex">
        <div className="px-2 pb-3 pt-1">
          <Logo />
        </div>
        <nav className="no-scrollbar -mx-1 flex min-h-0 flex-col gap-1 overflow-y-auto px-1" aria-label="Admin">
          {groups.map((g) => (
            <div key={g.title || 'main'} className="mb-1">
              {g.title && <p className="mb-0.5 mt-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">{g.title}</p>}
              <div className="flex flex-col gap-0.5">{g.links.map((l) => item(l))}</div>
            </div>
          ))}
        </nav>
        <div className="mt-auto border-t border-white/[0.08] pt-3">
          <p className="truncate px-3 text-xs text-white/40" title={user?.email}>
            {user?.email}
            <span className="ml-1 font-bold capitalize text-brand-500">· {user?.adminRole}</span>
          </p>
          <div className="mt-1.5 flex gap-1">
            <a href="/" target="_blank" rel="noreferrer" className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white/60 hover:bg-white/[0.06] hover:text-white">
              <ExternalLink size={16} /> Website
            </a>
            <button onClick={signOut} className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-danger hover:bg-red-500/10">
              <LogOut size={16} /> Log out
            </button>
          </div>
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
            {groups.flatMap((g) => g.links).map((l) => item(l, true))}
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
