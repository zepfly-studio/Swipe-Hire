// Building blocks of the public website (home, How it works, For companies, For job seekers,
// Pricing, FAQ, About): the shared layout, footer and each section.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, CalendarClock, Check, ChevronDown, ClipboardList, EyeOff, FileText, IndianRupee, Layers, Lock, MessageCircle,
  Sparkles, Users, Video,
} from 'lucide-react';
import Background from './Background';
import PublicHeader, { PUBLIC_PAGES } from './PublicHeader';
import Logo from './Logo';
import { api } from '../lib/api';
import { addJsonLd } from '../lib/seo';
import { DEFAULT_FAQ } from '../lib/faq';
import { useSite } from '../lib/site';

export const fade = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' }, transition: { duration: 0.5 } };

export function SectionHeading({ eyebrow, title, text, as: Tag = 'h2' }) {
  return (
    <motion.div {...fade} className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-500">{eyebrow}</p>
      <Tag className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</Tag>
      {text && <p className="mt-4 text-white/60 sm:text-lg">{text}</p>}
    </motion.div>
  );
}

// Header, page content and footer for every public page.
export function PublicLayout({ children }) {
  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <Background />
      <PublicHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 px-4 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div>
          <Logo tagline />
          <p className="mt-3 text-sm text-white/45">© {new Date().getFullYear()} Glide Recruit. Made in India.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-white/55">
          <Link to="/" className="hover:text-white">Home</Link>
          {PUBLIC_PAGES.map(([to, label]) => (
            <Link key={to} to={to} className="hover:text-white">
              {label}
            </Link>
          ))}
          <Link to="/auth?mode=login" className="hover:text-white">Log in</Link>
        </nav>
      </div>
    </footer>
  );
}

// ---------------------------------------------------------------------------------------

const STEPS = [
  { title: 'Create your profile', text: 'Candidates upload a resume (we fill the form from it) and record a 15-second intro video.' },
  { title: 'Companies swipe', text: 'Recruiters see each candidate as a card with resume, video and match score. Right = shortlist, left = pass.' },
  { title: 'Chat, task, interview', text: 'Shortlisted candidates get messages, take-home tasks and interview invites in one place.' },
];

export function HowItWorks({ heading = 'h2' }) {
  return (
    <section id="how-it-works" className="scroll-mt-20 px-4 py-16">
      <SectionHeading as={heading} eyebrow="How it works" title="How Glide Recruit works" text="Three steps from profile to interview. No long forms, no inbox full of PDFs." />
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
  );
}

const FOR_COMPANIES = [
  { icon: Layers, title: 'Swipe, don’t sift', text: 'Resume and 15-second video intro on one card. Decide in seconds, not days.' },
  { icon: Sparkles, title: 'Match score', text: 'Set the role, skills, experience, salary and city; the best matches come first.' },
  { icon: IndianRupee, title: 'Salary fit built in', text: 'People inside your budget come first, so you spend swipes on the right candidates.' },
  { icon: ClipboardList, title: 'Tasks with deadlines', text: 'Send a take-home task; get a live link and GitHub repo back before the interview.' },
  { icon: CalendarClock, title: 'Interviews in a click', text: 'Offer time slots, the candidate picks one, a video room is created for you.' },
  { icon: Users, title: 'Hire as a team', text: 'Invite recruiters, share notes and chats. Get a verified company badge.' },
];

export function ForCompanies({ heading = 'h2' }) {
  return (
    <section id="for-companies" className="scroll-mt-20 px-4 py-16">
      <SectionHeading
        as={heading}
        eyebrow="For companies"
        title="A faster hiring platform for growing teams"
        text="Stop reading hundreds of resumes. See the person, the skills and the fit on one card, then shortlist with a swipe."
      />
      <div className="mx-auto mt-12 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FOR_COMPANIES.map((f, i) => (
          <motion.div key={f.title} {...fade} transition={{ duration: 0.5, delay: (i % 2) * 0.08 }} className="glass rounded-3xl p-5">
            <f.icon size={22} className="text-brand-500" />
            <h3 className="mt-3 font-bold">{f.title}</h3>
            <p className="mt-1 text-sm text-white/60">{f.text}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

const FOR_CANDIDATES = [
  { icon: FileText, text: 'One profile, auto-filled from your resume' },
  { icon: Video, text: 'A 15-second intro video that shows who you are' },
  { icon: IndianRupee, text: 'Set your salary range, and mark it negotiable if you like' },
  { icon: Lock, text: 'Your phone and email are shared only after a company shortlists you' },
  { icon: EyeOff, text: 'Age and gender are never shown to companies' },
  { icon: MessageCircle, text: 'Chat, tasks and interviews with the companies that want you' },
];

export function ForCandidates({ heading = 'h2' }) {
  return (
    <section id="for-candidates" className="scroll-mt-20 px-4 py-16">
      <SectionHeading
        as={heading}
        eyebrow="For job seekers"
        title="Find the best job opportunities without endless applications"
        text="Make one great profile. Companies come to you, and you only hear from the ones that are interested. Perfect for freshers and experienced professionals."
      />
      <ul className="mx-auto mt-12 grid max-w-6xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FOR_CANDIDATES.map((f, i) => (
          <motion.li key={f.text} {...fade} transition={{ duration: 0.5, delay: (i % 2) * 0.08 }} className="glass flex items-start gap-3 rounded-2xl p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-brand/10 text-violet-brand">
              <f.icon size={18} />
            </span>
            <span className="pt-1.5 text-sm font-medium">{f.text}</span>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}

export function Pricing({ heading = 'h2' }) {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    api.get('/payment/plans').then(({ data }) => setInfo(data)).catch(() => {});
  }, []);
  const plan = info?.plans?.[0] ?? { name: 'Starter', price: 399, swipes: 150, perks: ['150 candidate swipes', 'Full resume & intro video access', 'Unlimited wishlist', 'Contact details on shortlist'] };
  return (
    <section id="pricing" className="scroll-mt-20 px-4 py-16">
      <SectionHeading as={heading} eyebrow="Pricing" title="Simple pricing, no subscription" text="Free for job seekers. Companies pay only for the swipes they use." />
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
    </section>
  );
}

export function Faq({ heading = 'h2' }) {
  // Admins can replace the built-in FAQ (Admin → Content & lists).
  const faq = useSite().content.faq || DEFAULT_FAQ;
  useEffect(
    () =>
      addJsonLd('faq-jsonld', {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      }),
    [faq],
  );
  return (
    <section id="faq" className="scroll-mt-20 px-4 py-16">
      <SectionHeading as={heading} eyebrow="FAQ" title="Frequently asked questions" />
      <div className="mx-auto mt-10 max-w-3xl space-y-3">
        {faq.map((f) => (
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
  );
}

// "Read more" cards on the home page, one per inner page.
const EXPLORE = [
  { to: '/for-companies', icon: Layers, title: 'For companies', text: 'Swipe through resumes and video intros, best matches first.' },
  { to: '/for-job-seekers', icon: FileText, title: 'For job seekers', text: 'One profile, and companies come to you. Free forever.' },
  { to: '/pricing', icon: IndianRupee, title: 'Pricing', text: 'Free for candidates. Companies pay only for the swipes they use.' },
  { to: '/faq', icon: MessageCircle, title: 'FAQ', text: 'Answers about privacy, videos, salary and payments.' },
];

export function Explore() {
  return (
    <section className="px-4 py-16">
      <SectionHeading eyebrow="Explore" title="Everything about Glide Recruit" />
      <div className="mx-auto mt-12 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {EXPLORE.map((e, i) => (
          <motion.div key={e.to} {...fade} transition={{ duration: 0.5, delay: i * 0.06 }}>
            <Link to={e.to} className="glass group flex h-full flex-col rounded-3xl p-5 transition hover:-translate-y-1 hover:ring-1 hover:ring-brand-500/40">
              <e.icon size={22} className="text-brand-500" />
              <h3 className="mt-3 font-bold">{e.title}</h3>
              <p className="mt-1 flex-1 text-sm text-white/60">{e.text}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-500">
                Read more <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
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
  );
}
