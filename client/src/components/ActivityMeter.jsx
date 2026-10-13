import { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from './ui';
import { api, cx, errorMessage } from '../lib/api';

// Same number as the server (server/src/utils/activity.js).
export const ACTIVE_DAYS = 15;
const DAY = 24 * 60 * 60 * 1000;
const R = 52;
const CIRC = 2 * Math.PI * R;

// A ring that slowly fills over ACTIVE_DAYS since the candidate last said "I'm still looking".
// When it's full it turns into that button; until then the text explains what happens.
export default function ActivityMeter({ profile, onProfile }) {
  const [saving, setSaving] = useState(false);
  const since = new Date(profile.activeAt ?? profile.updatedAt).getTime();
  const elapsed = Math.max(0, (Date.now() - since) / DAY);
  const full = elapsed >= ACTIVE_DAYS;
  const progress = Math.min(1, elapsed / ACTIVE_DAYS);
  const daysLeft = Math.max(1, Math.ceil(ACTIVE_DAYS - elapsed));

  const confirm = async () => {
    setSaving(true);
    try {
      const { data } = await api.post('/candidate/active');
      onProfile(data.profile);
      toast.success("You're back at the top of company feeds!");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      className={cx(
        'flex flex-col items-center gap-5 rounded-3xl p-5 ring-1 sm:flex-row sm:p-6',
        full ? 'bg-amber-300/10 ring-amber-300/30' : 'glass',
      )}
      aria-label="Profile activity"
    >
      <div className="relative grid h-32 w-32 shrink-0 place-items-center">
        <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90" aria-hidden="true">
          <defs>
            <linearGradient id="activity-ring" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="var(--color-brand-500)" />
              <stop offset="1" stopColor="var(--color-violet-brand)" />
            </linearGradient>
          </defs>
          <circle cx="60" cy="60" r={R} fill="none" stroke="currentColor" strokeWidth="10" className="text-white/10" />
          <motion.circle
            cx="60"
            cy="60"
            r={R}
            fill="none"
            stroke={full ? '#d97706' : 'url(#activity-ring)'}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            initial={{ strokeDashoffset: CIRC }}
            animate={{ strokeDashoffset: CIRC * (1 - progress) }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </svg>
        {full ? (
          <Button className="btn-primary relative z-10 h-20 w-20 rounded-full p-0 text-xs leading-tight" onClick={confirm} loading={saving} aria-label="I'm still looking">
            <span className="flex flex-col items-center gap-0.5">
              <RefreshCw size={16} />
              I’m active
            </span>
          </Button>
        ) : (
          <div className="relative text-center">
            <p className="text-3xl font-extrabold leading-none">{daysLeft}</p>
            <p className="mt-1 text-xs font-semibold text-white/50">day{daysLeft === 1 ? '' : 's'} left</p>
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 text-center sm:text-left">
        {full ? (
          <>
            <p className="font-bold">Your profile has moved down</p>
            <p className="mt-1 text-sm text-white/60">
              You haven’t confirmed you’re still looking for {ACTIVE_DAYS}+ days, so companies now see you much lower. Tap{' '}
              <b>I’m active</b> to go back to the top.
            </p>
          </>
        ) : (
          <>
            <p className="font-bold">You’re at the top of company feeds</p>
            <p className="mt-1 text-sm text-white/60">
              This ring fills up over {ACTIVE_DAYS} days. When it’s full, it becomes an <b>I’m active</b> button: tap it to stay on top. If you
              don’t, companies will see your profile much lower.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
