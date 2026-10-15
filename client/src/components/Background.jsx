import { motion } from 'framer-motion';

const blob = (duration) => ({ duration, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' });

export default function Background() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink-950">
      <motion.div
        className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-brand-500/[0.07] blur-[130px]"
        animate={{ x: [0, 120, 40], y: [0, 80, 160] }}
        transition={blob(22)}
      />
      <motion.div
        className="absolute -right-40 top-1/4 h-[480px] w-[480px] rounded-full bg-sky-400/[0.06] blur-[130px]"
        animate={{ x: [0, -100, -20], y: [0, 120, -40] }}
        transition={blob(26)}
      />
      <motion.div
        className="absolute -bottom-48 left-1/4 h-[440px] w-[440px] rounded-full bg-brand-400/[0.04] blur-[130px]"
        animate={{ x: [0, 140, -60], y: [0, -60, 0] }}
        transition={blob(30)}
      />
      <div className="bg-grid absolute inset-0 opacity-[0.035]" />
    </div>
  );
}
