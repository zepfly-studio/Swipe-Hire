import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from './ui';
import SuggestionList, { handleListKeys } from './SuggestionList';
import { searchOptions } from '../lib/suggestions';

// Text input that suggests matching options while typing; free text is still allowed.
// `search` (optional) replaces the default matching, e.g. for locations.
export default function Autocomplete({ value, onChange, options, icon, placeholder, search, maxLength }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const items = useMemo(() => {
    if (!open) return [];
    // Once the value is a complete option, close the list so it doesn't cover the next field.
    const typed = String(value || '').trim().toLowerCase();
    if (options.some((o) => o.toLowerCase() === typed)) return [];
    return search ? search(typed) : searchOptions(options, typed);
  }, [open, options, value, search]);

  const pick = (item) => {
    onChange(item);
    setOpen(false);
    setActive(-1);
  };

  return (
    <div className="relative">
      <Input
        icon={icon}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => handleListKeys(e, { items, active, setActive, onPick: pick, onClose: () => setOpen(false) })}
      />
      <SuggestionList items={items} query={value || ''} active={active} onPick={pick} onHover={setActive} icon={Search} />
    </div>
  );
}
