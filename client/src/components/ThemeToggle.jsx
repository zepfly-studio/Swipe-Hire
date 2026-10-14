import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { currentTheme, setTheme } from '../lib/theme';
import { cx } from '../lib/api';

// Sun/moon button that switches between the light and dark theme.
export default function ThemeToggle({ className }) {
  const [theme, setLocal] = useState(currentTheme);
  useEffect(() => {
    const sync = (e) => setLocal(e.detail);
    window.addEventListener('swipehire:theme', sync);
    return () => window.removeEventListener('swipehire:theme', sync);
  }, []);
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className={cx('btn-ghost relative grid h-10 w-10 place-items-center overflow-hidden p-0', className)}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ y: 14, opacity: 0, rotate: -40 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: -14, opacity: 0, rotate: 40 }}
          transition={{ duration: 0.2 }}
        >
          {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
