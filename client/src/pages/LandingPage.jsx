import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BadgeCheck, Briefcase, Check, FileText, Sparkles, Video, X } from 'lucide-react';
import { Explore, FinalCta, HowItWorks, PublicLayout } from '../components/marketing';

// Old links to sections of this page (e.g. /#pricing) now have pages of their own.
const OLD_SECTIONS = { 'how-it-works': '/how-it-works', 'for-companies': '/for-companies', 'for-candidates': '/for-job-seekers', pricing: '/pricing', faq: '/faq' };

// Hero visual: a candidate card as it looks in the product (built in code, no artwork or faces).
function HeroCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.15 }}
      className="relative mx-auto w-full max-w-[440px]"
      role="img"
      aria-label="Example candidate card with a 92% match, intro video and resume"
    >
      <div className="absolute inset-x-8 -bottom-4 top-8 rounded-[28px] bg-brand-500/10 ring-1 ring-brand-500/10" aria-hidden="true" />
      <div className="relative rounded-[28px] bg-ink-900 p-6 shadow-2xl shadow-brand-600/10 ring-1 ring-white/10" aria-hidden="true">
        <div className="flex items-start gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-brand-500 to-brand-600 text-lg font-extrabold text-[#fff]">PS</span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-extrabold">Priya Sharma</p>
            <p className="text-sm text-white/55">Frontend Developer · Bengaluru</p>
          </div>
          <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs font-bold text-emerald-400 ring-1 ring-emerald-400/30">92% match</span>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          {[
            ['4 yrs', 'Experience'],
            ['₹8 LPA', 'Expected'],
            ['15 days', 'Notice'],
          ].map(([v, l]) => (
            <div key={l} className="rounded-2xl bg-white/[0.04] px-2 py-3 ring-1 ring-white/5">
              <p className="font-extrabold">{v}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-white/45">{l}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {['React', 'TypeScript', 'Node.js', 'Tailwind CSS'].map((t) => (
            <span key={t} className="rounded-lg bg-sky-400/10 px-2.5 py-1 text-xs font-semibold text-sky-400">
              {t}
            </span>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/5">
          <span className="grid size-10 place-items-center rounded-xl bg-brand-500 text-[#fff]">
            <Video size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">Intro video</p>
            <p className="text-xs text-white/50">0:15 · Resume attached</p>
          </div>
          <FileText size={18} className="text-white/40" />
        </div>
        <div className="mt-6 flex items-center justify-center gap-4">
          <span className="grid size-12 place-items-center rounded-full bg-white/[0.04] text-danger ring-1 ring-white/10">
            <X size={20} />
          </span>
          <span className="grid size-14 place-items-center rounded-full bg-brand-500 text-[#fff] shadow-lg shadow-brand-500/30">
            <Check size={24} />
          </span>
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.7 }}
        className="absolute -left-3 bottom-20 hidden items-center gap-2 rounded-2xl bg-ink-900 px-3.5 py-2.5 text-sm font-bold shadow-xl shadow-black/10 ring-1 ring-white/10 sm:flex lg:-left-10"
        aria-hidden="true"
      >
        <BadgeCheck size={18} className="text-emerald-400" /> Shortlisted
      </motion.div>
    </motion.div>
  );
}

// Public home page: what search engines and new visitors see. The details live on their own
// pages (How it works, For companies, For job seekers, Pricing, FAQ, About).
export default function LandingPage() {
  const navigate = useNavigate();
  useEffect(() => {
    const page = OLD_SECTIONS[window.location.hash.slice(1)];
    if (page) navigate(page, { replace: true });
  }, [navigate]);

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-12 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <p className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-3.5 py-1.5 text-xs font-bold text-white/70 ring-1 ring-white/10">
            <Sparkles size={14} className="text-brand-500" />
            The swipe-to-hire platform for India
          </p>
          <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            The best way to hire <span className="text-gradient">is a swipe.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-white/60">
            Glide Recruit is the hiring platform where companies swipe through resumes and 15-second intro videos to shortlist the right people in minutes,
            and job seekers find the best job opportunities without sending a hundred applications.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth?role=company" className="btn-primary px-6 py-3.5">
              <Briefcase size={18} />
              I’m hiring
            </Link>
            <Link to="/auth" className="btn-ghost px-6 py-3.5">
              I want a job
              <ArrowRight size={18} />
            </Link>
          </div>
          <p className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/50">
            <span className="flex items-center gap-1.5">
              <Check size={16} className="text-emerald-400" /> Free for job seekers
            </span>
            <span className="flex items-center gap-1.5">
              <Check size={16} className="text-emerald-400" /> Free swipes for companies
            </span>
            <span className="flex items-center gap-1.5">
              <BadgeCheck size={16} className="text-sky-400" /> Verified companies
            </span>
          </p>
        </motion.div>
        <HeroCard />
      </section>

      <HowItWorks />
      <Explore />
      <FinalCta />
    </PublicLayout>
  );
}
