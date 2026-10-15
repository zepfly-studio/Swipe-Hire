import {
  BadgeCheck,
  Bell,
  Bookmark,
  Briefcase,
  CalendarClock,
  Compass,
  Hourglass,
  MessageCircle,
  ShieldCheck,
  UserSearch,
  Users,
  Video,
  WifiOff,
  Zap,
} from 'lucide-react';
import { cx } from '../lib/api';

// Empty and success states show a simple line icon on a soft green tile (no artwork),
// in the clean style of LinkedIn / Naukri. `name` keeps the old illustration names.
const ICONS = {
  offline: WifiOff,
  'not-found': Compass,
  'no-notifications': Bell,
  'profile-complete': BadgeCheck,
  'waiting-shortlist': Hourglass,
  'record-video': Video,
  'empty-pipeline': Users,
  'empty-wishlist': Bookmark,
  'no-jobs': Briefcase,
  'out-of-swipes': Zap,
  'no-candidates': UserSearch,
  verified: ShieldCheck,
  'no-interviews': CalendarClock,
  'no-messages': MessageCircle,
};

// Success states get a solid brand tile; everything else a light one.
const SOLID = new Set(['profile-complete', 'verified']);

// `small` is for tight spots such as the notifications panel.
export default function Illustration({ name, small = false, className }) {
  const Icon = ICONS[name] ?? Briefcase;
  const solid = SOLID.has(name);
  return (
    <div
      className={cx(
        'mx-auto grid place-items-center rounded-3xl',
        small ? 'size-14 rounded-2xl' : 'size-20',
        solid ? 'bg-brand-500 text-[#fff] shadow-lg shadow-brand-500/25' : 'bg-brand-500/10 text-brand-500 ring-1 ring-brand-500/15',
        className,
      )}
      aria-hidden="true"
    >
      <Icon size={small ? 24 : 36} strokeWidth={1.75} />
    </div>
  );
}
