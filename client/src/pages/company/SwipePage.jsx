import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BadgeCheck, Crown, Heart, Mail, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import toast from 'react-hot-toast';
import CompanyShell from '../../components/CompanyShell';
import SwipeCard from '../../components/SwipeCard';
import ResumeViewer from '../../components/ResumeViewer';
import PlanCards from '../../components/PlanCards';
import Modal from '../../components/Modal';
import FeedFilters, { EMPTY_FILTERS, countFilters, filterParams, fromSaved } from '../../components/FeedFilters';
import { Burst, Spinner } from '../../components/ui';
import Illustration from '../../components/Illustration';
import { useAuth } from '../../context/AuthContext';
import { api, cx, errorMessage, toLpa } from '../../lib/api';

const MODE_NAMES = { onsite: 'On-site', hybrid: 'Hybrid', remote: 'Remote' };

// The last applied filters are remembered per company in this browser, so a refresh
// (or coming back from another page) doesn't empty the swipe screen.
const readSaved = (key) => {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    return saved?.filters ? { filters: fromSaved(saved.filters), searchId: saved.searchId || '' } : null;
  } catch {
    return null;
  }
};
const writeSaved = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore: only a convenience
  }
};

function ActionButton({ onClick, label, className, size = 'lg', children, disabled }) {
  return (
    <motion.button
      whileHover={disabled ? undefined : { scale: 1.1, y: -3 }}
      whileTap={disabled ? undefined : { scale: 0.85 }}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cx(
        'grid place-items-center rounded-full border bg-ink-900/80 shadow-xl backdrop-blur transition-colors disabled:opacity-40',
        size === 'lg' ? 'h-16 w-16' : 'h-12 w-12',
        className,
      )}
    >
      {children}
    </motion.button>
  );
}

function ShortlistFlash({ flash }) {
  return (
    <AnimatePresence>
      {flash && (
        <motion.div
          key={flash.id}
          initial={{ opacity: 0, scale: 0.6, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          transition={{ type: 'spring', stiffness: 380, damping: 22 }}
          className="pointer-events-none fixed inset-x-0 top-1/3 z-50 flex justify-center"
        >
          <div className="relative rounded-3xl border border-emerald-400/40 bg-ink-900/95 px-6 py-4 text-center shadow-2xl shadow-brand-500/20 backdrop-blur-xl">
            <Burst count={26} distance={150} />
            <p className="flex items-center justify-center gap-2 text-lg font-extrabold text-emerald-400">
              <BadgeCheck size={22} />
              {flash.name} shortlisted!
            </p>
            {flash.email && (
              <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-white/60">
                <Mail size={14} />
                {flash.email}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Sidebar({ filters, onEdit }) {
  if (!countFilters(filters)) return <aside className="hidden w-72 shrink-0 lg:block" />;
  const budget = filters.minSalary !== '' || filters.maxSalary !== ''
    ? `₹${toLpa(filters.minSalary) || 0}–${filters.maxSalary === '' ? 'Any' : toLpa(filters.maxSalary)} LPA`
    : null;
  const rows = [
    ['Role', filters.role],
    ['Experience', filters.minExp !== '' || filters.maxExp !== '' ? `${filters.minExp || 0}–${filters.maxExp || 'Any'} yrs` : null],
    ['Budget', budget],
    ['Location', [filters.location, filters.workModes?.map((m) => MODE_NAMES[m]).join(' / ')].filter(Boolean).join(' · ')],
  ].filter(([, v]) => v);
  return (
    <aside className="sticky top-24 hidden w-72 shrink-0 space-y-4 self-start lg:block">
      <div className="glass rounded-3xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/40">Hiring for</p>
          <button onClick={onEdit} className="text-white/40 hover:text-white" title="Edit filters">
            <SlidersHorizontal size={15} />
          </button>
        </div>
        <dl className="space-y-3 text-sm">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt className="text-white/40">{k}</dt>
              <dd className="font-semibold capitalize">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {filters.skills?.map((s) => (
            <span key={s} className="chip">
              {s}
            </span>
          ))}
        </div>
      </div>
      <div className="glass rounded-3xl p-5 text-sm text-white/55">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-white/40">Shortcuts</p>
        <p className="flex justify-between"><span>Pass</span><kbd className="rounded bg-white/10 px-2">←</kbd></p>
        <p className="mt-2 flex justify-between"><span>Shortlist</span><kbd className="rounded bg-white/10 px-2">→</kbd></p>
        <p className="mt-2 flex justify-between"><span>Open resume</span><span className="text-white/40">double-click</span></p>
      </div>
    </aside>
  );
}

export default function SwipePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, setProfile } = useAuth();
  const savedKey = `glide_swipe_filters_${user?.companyId || user?.id}`;
  const [initial] = useState(() => readSaved(savedKey));
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(() => countFilters(initial?.filters || EMPTY_FILTERS) > 0);
  const [exhausted, setExhausted] = useState(false);
  const [exitDir, setExitDir] = useState(1);
  const [resume, setResume] = useState(null);
  const [paywall, setPaywall] = useState(false);
  const [flash, setFlash] = useState(null);
  const [feedError, setFeedError] = useState(null);
  const [seen, setSeen] = useState(null); // matching people this company already swiped
  const fetching = useRef(false);
  const pending = useRef(new Set());

  const [filters, setFilters] = useState(initial?.filters || EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersRef = useRef(filters);
  const generation = useRef(0);
  const activeFilters = countFilters(filters);

  const [params, setParams] = useSearchParams();
  const jobRef = useRef(params.get('job'));
  const [searches, setSearches] = useState([]);
  const [activeSearchId, setActiveSearchId] = useState(initial?.searchId || '');
  const [undoing, setUndoing] = useState(false);
  const [returning, setReturning] = useState(null); // { id, from } card flying back after undo

  const swipesLeft = profile?.swipesLeft ?? 0;

  const openFilters = () => {
    setFiltersOpen(true);
    if (params.get('filters') !== 'open') {
      const next = new URLSearchParams(params);
      next.set('filters', 'open');
      setParams(next, { replace: true });
    }
  };

  const closeFilters = () => {
    setFiltersOpen(false);
    if (params.get('filters') === 'open') {
      const next = new URLSearchParams(params);
      next.delete('filters');
      setParams(next, { replace: true });
    }
  };

  const loadMore = useCallback(async (current) => {
    if (fetching.current || !countFilters(filtersRef.current)) return;
    fetching.current = true;
    const gen = generation.current;
    try {
      const exclude = [...current.map((c) => c.id), ...pending.current].join(',');
      const params = { limit: 10, exclude, ...filterParams(filtersRef.current) };
      if (jobRef.current) params.jobId = jobRef.current;
      const { data } = await api.get('/company/feed', {
        params,
      });
      if (gen !== generation.current) return;
      if (!jobRef.current && data.job?.id) {
        jobRef.current = data.job.id;
      }
      setCards((prev) => {
        const seen = new Set(prev.map((c) => c.id));
        return [...prev, ...data.candidates.filter((c) => !seen.has(c.id))];
      });
      if (data.candidates.length === 0) setExhausted(true);
      if (!current.length) setSeen(data.seen || null);
    } catch (err) {
      if (gen === generation.current) setFeedError(errorMessage(err));
    } finally {
      fetching.current = false;
      if (gen === generation.current) setLoading(false);
    }
  }, []);

  const resetFeed = () => {
    generation.current += 1;
    fetching.current = false;
    setCards([]);
    setLoading(countFilters(filtersRef.current) > 0);
    setExhausted(false);
    setFeedError(null);
    setSeen(null);
  };

  const applyFilters = (next, searchId = '') => {
    closeFilters();
    filtersRef.current = next;
    setFilters(next);
    setActiveSearchId(searchId);
    writeSaved(savedKey, { filters: next, searchId });
    jobRef.current = null;
    resetFeed();
  };

  useEffect(() => {
    api.get('/company/searches').then(({ data }) => setSearches(data.searches)).catch(() => {});
  }, []);

  useEffect(() => {
    if (params.get('filters') === 'open') setFiltersOpen(true);
  }, [params]);

  useEffect(() => {
    const incomingFilters = location.state?.filters;
    if (!incomingFilters) return;
    applyFilters(incomingFilters);
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    // Apply once per navigation; route state is cleared immediately afterward.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  // Coming from a "new match" alert: apply that saved search.
  useEffect(() => {
    const sid = params.get('search');
    const s = sid && searches.find((x) => x.id === sid);
    if (!s) return;
    applyFilters(fromSaved(s.filters), s.id);
    params.delete('search');
    setParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searches]);

  useEffect(() => {
    if (countFilters(filtersRef.current) && cards.length < 3 && !exhausted && !feedError) loadMore(cards);
  }, [cards, exhausted, feedError, filters, loadMore]);

  // New swipes bought -> look for more candidates again.
  useEffect(() => {
    if (swipesLeft > 0) setExhausted(false);
  }, [swipesLeft]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 1800);
    return () => clearTimeout(t);
  }, [flash]);

  const swipe = useCallback(
    (dir) => {
      const top = cards[0];
      if (!top) return false;
      if (swipesLeft <= 0) {
        setPaywall(true);
        return false;
      }
      setExitDir(dir);
      if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: 'smooth' });
      setCards((c) => c.slice(1));
      setProfile((p) => ({ ...p, swipesLeft: Math.max(0, p.swipesLeft - 1) }));
      pending.current.add(top.id);

      api
        .post('/company/swipe', { candidateId: top.id, action: dir > 0 ? 'right' : 'left', jobId: jobRef.current })
        .then(({ data }) => {
          // Replies can arrive out of order; while other swipes are in flight keep the lowest count.
          setProfile((p) => ({
            ...p,
            swipesLeft: pending.current.size > 1 ? Math.min(p.swipesLeft, data.swipesLeft) : data.swipesLeft,
          }));
          if (dir > 0) setFlash({ id: top.id, name: top.name.split(' ')[0], email: data.contact?.email });
        })
        .catch((err) => {
          setProfile((p) => ({ ...p, swipesLeft: p.swipesLeft + 1 }));
          if (err.response?.data?.code === 'NO_SWIPES') {
            setProfile((p) => ({ ...p, swipesLeft: 0 }));
            setCards((c) => [top, ...c]);
            setPaywall(true);
          } else if (err.response?.data?.code === 'SALARY_MISMATCH') {
            // Their expectation changed after the feed loaded; they can't be shortlisted for this job.
            toast.error(errorMessage(err), { duration: 6000 });
          } else if (err.response?.status !== 409) {
            setCards((c) => [top, ...c]);
            toast.error(errorMessage(err));
          }
        })
        .finally(() => pending.current.delete(top.id));
      return true;
    },
    [cards, swipesLeft, setProfile],
  );

  // Takes back the most recent swipe; the card flies back in from where it went.
  const undo = async () => {
    // Without filters there is no stack to put the card back into.
    if (undoing || !activeFilters) return;
    setUndoing(true);
    try {
      const { data } = await api.post('/company/swipe/undo');
      setProfile((p) => ({ ...p, swipesLeft: data.swipesLeft }));
      // The card comes back on top, even if the filters changed since that swipe.
      if (data.card) {
        setReturning({ id: data.card.id, from: data.action === 'right' ? 1 : -1 });
        setCards((c) => [data.card, ...c.filter((x) => x.id !== data.card.id)]);
        if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      toast.success(data.action === 'right' ? 'Shortlist undone. Its swipe is not refunded, as contact details were shown.' : 'Pass undone, swipe refunded', { id: 'undo' });
    } catch (err) {
      toast.error(errorMessage(err), { id: 'undo' });
    } finally {
      setUndoing(false);
    }
  };

  const saveSearch = async (name, f) => {
    try {
      const { data } = await api.post('/company/searches', { name, filters: filterParams(f), alerts: true });
      setSearches((s) => [data.search, ...s]);
      toast.success(`Saved "${name}". We'll alert you about new matches.`);
      return true;
    } catch (err) {
      toast.error(errorMessage(err));
      return false;
    }
  };
  const updateSearch = async (id, name, f) => {
    try {
      const { data } = await api.patch(`/company/searches/${id}`, { name, filters: filterParams(f) });
      setSearches((all) => all.map((s) => (s.id === id ? data.search : s)));
      toast.success(`Updated "${data.search.name}".`);
      return true;
    } catch (err) {
      toast.error(errorMessage(err));
      return false;
    }
  };
  const toggleSearchAlerts = async (s) => {
    setSearches((all) => all.map((x) => (x.id === s.id ? { ...x, alerts: !s.alerts } : x)));
    try {
      await api.patch(`/company/searches/${s.id}`, { alerts: !s.alerts });
    } catch (err) {
      setSearches((all) => all.map((x) => (x.id === s.id ? s : x)));
      toast.error(errorMessage(err));
    }
  };
  const deleteSearch = async (s) => {
    try {
      await api.delete(`/company/searches/${s.id}`);
      setSearches((all) => all.filter((x) => x.id !== s.id));
      if (activeSearchId === s.id) setActiveSearchId('');
      toast.success(`Deleted "${s.name}".`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const toggleWish = useCallback(async (candidate) => {
    const flip = (value) => setCards((cs) => cs.map((c) => (c.id === candidate.id ? { ...c, wishlisted: value } : c)));
    flip(!candidate.wishlisted);
    try {
      const { data } = await api.put(`/company/wishlist/${candidate.id}`, { wishlisted: !candidate.wishlisted });
      flip(data.wishlisted);
      toast.success(data.wishlisted ? 'Added to wishlist' : 'Removed from wishlist', { id: 'wish' });
    } catch (err) {
      flip(candidate.wishlisted);
      toast.error(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (resume || paywall || filtersOpen || e.target.closest('input, textarea, select')) return;
      if (e.key === 'ArrowRight') swipe(1);
      if (e.key === 'ArrowLeft') swipe(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [swipe, resume, paywall, filtersOpen]);

  const top = cards[0];
  const visible = cards.slice(0, 3);

  return (
    <CompanyShell>
      <div className="flex gap-8">
        <Sidebar filters={filters} onEdit={openFilters} />

        <section className="relative flex flex-1 flex-col items-center">
          <div className="mb-4 flex w-full max-w-[430px] items-center justify-between gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={openFilters}
              className={cx('btn-ghost py-2 text-sm', activeFilters > 0 && 'border-brand-500/50 text-white')}
            >
              <SlidersHorizontal size={16} />
              Filters
              {activeFilters > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-500 px-1 text-[11px] font-bold">{activeFilters}</span>
              )}
            </motion.button>
            {activeFilters > 0 ? (
              <button onClick={() => applyFilters(EMPTY_FILTERS)} className="text-sm font-semibold text-white/45 hover:text-white">
                Clear filters
              </button>
            ) : (
              <Link to="/company/wishlist" className="flex items-center gap-1.5 text-sm font-semibold text-white/45 hover:text-white">
                <Heart size={15} />
                Wishlist
              </Link>
            )}
          </div>
          {top?.fallback && (
            <p className="mb-3 w-full max-w-[430px] rounded-2xl bg-amber-400/10 px-4 py-2.5 text-sm font-medium text-amber-300 ring-1 ring-amber-400/30">
              No {filters.role || 'candidates for this role'} found{seen ? ` (you've seen all ${seen.total})` : ''}. Showing candidates with
              matching skills, experience and salary.
            </p>
          )}
          {/* Height follows the top card; the whole page scrolls through it. */}
          <div className="relative mb-6 min-h-[60dvh] w-full max-w-[430px]">
            <AnimatePresence custom={exitDir}>
              {visible.map((c, i) => (
                <SwipeCard
                  key={c.id}
                  c={c}
                  depth={i}
                  onSwipe={swipe}
                  onOpenResume={setResume}
                  onToggleWish={toggleWish}
                  enterFrom={returning?.id === c.id ? returning.from : 0}
                />
              ))}
            </AnimatePresence>

            {!top && !loading && !feedError && activeFilters === 0 && (
              <div className="glass absolute inset-0 flex flex-col items-center justify-center rounded-[30px] p-8 text-center">
                <SlidersHorizontal size={36} className="text-white/40" />
                <h3 className="mt-5 text-2xl font-extrabold">Set filters to see candidates</h3>
                <p className="mt-2 text-white/55">Choose the role and requirements you’re hiring for before viewing resumes.</p>
                <button onClick={openFilters} className="btn-primary mt-6">
                  <SlidersHorizontal size={18} />
                  Set filters
                </button>
              </div>
            )}

            {!top && loading && <Spinner className="absolute inset-0" />}

            {!top && !loading && feedError && (
              <div className="glass absolute inset-0 flex flex-col items-center justify-center rounded-[30px] p-8 text-center">
                <h3 className="text-xl font-extrabold">Could not load candidates</h3>
                <p className="mt-2 text-white/55">{feedError}</p>
                <button onClick={() => setFeedError(null)} className="btn-primary mt-6">
                  Try again
                </button>
              </div>
            )}

            {!top && !loading && !feedError && activeFilters > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass absolute inset-0 flex flex-col items-center justify-center rounded-[30px] p-8 text-center"
              >
                {swipesLeft <= 0 ? (
                  <>
                    <Illustration name="out-of-swipes" />
                    <h3 className="mt-4 text-2xl font-extrabold">You're out of swipes</h3>
                    <p className="mt-2 text-white/55">Get more swipes to keep discovering great candidates.</p>
                    <Link to="/company/plans" className="btn-primary mt-6">
                      <Crown size={18} />
                      See plans
                    </Link>
                  </>
                ) : (
                  <>
                    <Illustration name="no-candidates" />
                    {activeFilters > 0 ? (
                      <>
                        {seen ? (
                          <>
                            <h3 className="mt-4 text-2xl font-extrabold">You've seen everyone for these filters</h3>
                            <p className="mt-2 text-white/55">
                              {seen.total} {seen.total === 1 ? 'candidate matches' : 'candidates match'}, and you've already swiped {seen.total === 1 ? 'them' : 'all of them'}
                              {' '}({[seen.shortlisted && `${seen.shortlisted} shortlisted`, seen.passed && `${seen.passed} passed`].filter(Boolean).join(', ')}).
                              {seen.passed ? ' Undo brings back the ones you passed.' : ''} Widen the filters to see more people.
                            </p>
                          </>
                        ) : (
                          <>
                            <h3 className="mt-4 text-2xl font-extrabold">No one matches your filters</h3>
                            <p className="mt-2 text-white/55">Try widening them to see more candidates.</p>
                          </>
                        )}
                        <div className="mt-6 flex flex-wrap justify-center gap-3">
                          <button onClick={openFilters} className="btn-ghost">
                            <SlidersHorizontal size={18} />
                            Edit filters
                          </button>
                          {seen?.shortlisted ? (
                            <Link to="/company/shortlisted" className="btn-primary">
                              Open shortlisted
                            </Link>
                          ) : (
                            <button onClick={() => applyFilters(EMPTY_FILTERS)} className="btn-primary">
                              Clear filters
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <h3 className="mt-4 text-2xl font-extrabold">You've seen everyone</h3>
                        <p className="mt-2 text-white/55">New candidates join every day. Check back soon, or review your wishlist.</p>
                        <Link to="/company/wishlist" className="btn-ghost mt-6">
                          <Heart size={18} />
                          Open wishlist
                        </Link>
                      </>
                    )}
                  </>
                )}
              </motion.div>
            )}

            <ShortlistFlash flash={flash} />
          </div>

          <div className="sticky bottom-24 z-40 flex items-center gap-4 rounded-full bg-ink-950/40 px-4 py-2 backdrop-blur-md sm:gap-5 md:bottom-6">
            <ActionButton
              label="Undo last swipe"
              size="sm"
              onClick={undo}
              disabled={undoing || !activeFilters}
              className="border-amber-300/40 text-amber-300 hover:bg-amber-300 hover:text-ink-950"
            >
              <RotateCcw size={19} strokeWidth={2.5} />
            </ActionButton>
            <ActionButton label="Pass" onClick={() => swipe(-1)} disabled={!top} className="border-brand-500/40 text-brand-500 hover:bg-brand-500 hover:text-[#fff]">
              <X size={30} strokeWidth={3} />
            </ActionButton>
            <ActionButton
              label={top?.wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              size="sm"
              onClick={() => top && toggleWish(top)}
              disabled={!top}
              className={cx('border-violet-brand/40 text-violet-brand hover:bg-violet-brand hover:text-white', top?.wishlisted && 'bg-violet-brand text-white')}
            >
              <Heart size={20} fill={top?.wishlisted ? 'currentColor' : 'none'} />
            </ActionButton>
            <ActionButton label="Shortlist" onClick={() => swipe(1)} disabled={!top} className="border-emerald-400/40 text-emerald-400 hover:bg-emerald-400 hover:text-ink-950">
              <BadgeCheck size={30} strokeWidth={2.5} />
            </ActionButton>
          </div>
        </section>
      </div>

      <ResumeViewer url={resume?.resumeUrl} name={resume?.name} onClose={() => setResume(null)} />
      <FeedFilters
        open={filtersOpen}
        value={filters}
        onApply={applyFilters}
        onClose={closeFilters}
        searches={searches}
        activeSearchId={activeSearchId}
        onSaveSearch={saveSearch}
        onUpdateSearch={updateSearch}
        onToggleAlerts={toggleSearchAlerts}
        onDeleteSearch={deleteSearch}
        onRemoveSearch={() => applyFilters(EMPTY_FILTERS)}
      />

      <Modal open={paywall} onClose={() => setPaywall(false)} className="sm:max-w-2xl">
        <div className="no-scrollbar overflow-y-auto p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold">You've used all your swipes</h2>
              <p className="mt-1 text-white/55">Pick a plan to keep swiping. Your wishlist and shortlist stay safe.</p>
            </div>
            <button onClick={() => setPaywall(false)} className="btn-ghost p-2" aria-label="Close">
              <X size={18} />
            </button>
          </div>
          <PlanCards onPurchased={() => setPaywall(false)} />
        </div>
      </Modal>
    </CompanyShell>
  );
}
