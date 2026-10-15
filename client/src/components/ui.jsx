import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BadgeCheck, ChevronDown, LoaderCircle } from 'lucide-react';
import { cx } from '../lib/api';

export function Button({ loading, children, className = 'btn-primary', disabled, ...props }) {
  return (
    <motion.button
      whileHover={disabled || loading ? undefined : { y: -2 }}
      whileTap={disabled || loading ? undefined : { scale: 0.96 }}
      disabled={disabled || loading}
      className={className}
      {...props}
    >
      {loading && <LoaderCircle size={18} className="animate-spin" />}
      {children}
    </motion.button>
  );
}

export function Spinner({ className }) {
  return (
    <div className={cx('grid place-items-center', className)}>
      <LoaderCircle className="animate-spin text-brand-500" size={32} />
    </div>
  );
}

export function Field({ label, error, hint, children, className, as: Tag = 'label' }) {
  return (
    <Tag className={cx('block', className)}>
      {label && (
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">{label}</span>
      )}
      {children}
      <AnimatePresence initial={false}>
        {error && (
          <motion.span
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="block overflow-hidden pt-1 text-xs font-medium text-danger"
          >
            {error}
          </motion.span>
        )}
      </AnimatePresence>
      {hint && !error && <span className="block pt-1 text-xs text-white/40">{hint}</span>}
    </Tag>
  );
}

export function Input({ icon: Icon, className, right, ...props }) {
  return (
    <div className="relative">
      {Icon && <Icon size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />}
      <input {...props} className={cx('input', Icon && 'pl-10', right && 'pr-11', className)} />
      {right && <div className="absolute right-2 top-1/2 -translate-y-1/2">{right}</div>}
    </div>
  );
}

export function Select({ options, placeholder = 'Select', className, ...props }) {
  return (
    <div className="relative">
      <select {...props} className={cx('input appearance-none pr-10', !props.value && 'text-white/30', className)}>
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o} value={o} className="bg-ink-800 text-white">
            {o}
          </option>
        ))}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40" />
    </div>
  );
}

export function Textarea({ className, ...props }) {
  return <textarea {...props} className={cx('input min-h-24 resize-none', className)} />;
}

export function ChipSelect({ options, value, onChange, layoutId }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const opt = typeof o === 'string' ? { value: o, label: o } : o;
        const active = value === opt.value;
        return (
          <motion.button
            type="button"
            key={opt.value}
            whileTap={{ scale: 0.94 }}
            onClick={() => onChange(opt.value)}
            className={cx(
              'relative rounded-full px-4 py-2 text-sm font-medium transition-colors',
              active ? 'text-white' : 'bg-white/[0.05] text-white/60 hover:text-white',
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-full bg-linear-to-r from-brand-500 to-violet-brand"
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              />
            )}
            <span className="relative">{opt.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

// Pick several options (e.g. work modes). `value` is an array.
export function MultiChipSelect({ options, value = [], onChange }) {
  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const opt = typeof o === 'string' ? { value: o, label: o } : o;
        const active = value.includes(opt.value);
        return (
          <motion.button
            type="button"
            key={opt.value}
            whileTap={{ scale: 0.94 }}
            onClick={() => toggle(opt.value)}
            aria-pressed={active}
            className={cx(
              'rounded-full px-4 py-2 text-sm font-medium ring-1 transition-colors',
              active
                ? 'bg-brand-500/15 text-brand-400 ring-brand-500/50'
                : 'bg-white/[0.05] text-white/60 ring-transparent hover:text-white',
            )}
          >
            {opt.label}
          </motion.button>
        );
      })}
    </div>
  );
}

export function VerifiedBadge({ className }) {
  return (
    <span title="Verified company" className={cx('inline-flex shrink-0 items-center', className)}>
      <BadgeCheck size={17} className="fill-sky-400 text-ink-900" />
    </span>
  );
}

export const STAGE_STYLES = {
  shortlisted: { label: 'Shortlisted', cls: 'bg-white/10 text-white/80' },
  contacted: { label: 'Contacted', cls: 'bg-sky-400/15 text-sky-300' },
  task: { label: 'Task sent', cls: 'bg-violet-400/15 text-violet-300' },
  interview: { label: 'Interview', cls: 'bg-amber-300/15 text-amber-200' },
  hired: { label: 'Hired', cls: 'bg-emerald-400/15 text-emerald-300' },
  rejected: { label: 'Rejected', cls: 'bg-brand-500/15 text-brand-400' },
  closed: { label: 'Closed', cls: 'bg-white/5 text-white/40' },
};

export function StagePill({ stage, candidateView = false }) {
  const s = STAGE_STYLES[stage] ?? STAGE_STYLES.shortlisted;
  const label = candidateView && stage === 'hired' ? 'Selected 🎉' : s.label;
  return <span className={cx('rounded-full px-2.5 py-1 text-xs font-bold', s.cls)}>{label}</span>;
}

const BURST_COLORS = ['var(--color-brand-500)', '#2563eb', '#34d399', '#93c5fd', '#a7f3d0'];

// Confetti-style particle burst, centred on its parent.
export function Burst({ count = 22, distance = 140 }) {
  const parts = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
        const d = distance * (0.55 + Math.random() * 0.6);
        return {
          x: Math.cos(angle) * d,
          y: Math.sin(angle) * d,
          size: 5 + Math.random() * 7,
          rotate: Math.random() * 540,
          color: BURST_COLORS[i % BURST_COLORS.length],
          round: i % 3 === 0,
        };
      }),
    [count, distance],
  );
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2">
      {parts.map((p, i) => (
        <motion.span
          key={i}
          className={cx('absolute', p.round ? 'rounded-full' : 'rounded-[2px]')}
          style={{ width: p.size, height: p.size, background: p.color, marginLeft: -p.size / 2, marginTop: -p.size / 2 }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.3, rotate: 0 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 1, rotate: p.rotate }}
          transition={{ duration: 1.1, ease: [0.15, 0.8, 0.3, 1] }}
        />
      ))}
    </div>
  );
}

export function ProgressBar({ value }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <motion.div
        className="h-full rounded-full bg-linear-to-r from-brand-500 to-violet-brand"
        initial={false}
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ type: 'spring', stiffness: 120, damping: 22 }}
      />
    </div>
  );
}
