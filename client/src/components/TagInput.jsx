import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import SuggestionList, { handleListKeys } from './SuggestionList';
import { SKILLS, searchOptions } from '../lib/suggestions';

export default function TagInput({ value = [], onChange, options = SKILLS, placeholder = 'Type and press Enter' }) {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);

  const items = useMemo(
    () => (focused ? searchOptions(options, text, { exclude: value }) : []),
    [focused, options, text, value],
  );

  const add = (raw) => {
    const tag = raw.replace(/,/g, '').trim();
    setText('');
    setActive(-1);
    if (!tag || value.some((v) => v.toLowerCase() === tag.toLowerCase())) return;
    // Use the list's spelling when the typed text matches an option ("react" -> "React").
    const known = options.find((o) => o.toLowerCase() === tag.toLowerCase());
    onChange([...value, known || tag]);
  };
  const remove = (tag) => onChange(value.filter((v) => v !== tag));

  return (
    <div className="relative">
      <div className="input flex min-h-12 flex-wrap items-center gap-2 py-2">
        <AnimatePresence initial={false}>
          {value.map((tag) => (
            <motion.span
              layout
              key={tag}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="flex items-center gap-1 rounded-full bg-brand-500/15 py-1 pl-3 pr-1.5 text-sm font-medium text-brand-400 ring-1 ring-brand-500/30"
            >
              {tag}
              <button
                type="button"
                onClick={() => remove(tag)}
                className="rounded-full p-0.5 hover:bg-brand-500/20"
                aria-label={`Remove ${tag}`}
              >
                <X size={13} />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        <input
          value={text}
          autoComplete="off"
          onChange={(e) => {
            if (e.target.value.endsWith(',')) return add(e.target.value);
            setText(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (handleListKeys(e, { items, active, setActive, onPick: add, onClose: () => setActive(-1) })) return;
            if (e.key === 'Enter') {
              e.preventDefault();
              add(text);
            } else if (e.key === 'Backspace' && !text && value.length) {
              remove(value[value.length - 1]);
            }
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            add(text);
          }}
          placeholder={value.length ? 'Add more…' : placeholder}
          className="min-w-32 flex-1 bg-transparent py-1 outline-none placeholder:text-white/30"
        />
      </div>
      <SuggestionList items={items} query={text} active={active} onPick={add} onHover={setActive} icon={Plus} />
    </div>
  );
}
