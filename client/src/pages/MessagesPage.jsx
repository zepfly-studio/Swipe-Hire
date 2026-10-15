import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CalendarPlus, Check, CheckCheck, MessageCircle, Search, Send, SquarePen, X } from 'lucide-react';
import toast from 'react-hot-toast';
import AppShell from '../components/AppShell';
import Avatar from '../components/Avatar';
import CompanyModal from '../components/CompanyModal';
import Illustration from '../components/Illustration';
import Modal from '../components/Modal';
import ScheduleInterviewModal from '../components/ScheduleInterviewModal';
import { timeAgo } from '../components/NotificationBell';
import { Input, Spinner, StagePill, VerifiedBadge } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { usePoll } from '../hooks/usePoll';
import { api, cx, errorMessage } from '../lib/api';

const timeOf = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
const dayOf = (d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });


function ConversationList({ conversations, activeId, onPick, isCompany }) {
  if (!conversations) return <Spinner className="py-16" />;
  if (!conversations.length) {
    return (
      <div className="px-6 py-16 text-center">
        <Illustration name="no-messages" />
        <p className="mt-3 font-semibold">No conversations yet</p>
        <p className="mt-1 text-sm text-white/45">
          {isCompany
            ? 'Message a candidate from your Shortlisted page, or tap New message.'
            : 'When a company messages you, the chat shows up here.'}
        </p>
        {isCompany && (
          <Link to="/company/shortlisted" className="btn-primary mt-5 py-2.5 text-sm">
            Open shortlisted
          </Link>
        )}
      </div>
    );
  }
  return (
    <ul className="divide-y divide-white/5">
      {conversations.map((c) => (
        <li key={c.id}>
          <button
            onClick={() => onPick(c.id)}
            className={cx('flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/5', activeId === c.id && 'bg-white/[0.07]')}
          >
            <Avatar src={c.avatarUrl} name={c.name} company={!isCompany} size="md" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className={cx('truncate', c.unread ? 'font-bold' : 'font-semibold')}>{c.name}</span>
                {c.verified && <VerifiedBadge />}
              </span>
              <span className={cx('block truncate text-sm', c.unread ? 'text-white/85' : 'text-white/45')}>
                {c.lastMessage ? `${c.lastMessage.mine ? 'You: ' : ''}${c.lastMessage.text}` : c.subtitle}
              </span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1.5">
              <span className="text-[11px] text-white/35">{c.lastMessage ? timeAgo(c.lastMessage.at) : 'new'}</span>
              {c.unread > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-500 px-1 text-[10px] font-bold">{c.unread}</span>
              )}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Thread({ otherId, isCompany, onBack, onSent }) {
  const [data, setData] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const bottom = useRef(null);
  const lastCount = useRef(0);

  const load = () =>
    api
      .get(`/chats/${otherId}`)
      .then(({ data: d }) => setData(d))
      .catch((err) => toast.error(errorMessage(err), { id: 'chat-load' }));
  usePoll(load, 4000, [otherId]);

  useEffect(() => {
    setData(null);
    lastCount.current = 0;
  }, [otherId]);

  // Jump to the newest message whenever one arrives.
  useLayoutEffect(() => {
    const n = data?.messages.length ?? 0;
    if (n !== lastCount.current) bottom.current?.scrollIntoView({ block: 'end', behavior: lastCount.current ? 'smooth' : 'auto' });
    lastCount.current = n;
  }, [data]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const { data: d } = await api.post(`/chats/${otherId}`, { text: body });
      setText('');
      setData((cur) => (cur ? { ...cur, messages: [...cur.messages, d.message] } : cur));
      onSent?.();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  if (!data) return <Spinner className="flex-1" />;
  const other = data.with;

  // Group messages under day headers.
  let lastDay = '';
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <button onClick={onBack} className="btn-ghost p-2 md:hidden" aria-label="Back to conversations">
          <ArrowLeft size={18} />
        </button>
        {/* Candidates can tap the company to see its details. */}
        <button
          type="button"
          disabled={isCompany}
          onClick={() => setAboutOpen(true)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-default"
          aria-label={isCompany ? undefined : `About ${other.name}`}
        >
          <Avatar src={other.avatarUrl} name={other.name} company={!isCompany} size="md" />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 truncate font-bold">
              {other.name}
              {other.verified && <VerifiedBadge />}
            </span>
            <span className="block truncate text-xs text-white/45">{isCompany ? other.subtitle : 'Tap for company details'}</span>
          </span>
        </button>
        {isCompany && (
          <button onClick={() => setScheduling(true)} className="btn-ghost px-3 py-2 text-sm" title="Schedule interview">
            <CalendarPlus size={16} />
            <span className="hidden sm:inline">Interview</span>
          </button>
        )}
      </div>

      <div className="no-scrollbar flex-1 space-y-1.5 overflow-y-auto px-4 py-4">
        {data.messages.length === 0 && (
          <p className="py-10 text-center text-sm text-white/40">
            {isCompany ? `Say hello to ${other.name.split(' ')[0]} 👋` : 'No messages yet. Say hello!'}
          </p>
        )}
        <AnimatePresence initial={false}>
          {data.messages.map((m) => {
            const day = dayOf(m.at);
            const header = day !== lastDay ? day : null;
            lastDay = day;
            return (
              <div key={m.id}>
                {header && <p className="py-3 text-center text-[11px] font-semibold text-white/35">{header}</p>}
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={cx('flex', m.mine ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cx(
                      'max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[15px]',
                      m.mine ? 'rounded-br-md bg-linear-to-br from-brand-500 to-violet-brand' : 'rounded-bl-md bg-white/[0.08]',
                    )}
                  >
                    {m.text}
                    <span className={cx('mt-0.5 flex items-center justify-end gap-1 text-[10px]', m.mine ? 'text-[#fff]/75' : 'text-white/40')}>
                      {timeOf(m.at)}
                      {m.mine && (m.read ? <CheckCheck size={12} /> : <Check size={12} />)}
                    </span>
                  </div>
                </motion.div>
              </div>
            );
          })}
        </AnimatePresence>
        <div ref={bottom} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-end gap-2 border-t border-white/10 p-3"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          maxLength={2000}
          placeholder="Type a message…"
          className="input max-h-32 min-h-11 flex-1 resize-none py-2.5"
          aria-label="Message"
        />
        <motion.button
          whileTap={{ scale: 0.9 }}
          type="submit"
          disabled={!text.trim() || sending}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-linear-to-br from-brand-500 to-violet-brand disabled:opacity-40"
          aria-label="Send"
        >
          <Send size={18} />
        </motion.button>
      </form>

      {!isCompany && <CompanyModal companyId={aboutOpen ? otherId : null} onClose={() => setAboutOpen(false)} />}
      <ScheduleInterviewModal candidate={scheduling ? { id: otherId, name: other.name } : null} onClose={() => setScheduling(false)} />
    </div>
  );
}

// "New message": everyone you can chat with (shortlisted pairs), searchable.
function NewMessageModal({ open, onClose, onPick, isCompany }) {
  const [contacts, setContacts] = useState(null);
  const [q, setQ] = useState('');
  useEffect(() => {
    if (!open) return;
    setQ('');
    setContacts(null);
    api
      .get('/chats/contacts')
      .then(({ data }) => setContacts(data.contacts))
      .catch((err) => {
        toast.error(errorMessage(err));
        setContacts([]);
      });
  }, [open]);
  const shown = contacts?.filter((c) => `${c.name} ${c.subtitle ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
        <div>
          <h2 className="text-xl font-extrabold">New message</h2>
          <p className="text-sm text-white/50">{isCompany ? 'Candidates you shortlisted' : 'Companies that contacted you'}</p>
        </div>
        <button onClick={onClose} className="btn-ghost p-2" aria-label="Close">
          <X size={18} />
        </button>
      </div>
      <div className="border-b border-white/10 p-4">
        <Input icon={Search} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or role" />
      </div>
      <div className="no-scrollbar max-h-[55dvh] flex-1 overflow-y-auto p-2">
        {!contacts && <Spinner className="py-10" />}
        {contacts?.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-white/45">
            {isCompany ? 'Shortlist a candidate first, then you can message them.' : 'No company has contacted you yet.'}
          </p>
        )}
        {shown?.length === 0 && contacts?.length > 0 && <p className="px-4 py-10 text-center text-sm text-white/45">No one matches “{q}”.</p>}
        {shown?.map((c) => (
          <button
            key={c.id}
            onClick={() => onPick(c.id)}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-white/5"
          >
            <Avatar src={c.avatarUrl} name={c.name} company={!isCompany} size="md" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 truncate font-semibold">
                {c.name}
                {c.verified && <VerifiedBadge />}
              </span>
              <span className="block truncate text-sm text-white/45">{c.subtitle}</span>
            </span>
            {isCompany && <StagePill stage={c.stage} />}
            {c.hasChat && <MessageCircle size={16} className="shrink-0 text-white/35" />}
          </button>
        ))}
      </div>
    </Modal>
  );
}

export default function MessagesPage() {
  const { user } = useAuth();
  const isCompany = user.role === 'company';
  const [params, setParams] = useSearchParams();
  const activeId = params.get('with');
  const [conversations, setConversations] = useState(null);
  const [picking, setPicking] = useState(false);

  const loadList = () =>
    api
      .get('/chats')
      .then(({ data }) => setConversations(data.conversations))
      .catch(() => setConversations((c) => c ?? []));
  usePoll(loadList, 10000);

  const pick = (id) => {
    setParams({ with: id });
    setConversations((list) => list?.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
  };

  const active = conversations?.find((c) => c.id === activeId);

  return (
    <AppShell>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight">Messages</h1>
        <div className="flex items-center gap-2">
          {active && isCompany && <StagePill stage={active.stage} />}
          <button onClick={() => setPicking(true)} className="btn-primary px-4 py-2.5 text-sm">
            <SquarePen size={16} />
            New message
          </button>
        </div>
      </div>
      <div className="glass grid h-[calc(100dvh-230px)] min-h-[420px] overflow-hidden rounded-3xl md:h-[calc(100dvh-190px)] md:grid-cols-[320px_1fr]">
        <aside className={cx('no-scrollbar overflow-y-auto border-white/10 md:border-r', activeId && 'hidden md:block')}>
          <ConversationList conversations={conversations} activeId={activeId} onPick={pick} isCompany={isCompany} />
        </aside>
        <section className={cx('min-h-0', !activeId && 'hidden md:block')}>
          {activeId ? (
            <Thread key={activeId} otherId={activeId} isCompany={isCompany} onBack={() => setParams({})} onSent={loadList} />
          ) : (
            <div className="grid h-full place-items-center text-center text-white/40">
              <div>
                <MessageCircle className="mx-auto" size={38} />
                <p className="mt-3 text-sm">Choose a conversation</p>
              </div>
            </div>
          )}
        </section>
      </div>
      <NewMessageModal
        open={picking}
        isCompany={isCompany}
        onClose={() => setPicking(false)}
        onPick={(id) => {
          setPicking(false);
          pick(id);
        }}
      />
    </AppShell>
  );
}
