import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BadgeCheck, Bell, BellRing, CalendarClock, CheckCheck, ClipboardList, LifeBuoy, Megaphone, MessageCircle, PartyPopper, Sparkles, Trash2, X } from 'lucide-react';
import { api, cx } from '../lib/api';
import { usePoll } from '../hooks/usePoll';
import Illustration from './Illustration';

const ICONS = {
  shortlisted: Sparkles,
  message: MessageCircle,
  interview: CalendarClock,
  hired: PartyPopper,
  verified: BadgeCheck,
  alert: BellRing,
  task: ClipboardList,
  announcement: Megaphone,
  support: LifeBuoy,
};

export function timeAgo(date) {
  const secs = Math.max(1, Math.floor((Date.now() - new Date(date)) / 1000));
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ unread: 0, notifications: [] });
  const ref = useRef(null);

  const load = () => api.get('/notifications').then(({ data: d }) => setData(d)).catch(() => {});
  usePoll(load, 30000);

  useEffect(() => {
    if (!open) return;
    load();
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const openItem = (n) => {
    setOpen(false);
    if (!n.read) {
      api.post(`/notifications/${n.id}/read`).catch(() => {});
      setData((d) => ({
        unread: Math.max(0, d.unread - 1),
        notifications: d.notifications.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
      }));
    }
    if (n.link) navigate(n.link);
  };

  const readAll = () => {
    api.post('/notifications/read-all').catch(() => {});
    setData((d) => ({ unread: 0, notifications: d.notifications.map((x) => ({ ...x, read: true })) }));
  };

  const clearAll = () => {
    if (!window.confirm('Clear all notifications?')) return;
    api.delete('/notifications').catch(() => {});
    setData({ unread: 0, notifications: [] });
  };

  const removeOne = (n) => {
    api.delete(`/notifications/${n.id}`).catch(() => {});
    setData((d) => ({
      unread: Math.max(0, d.unread - (n.read ? 0 : 1)),
      notifications: d.notifications.filter((x) => x.id !== n.id),
    }));
  };

  return (
    <div ref={ref} className="relative">
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen((o) => !o)}
        className="btn-ghost relative p-2.5"
        aria-label={`Notifications${data.unread ? ` (${data.unread} unread)` : ''}`}
        title="Notifications"
      >
        <motion.span key={data.unread} animate={data.unread ? { rotate: [0, -18, 14, -8, 0] } : {}} transition={{ duration: 0.6 }}>
          <Bell size={17} />
        </motion.span>
        <AnimatePresence>
          {data.unread > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white"
            >
              {data.unread > 9 ? '9+' : data.unread}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97, pointerEvents: 'none' }}
            transition={{ duration: 0.16 }}
            className="fixed inset-x-3 top-16 z-50 overflow-hidden rounded-2xl border border-white/10 bg-ink-800 shadow-2xl shadow-black/60 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <p className="font-bold">Notifications</p>
              <div className="flex items-center gap-3">
                {data.unread > 0 && (
                  <button onClick={readAll} className="flex items-center gap-1 text-xs font-semibold text-white/50 hover:text-white">
                    <CheckCheck size={14} />
                    Mark all read
                  </button>
                )}
                {data.notifications.length > 0 && (
                  <button onClick={clearAll} className="flex items-center gap-1 text-xs font-semibold text-white/50 hover:text-danger">
                    <Trash2 size={13} />
                    Clear all
                  </button>
                )}
              </div>
            </div>
            <div className="no-scrollbar max-h-[60vh] overflow-y-auto">
              {data.notifications.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <Illustration name="no-notifications" small />
                  <p className="mt-2 text-sm text-white/45">No notifications yet</p>
                </div>
              )}
              {data.notifications.map((n) => {
                const Icon = ICONS[n.type] ?? Bell;
                return (
                  <div key={n.id} className="group relative">
                    <button
                      onClick={() => openItem(n)}
                      className={cx('flex w-full gap-3 py-3 pl-4 pr-10 text-left transition-colors hover:bg-white/5', !n.read && 'bg-brand-500/[0.06]')}
                    >
                      <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-xl', n.read ? 'bg-white/5 text-white/40' : 'bg-brand-500/15 text-brand-400')}>
                        <Icon size={17} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cx('block text-sm', n.read ? 'text-white/70' : 'font-semibold')}>{n.title}</span>
                        {n.body && <span className="mt-0.5 line-clamp-2 block text-xs text-white/45">{n.body}</span>}
                        <span className="mt-1 block text-[11px] text-white/35">{timeAgo(n.at)}</span>
                      </span>
                      {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                    </button>
                    <button
                      onClick={() => removeOne(n)}
                      className="absolute right-2 top-2 rounded-lg p-1.5 text-white/30 opacity-100 transition hover:bg-white/10 hover:text-white sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                      aria-label={`Remove notification: ${n.title}`}
                      title="Remove"
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
