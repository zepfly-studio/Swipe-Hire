import { useState } from 'react';
import { MapPin, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import LocationInput from './LocationInput';
import Autocomplete from './Autocomplete';
import TagInput from './TagInput';
import { Button, ChipSelect, Field, Input, Textarea } from './ui';
import { api, errorMessage, salaryHint } from '../lib/api';
import { ROLES } from '../lib/suggestions';
import { JOB_TYPE_OPTIONS, WORK_MODE_OPTIONS } from '../lib/options';

const FIELDS = ['title', 'minExperience', 'maxExperience', 'salaryMin', 'salaryMax', 'jobLocation', 'openings', 'description'];

function initial(job, defaults) {
  const f = { requiredSkills: job?.requiredSkills ?? [], workMode: job?.workMode ?? 'onsite', jobType: job?.jobType ?? 'full-time' };
  for (const k of FIELDS) f[k] = job?.[k] ?? '';
  if (!job && defaults?.location) f.jobLocation = defaults.location;
  if (!job) f.openings = 1;
  return f;
}

function Form({ job, defaults, onClose, onSaved }) {
  const [form, setForm] = useState(() => initial(job, defaults));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const save = async () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Enter the role you are hiring for';
    if (!form.requiredSkills.length) e.requiredSkills = 'Add at least one skill';
    if (form.salaryMax === '') e.salaryMax = 'Enter the maximum salary';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      const { data } = job ? await api.put(`/company/jobs/${job.id}`, form) : await api.post('/company/jobs', form);
      toast.success(job ? 'Job updated' : 'Job posted! Start swiping for it.');
      onSaved(data.job);
      onClose();
    } catch (err) {
      const field = err.response?.data?.field;
      if (field) setErrors({ [field]: errorMessage(err) });
      else toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
        <div>
          <h2 className="text-xl font-extrabold">{job ? 'Edit job' : 'Post a new job'}</h2>
          <p className="text-sm text-white/50">Candidates are ranked against these requirements</p>
        </div>
        <button onClick={onClose} className="btn-ghost p-2" aria-label="Close">
          <X size={18} />
        </button>
      </div>
      <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto p-5">
        <Field label="Job title" error={errors.title}>
          <Autocomplete options={ROLES} value={form.title} onChange={set('title')} placeholder="e.g. Frontend Developer" />
        </Field>
        <Field label="Skills you need" error={errors.requiredSkills} hint="Candidates with these skills are shown first" as="div">
          <TagInput value={form.requiredSkills} onChange={set('requiredSkills')} placeholder="React, JavaScript…" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Min experience (yrs)" error={errors.minExperience}>
            <Input type="number" min={0} inputMode="decimal" value={form.minExperience} onChange={set('minExperience')} placeholder="0" />
          </Field>
          <Field label="Max experience (yrs)" error={errors.maxExperience}>
            <Input type="number" min={0} inputMode="decimal" value={form.maxExperience} onChange={set('maxExperience')} placeholder="5" />
          </Field>
          <Field label="Min salary (LPA)" error={errors.salaryMin} hint={salaryHint(form.salaryMin)}>
            <Input type="number" min={0} inputMode="decimal" value={form.salaryMin} onChange={set('salaryMin')} placeholder="3" />
          </Field>
          <Field label="Max salary (LPA)" error={errors.salaryMax} hint={salaryHint(form.salaryMax)}>
            <Input type="number" min={0} inputMode="decimal" value={form.salaryMax} onChange={set('salaryMax')} placeholder="8" />
          </Field>
          <Field label="Job location">
            <LocationInput value={form.jobLocation} onChange={set('jobLocation')} placeholder="Jaipur" />
          </Field>
          <Field label="Openings" error={errors.openings}>
            <Input type="number" min={1} inputMode="numeric" value={form.openings} onChange={set('openings')} />
          </Field>
        </div>
        <Field label="Work mode" as="div">
          <ChipSelect layoutId="job-work-mode" options={WORK_MODE_OPTIONS} value={form.workMode} onChange={set('workMode')} />
        </Field>
        <Field label="Job type" as="div">
          <ChipSelect layoutId="job-type" options={JOB_TYPE_OPTIONS} value={form.jobType} onChange={set('jobType')} />
        </Field>
        <Field label="Description" hint="Optional · shown to candidates you shortlist">
          <Textarea value={form.description} onChange={set('description')} maxLength={3000} placeholder="What will this person do? What's great about the team?" />
        </Field>
      </div>
      <div className="border-t border-white/10 p-4">
        <Button className="btn-primary w-full" onClick={save} loading={saving}>
          {job ? 'Save changes' : 'Post job'}
        </Button>
      </div>
    </>
  );
}

// `job` = edit that job; `job === 'new'` = create one.
export default function JobFormModal({ job, defaults, onClose, onSaved }) {
  return (
    <Modal open={Boolean(job)} onClose={onClose} className="sm:max-w-xl">
      {job && <Form job={job === 'new' ? null : job} defaults={defaults} onClose={onClose} onSaved={onSaved} />}
    </Modal>
  );
}
