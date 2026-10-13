import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, ChevronRight, Gauge } from 'lucide-react';


// What makes a profile stand out to companies, and how much each part counts (total 100).
export function strengthItems(p) {
  return [
    { label: 'Intro video', points: 20, done: Boolean(p.videoUrl), to: '/candidate/onboarding?edit' },
    { label: 'Resume', points: 15, done: Boolean(p.resumeUrl), to: '/candidate/onboarding?edit' },
    { label: 'At least 5 skills', points: 15, done: (p.skills?.length ?? 0) >= 5, to: '/candidate/onboarding?edit' },
    { label: 'A few lines about you', points: 10, done: (p.about?.trim().length ?? 0) >= 30, to: '/candidate/onboarding?edit' },
    { label: 'Current or last company & role', points: 10, done: p.experienceYears === 0 || Boolean(p.currentCompany && p.currentPost), to: '/candidate/onboarding?edit' },
    { label: 'Job title you want', points: 5, done: Boolean(p.headline), to: '/candidate/onboarding?edit' },
    { label: 'College & passing year', points: 5, done: Boolean(p.college && p.graduationYear), to: '/candidate/onboarding?edit' },
    { label: 'Notice period', points: 5, done: Boolean(p.noticePeriod), to: '/candidate/onboarding?edit' },
    { label: 'Expected salary', points: 5, done: p.expectedSalary != null, to: '/candidate/onboarding?edit' },
    { label: 'Work mode & job type', points: 5, done: Boolean(p.workModes?.length && p.jobTypes?.length), to: '#preferences' },
    { label: 'Cities you would work in', points: 5, done: Boolean(p.preferredLocations?.length), to: '#preferences' },
  ];
}

export default function ProfileStrength({ profile }) {
  const items = strengthItems(profile);
  const score = items.reduce((sum, i) => sum + (i.done ? i.points : 0), 0);
  const missing = items.filter((i) => !i.done).sort((a, b) => b.points - a.points);
  const level = score >= 90 ? 'All-star' : score >= 70 ? 'Strong' : score >= 45 ? 'Good start' : 'Needs work';
  const color = score >= 90 ? '#34d399' : score >= 70 ? '#38bdf8' : score >= 45 ? '#fbbf24' : '#ff4d6d';
  const R = 34;
  const C = 2 * Math.PI * R;

  return (
    <section className="glass rounded-3xl p-5 sm:p-6">
      <div className="flex items-center gap-5">
        <div className="relative h-20 w-20 shrink-0">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r={R} stroke="rgb(255 255 255 / 0.1)" strokeWidth="7" fill="none" />
            <motion.circle
              cx="40"
              cy="40"
              r={R}
              stroke={color}
              strokeWidth="7"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={C}
              initial={{ strokeDashoffset: C }}
              animate={{ strokeDashoffset: C - (C * score) / 100 }}
              transition={{ duration: 1.1, ease: 'easeOut' }}
            />
          </svg>
          <span className="absolute inset-0 grid place-items-center text-xl font-extrabold">{score}%</span>
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">
            <Gauge size={13} />
            Profile strength
          </p>
          <p className="mt-1 text-xl font-extrabold" style={{ color }}>
            {level}
          </p>
          <p className="text-sm text-white/50">
            {missing.length ? 'Complete profiles get shortlisted more often.' : 'Your profile has everything companies look for.'}
          </p>
        </div>
      </div>
      {missing.length > 0 && (
        <ul className="mt-5 space-y-1.5">
          {missing.slice(0, 4).map((i) => {
            const inner = (
              <>
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-dashed border-white/25" />
                <span className="flex-1">{i.label}</span>
                <span className="text-xs font-bold text-emerald-300">+{i.points}%</span>
                <ChevronRight size={15} className="text-white/30" />
              </>
            );
            const cls = 'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/75 transition-colors hover:bg-white/5';
            return (
              <li key={i.label}>
                {i.to.startsWith('#') ? (
                  <a href={i.to} className={cls}>{inner}</a>
                ) : (
                  <Link to={i.to} className={cls}>{inner}</Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {!missing.length && (
        <p className="mt-4 flex items-center gap-2 text-sm text-emerald-300">
          <Check size={16} />
          Nothing left to add.
        </p>
      )}
    </section>
  );
}

export const strengthScore = (p) => strengthItems(p).reduce((s, i) => s + (i.done ? i.points : 0), 0);
