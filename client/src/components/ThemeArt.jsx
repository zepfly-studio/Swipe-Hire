import { motion } from 'framer-motion';
import { cx } from '../lib/api';

// Artwork with one file per theme: `${name}-light.webp` and `${name}.webp` (dark).
// Both are rendered and CSS (.light-only / .dark-only) shows the one that fits the theme,
// so switching themes needs no re-render. Both files share the same size.
export default function ThemeArt({ name, animated = false, className, alt = '', ...props }) {
  const Img = animated ? motion.img : 'img';
  return ['light', 'dark'].map((t) => (
    <Img
      key={t}
      src={`/illustrations/${name}${t === 'light' ? '-light' : ''}.webp`}
      alt={alt}
      draggable={false}
      {...props}
      className={cx(`${t}-only`, className)}
    />
  ));
}
