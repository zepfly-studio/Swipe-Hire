import { motion } from 'framer-motion';
import { cx } from '../lib/api';

// The brand mark: a white card with a green tick over a deep green card. Same artwork as
// public/brand/mark.svg (redrawn as a vector from the client's logo).
export function LogoMark({ className }) {
  return (
    <svg viewBox="110 130 1000 1000" className={className} aria-hidden="true">
      <rect x="175" y="385" width="610" height="610" rx="120" transform="rotate(-16 480 690)" fill="#0f4d42" />
      <rect x="392" y="272" width="640" height="640" rx="120" transform="rotate(16 712 592)" fill="#f7f8f7" stroke="#c3d4cc" strokeWidth="20" />
      <path d="M532 604 L642 718 L938 492" fill="none" stroke="#0d4a3b" strokeWidth="88" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Mark + "Glide Recruit" wordmark. `tagline` adds a line under the name.
export default function Logo({ animated = false, tagline = false }) {
  return (
    <motion.span
      className="inline-flex select-none items-center gap-2.5"
      initial={animated ? { opacity: 0, scale: 0.92 } : false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 220, damping: 18, delay: 0.1 }}
      role="img"
      aria-label="Glide Recruit"
    >
      <LogoMark className={cx('shrink-0', tagline ? 'size-12 sm:size-14' : 'size-10')} />
      <span className="flex flex-col leading-none" aria-hidden="true">
        <span className={cx('whitespace-nowrap font-extrabold tracking-tight', tagline ? 'text-2xl sm:text-[28px]' : 'text-xl')}>
          <span className="text-white">Glide</span> <span className="text-brand-500">Recruit</span>
        </span>
        {tagline && <span className="mt-1.5 text-xs font-medium text-white/50 sm:text-sm">Find the right people, faster.</span>}
      </span>
    </motion.span>
  );
}
