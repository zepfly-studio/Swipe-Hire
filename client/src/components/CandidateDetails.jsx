import { Briefcase, Building2, Check, Clock, GraduationCap, IndianRupee, MapPin, User } from 'lucide-react';
import { cx, fileUrl } from '../lib/api';

export const lpa = (v) => (v == null ? null : `₹${v} LPA`);
// "₹6–8 LPA · Negotiable" from a candidate's expected salary range.
export function expectedSalaryLabel(c) {
  if (c.expectedSalary == null) return null;
  const range = c.expectedSalaryMax > c.expectedSalary ? `₹${c.expectedSalary}–${c.expectedSalaryMax} LPA` : lpa(c.expectedSalary);
  return c.salaryNegotiable ? `${range} · Negotiable` : range;
}
export const expLabel = (y) => (y == null ? null : y === 0 ? 'Fresher' : `${y} yr${y === 1 ? '' : 's'} exp`);

export function SectionTitle({ children }) {
  return <h4 className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">{children}</h4>;
}

export function MatchBadge({ score }) {
  if (score == null) return null;
  const tone = score >= 75 ? 'text-emerald-400 ring-emerald-400/30 bg-emerald-400/10' : score >= 45 ? 'text-amber-300 ring-amber-300/30 bg-amber-300/10' : 'text-white/60 ring-white/15 bg-white/5';
  return <span className={cx('rounded-full px-2.5 py-1 text-xs font-bold ring-1', tone)}>{score}% match</span>;
}

export function IntroVideo({ url, className }) {
  if (!url) return null;
  return (
    <video
      src={`${fileUrl(url)}#t=0.1`}
      controls
      playsInline
      preload="metadata"
      className={cx('max-h-[440px] w-full rounded-2xl bg-black object-contain', className)}
    />
  );
}

export function CandidateDetails({ c, showVideo = true }) {
  const matched = new Set((c.matchedSkills || []).map((s) => s.toLowerCase()));
  const rows = [
    [Briefcase, 'Experience', c.experienceYears === 0 ? 'Fresher' : c.experienceYears != null ? `${c.experienceYears} years` : null],
    [IndianRupee, 'Expected salary', expectedSalaryLabel(c)],
    [IndianRupee, 'Current salary', lpa(c.currentSalary)],
    [Clock, 'Notice period', c.noticePeriod],
    [Building2, 'Current / last company', c.currentCompany],
    [Briefcase, 'Current / last role', c.currentPost],
    [GraduationCap, 'Qualification', c.qualification],
    [GraduationCap, 'Degree', c.degree],
    [GraduationCap, 'College', c.college],
    [GraduationCap, 'Graduation year', c.graduationYear],
    [User, 'Age', c.age],
    [User, 'Gender', c.gender],
    [MapPin, 'Location', c.location],
    [MapPin, 'Open to cities', c.preferredLocations?.join(', ')],
    [Briefcase, 'Work mode', c.workModes?.map((m) => (m === 'onsite' ? 'On-site' : m[0].toUpperCase() + m.slice(1))).join(', ')],
    [Briefcase, 'Job type', c.jobTypes?.map((t) => t[0].toUpperCase() + t.slice(1)).join(', ')],
  ].filter(([, , v]) => v != null && v !== '');

  return (
    <div className="space-y-7">
      {showVideo && c.videoUrl && (
        <section>
          <SectionTitle>Intro video</SectionTitle>
          <IntroVideo url={c.videoUrl} />
        </section>
      )}

      {c.skills?.length > 0 && (
        <section>
          <SectionTitle>Skills</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {c.skills.map((s) => {
              const hit = matched.has(s.toLowerCase());
              return (
                <span
                  key={s}
                  className={cx(
                    'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium',
                    hit ? 'bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/30' : 'bg-white/[0.06] text-white/75',
                  )}
                >
                  {hit && <Check size={13} strokeWidth={3} />}
                  {s}
                </span>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <SectionTitle>Details</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {rows.map(([Icon, label, value]) => (
            <div key={label} className="rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/5">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                <Icon size={12} />
                {label}
              </p>
              <p className="mt-1 break-words text-sm font-semibold text-white/90">{value}</p>
            </div>
          ))}
        </div>
      </section>

      {c.about && (
        <section>
          <SectionTitle>About</SectionTitle>
          <p className="whitespace-pre-line text-sm leading-relaxed text-white/70">{c.about}</p>
        </section>
      )}
    </div>
  );
}
