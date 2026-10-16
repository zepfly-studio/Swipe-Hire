import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BadgeCheck, Building2, CalendarClock, ClipboardList, Crown, Heart, House, Layers, LogOut, MessageCircle, Pencil, ShieldCheck,
  LifeBuoy, SlidersHorizontal, UserCog, UserPlus, Users, Zap,
} from 'lucide-react';
import Background from './Background';
import Logo from './Logo';
import NotificationBell from './NotificationBell';
import Avatar from './Avatar';
import { useAuth } from '../context/AuthContext';
import { usePoll } from '../hooks/usePoll';
import { api, cx } from '../lib/api';

// Wishlist and Tasks are desktop-only in the company nav; on phones Wishlist is linked
// from the swipe screen and Tasks from the profile menu.
const COMPANY_LINKS = [
  { to: '/company/swipe', label: 'Swipe', icon: Layers },
  { to: '/company/filters', label: 'Filters', icon: SlidersHorizontal },
  { to: '/company/shortlisted', label: 'Shortlisted', icon: Users },
  { to: '/company/wishlist', label: 'Wishlist', icon: Heart, desktopOnly: true },
  { to: '/messages', label: 'Messages', icon: MessageCircle, badge: 'messages' },
  { to: '/interviews', label: 'Interviews', icon: CalendarClock },
  { to: '/tasks', label: 'Tasks', icon: ClipboardList, desktopOnly: true },
];

const CANDIDATE_LINKS = [
  { to: '/candidate', label: 'Home', icon: House, end: true },
  { to: '/messages', label: 'Messages', icon: MessageCircle, badge: 'messages' },
  { to: '/tasks', label: 'Tasks', icon: ClipboardList },
  { to: '/interviews', label: 'Interviews', icon: CalendarClock },
];

export function SwipeCounter() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const left = profile?.swipesLeft ?? 0;
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => navigate('/company/plans')}
      className={cx(
        'flex shrink-0 items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-bold tabular-nums ring-1',
        left > 0 ? 'bg-white/[0.06] ring-white/10' : 'bg-brand-500/15 text-brand-400 ring-brand-500/40',
      )}
      title="Swipes left"
    >
      <Zap size={15} className={cx('shrink-0', left > 0 && 'text-amber-300')} fill="currentColor" />
      <span className="relative inline-flex h-5 shrink-0 justify-center overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={left}
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -18, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            {left}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="hidden font-medium text-white/50 sm:inline">swipes</span>
    </motion.button>
  );
}

function ProfileMenu() {
  const { user, profile, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const isCompany = user.role === 'company';

  useEffect(() => {
    if (!open) return;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  const items = isCompany
    ? [
        { to: '/settings', label: 'Account settings', icon: UserCog },
        { to: '/company/profile', label: 'Company profile', icon: Building2 },
        { to: '/tasks', label: 'Tasks', icon: ClipboardList, mobileOnly: true },
        { to: '/company/team', label: 'Team', icon: UserPlus },
        { to: '/company/verify', label: profile?.verification?.status === 'verified' ? 'Verified company' : 'Get verified badge', icon: BadgeCheck },
        { to: '/company/plans', label: 'Plans & swipes', icon: Crown },
        { to: '/support', label: 'Help & support', icon: LifeBuoy },
      ]
    : [
        { to: '/settings', label: 'Account settings', icon: UserCog },
        { to: '/candidate/onboarding?edit', label: 'Edit profile', icon: Pencil },
        { to: '/support', label: 'Help & support', icon: LifeBuoy },
      ];
  if (user.isAdmin) items.push({ to: '/admin', label: 'Admin', icon: ShieldCheck });

  return (
    <div ref={ref} className="relative">
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen((o) => !o)}
        className="rounded-full ring-2 ring-transparent transition hover:ring-brand-500/50"
        aria-label="Account menu"
        title={user.name}
      >
        <Avatar src={user.avatarUrl} name={user.name} size="sm" />
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97, pointerEvents: 'none' }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-white/10 bg-ink-800 p-1.5 shadow-2xl shadow-black/60"
          >
            <div className="flex items-center gap-3 px-3 py-2.5">
              <Avatar src={user.avatarUrl} name={user.name} size="md" />
              <div className="min-w-0">
                <p className="truncate font-bold">{user.name}</p>
                <p className="truncate text-xs text-white/45">{isCompany ? profile?.companyName : user.email}</p>
              </div>
            </div>
            {items.map((i) => (
              <Link
                key={i.to}
                to={i.to}
                onClick={() => setOpen(false)}
                className={cx(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/80 hover:bg-white/5 hover:text-white',
                  i.mobileOnly && 'md:hidden',
                )}
              >
                <i.icon size={16} className="text-white/50" />
                {i.label}
              </Link>
            ))}
            <button
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/80 hover:bg-white/5 hover:text-white"
            >
              <LogOut size={16} className="text-white/50" />
              Log out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Badge({ n }) {
  if (!n) return null;
  return (
    <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white">
      {n > 9 ? '9+' : n}
    </span>
  );
}

export default function AppShell({ children }) {
  const { user } = useAuth();
  const isCompany = user.role === 'company';
  const links = isCompany ? COMPANY_LINKS : CANDIDATE_LINKS;
  const mobileLinks = links.filter((l) => !l.desktopOnly);
  const [unread, setUnread] = useState(0);
  usePoll(() => api.get('/chats/unread-count').then(({ data }) => setUnread(data.count)).catch(() => {}), 15000);
  const badges = { messages: unread };

  return (
    <div className="min-h-dvh pb-24 md:pb-0">
      <Background />
      <header className="sticky top-0 z-40 border-b border-white/5 bg-ink-950/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4">
          {/* The logo goes to the user's home tab (Swipe for companies), same as the first nav link. */}
          <Link to={links[0]?.to || '/'} aria-label="Home" className="shrink-0">
            <Logo />
          </Link>
          <nav className="ml-4 hidden min-w-0 items-center gap-1 md:flex lg:ml-6">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} title={l.label} className="relative rounded-xl px-3 py-2 text-sm font-semibold">
                {({ isActive }) => {
                  const active = isActive;
                  return (
                    <>
                    {active && (
                      <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-xl bg-white/[0.08]" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />
                    )}
                    <span className={cx('relative flex items-center gap-2', active ? 'text-white' : 'text-white/50 hover:text-white')}>
                      <l.icon size={16} />
                      {/* Icons only on narrower screens, where the labels don't fit (seven for companies). */}
                      <span className={cx('hidden', links.length > 5 ? 'xl:inline' : 'lg:inline')}>{l.label}</span>
                      <Badge n={badges[l.badge]} />
                    </span>
                    </>
                  );
                }}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {isCompany && <SwipeCounter />}
            <NotificationBell />
            <ProfileMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>

      <nav
        className={cx(
          'fixed inset-x-3 bottom-3 z-40 grid rounded-2xl border border-white/10 bg-ink-900/90 p-1.5 shadow-2xl backdrop-blur-xl md:hidden',
          { 3: 'grid-cols-3', 4: 'grid-cols-4', 5: 'grid-cols-5' }[mobileLinks.length],
        )}
      >
        {mobileLinks.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} className="relative flex flex-col items-center gap-0.5 rounded-xl py-2 text-[10px] font-semibold">
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span layoutId="mobile-nav-pill" className="absolute inset-0 rounded-xl bg-white/[0.08]" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />
                )}
                <span className="relative">
                  <l.icon size={19} className={isActive ? 'text-brand-400' : 'text-white/45'} />
                  {badges[l.badge] > 0 && <span className="absolute -right-2 -top-1"><Badge n={badges[l.badge]} /></span>}
                </span>
                <span className={cx('relative', isActive ? 'text-white' : 'text-white/45')}>{l.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
