import { cx } from '../lib/api';

// Brand illustrations from /public/illustrations, used for empty and success states.
// Decorative: the heading next to it says the same thing, so alt is empty.
// `size` sets the width classes (kept separate so they don't clash with the default).
export default function Illustration({ name, size = 'w-56 sm:w-64', className }) {
  return (
    <img
      src={`/illustrations/${name}.webp`}
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
      className={cx('mx-auto h-auto max-w-full select-none', size, className)}
    />
  );
}
