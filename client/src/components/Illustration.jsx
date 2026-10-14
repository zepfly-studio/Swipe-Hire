import { cx } from '../lib/api';
import ThemeArt from './ThemeArt';

// Brand illustrations from /public/illustrations, used for empty and success states.
// Decorative: the heading next to it says the same thing, so alt is empty.
// `size` sets the width classes (kept separate so they don't clash with the default).
export default function Illustration({ name, size = 'w-56 sm:w-64', className }) {
  return (
    <ThemeArt
      name={name}
      loading="lazy"
      decoding="async"
      className={cx('mx-auto h-auto max-w-full select-none', size, className)}
    />
  );
}
