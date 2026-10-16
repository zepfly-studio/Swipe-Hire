import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, BadgeCheck, Briefcase, CalendarClock, Check, ChevronDown, ClipboardList, EyeOff, FileText, IndianRupee,
  Layers, Lock, MessageCircle, Sparkles, Users, Video, X,
} from 'lucide-react';
import Background from '../components/Background';
import PublicHeader from '../components/PublicHeader';
import Logo from '../components/Logo';
import { api, cx } from '../lib/api';
import { addJsonLd } from '../lib/seo';
import { DEFAULT_FAQ } from '../lib/faq';
import { useSite } from '../lib/site';

const STEPS = [
  { title: 'Create your profile', text: 'Candidates upload a resume (we fill the form from it) and record a 15-second intro video.' },
  { title: 'Companies swipe', text: 'Recruiters see each candidate as a card with resume, video and match score. Right = shortlist, left = pass.' },
  { title: 'Chat, task, interview', text: 'Shortlisted candidates get messages, take-home tasks and interview invites in one place.' },
];

const FOR_COMPANIES = [
  { icon: Layers, title: 'Swipe, don’t sift', text: 'Resume and 15-second video intro on one card. Decide in seconds, not days.' },
  { icon: Sparkles, title: 'Match score', text: 'Every candidate is scored against your job: skills, experience, salary and location.' },
  { icon: IndianRupee, title: 'Salary fit built in', text: 'Only see people whose expected salary fits your budget, or who are open to negotiate.' },
  { icon: ClipboardList, title: 'Tasks with deadlines', text: 'Send a take-home task; get a live link and GitHub repo back before the interview.' },
  { icon: CalendarClock, title: 'Interviews in a click', text: 'Offer time slots, the candidate picks one, a video room is created for you.' },
  { icon: Users, title: 'Hire as a team', text: 'Invite recruiters, share jobs, notes and chats. Get a verified company badge.' },
];

const FOR_CANDIDATES = [
  { icon: FileText, text: 'One profile, auto-filled from your resume' },
  { icon: Video, text: 'A 15-second intro video that shows who you are' },
  { icon: IndianRupee, text: 'Set your salary range, and mark it negotiable if you like' },
  { icon: Lock, text: 'Your phone and email are shared only after a company shortlists you' },
  { icon: EyeOff, text: 'Age and gender are never shown to companies' },
  { icon: MessageCircle, text: 'Chat, tasks and interviews with the companies that want you' },
];


const fade = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' }, transition: { duration: 0.5 } };

function SectionHeading({ eyebrow, title, text }) {
  return (
    <motion.div {...fade} className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-500">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h2>
      {text && <p className="mt-4 text-white/60 sm:text-lg">{text}</p>}
    </motion.div>
  );
}

function Pricing() {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    api.get('/payment/plans').then(({ data }) => setInfo(data)).catch(() => {});
  }, []);
  const plan = info?.plans?.[0] ?? { name: 'Starter', price: 399, swipes: 150, perks: ['150 candidate swipes', 'Full resume & intro video access', 'Unlimited wishlist', 'Contact details on shortlist'] };
  return (
    <div className="mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-2">
      <motion.div {...fade} className="glass rounded-3xl p-7">
        <p className="font-bold text-white/60">Job seekers</p>
        <p className="mt-2 text-4xl font-extrabold">Free</p>
        <p className="mt-1 text-sm text-white/50">Forever, for every candidate</p>
        <ul className="mt-6 space-y-3 text-sm">
          {['Profile, resume and intro video', 'Get shortlisted by companies', 'Chat, tasks and interviews'].map((p) => (
            <li key={p} className="flex gap-2.5">
              <Check size={18} className="shrink-0 text-emerald-400" />
              {p}
            </li>
          ))}
        </ul>
        <Link to="/auth" className="btn-ghost mt-7 w-full">
          Create my profile
        </Link>
      </motion.div>
      <motion.div {...fade} className="relative rounded-3xl bg-linear-to-br from-brand-500 to-violet-brand p-[1.5px] shadow-2xl shadow-brand-500/20">
        {/* text-white resets the white text the gradient wrapper gets in the light theme. */}
        <div className="h-full rounded-[calc(1.5rem-1.5px)] bg-ink-900 p-7 text-white">
          <p className="font-bold text-white/60">Companies · {plan.name}</p>
          <p className="mt-2 text-4xl font-extrabold">
            ₹{plan.price}
            <span className="text-base font-semibold text-white/50"> for {plan.swipes} swipes</span>
          </p>
          <p className="mt-1 text-sm text-white/50">{info?.freeSwipes ? `Start with ${info.freeSwipes} free swipes` : 'Start with free swipes'} · no subscription</p>
          <ul className="mt-6 space-y-3 text-sm">
            {plan.perks.map((p) => (
              <li key={p} className="flex gap-2.5">
                <Check size={18} className="shrink-0 text-emerald-400" />
                {p}
              </li>
            ))}
          </ul>
          <Link to="/auth?role=company" className="btn-primary mt-7 w-full">
            Start hiring
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

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

// Public home page: what search engines and new visitors see.
export default function LandingPage() {
  // Opened from another page's menu (e.g. /#pricing): jump to that section.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id) setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, []);
  // Admins can replace the built-in FAQ (Admin → Content & lists).
  const FAQ = useSite().content.faq || DEFAULT_FAQ;
  useEffect(
    () =>
      addJsonLd('faq-jsonld', {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      }),
    [FAQ],
  );

  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <Background />

      <PublicHeader />

      <main>
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

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-20 px-4 py-16">
          <SectionHeading eyebrow="How it works" title="How Glide Recruit works" text="Three steps from profile to interview. No long forms, no inbox full of PDFs." />
          <ol className="mx-auto mt-12 grid max-w-5xl gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <motion.li key={s.title} {...fade} transition={{ duration: 0.5, delay: i * 0.1 }} className="glass rounded-3xl p-6">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-linear-to-br from-brand-500 to-violet-brand font-extrabold text-white">{i + 1}</span>
                <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-white/60">{s.text}</p>
              </motion.li>
            ))}
          </ol>
        </section>

        {/* For companies */}
        <section id="for-companies" className="scroll-mt-20 px-4 py-16">
          <SectionHeading
            eyebrow="For companies"
            title="A faster hiring platform for growing teams"
            text="Stop reading hundreds of resumes. See the person, the skills and the fit on one card, then shortlist with a swipe."
          />
          <div className="mx-auto mt-12 max-w-6xl">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FOR_COMPANIES.map((f, i) => (
                <motion.div key={f.title} {...fade} transition={{ duration: 0.5, delay: (i % 2) * 0.08 }} className="glass rounded-3xl p-5">
                  <f.icon size={22} className="text-brand-500" />
                  <h3 className="mt-3 font-bold">{f.title}</h3>
                  <p className="mt-1 text-sm text-white/60">{f.text}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* For candidates */}
        <section id="for-candidates" className="scroll-mt-20 px-4 py-16">
          <SectionHeading
            eyebrow="For job seekers"
            title="Find the best job opportunities without endless applications"
            text="Make one great profile. Companies come to you, and you only hear from the ones that are interested. Perfect for freshers and experienced professionals."
          />
          <div className="mx-auto mt-12 max-w-6xl">
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {FOR_CANDIDATES.map((f, i) => (
                <motion.li key={f.text} {...fade} transition={{ duration: 0.5, delay: (i % 2) * 0.08 }} className="glass flex items-start gap-3 rounded-2xl p-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-brand/10 text-violet-brand">
                    <f.icon size={18} />
                  </span>
                  <span className="pt-1.5 text-sm font-medium">{f.text}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-20 px-4 py-16">
          <SectionHeading eyebrow="Pricing" title="Simple pricing, no subscription" text="Free for job seekers. Companies pay only for the swipes they use." />
          <Pricing />
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 px-4 py-16">
          <SectionHeading eyebrow="FAQ" title="Frequently asked questions" />
          <div className="mx-auto mt-10 max-w-3xl space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="glass group rounded-2xl p-5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold">
                  <h3>{f.q}</h3>
                  <ChevronDown size={18} className="shrink-0 text-white/50 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-white/65">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final call to action */}
        <section className="px-4 pb-20 pt-8">
          <motion.div {...fade} className="relative mx-auto max-w-6xl overflow-hidden rounded-[32px] bg-linear-to-br from-brand-500 to-brand-600 p-8 text-[#fff] sm:p-12">
            {/* Soft shapes for depth; no artwork. */}
            <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full border-[40px] border-[#fff]/[0.06]" aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-32 right-32 size-72 rounded-full bg-[#2563eb]/25 blur-3xl" aria-hidden="true" />
            <div className="relative md:w-2/3">
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Right swipe, right job.</h2>
              <p className="mt-3 max-w-md text-[#fff]/75">Join the hiring platform built for speed. It takes less than 2 minutes to start.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/auth?role=company" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#fff] px-5 py-3 text-[15px] font-semibold text-brand-600 transition hover:bg-[#fff]/90">
                  Start hiring
                </Link>
                <Link to="/auth" className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#fff]/40 px-5 py-3 text-[15px] font-semibold text-[#fff] transition hover:bg-[#fff]/10">
                  Find a job
                </Link>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-4 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <Logo tagline />
            <p className="mt-3 text-sm text-white/45">© {new Date().getFullYear()} Glide Recruit. Made in India.</p>
          </div>
          <nav aria-label="Footer" className={cx('flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-white/55')}>
            <a href="#how-it-works" className="hover:text-white">How it works</a>
            <a href="#pricing" className="hover:text-white">Pricing</a>
            <a href="#faq" className="hover:text-white">FAQ</a>
            <Link to="/about" className="hover:text-white">About</Link>
            <Link to="/auth?role=company" className="hover:text-white">For companies</Link>
            <Link to="/auth" className="hover:text-white">For job seekers</Link>
            <Link to="/auth?mode=login" className="hover:text-white">Log in</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
