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

// Mark + "Glide Recruit" wordmark. `tagline` shows the client's full logo artwork instead
// (mark, wordmark and "Right glide, right job."; public/brand/logo-full.webp).
export default function Logo({ animated = false, tagline = false }) {
  const motionProps = {
    initial: animated ? { opacity: 0, scale: 0.92 } : false,
    animate: { opacity: 1, scale: 1 },
    transition: { type: 'spring', stiffness: 220, damping: 18, delay: 0.1 },
  };
  if (tagline) {
    return (
      <motion.img
        {...motionProps}
        src="/brand/logo-full.webp"
        alt="Glide Recruit · Right glide, right job."
        width={1344}
        height={395}
        draggable={false}
        className="h-16 w-auto select-none sm:h-24"
      />
    );
  }
  return (
    <motion.span {...motionProps} className="inline-flex select-none items-center gap-2.5" role="img" aria-label="Glide Recruit">
      <LogoMark className="size-10 shrink-0" />
      <span className="whitespace-nowrap text-xl font-extrabold leading-none tracking-tight" aria-hidden="true">
        <span className="text-white">Glide</span> <span className="text-brand-500">Recruit</span>
      </span>
    </motion.span>
  );
}
