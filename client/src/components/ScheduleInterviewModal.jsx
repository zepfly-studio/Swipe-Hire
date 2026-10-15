import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarPlus, Plus, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import { Button, ChipSelect, Field, Input, Textarea } from './ui';
import { api, errorMessage } from '../lib/api';

// Value for <input type="datetime-local"> in the user's own timezone.
export function localInputValue(date) {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
}

function defaultSlot(daysAhead) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(11, 0, 0, 0);
  return localInputValue(d);
}

const MODES = [
  { value: 'video', label: 'Video call' },
  { value: 'phone', label: 'Phone' },
  { value: 'in-person', label: 'In person' },
];

function Form({ candidate, onClose, onScheduled }) {
  const [slots, setSlots] = useState([defaultSlot(1), defaultSlot(2)]);
  const [duration, setDuration] = useState(30);
  const [mode, setMode] = useState('video');
  const [location, setLocation] = useState('');
  const [link, setLink] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    const filled = slots.filter(Boolean);
    if (!filled.length) return setError('Add at least one time slot');
    if (filled.some((s) => new Date(s).getTime() < Date.now() + 15 * 60000)) return setError('Time slots must be in the future');
    if (mode === 'in-person' && !location.trim()) return setError('Please add the interview address');
    setSaving(true);
    try {
      await api.post('/interviews', {
        candidateId: candidate.id,
        jobId: candidate.jobId ?? candidate.job?.id,
        slots: filled.map((s) => new Date(s).toISOString()),
        durationMins: duration,
        mode,
        location,
        meetingLink: link,
        note,
      });
      toast.success(`Interview invite sent to ${candidate.name.split(' ')[0]}`);
      onScheduled?.();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
        <div>
          <h2 className="text-xl font-extrabold">Schedule interview</h2>
          <p className="text-sm text-white/50">With {candidate.name} · they pick the time that suits them</p>
        </div>
        <button onClick={onClose} className="btn-ghost p-2" aria-label="Close">
          <X size={18} />
        </button>
      </div>
      <div className="no-scrollbar flex-1 space-y-5 overflow-y-auto p-5">
        <Field label="Time options (up to 3)" as="div">
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {slots.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex gap-2"
                >
                  <input
                    type="datetime-local"
                    value={s}
                    min={localInputValue(new Date())}
                    onChange={(e) => setSlots((all) => all.map((x, j) => (j === i ? e.target.value : x)))}
                    className="input flex-1"
                    aria-label={`Time option ${i + 1}`}
                  />
                  {slots.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setSlots((all) => all.filter((_, j) => j !== i))}
                      className="btn-ghost px-3"
                      aria-label="Remove time option"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            {slots.length < 3 && (
              <button
                type="button"
                onClick={() => setSlots((all) => [...all, defaultSlot(all.length + 1)])}
                className="flex items-center gap-1.5 text-sm font-semibold text-brand-400 hover:text-brand-500"
              >
                <Plus size={15} />
                Add another time
              </button>
            )}
          </div>
        </Field>
        <Field label="Duration" as="div">
          <ChipSelect
            layoutId="iv-duration"
            options={[15, 30, 45, 60].map((m) => ({ value: m, label: `${m} min` }))}
            value={duration}
            onChange={setDuration}
          />
        </Field>
        <Field label="Interview type" as="div">
          <ChipSelect layoutId="iv-mode" options={MODES} value={mode} onChange={setMode} />
        </Field>
        {mode === 'video' && (
          <Field label="Meeting link" hint="Leave empty and we'll create a free Jitsi video room for you">
            <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://meet.google.com/..." />
          </Field>
        )}
        {mode === 'in-person' && (
          <Field label="Office address">
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="2nd floor, Tower B, Malviya Nagar, Jaipur" />
          </Field>
        )}
        <Field label="Note for the candidate" hint="Optional">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Please bring your portfolio" />
        </Field>
        {error && <p className="text-sm font-medium text-danger">{error}</p>}
      </div>
      <div className="border-t border-white/10 p-4">
        <Button className="btn-primary w-full" onClick={submit} loading={saving}>
          <CalendarPlus size={18} />
          Send invite
        </Button>
      </div>
    </>
  );
}

export default function ScheduleInterviewModal({ candidate, onClose, onScheduled }) {
  return (
    <Modal open={Boolean(candidate)} onClose={onClose}>
      {candidate && <Form candidate={candidate} onClose={onClose} onScheduled={onScheduled} />}
    </Modal>
  );
}
