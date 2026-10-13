import { motion } from 'framer-motion';
import { cx } from '../lib/api';

// The official logo artwork (public/brand). `tagline` shows "Right swipe, right job." under it.
export default function Logo({ animated = false, tagline = false }) {
  return (
    <motion.img
      src={tagline ? '/brand/logo-tagline.webp' : '/brand/logo.webp'}
      alt="SwipeHire"
      width={tagline ? 623 : 374}
      height={tagline ? 160 : 96}
      draggable={false}
      className={cx('w-auto select-none', tagline ? 'h-16 sm:h-[76px]' : 'h-10')}
      initial={animated ? { opacity: 0, scale: 0.92 } : false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 220, damping: 18, delay: 0.1 }}
    />
  );
}
