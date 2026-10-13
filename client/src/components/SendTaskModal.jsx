import { useState } from 'react';
import { ClipboardList, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import { localInputValue } from './ScheduleInterviewModal';
import { Button, Field, Input, Textarea } from './ui';
import { api, cx, errorMessage } from '../lib/api';

// Deadline presets: N days from now at 11:59 pm.
function inDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(23, 59, 0, 0);
  return localInputValue(d);
}
const PRESETS = [
  { days: 1, label: '1 day' },
  { days: 3, label: '3 days' },
  { days: 7, label: '1 week' },
];

function Form({ candidate, onClose, onSent }) {
  const [form, setForm] = useState({ title: '', description: '', briefUrl: '', dueAt: inDays(3) });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const submit = async () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Give the task a title';
    if (!form.description.trim()) e.description = 'Describe what they should build';
    if (!form.dueAt || new Date(form.dueAt).getTime() < Date.now() + 60 * 60 * 1000) e.dueAt = 'Pick a deadline at least 1 hour from now';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      await api.post('/tasks', {
        candidateId: candidate.id,
        jobId: candidate.jobId ?? candidate.job?.id,
        title: form.title,
        description: form.description,
        briefUrl: form.briefUrl,
        dueAt: new Date(form.dueAt).toISOString(),
      });
      toast.success(`Task sent to ${candidate.name.split(' ')[0]}`);
      onSent?.();
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
          <h2 className="text-xl font-extrabold">Send a task</h2>
          <p className="text-sm text-white/50">To {candidate.name} · they submit a live link and GitHub repo before the deadline</p>
        </div>
        <button onClick={onClose} className="btn-ghost p-2" aria-label="Close">
          <X size={18} />
        </button>
      </div>
      <div className="no-scrollbar flex-1 space-y-5 overflow-y-auto p-5">
        <Field label="Task title" error={errors.title}>
          <Input value={form.title} onChange={set('title')} maxLength={120} placeholder="Build a to-do app with login" />
        </Field>
        <Field label="What should they build?" error={errors.description} hint="Requirements, tech stack, what you will check">
          <Textarea
            value={form.description}
            onChange={set('description')}
            maxLength={5000}
            rows={6}
            placeholder={'- React front end, any backend\n- Users can add, edit and delete tasks\n- Deploy it and share the live link + GitHub repo'}
          />
        </Field>
        <Field label="Reference link" error={errors.briefUrl} hint="Optional: a brief, Figma design or doc">
          <Input value={form.briefUrl} onChange={set('briefUrl')} placeholder="https://figma.com/…" />
        </Field>
        <Field label="Deadline" error={errors.dueAt} as="div">
          <div className="mb-2 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.days}
                type="button"
                onClick={() => setForm((f) => ({ ...f, dueAt: inDays(p.days) }))}
                className={cx('chip px-3.5 py-1.5 text-sm', form.dueAt === inDays(p.days) && 'bg-brand-500 text-white')}
              >
                {p.label}
              </button>
            ))}
          </div>
          <input
            type="datetime-local"
            value={form.dueAt}
            min={localInputValue(new Date())}
            onChange={set('dueAt')}
            className="input"
            aria-label="Deadline"
          />
        </Field>
      </div>
      <div className="border-t border-white/10 p-4">
        <Button className="btn-primary w-full" onClick={submit} loading={saving}>
          <ClipboardList size={18} />
          Send task
        </Button>
      </div>
    </>
  );
}

export default function SendTaskModal({ candidate, onClose, onSent }) {
  return (
    <Modal open={Boolean(candidate)} onClose={onClose}>
      {candidate && <Form candidate={candidate} onClose={onClose} onSent={onSent} />}
    </Modal>
  );
}
