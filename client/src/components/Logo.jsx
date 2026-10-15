import { motion } from 'framer-motion';
import { cx } from '../lib/api';

// The brand mark: a green tile with a rising "glide" arrow. Same artwork as public/brand/mark.svg.
export function LogoMark({ className }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="gr-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#13805f" />
          <stop offset="1" stopColor="#0a4d3a" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="13" fill="url(#gr-mark)" />
      <path d="M12 31.5 21 22.5l5.5 5.5L36 18.5" fill="none" stroke="#fff" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M28.5 17.5H36.5V25.5" fill="none" stroke="#7dd3a8" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
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
      <LogoMark className={cx('shrink-0', tagline ? 'size-12 sm:size-14' : 'size-9')} />
      <span className="flex flex-col leading-none" aria-hidden="true">
        <span className={cx('whitespace-nowrap font-extrabold tracking-tight', tagline ? 'text-2xl sm:text-[28px]' : 'text-xl')}>
          <span className="text-white">Glide</span> <span className="text-brand-500">Recruit</span>
        </span>
        {tagline && <span className="mt-1.5 text-xs font-medium text-white/50 sm:text-sm">Find the right people, faster.</span>}
      </span>
    </motion.span>
  );
}
