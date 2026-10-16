import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import Logo, { LogoMark } from './Logo';
import { cx } from '../lib/api';

// The public pages, in menu order (also used by the footer).
export const PUBLIC_PAGES = [
  ['/how-it-works', 'How it works'],
  ['/for-companies', 'For companies'],
  ['/for-job-seekers', 'For job seekers'],
  ['/pricing', 'Pricing'],
  ['/faq', 'FAQ'],
  ['/about', 'About'],
];

// Floating header shared by the public pages: a rounded bar that stays a little below the top
// edge. On wide screens the pages are listed in the bar; on phones and tablets a menu button
// opens them in a panel under it.
export default function PublicHeader() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  // Close the menu after moving to another page, and with Escape.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [open]);

  return (
    <header className="sticky top-3 z-40 px-3 sm:top-4 sm:px-4">
      <nav
        className="mx-auto flex h-16 max-w-6xl items-center gap-3 rounded-[20px] border border-white/10 bg-ink-900/80 px-3 shadow-xl shadow-black/10 backdrop-blur-xl sm:px-4"
        aria-label="Main"
      >
        <Link to="/" aria-label="Glide Recruit home">
          <Logo />
        </Link>
        <div className="ml-6 hidden items-center gap-1 text-sm font-semibold text-white/60 lg:flex">
          {PUBLIC_PAGES.map(([to, label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => cx('rounded-xl px-3 py-2 hover:bg-white/5 hover:text-white', isActive && 'bg-white/5 text-white')}>
              {label}
            </NavLink>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link to="/auth?mode=login" className="btn-ghost hidden px-4 py-2 text-sm sm:inline-flex">
            Log in
          </Link>
          {/* The logo tile slides to the other end on hover while the label slides back. */}
          <Link
            to="/auth"
            className="btn-primary group relative hidden h-11 rounded-2xl py-0 pl-[3.25rem] pr-4 text-sm transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] hover:pl-4 hover:pr-[3.25rem] sm:inline-flex"
          >
            <span
              className="absolute inset-y-1 left-1 grid aspect-square place-items-center rounded-[12px] bg-[#fff] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:left-[calc(100%-2.5rem)]"
              aria-hidden="true"
            >
              <LogoMark className="size-7" />
            </span>
            Get started
          </Link>
          <button
            onClick={() => setOpen((o) => !o)}
            className="btn-ghost p-2.5 lg:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="public-menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            id="public-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.16 }}
            className="mx-auto mt-2 max-w-6xl rounded-[20px] border border-white/10 bg-ink-900/95 p-2 shadow-xl shadow-black/10 backdrop-blur-xl lg:hidden"
          >
            <nav aria-label="Pages" className="flex flex-col">
              <NavLink to="/" end className={({ isActive }) => cx('rounded-xl px-4 py-3 font-semibold hover:bg-white/5', isActive ? 'bg-white/5 text-white' : 'text-white/70')}>
                Home
              </NavLink>
              {PUBLIC_PAGES.map(([to, label]) => (
                <NavLink key={to} to={to} className={({ isActive }) => cx('rounded-xl px-4 py-3 font-semibold hover:bg-white/5', isActive ? 'bg-white/5 text-white' : 'text-white/70')}>
                  {label}
                </NavLink>
              ))}
            </nav>
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-white/10 p-2 pt-3">
              <Link to="/auth?mode=login" className="btn-ghost justify-center py-2.5 text-sm">
                Log in
              </Link>
              <Link to="/auth" className="btn-primary justify-center py-2.5 text-sm">
                Get started
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
