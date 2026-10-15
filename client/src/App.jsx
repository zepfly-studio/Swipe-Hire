import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Illustration from './components/Illustration';
import { homePath, useAuth } from './context/AuthContext';
import { Spinner } from './components/ui';
import AuthPage from './pages/AuthPage';
import LandingPage from './pages/LandingPage';
import { applyRouteMeta } from './lib/seo';

const CandidateOnboarding = lazy(() => import('./pages/candidate/CandidateOnboarding'));
const CandidateHome = lazy(() => import('./pages/candidate/CandidateHome'));
const CompanyOnboarding = lazy(() => import('./pages/company/CompanyOnboarding'));
const SwipePage = lazy(() => import('./pages/company/SwipePage'));
const CandidateListPage = lazy(() => import('./pages/company/CandidateListPage'));
const PlansPage = lazy(() => import('./pages/company/PlansPage'));
const VerifyPage = lazy(() => import('./pages/company/VerifyPage'));
const MessagesPage = lazy(() => import('./pages/MessagesPage'));
const InterviewsPage = lazy(() => import('./pages/InterviewsPage'));
const TasksPage = lazy(() => import('./pages/TasksPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const JobsPage = lazy(() => import('./pages/company/JobsPage'));
const TeamPage = lazy(() => import('./pages/company/TeamPage'));
const JoinPage = lazy(() => import('./pages/JoinPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const CompanyProfilePage = lazy(() => import('./pages/company/CompanyProfilePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));

function isOnboarded(user, profile) {
  return user.role === 'candidate' ? profile?.step >= 3 : Boolean(profile?.completed);
}

function Guard({ role, onboarded, admin, children }) {
  const { loading, user, profile } = useAuth();
  if (loading) return <Spinner className="min-h-dvh" />;
  if (!user) return <Navigate to="/auth" replace />;
  if (user.emailVerified === false) return <Navigate to="/verify-email" replace />;
  if (role && user.role !== role) return <Navigate to={homePath(user, profile)} replace />;
  if (admin && !user.isAdmin) return <Navigate to={homePath(user, profile)} replace />;
  if (onboarded && !isOnboarded(user, profile)) return <Navigate to={homePath(user, profile)} replace />;
  return children;
}

// Only for a signed-in account whose email isn't verified yet.
function Unverified({ children }) {
  const { loading, user, profile } = useAuth();
  if (loading) return <Spinner className="min-h-dvh" />;
  if (!user) return <Navigate to="/auth" replace />;
  if (user.emailVerified !== false) return <Navigate to={homePath(user, profile)} replace />;
  return children;
}

function GuestOnly({ children }) {
  const { loading, user, profile } = useAuth();
  if (loading) return <Spinner className="min-h-dvh" />;
  if (user) return <Navigate to={homePath(user, profile)} replace />;
  return children;
}

// Visitors (and search engines) get the landing page; signed-in users go to their dashboard.
function Home() {
  const { loading, user, profile } = useAuth();
  if (loading) return <Spinner className="min-h-dvh" />;
  if (user) return <Navigate to={homePath(user, profile)} replace />;
  return <LandingPage />;
}

function Page({ children }) {
  return (
    // Opacity only: a transform here would break position:fixed children.
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
      <Suspense fallback={<Spinner className="min-h-dvh" />}>{children}</Suspense>
    </motion.div>
  );
}

function OfflineScreen({ onRetry }) {
  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <Illustration name="offline" />
        <h1 className="mt-4 text-2xl font-extrabold">Can't reach Glide Recruit</h1>
        <p className="mt-2 text-white/55">Check your internet connection and try again.</p>
        <button onClick={onRetry} className="btn-primary mt-6">
          Try again
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const { offline, refresh } = useAuth();
  // Title, description, canonical and robots for each page.
  useEffect(() => applyRouteMeta(location.pathname), [location.pathname]);
  // Public pages (home, login) work without the API, so visitors and search engines still
  // see them if it's down; only the signed-in app shows the "can't reach" screen.
  if (offline && !['/', '/auth'].includes(location.pathname)) return <OfflineScreen onRetry={refresh} />;
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<GuestOnly><Page><AuthPage /></Page></GuestOnly>} />
        <Route path="/verify-email" element={<Unverified><Page><VerifyEmailPage /></Page></Unverified>} />

        <Route path="/candidate/onboarding" element={<Guard role="candidate"><Page><CandidateOnboarding /></Page></Guard>} />
        <Route path="/candidate" element={<Guard role="candidate" onboarded><Page><CandidateHome /></Page></Guard>} />

        <Route path="/company/onboarding" element={<Guard role="company"><Page><CompanyOnboarding /></Page></Guard>} />
        <Route path="/company/swipe" element={<Guard role="company" onboarded><Page><SwipePage /></Page></Guard>} />
        <Route path="/company/wishlist" element={<Guard role="company" onboarded><Page><CandidateListPage kind="wishlist" /></Page></Guard>} />
        <Route path="/company/shortlisted" element={<Guard role="company" onboarded><Page><CandidateListPage kind="shortlisted" /></Page></Guard>} />
        <Route path="/company/plans" element={<Guard role="company" onboarded><Page><PlansPage /></Page></Guard>} />
        <Route path="/company/jobs" element={<Guard role="company" onboarded><Page><JobsPage /></Page></Guard>} />
        <Route path="/company/profile" element={<Guard role="company" onboarded><Page><CompanyProfilePage /></Page></Guard>} />
        <Route path="/settings" element={<Guard onboarded><Page><SettingsPage /></Page></Guard>} />
        <Route path="/company/team" element={<Guard role="company" onboarded><Page><TeamPage /></Page></Guard>} />
        <Route path="/join" element={<GuestOnly><Page><JoinPage /></Page></GuestOnly>} />
        <Route path="/company/verify" element={<Guard role="company" onboarded><Page><VerifyPage /></Page></Guard>} />

        <Route path="/messages" element={<Guard onboarded><Page><MessagesPage /></Page></Guard>} />
        <Route path="/interviews" element={<Guard onboarded><Page><InterviewsPage /></Page></Guard>} />
        <Route path="/tasks" element={<Guard onboarded><Page><TasksPage /></Page></Guard>} />
        <Route path="/admin" element={<Guard admin><Page><AdminPage /></Page></Guard>} />

        <Route path="*" element={<Page><NotFoundPage /></Page>} />
      </Routes>
    </AnimatePresence>
  );
}
