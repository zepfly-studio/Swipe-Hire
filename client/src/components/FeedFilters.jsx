import { useState } from 'react';
import { Bell, BellOff, Bookmark, RotateCcw, Trash2, X } from 'lucide-react';
import Modal from './Modal';
import TagInput from './TagInput';
import { Button, Field, Input, MultiChipSelect } from './ui';
import { cx, salaryHint, toLpa } from '../lib/api';

export const EMPTY_FILTERS = { location: '', minExp: '', maxExp: '', maxSalary: '', notice: [], skills: [] };
const NOTICE = ['Immediate', '15 days', '30 days', '60 days', '90 days'];

export const countFilters = (f) =>
  [f.location, f.minExp, f.maxExp, f.maxSalary].filter((v) => v !== '' && v != null).length +
  (f.notice?.length ? 1 : 0) +
  (f.skills?.length ? 1 : 0);

// Query params the /company/feed endpoint understands.
export function filterParams(f) {
  const p = {};
  if (f.location.trim()) p.location = f.location.trim();
  if (f.minExp !== '') p.minExp = f.minExp;
  if (f.maxExp !== '') p.maxExp = f.maxExp;
  if (f.maxSalary !== '') p.maxSalary = toLpa(f.maxSalary);
  if (f.notice.length) p.notice = f.notice.join(',');
  if (f.skills.length) p.skills = f.skills.join(',');
  return p;
}

// Saved searches come back from the server with nulls; the form uses ''.
export const fromSaved = (s = {}) => ({
  location: s.location || '',
  minExp: s.minExp ?? '',
  maxExp: s.maxExp ?? '',
  maxSalary: s.maxSalary ?? '',
  notice: s.notice ?? [],
  skills: s.skills ?? [],
});

function SavedSearches({ searches, onApply, onToggleAlerts, onDelete }) {
  if (!searches?.length) return null;
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">Saved searches</p>
      {searches.map((s) => (
        <div key={s.id} className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2">
          <button onClick={() => onApply(s)} className="min-w-0 flex-1 truncate text-left text-sm font-semibold hover:text-brand-400">
            {s.name}
          </button>
          <button
            onClick={() => onToggleAlerts(s)}
            className={cx('rounded-lg p-1.5', s.alerts ? 'text-amber-300' : 'text-white/30 hover:text-white')}
            title={s.alerts ? 'Alerts on: we notify you about new matches' : 'Alerts off'}
            aria-label={s.alerts ? `Turn off alerts for ${s.name}` : `Turn on alerts for ${s.name}`}
          >
            {s.alerts ? <Bell size={15} /> : <BellOff size={15} />}
          </button>
          <button onClick={() => onDelete(s)} className="rounded-lg p-1.5 text-white/30 hover:text-brand-400" aria-label={`Delete ${s.name}`}>
            <Trash2 size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}

function Form({ value, onApply, onClose, searches, onSaveSearch, onToggleAlerts, onDeleteSearch }) {
  const [f, setF] = useState(value);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF((cur) => ({ ...cur, [k]: e?.target ? e.target.value : e }));
  const canSave = countFilters(f) > 0 && name.trim();

  const save = async () => {
    setSaving(true);
    const ok = await onSaveSearch(name.trim(), f);
    setSaving(false);
    if (ok) setName('');
  };

  return (
    <>
      <div className="flex items-center justify-between border-b border-white/10 p-5">
        <div>
          <h2 className="text-xl font-extrabold">Filter candidates</h2>
          <p className="text-sm text-white/50">Only matching candidates will appear in your stack</p>
        </div>
        <button onClick={onClose} className="btn-ghost p-2" aria-label="Close">
          <X size={18} />
        </button>
      </div>
      <div className="no-scrollbar flex-1 space-y-5 overflow-y-auto p-5">
        <SavedSearches
          searches={searches}
          onApply={(s) => onApply(fromSaved(s.filters))}
          onToggleAlerts={onToggleAlerts}
          onDelete={onDeleteSearch}
        />
        <Field label="City">
          <Input value={f.location} onChange={set('location')} placeholder="e.g. Jaipur (also matches preferred cities)" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Min experience (yrs)">
            <Input type="number" min={0} inputMode="decimal" value={f.minExp} onChange={set('minExp')} placeholder="Any" />
          </Field>
          <Field label="Max experience (yrs)">
            <Input type="number" min={0} inputMode="decimal" value={f.maxExp} onChange={set('maxExp')} placeholder="Any" />
          </Field>
        </div>
        <Field
          label="Your budget (max LPA)"
          hint={f.maxSalary === '' ? 'Shows candidates whose expected range starts at or below this, plus anyone open to negotiate' : salaryHint(f.maxSalary)}
        >
          <Input type="number" min={0} inputMode="decimal" value={f.maxSalary} onChange={set('maxSalary')} placeholder="Any" />
        </Field>
        <Field label="Notice period" as="div">
          <MultiChipSelect options={NOTICE} value={f.notice} onChange={set('notice')} />
        </Field>
        <Field label="Must have any of these skills" as="div">
          <TagInput value={f.skills} onChange={set('skills')} placeholder="React, Excel…" />
        </Field>
        <div className="rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/5">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Bookmark size={15} className="text-brand-400" />
            Save this search & get alerts
          </p>
          <p className="mt-1 text-xs text-white/45">We'll notify you when a new candidate matching these filters joins.</p>
          <div className="mt-3 flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="e.g. React devs in Jaipur" aria-label="Search name" />
            <Button className="btn-ghost shrink-0" onClick={save} loading={saving} disabled={!canSave}>
              Save
            </Button>
          </div>
          {countFilters(f) === 0 && <p className="mt-2 text-xs text-white/35">Set at least one filter first.</p>}
        </div>
      </div>
      <div className="flex gap-3 border-t border-white/10 p-4">
        <Button className="btn-ghost" onClick={() => setF(EMPTY_FILTERS)}>
          <RotateCcw size={16} />
          Clear
        </Button>
        <Button className="btn-primary flex-1" onClick={() => onApply(f)}>
          Show candidates
        </Button>
      </div>
    </>
  );
}

export default function FeedFilters({ open, onClose, ...rest }) {
  return (
    <Modal open={open} onClose={onClose}>
      {open && <Form onClose={onClose} {...rest} />}
    </Modal>
  );
}
