import { useState } from 'react';
import { cx, fileUrl } from '../lib/api';

const SIZES = { xs: 'h-8 w-8 text-[11px]', sm: 'h-10 w-10 text-sm', md: 'h-12 w-12 text-base', lg: 'h-14 w-14 text-lg', xl: 'h-24 w-24 text-3xl' };

export const initialsOf = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

// Photo (or company logo) with an initials fallback. `company` uses the green style.
export default function Avatar({ src, name, size = 'md', company = false, className }) {
  const [broken, setBroken] = useState(false);
  const shape = company ? 'rounded-2xl' : 'rounded-full';
  if (src && !broken) {
    return (
      <img
        src={fileUrl(src)}
        alt={name ? `${name}` : ''}
        onError={() => setBroken(true)}
        className={cx('shrink-0 bg-white/10 object-cover', shape, SIZES[size], company && 'bg-[#fff] object-contain p-0.5', className)}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cx(
        'grid shrink-0 place-items-center font-extrabold',
        shape,
        SIZES[size],
        company ? 'bg-linear-to-br from-emerald-400 to-sky-400 text-ink-950' : 'bg-linear-to-br from-brand-500 to-violet-brand',
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
