import { useState } from 'react';
import { Bell, BellOff, Bookmark, Pencil, RotateCcw, Trash2, X } from 'lucide-react';
import Modal from './Modal';
import Autocomplete from './Autocomplete';
import LocationInput from './LocationInput';
import TagInput from './TagInput';
import { Button, ChipSelect, Field, Input, MultiChipSelect } from './ui';
import { cx, salaryHint, toLpa } from '../lib/api';
import { ROLES, searchRoles } from '../lib/suggestions';

export const EMPTY_FILTERS = {
  role: '',
  location: '',
  minExp: '',
  maxExp: '',
  minSalary: '',
  maxSalary: '',
  workMode: '',
  notice: [],
  skills: [],
};
const NOTICE = ['Immediate', '15 days', '30 days', '60 days', '90 days'];
const WORK_MODES = [
  { value: 'onsite', label: 'On-site' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'remote', label: 'Remote' },
];

export const countFilters = (f) =>
  [f.role, f.location, f.minExp, f.maxExp, f.minSalary, f.maxSalary, f.workMode].filter((v) => v !== '' && v != null).length +
  (f.notice?.length ? 1 : 0) +
  (f.skills?.length ? 1 : 0);

// Query params the /company/feed endpoint understands.
export function filterParams(f) {
  const p = {};
  const rawRole = (f.role || '').trim();
  if (rawRole) p.role = rawRole;

  const rawLocation = (f.location || '').trim();
  // "All India" is sent as is: it means "anywhere", and still counts as a filter.
  if (rawLocation) p.location = rawLocation;
  // Min above max (typed the wrong way round) would match nobody, so swap them.
  const range = (lo, hi) => (lo !== '' && hi !== '' && Number(lo) > Number(hi) ? [hi, lo] : [lo, hi]);
  const [minExp, maxExp] = range(f.minExp, f.maxExp);
  if (minExp !== '') p.minExp = minExp;
  if (maxExp !== '') p.maxExp = maxExp;
  const [minSalary, maxSalary] = range(f.minSalary === '' ? '' : toLpa(f.minSalary), f.maxSalary === '' ? '' : toLpa(f.maxSalary));
  if (minSalary !== '') p.minSalary = minSalary;
  if (maxSalary !== '') p.maxSalary = maxSalary;
  if (f.workMode) p.workMode = f.workMode;
  if (f.notice.length) p.notice = f.notice.join(',');
  if (f.skills.length) p.skills = f.skills.join(',');
  return p;
}

// Saved searches come back from the server with nulls; the form uses ''.
export const fromSaved = (s = {}) => ({
  ...EMPTY_FILTERS,
  role: s.role || '',
  location: s.location || '',
  minExp: s.minExp ?? '',
  maxExp: s.maxExp ?? '',
  minSalary: s.minSalary ?? '',
  maxSalary: s.maxSalary ?? '',
  workMode: s.workMode || '',
  notice: s.notice ?? [],
  skills: s.skills ?? [],
});

function SavedSearches({ searches, activeSearchId, onApply, onEdit, onToggleAlerts, onDelete, onRemove }) {
  if (!searches?.length) return null;
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">Saved searches</p>
      {searches.map((s) => (
        <div key={s.id} className={cx('space-y-2 rounded-xl px-3 py-3', activeSearchId === s.id ? 'bg-brand-500/10 ring-1 ring-brand-500/30' : 'bg-white/[0.04]')}>
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-sm font-semibold">{s.name}</p>
            <button
              type="button"
              onClick={() => onToggleAlerts(s)}
              className={cx('rounded-lg p-1.5', s.alerts ? 'text-amber-300' : 'text-white/30 hover:text-white')}
              title={s.alerts ? 'Alerts on: we notify you about new matches' : 'Alerts off'}
              aria-label={s.alerts ? `Turn off alerts for ${s.name}` : `Turn on alerts for ${s.name}`}
            >
              {s.alerts ? <Bell size={15} /> : <BellOff size={15} />}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="btn-primary px-3 py-1.5 text-xs" onClick={() => onApply(s)}>
              Apply
            </Button>
            <Button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={() => onEdit(s)}>
              <Pencil size={13} />
              Edit
            </Button>
            {activeSearchId === s.id && (
              <Button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={() => onRemove(s)}>
                Remove
              </Button>
            )}
            <Button type="button" className="btn-ghost px-3 py-1.5 text-xs text-danger" onClick={() => onDelete(s)}>
              <Trash2 size={13} />
              Delete
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Form({
  value,
  onApply,
  onClose,
  searches,
  activeSearchId,
  showSavedSearches = true,
  initialName = '',
  initialSearchId = '',
  onSaved,
  onSaveSearch,
  onUpdateSearch,
  onToggleAlerts,
  onDeleteSearch,
  onRemoveSearch,
}) {
  const [f, setF] = useState(value);
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [editingSearchId, setEditingSearchId] = useState(initialSearchId);
  const set = (k) => (e) => setF((cur) => ({ ...cur, [k]: e?.target ? e.target.value : e }));
  const canSave = countFilters(f) > 0 && name.trim();

  const save = async () => {
    setSaving(true);
    const ok = editingSearchId
      ? await onUpdateSearch(editingSearchId, name.trim(), f)
      : await onSaveSearch(name.trim(), f);
    setSaving(false);
    if (ok) {
      setName('');
      setEditingSearchId('');
      onSaved?.();
    }
  };

  const edit = (search) => {
    setF(fromSaved(search.filters));
    setName(search.name);
    setEditingSearchId(search.id);
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
        {showSavedSearches && (
          <SavedSearches
            searches={searches}
            activeSearchId={activeSearchId}
            onApply={(s) => onApply(fromSaved(s.filters), s.id)}
            onEdit={edit}
            onToggleAlerts={onToggleAlerts}
            onDelete={onDeleteSearch}
            onRemove={onRemoveSearch}
          />
        )}
        <Field label="Role / job title">
          <Autocomplete
            value={f.role}
            onChange={(role) => setF((current) => ({ ...current, role }))}
            options={ROLES}
            search={searchRoles}
            maxLength={80}
            placeholder="e.g. Web Developer"
          />
        </Field>
        <Field label="City">
          <LocationInput value={f.location} onChange={set('location')} placeholder="e.g. Jaipur, Delhi or All India" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Min experience (yrs)">
            <Input type="number" min={0} inputMode="decimal" value={f.minExp} onChange={set('minExp')} placeholder="Any" />
          </Field>
          <Field label="Max experience (yrs)">
            <Input type="number" min={0} inputMode="decimal" value={f.maxExp} onChange={set('maxExp')} placeholder="Any" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Min salary (LPA)">
            <Input type="number" min={0} inputMode="decimal" value={f.minSalary} onChange={set('minSalary')} placeholder="Any" />
          </Field>
          <Field
            label="Max salary (LPA)"
            hint={f.maxSalary === '' ? 'Hides people already earning more. Open-to-negotiate people up to 20% above are shown.' : salaryHint(f.maxSalary)}
          >
            <Input type="number" min={0} inputMode="decimal" value={f.maxSalary} onChange={set('maxSalary')} placeholder="Any" />
          </Field>
        </div>
        <Field label="Work mode" as="div">
          <ChipSelect layoutId="filter-work-mode" options={WORK_MODES} value={f.workMode} onChange={set('workMode')} />
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
            {editingSearchId ? 'Edit saved search' : 'Save this search & get alerts'}
          </p>
          <p className="mt-1 text-xs text-white/45">
            {editingSearchId ? 'Update the name and filter criteria for this saved search.' : "We'll notify you when a new candidate matching these filters joins."}
          </p>
          <div className="mt-3 flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="e.g. React devs in Jaipur" aria-label="Search name" />
            <Button className="btn-ghost shrink-0" onClick={save} loading={saving} disabled={!canSave}>
              {editingSearchId ? 'Update' : 'Save'}
            </Button>
          </div>
          {editingSearchId && (
            <Button
              type="button"
              className="btn-ghost mt-2 px-3 py-1.5 text-xs"
              onClick={() => {
                setEditingSearchId('');
                setName('');
                setF(value);
              }}
            >
              Cancel edit
            </Button>
          )}
          {countFilters(f) === 0 && <p className="mt-2 text-xs text-white/35">Set at least one filter first.</p>}
        </div>
      </div>
      <div className="flex gap-3 border-t border-white/10 p-4">
        <Button className="btn-ghost" onClick={() => setF(EMPTY_FILTERS)}>
          <RotateCcw size={16} />
          Clear
        </Button>
        <Button className="btn-primary flex-1" onClick={() => onApply(f)} disabled={countFilters(f) === 0}>
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
