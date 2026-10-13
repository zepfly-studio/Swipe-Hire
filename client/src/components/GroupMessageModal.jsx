import { useState } from 'react';
import { Send, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Avatar from './Avatar';
import Modal from './Modal';
import { Button, Textarea } from './ui';
import { api, errorMessage } from '../lib/api';

function Form({ recipients, onClose, onSent }) {
  const [list, setList] = useState(recipients);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!text.trim()) return setError('Write a message first');
    if (!list.length) return setError('Choose at least one candidate');
    setSending(true);
    try {
      const { data } = await api.post('/chats/bulk', { candidateIds: list.map((c) => c.id), text });
      toast.success(`Message sent to ${data.sent} candidate${data.sent === 1 ? '' : 's'}`);
      onSent(list.filter((c) => !data.skipped.includes(c.id)).map((c) => c.id));
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
        <div>
          <h2 className="text-xl font-extrabold">
            Message {list.length} candidate{list.length === 1 ? '' : 's'}
          </h2>
          <p className="text-sm text-white/50">Each one gets it as a private chat message and an email.</p>
        </div>
        <button onClick={onClose} className="btn-ghost p-2" aria-label="Close">
          <X size={18} />
        </button>
      </div>
      <div className="no-scrollbar flex-1 space-y-5 overflow-y-auto p-5">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">To</p>
          <div className="flex flex-wrap gap-2">
            {list.map((c) => (
              <span key={c.id} className="flex items-center gap-2 rounded-full bg-white/[0.06] py-1 pl-1 pr-2 text-sm">
                <Avatar src={c.avatarUrl} name={c.name} size="xs" />
                {c.name}
                {list.length > 1 && (
                  <button onClick={() => setList((l) => l.filter((x) => x.id !== c.id))} className="text-white/40 hover:text-white" aria-label={`Remove ${c.name}`}>
                    <X size={14} />
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">Message</span>
          <Textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setError('');
            }}
            maxLength={2000}
            rows={6}
            placeholder={'Hi! Thanks for your interest in the role.\nWe would like to invite you for an interview next week. Please reply with your availability.'}
          />
        </label>
        <p className="text-xs text-white/45">Candidates will see your company name with this message, and can reply in Messages.</p>
        {error && <p className="text-sm font-medium text-brand-400">{error}</p>}
      </div>
      <div className="border-t border-white/10 p-4">
        <Button className="btn-primary w-full" onClick={send} loading={sending}>
          <Send size={17} />
          Send to {list.length} candidate{list.length === 1 ? '' : 's'}
        </Button>
      </div>
    </>
  );
}

// Company -> several shortlisted candidates at once (selected on the Shortlisted page).
export default function GroupMessageModal({ recipients, onClose, onSent }) {
  // Keep the last list while the closing animation plays, and give every opening a fresh
  // form: reopening during that animation must not bring back the old recipients and text.
  const [shown, setShown] = useState(null);
  if (recipients?.length && recipients !== shown?.list) setShown({ list: recipients, key: (shown?.key ?? 0) + 1 });
  return (
    <Modal open={Boolean(recipients?.length)} onClose={onClose}>
      {shown && <Form key={shown.key} recipients={shown.list} onClose={onClose} onSent={onSent} />}
    </Modal>
  );
}
