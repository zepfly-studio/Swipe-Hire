import { useState } from 'react';
import { Flag, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import { Button, Field, Textarea } from './ui';
import { api, cx, errorMessage } from '../lib/api';

const REASONS = [
  ['fake', 'Fake profile or company'],
  ['scam', 'Scam or asking for money'],
  ['abuse', 'Abusive or rude behaviour'],
  ['spam', 'Spam'],
  ['inappropriate', 'Inappropriate content'],
  ['other', 'Something else'],
];

// Lets a user report another user to the Glide Recruit team. `target` = { id, name }.
export default function ReportModal({ target, onClose }) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!reason) return toast.error('Please choose a reason');
    setBusy(true);
    try {
      await api.post('/support/reports', { targetId: target.id, reason, details });
      toast.success('Thanks. Our team will look into it.');
      setReason('');
      setDetails('');
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={Boolean(target)} onClose={onClose}>
      {target && (
        <>
          <div className="flex items-center justify-between border-b border-white/10 p-5">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-extrabold">
                <Flag size={19} className="text-danger" /> Report {target.name}
              </h2>
              <p className="text-sm text-white/50">Only the Glide Recruit team sees this. {target.name} won’t be told who reported.</p>
            </div>
            <button onClick={onClose} className="btn-ghost p-2" aria-label="Close">
              <X size={18} />
            </button>
          </div>
          <div className="space-y-4 overflow-y-auto p-5">
            <Field label="Reason" as="div">
              <div className="grid gap-2 sm:grid-cols-2">
                {REASONS.map(([v, l]) => (
                  <button key={v} type="button" onClick={() => setReason(v)} className={cx('rounded-xl px-3 py-2.5 text-left text-sm font-semibold ring-1', reason === v ? 'bg-red-500/10 text-danger ring-red-500/30' : 'bg-white/[0.04] text-white/70 ring-white/10')}>
                    {l}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="What happened?" hint="Optional">
              <Textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} placeholder="Add anything that helps us check it" />
            </Field>
          </div>
          <div className="flex gap-3 border-t border-white/10 p-4">
            <button className="btn-ghost flex-1" onClick={onClose}>
              Cancel
            </button>
            <Button className="btn-primary flex-1" loading={busy} onClick={send}>
              Send report
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
