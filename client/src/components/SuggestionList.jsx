import { motion, AnimatePresence } from 'framer-motion';
import { cx } from '../lib/api';

// Bolds the words of `text` that start with one of the typed terms.
function Highlight({ text, query }) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  return text.split(/(\s+)/).map((part, i) => {
    const lower = part.toLowerCase();
    const term = terms.find((t) => lower.startsWith(t));
    if (!term) return <span key={i}>{part}</span>;
    return (
      <span key={i}>
        <b className="font-bold text-white">{part.slice(0, term.length)}</b>
        {part.slice(term.length)}
      </span>
    );
  });
}

export default function SuggestionList({ items, query, active, onPick, onHover, icon: Icon }) {
  return (
    <AnimatePresence>
      {items.length > 0 && (
        <motion.ul
          role="listbox"
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          // Ignore clicks while fading out so they reach the field underneath.
          exit={{ opacity: 0, y: -6, scale: 0.98, pointerEvents: 'none' }}
          transition={{ duration: 0.15 }}
          className="absolute inset-x-0 top-full z-30 mt-2 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-ink-800 p-1 shadow-2xl shadow-black/60"
        >
          {items.map((item, i) => (
            <li key={item} role="option" aria-selected={i === active}>
              <button
                type="button"
                // mousedown keeps focus in the input so blur handlers don't fire first
                onMouseDown={(e) => {
                  e.preventDefault();
                  onPick(item);
                }}
                onMouseEnter={() => onHover(i)}
                className={cx(
                  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                  i === active ? 'bg-brand-500/15 text-white' : 'text-white/70',
                )}
              >
                {Icon && <Icon size={15} className={i === active ? 'text-brand-400' : 'text-white/35'} />}
                <span className="truncate">
                  <Highlight text={item} query={query} />
                </span>
              </button>
            </li>
          ))}
        </motion.ul>
      )}
    </AnimatePresence>
  );
}

// Keyboard navigation shared by inputs that show a SuggestionList.
// Returns true when the key was handled.
export function handleListKeys(e, { items, active, setActive, onPick, onClose }) {
  if (!items.length) return false;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    setActive((active + 1) % items.length);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    setActive((active - 1 + items.length) % items.length);
  } else if (e.key === 'Enter' && active >= 0) {
    e.preventDefault();
    onPick(items[active]);
  } else if (e.key === 'Escape') {
    // Close just the suggestions, not the popup the field sits in.
    e.stopPropagation();
    onClose();
  } else {
    return false;
  }
  return true;
}
