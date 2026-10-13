import { useRef } from 'react';
import { motion, animate, useDragControls, useIsPresent, useMotionValue, useTransform } from 'framer-motion';
import { Briefcase, ChevronsDown, Heart, IndianRupee, Maximize2, MapPin } from 'lucide-react';
import { PdfFirstPage } from './Pdf';
import Avatar from './Avatar';
import { CandidateDetails, MatchBadge, expLabel, expectedSalaryLabel } from './CandidateDetails';
import { useElementWidth } from '../hooks/useElementWidth';
import { cx, fileUrl } from '../lib/api';

const SWIPE_OFFSET = 100;
const SWIPE_VELOCITY = 500;

const variants = {
  enter: { scale: 0.8, y: 60, opacity: 0 },
  exit: (dir) => ({
    x: dir * (typeof window === 'undefined' ? 900 : window.innerWidth * 0.6 + 400),
    opacity: 0,
    transition: { duration: 0.45, ease: [0.4, 0, 0.6, 1] },
  }),
};

// The top card sits in normal page flow so the whole page scrolls through the
// resume, video and details. Cards behind it (and a card flying out) are absolute.
// `enterFrom` (1 / -1) makes an undone card fly back in from the side it left.
export default function SwipeCard({ c, depth, onSwipe, onOpenResume, onToggleWish, enterFrom = 0 }) {
  const isPresent = useIsPresent();
  const isTop = depth === 0;
  const inFlow = isTop && isPresent;

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-320, 0, 320], [-9, 0, 9]);
  const likeOpacity = useTransform(x, [20, SWIPE_OFFSET], [0, 1]);
  const passOpacity = useTransform(x, [-SWIPE_OFFSET, -20], [1, 0]);
  const likeTint = useTransform(x, [0, 200], [0, 0.22]);
  const passTint = useTransform(x, [-200, 0], [0.22, 0]);

  const controls = useDragControls();
  const dragging = useRef(false);
  const lastTap = useRef(0);
  const [pdfRef, pdfWidth] = useElementWidth();

  const onDragEnd = (_, info) => {
    setTimeout(() => (dragging.current = false), 60);
    const { offset, velocity } = info;
    let dir = 0;
    if (offset.x > SWIPE_OFFSET || (velocity.x > SWIPE_VELOCITY && offset.x > 40)) dir = 1;
    else if (offset.x < -SWIPE_OFFSET || (velocity.x < -SWIPE_VELOCITY && offset.x < -40)) dir = -1;
    if (dir && onSwipe(dir) !== false) return;
    animate(x, 0, { type: 'spring', stiffness: 520, damping: 34 });
  };

  // Double click on desktop, double tap on phones.
  const onResumeTap = () => {
    if (dragging.current) return;
    const now = Date.now();
    if (now - lastTap.current < 330) {
      lastTap.current = 0;
      onOpenResume(c);
    } else {
      lastTap.current = now;
    }
  };

  return (
    <motion.div
      className={cx(
        'w-full touch-pan-y origin-[50%_35vh]',
        inFlow ? 'relative' : 'absolute inset-x-0 top-0',
        !isTop && 'bottom-0',
      )}
      style={{ x, rotate, zIndex: 30 - depth }}
      drag={isTop ? 'x' : false}
      dragControls={controls}
      dragListener={false}
      dragMomentum={false}
      dragDirectionLock
      onDragStart={() => (dragging.current = true)}
      onDragEnd={onDragEnd}
      onPointerDown={(e) => {
        if (isTop && !e.target.closest('video, button, a')) controls.start(e);
      }}
      variants={variants}
      initial={enterFrom ? { x: enterFrom * 700, opacity: 0, scale: 1, y: 0 } : 'enter'}
      animate={{ scale: 1 - depth * 0.05, y: depth * 16, opacity: depth > 2 ? 0 : 1, ...(enterFrom ? { x: 0 } : {}) }}
      exit="exit"
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
    >
      {/* overflow-clip (not hidden) so the sticky header can stick to the page */}
      <div
        className={cx(
          'relative select-none overflow-clip rounded-[30px] border border-white/10 bg-ink-800 shadow-2xl shadow-black/60',
          isTop ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none h-full',
        )}
      >
        <header className="sticky top-16 z-20 border-b border-white/5 bg-ink-800/90 px-5 pb-4 pt-5 backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <Avatar src={c.avatarUrl} name={c.name} size="lg" />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-2xl font-extrabold tracking-tight">{c.name}</h2>
              <p className="truncate text-sm font-medium text-white/60">{c.headline}</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={() => onToggleWish(c)}
              aria-label={c.wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              className={cx(
                'grid h-11 w-11 shrink-0 place-items-center rounded-full transition-colors',
                c.wishlisted ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/40' : 'bg-white/[0.07] text-white/70 hover:text-white',
              )}
            >
              <motion.span key={String(c.wishlisted)} initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 14 }}>
                <Heart size={20} fill={c.wishlisted ? 'currentColor' : 'none'} />
              </motion.span>
            </motion.button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <MatchBadge score={c.matchScore} />
            {c.location && (
              <span className="chip">
                <MapPin size={12} />
                {c.location}
              </span>
            )}
            {c.experienceYears != null && (
              <span className="chip">
                <Briefcase size={12} />
                {expLabel(c.experienceYears)}
              </span>
            )}
            {c.expectedSalary != null && (
              <span className="chip">
                <IndianRupee size={12} />
                {expectedSalaryLabel(c).replace('₹', '')}
              </span>
            )}
          </div>

          {/* Stamps hang below the sticky header so they stay in view while scrolled */}
          <motion.div
            style={{ opacity: likeOpacity }}
            className="pointer-events-none absolute left-5 top-full mt-6 -rotate-12 rounded-2xl border-[5px] border-emerald-400 bg-ink-900/50 px-4 py-1 text-3xl font-black tracking-[0.15em] text-emerald-400"
          >
            SHORTLIST
          </motion.div>
          <motion.div
            style={{ opacity: passOpacity }}
            className="pointer-events-none absolute right-5 top-full mt-6 rotate-12 rounded-2xl border-[5px] border-brand-500 bg-ink-900/50 px-4 py-1 text-3xl font-black tracking-[0.15em] text-brand-500"
          >
            PASS
          </motion.div>
        </header>

        <div className="space-y-6 p-4 pb-8">
          <div
            ref={pdfRef}
            onClick={onResumeTap}
            className="group relative cursor-zoom-in overflow-hidden rounded-2xl bg-[#fff] ring-1 ring-white/10"
            style={{ aspectRatio: '1 / 1.3' }}
          >
            {/* Cards waiting behind preload their resume so it is ready when they reach the top. */}
            {depth <= 2 && c.resumeUrl ? <PdfFirstPage file={fileUrl(c.resumeUrl)} width={pdfWidth} /> : null}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-black/50 to-transparent" />
            <span className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-black/75 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur transition group-hover:bg-brand-500">
              <Maximize2 size={13} />
              Double-tap to open resume
            </span>
          </div>

          {isTop && (
            <>
              <motion.p
                className="flex items-center justify-center gap-1.5 text-xs font-semibold text-white/40"
                animate={{ y: [0, 5, 0] }}
                transition={{ duration: 1.6, repeat: Infinity }}
              >
                <ChevronsDown size={15} />
                Scroll down for intro video & details
              </motion.p>
              <CandidateDetails c={c} />
            </>
          )}
        </div>

        <motion.div className="pointer-events-none absolute inset-0 z-10 bg-emerald-400" style={{ opacity: likeTint }} />
        <motion.div className="pointer-events-none absolute inset-0 z-10 bg-brand-500" style={{ opacity: passTint }} />
      </div>
    </motion.div>
  );
}
