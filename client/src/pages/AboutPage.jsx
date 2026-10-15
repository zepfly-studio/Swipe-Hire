import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, BadgeCheck, Bell, Briefcase, Building2, CalendarClock, ClipboardList, EyeOff, FileText, Filter, Gauge, IndianRupee,
  Layers, Lock, MessageCircle, Search, ShieldCheck, Sparkles, Target, UserCheck, Users, Video,
} from 'lucide-react';
import Background from '../components/Background';
import Logo from '../components/Logo';

const fade = { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' }, transition: { duration: 0.45 } };

const PROBLEMS = [
  { icon: FileText, title: 'Too many resumes', text: 'Recruiters open hundreds of PDFs that all look the same and still can’t tell who will fit.' },
  { icon: Target, title: 'Applications that go nowhere', text: 'Job seekers send application after application and rarely hear back.' },
  { icon: Gauge, title: 'Slow first rounds', text: 'Phone screens, scheduling emails and follow-ups take weeks before a real conversation starts.' },
];

const CANDIDATE_STEPS = [
  { icon: UserCheck, title: 'Sign up free', text: 'Create an account with your email. Verify it with a 6-digit code.' },
  { icon: FileText, title: 'Upload your resume', text: 'We read it and fill your profile for you: skills, college, experience, last company and more.' },
  { icon: Video, title: 'Record a 15-second intro', text: 'Say your name, your role and what makes you great. Record in the browser or upload a clip.' },
  { icon: Bell, title: 'Get discovered', text: 'Companies find you. You’re told when you’re shortlisted, and you hear from the ones that want you.' },
  { icon: MessageCircle, title: 'Chat, tasks and interviews', text: 'Reply to companies, submit take-home tasks and pick an interview time, all in one place.' },
];

const COMPANY_STEPS = [
  { icon: Building2, title: 'Set up your company', text: 'Add your company details and the role you are hiring for: skills, experience and budget.' },
  { icon: Layers, title: 'Swipe through candidates', text: 'Each candidate is one card: resume, 15-second video and a match score. Right to shortlist, left to pass.' },
  { icon: Lock, title: 'Unlock contact details', text: 'Shortlisting a candidate shows their phone and email. Wishlist anyone you want to look at again for free.' },
  { icon: ClipboardList, title: 'Move them through your pipeline', text: 'Message, send a take-home task with a deadline, or offer interview slots. Track every stage up to hired.' },
  { icon: Users, title: 'Hire as a team', text: 'Invite recruiters to share jobs, swipes, notes and chats. Get a verified company badge.' },
];

const FEATURES = [
  {
    group: 'Profiles & matching',
    items: [
      [FileText, 'Resume auto-fill', 'Upload a PDF and the profile fills itself.'],
      [Video, '15-second intro videos', 'See how a person communicates before the first call.'],
      [Sparkles, 'Match score', 'Every candidate is scored against the job on skills, experience, salary and location.'],
      [IndianRupee, 'Salary fit', 'Companies only see candidates their budget can reach, or who are open to negotiate.'],
      [Filter, 'Filters & saved searches', 'Filter by city, experience, budget, notice period and skills; get alerts for new matches.'],
      [Gauge, 'Active candidates first', 'Candidates confirm every 15 days that they are still looking, so feeds stay fresh.'],
    ],
  },
  {
    group: 'Hiring workflow',
    items: [
      [Layers, 'Swipe to shortlist', 'Fast decisions with undo for a mistaken swipe.'],
      [MessageCircle, 'Built-in chat', 'Talk to shortlisted candidates without sharing personal numbers first.'],
      [ClipboardList, 'Take-home tasks', 'Send a brief with a deadline; candidates submit a live link and GitHub repo.'],
      [CalendarClock, 'Interview scheduling', 'Offer up to three slots; a video-call link is created automatically.'],
      [Briefcase, 'Multiple jobs', 'Hire for several roles at once, each with its own requirements and pipeline.'],
      [Users, 'Team accounts', 'Up to 10 recruiters share one company account.'],
    ],
  },
  {
    group: 'Trust & privacy',
    items: [
      [Lock, 'Contact on shortlist only', 'A candidate’s phone and email are shown only after a company shortlists them.'],
      [EyeOff, 'No bias fields', 'Age and gender are never shown to companies.'],
      [ShieldCheck, 'Anonymous until contact', 'A candidate learns which company shortlisted them once the company reaches out.'],
      [BadgeCheck, 'Verified companies', 'Companies verify with a work email or GSTIN and get a badge candidates can trust.'],
      [Search, 'Open to work switch', 'Candidates can hide their profile any time they are not looking.'],
      [UserCheck, 'Verified emails', 'Every account confirms its email with a one-time code.'],
    ],
  },
];

function Section({ eyebrow, title, text, children }) {
  return (
    <section className="px-4 py-14">
      <motion.div {...fade} className="mx-auto max-w-3xl text-center">
        {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-500">{eyebrow}</p>}
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h2>
        {text && <p className="mt-4 text-white/60 sm:text-lg">{text}</p>}
      </motion.div>
      <div className="mx-auto mt-10 max-w-6xl">{children}</div>
    </section>
  );
}

function Steps({ steps }) {
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => (
        <motion.li key={s.title} {...fade} transition={{ duration: 0.4, delay: i * 0.05 }} className="glass flex gap-4 rounded-2xl p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-500 text-sm font-extrabold text-[#fff]">{i + 1}</span>
          <div>
            <h4 className="flex items-center gap-2 font-bold">
              <s.icon size={16} className="text-brand-500" /> {s.title}
            </h4>
            <p className="mt-0.5 text-sm text-white/60">{s.text}</p>
          </div>
        </motion.li>
      ))}
    </ol>
  );
}

// Public "About" page: what Glide Recruit is, why it exists and how it works.
export default function AboutPage() {
  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <Background />
      <header className="sticky top-3 z-40 px-3 sm:top-4 sm:px-4">
        <nav className="mx-auto flex h-16 max-w-6xl items-center gap-3 rounded-[20px] border border-white/10 bg-ink-900/80 px-3 shadow-xl shadow-black/10 backdrop-blur-xl sm:px-4" aria-label="Main">
          <Link to="/" aria-label="Glide Recruit home">
            <Logo />
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/" className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-white/60 hover:bg-white/5 hover:text-white sm:inline-flex">
              Home
            </Link>
            <Link to="/auth?mode=login" className="btn-ghost px-4 py-2 text-sm">
              Log in
            </Link>
            <Link to="/auth" className="btn-primary hidden px-4 py-2 text-sm sm:inline-flex">
              Get started
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-4xl px-4 pb-6 pt-16 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-500">About us</p>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
              Hiring that moves at the <span className="text-gradient">speed of a swipe.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-white/60">
              Glide Recruit is an Indian hiring platform that connects companies with job seekers through short, honest profiles: a resume and a
              15-second intro video. Companies swipe through candidates to shortlist the right people in minutes, and job seekers get discovered
              without sending a hundred applications.
            </p>
          </motion.div>
          <div className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['15 sec', 'intro video per candidate'],
              ['1 card', 'resume, video & match score'],
              ['₹0', 'for job seekers, always'],
              ['10', 'recruiters per company team'],
            ].map(([v, l]) => (
              <div key={l} className="glass rounded-2xl p-4">
                <p className="text-2xl font-extrabold text-brand-500">{v}</p>
                <p className="mt-1 text-xs font-semibold text-white/55">{l}</p>
              </div>
            ))}
          </div>
        </section>

        <Section eyebrow="Why we built it" title="Hiring was slow for everyone" text="Glide Recruit replaces the pile of PDFs with one card per person, and the long back-and-forth with chat, tasks and interviews in one place.">
          <div className="grid gap-4 md:grid-cols-3">
            {PROBLEMS.map((p) => (
              <motion.div key={p.title} {...fade} className="glass rounded-3xl p-6">
                <span className="grid size-11 place-items-center rounded-xl bg-brand-500/10 text-brand-500 ring-1 ring-brand-500/15">
                  <p.icon size={20} />
                </span>
                <h3 className="mt-4 text-lg font-bold">{p.title}</h3>
                <p className="mt-1.5 text-sm text-white/60">{p.text}</p>
              </motion.div>
            ))}
          </div>
        </Section>

        <Section eyebrow="How it works" title="Two sides, one simple flow">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <h3 className="mb-4 flex items-center gap-2 text-xl font-extrabold">
                <UserCheck className="text-brand-500" /> For job seekers
              </h3>
              <Steps steps={CANDIDATE_STEPS} />
            </div>
            <div>
              <h3 className="mb-4 flex items-center gap-2 text-xl font-extrabold">
                <Building2 className="text-sky-400" /> For companies
              </h3>
              <Steps steps={COMPANY_STEPS} />
            </div>
          </div>
        </Section>

        <Section eyebrow="Features" title="Everything a hiring team needs">
          <div className="space-y-10">
            {FEATURES.map((g) => (
              <div key={g.group}>
                <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.14em] text-white/50">{g.group}</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {g.items.map(([Icon, title, text]) => (
                    <motion.div key={title} {...fade} className="glass flex gap-3 rounded-2xl p-4">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-500/10 text-brand-500">
                        <Icon size={18} />
                      </span>
                      <div>
                        <p className="font-bold">{title}</p>
                        <p className="mt-0.5 text-sm text-white/60">{text}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section eyebrow="Pricing" title="Free for job seekers. Pay-as-you-go for companies.">
          <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
            <div className="glass rounded-3xl p-6">
              <p className="font-bold text-white/60">Job seekers</p>
              <p className="mt-1 text-3xl font-extrabold">Free</p>
              <p className="mt-2 text-sm text-white/60">Profile, resume, intro video, chat, tasks and interviews. No fees, ever.</p>
            </div>
            <div className="glass rounded-3xl p-6">
              <p className="font-bold text-white/60">Companies</p>
              <p className="mt-1 text-3xl font-extrabold">Swipe credits</p>
              <p className="mt-2 text-sm text-white/60">
                Start with free swipes, then buy a pack (Starter: ₹399 for 150 swipes). One credit per swipe; wishlisting is free. No subscription.
              </p>
            </div>
          </div>
        </Section>

        <section className="px-4 pb-20 pt-6">
          <motion.div {...fade} className="relative mx-auto max-w-6xl overflow-hidden rounded-[32px] bg-linear-to-br from-brand-500 to-brand-600 p-8 text-[#fff] sm:p-12">
            <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full border-[40px] border-[#fff]/[0.06]" aria-hidden="true" />
            <div className="relative md:w-2/3">
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Ready to try Glide Recruit?</h2>
              <p className="mt-3 max-w-md text-[#fff]/75">It takes less than two minutes to create an account.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/auth?role=company" className="inline-flex items-center gap-2 rounded-xl bg-[#fff] px-5 py-3 text-[15px] font-semibold text-brand-600 transition hover:bg-[#fff]/90">
                  <Briefcase size={18} /> I’m hiring
                </Link>
                <Link to="/auth" className="inline-flex items-center gap-2 rounded-xl border border-[#fff]/40 px-5 py-3 text-[15px] font-semibold text-[#fff] transition hover:bg-[#fff]/10">
                  I want a job <ArrowRight size={18} />
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
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-white/55">
            <Link to="/" className="hover:text-white">Home</Link>
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
