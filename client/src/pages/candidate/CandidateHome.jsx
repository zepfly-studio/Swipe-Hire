import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BadgeCheck, Building2, Eye, FileText, Heart, MapPin, MessageCircle, Settings2 } from 'lucide-react';
import toast from 'react-hot-toast';
import AppShell from '../../components/AppShell';
import ResumeViewer from '../../components/ResumeViewer';
import TagInput from '../../components/TagInput';
import ProfileStrength from '../../components/ProfileStrength';
import Avatar from '../../components/Avatar';
import CompanyModal from '../../components/CompanyModal';
import { CandidateDetails, IntroVideo, SectionTitle } from '../../components/CandidateDetails';
import { Button, MultiChipSelect, Spinner, StagePill, VerifiedBadge } from '../../components/ui';
import Illustration from '../../components/Illustration';
import ActivityMeter from '../../components/ActivityMeter';
import { useAuth } from '../../context/AuthContext';
import { api, cx, errorMessage } from '../../lib/api';
import { CITIES, JOB_TYPE_OPTIONS, WORK_MODE_OPTIONS } from '../../lib/options';

function Stat({ icon: Icon, label, value, delay, tone }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="glass rounded-3xl p-5">
      <span className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}>
        <Icon size={19} />
      </span>
      <p className="mt-4 text-3xl font-extrabold">{value ?? '–'}</p>
      <p className="text-sm text-white/50">{label}</p>
    </motion.div>
  );
}

const timeAgo = (date) => {
  const days = Math.floor((Date.now() - new Date(date)) / 86400000);
  if (days < 1) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
};

function OpenToWork({ profile, onSave }) {
  const on = profile.openToWork !== false;
  return (
    <button
      onClick={() => onSave({ openToWork: !on })}
      className={cx(
        'flex w-full items-center gap-4 rounded-3xl p-5 text-left ring-1 transition-colors',
        on ? 'bg-emerald-400/[0.08] ring-emerald-400/30' : 'bg-white/[0.04] ring-white/10',
      )}
      role="switch"
      aria-checked={on}
    >
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{on ? 'Open to work' : 'Not looking right now'}</span>
        <span className="block text-sm text-white/50">
          {on ? 'Companies can discover your profile.' : 'Your profile is hidden from companies.'}
        </span>
      </span>
      <span className={cx('relative h-7 w-12 shrink-0 rounded-full transition-colors', on ? 'bg-emerald-400' : 'bg-white/15')}>
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 600, damping: 32 }}
          className={cx('absolute top-1 h-5 w-5 rounded-full bg-[#fff] shadow', on ? 'right-1' : 'left-1')}
        />
      </span>
    </button>
  );
}

function Preferences({ profile, onSave }) {
  const [form, setForm] = useState({
    workModes: profile.workModes ?? [],
    jobTypes: profile.jobTypes ?? [],
    preferredLocations: profile.preferredLocations ?? [],
  });
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify({ workModes: profile.workModes ?? [], jobTypes: profile.jobTypes ?? [], preferredLocations: profile.preferredLocations ?? [] });

  const save = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <section id="preferences" className="glass scroll-mt-24 space-y-5 rounded-3xl p-5 sm:p-6">
      <SectionTitle>
        <span className="flex items-center gap-2"><Settings2 size={13} /> Job preferences</span>
      </SectionTitle>
      <div>
        <p className="mb-2 text-sm text-white/60">Work mode</p>
        <MultiChipSelect options={WORK_MODE_OPTIONS} value={form.workModes} onChange={(v) => setForm((f) => ({ ...f, workModes: v }))} />
      </div>
      <div>
        <p className="mb-2 text-sm text-white/60">Job type</p>
        <MultiChipSelect options={JOB_TYPE_OPTIONS} value={form.jobTypes} onChange={(v) => setForm((f) => ({ ...f, jobTypes: v }))} />
      </div>
      <div>
        <p className="mb-2 text-sm text-white/60">Cities you'd work in</p>
        <TagInput
          value={form.preferredLocations}
          onChange={(v) => setForm((f) => ({ ...f, preferredLocations: v }))}
          options={CITIES}
          placeholder="Jaipur, Pune…"
        />
      </div>
      {dirty && (
        <Button className="btn-primary w-full" onClick={save} loading={saving}>
          Save preferences
        </Button>
      )}
    </section>
  );
}

export default function CandidateHome() {
  const { user, profile, setProfile } = useAuth();
  const [stats, setStats] = useState(null);
  const [resumeOpen, setResumeOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(null);

  useEffect(() => {
    api.get('/candidate/stats').then(({ data }) => setStats(data)).catch(() => setStats({ shortlistedBy: [] }));
  }, []);

  const savePrefs = async (patch) => {
    try {
      const { data } = await api.put('/candidate/preferences', patch);
      setProfile(data.profile);
      toast.success('Preferences saved', { id: 'prefs' });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const firstName = user.name.split(' ')[0];
  const live = profile.openToWork !== false;

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <p className={cx('flex items-center gap-2 text-sm font-semibold', live ? 'text-emerald-400' : 'text-white/45')}>
          <motion.span
            animate={live ? { scale: [1, 1.4, 1] } : {}}
            transition={{ duration: 1.6, repeat: Infinity }}
            className={cx('h-2 w-2 rounded-full', live ? 'bg-emerald-400' : 'bg-white/30')}
          />
          {live ? 'Your profile is live' : 'Your profile is hidden'}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Hi {firstName} 👋</h1>
        <p className="mt-1 text-white/50">
          {live ? 'Companies are swiping through profiles like yours right now.' : 'Turn on "Open to work" when you are ready for new offers.'}
        </p>
      </motion.div>

      <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
        <Stat icon={Eye} label="Profile views" value={stats?.viewedCount} delay={0.05} tone="bg-sky-400/15 text-sky-300" />
        <Stat icon={Heart} label="Wishlisted" value={stats?.wishlistedCount} delay={0.1} tone="bg-violet-brand/20 text-violet-300" />
        <Stat icon={BadgeCheck} label="Shortlisted" value={stats ? stats.shortlistedBy.length + (stats.hiddenCount ?? 0) : undefined} delay={0.15} tone="bg-emerald-400/15 text-emerald-300" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          {live && <ActivityMeter profile={profile} onProfile={setProfile} />}
          <ProfileStrength profile={profile} />
          <section className="glass rounded-3xl p-5 sm:p-6">
            <SectionTitle>Companies that shortlisted you</SectionTitle>
            {!stats && <Spinner className="py-12" />}
            {stats?.hiddenCount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-3 flex items-center gap-4 rounded-2xl bg-linear-to-r from-brand-500/10 to-violet-brand/10 p-4 ring-1 ring-brand-500/20"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-brand-500 to-violet-brand text-xl font-extrabold text-white">
                  {stats.hiddenCount}
                </span>
                <div className="min-w-0">
                  <p className="font-bold">
                    {stats.hiddenCount === 1 ? '1 company shortlisted you' : `${stats.hiddenCount} companies shortlisted you`}
                  </p>
                  <p className="text-sm text-white/55">You'll see who they are as soon as they message you or send a task or interview invite.</p>
                </div>
              </motion.div>
            )}
            {stats?.shortlistedBy?.length === 0 && !stats.hiddenCount && (
              <div className="flex flex-col items-center py-12 text-center">
                <Illustration name="waiting-shortlist" />
                <p className="mt-4 font-semibold">No shortlists yet</p>
                <p className="mt-1 max-w-xs text-sm text-white/50">A great intro video and a complete skill list help you get noticed faster.</p>
              </div>
            )}
            <div className="space-y-3">
              {stats?.shortlistedBy?.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center gap-4 rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/5"
                >
                  <button onClick={() => setCompanyOpen(c.companyId)} className="flex min-w-0 flex-1 items-center gap-4 text-left" aria-label={`About ${c.companyName}`}>
                  <Avatar src={c.logoUrl} name={c.companyName} size="md" company />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 font-bold hover:underline">
                      <span className="truncate">{c.companyName}</span>
                      {c.verified && <VerifiedBadge />}
                    </p>
                    <p className="truncate text-sm text-white/50">
                      {c.hiringFor}
                      {c.location && (
                        <>
                          {' · '}
                          <MapPin size={12} className="inline" /> {c.location}
                        </>
                      )}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <StagePill stage={c.stage} candidateView />
                      <span className="text-xs text-white/35">{timeAgo(c.date)}</span>
                    </div>
                  </div>
                  </button>
                  <Link to={`/messages?with=${c.companyId}`} className="btn-ghost shrink-0 p-2.5" title="Message" aria-label={`Message ${c.companyName}`}>
                    <MessageCircle size={18} />
                  </Link>
                </motion.div>
              ))}
            </div>
            {stats?.shortlistedBy?.length > 0 && (
              <p className="mt-4 text-xs text-white/40">These companies can see your email and phone number and may contact you directly.</p>
            )}
          </section>

          <OpenToWork profile={profile} onSave={savePrefs} />
          <Preferences key={JSON.stringify([profile.workModes, profile.jobTypes, profile.preferredLocations])} profile={profile} onSave={savePrefs} />
        </div>

        <motion.aside initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass h-fit space-y-6 rounded-3xl p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Link to="/settings" title="Change photo">
                <Avatar src={user.avatarUrl} name={user.name} size="lg" />
              </Link>
              <div className="min-w-0">
                <h2 className="truncate text-xl font-extrabold">{user.name}</h2>
                <p className="truncate text-sm text-white/50">{profile.headline}</p>
              </div>
            </div>
            <Link to="/candidate/onboarding?edit" className="btn-ghost px-3 py-2 text-sm">
              Edit profile
            </Link>
          </div>
          <IntroVideo url={profile.videoUrl} />
          <Button className="btn-ghost w-full" onClick={() => setResumeOpen(true)}>
            <FileText size={18} />
            View my resume
          </Button>
          <CandidateDetails c={profile} showVideo={false} />
        </motion.aside>
      </div>

      <CompanyModal companyId={companyOpen} onClose={() => setCompanyOpen(null)} />
      <ResumeViewer url={resumeOpen ? profile.resumeUrl : null} name={user.name} onClose={() => setResumeOpen(false)} />
    </AppShell>
  );
}
