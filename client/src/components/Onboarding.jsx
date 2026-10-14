import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, X } from 'lucide-react';
import Background from './Background';
import Illustration from './Illustration';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';
import Modal from './Modal';
import { Burst, Button, ProgressBar } from './ui';
import { homePath, useAuth } from '../context/AuthContext';
import { clearAllDrafts } from '../hooks/useDraft';

export function OnboardingShell({ children }) {
  const { logout, user, profile } = useAuth();
  const [params] = useSearchParams();
  const editing = params.has('edit');
  return (
    <div className="min-h-dvh">
      <Background />
      <header className="relative z-[60] mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-5">
        <Logo />
        <div className="flex items-center gap-2">
        <ThemeToggle />
        {editing ? (
          // Editing an existing profile: let people leave without finishing every step.
          <Link to={homePath(user, profile)} replace onClick={clearAllDrafts} className="btn-ghost px-3 py-2 text-sm">
            <X size={16} />
            Cancel
          </Link>
        ) : (
          <button onClick={logout} className="btn-ghost px-3 py-2 text-sm">
            <LogOut size={16} />
            <span className="hidden sm:inline">Log out</span>
          </button>
        )}
        </div>
      </header>
      <div className="mx-auto mt-16 max-w-xl px-4 text-center">
        <p className="text-sm text-white/40">Welcome, {user?.name?.split(' ')[0]}</p>
      </div>
      {children}
    </div>
  );
}

const slide = {
  enter: (dir) => ({ x: dir * 70, opacity: 0, filter: 'blur(6px)' }),
  center: { x: 0, opacity: 1, filter: 'blur(0px)' },
  exit: (dir) => ({ x: dir * -70, opacity: 0, filter: 'blur(6px)' }),
};

// Multi-step popup used for onboarding. `steps` = [{ title, subtitle }]
export function StepModal({ steps, step, dir, children }) {
  const current = steps[step];
  return (
    <Modal open className="sm:max-w-xl">
      {current && (
        <div className="space-y-4 px-6 pb-4 pt-6">
          <div className="flex items-center justify-between text-xs font-semibold text-white/40">
            <span>
              Step {step + 1} of {steps.length}
            </span>
            <span>{Math.round(((step + 1) / steps.length) * 100)}%</span>
          </div>
          <ProgressBar value={((step + 1) / steps.length) * 100} />
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div key={step} custom={dir} variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.28 }}>
              <h2 className="text-2xl font-extrabold tracking-tight">{current.title}</h2>
              <p className="mt-1 text-sm text-white/50">{current.subtitle}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      )}
      <AnimatePresence mode="wait" custom={dir} initial={false}>
        <motion.div
          key={step}
          custom={dir}
          variants={slide}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.28 }}
          className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </Modal>
  );
}

export function StepBody({ children }) {
  return <div className="flex-1 space-y-4 px-6 pb-4 pt-2">{children}</div>;
}

export function StepFooter({ children }) {
  return (
    <div className="sticky bottom-0 flex gap-3 border-t border-white/5 bg-ink-900/95 px-6 py-4 backdrop-blur">{children}</div>
  );
}

export function DoneScreen({ title, text, action, onAction }) {
  return (
    <div className="relative flex flex-col items-center px-6 py-14 text-center">
      <div className="relative">
        <Burst count={30} distance={170} />
        <motion.div
          initial={{ scale: 0, rotate: -40 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 14 }}
        >
          <Illustration name="profile-complete" />
        </motion.div>
      </div>
      <motion.h2 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mt-4 text-3xl font-extrabold">
        {title}
      </motion.h2>
      <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mt-2 max-w-sm text-white/60">
        {text}
      </motion.p>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="mt-8">
        <Button onClick={onAction}>{action}</Button>
      </motion.div>
    </div>
  );
}
