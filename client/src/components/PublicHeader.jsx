import { Link, useLocation } from 'react-router-dom';
import Logo, { LogoMark } from './Logo';
import { cx } from '../lib/api';

// Sections of the home page, plus the About page.
const LINKS = [
  ['how-it-works', 'How it works'],
  ['for-companies', 'For companies'],
  ['for-candidates', 'For job seekers'],
  ['pricing', 'Pricing'],
  ['faq', 'FAQ'],
];

// Floating header shared by the public pages (home, About): a rounded bar that stays a
// little below the top edge. Section links jump within the home page, or open it at that section.
export default function PublicHeader() {
  const { pathname } = useLocation();
  const onHome = pathname === '/';
  const linkClass = (active) => cx('rounded-xl px-3 py-2 hover:bg-white/5 hover:text-white', active && 'bg-white/5 text-white');

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
          {LINKS.map(([id, label]) =>
            onHome ? (
              <a key={id} href={`#${id}`} className={linkClass(false)}>
                {label}
              </a>
            ) : (
              <Link key={id} to={`/#${id}`} className={linkClass(false)}>
                {label}
              </Link>
            ),
          )}
          <Link to="/about" className={linkClass(pathname === '/about')} aria-current={pathname === '/about' ? 'page' : undefined}>
            About
          </Link>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link to="/auth?mode=login" className="btn-ghost px-4 py-2 text-sm">
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
        </div>
      </nav>
    </header>
  );
}
