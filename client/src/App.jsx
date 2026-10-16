import { lazy, Suspense, useEffect, useRef } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Illustration from './components/Illustration';
import { homePath, useAuth } from './context/AuthContext';
import { Spinner } from './components/ui';
import AuthPage from './pages/AuthPage';
import LandingPage from './pages/LandingPage';
import { applyRouteMeta } from './lib/seo';
import { AdminGuard } from './pages/admin/AdminShell';
import { useSite } from './lib/site';
import { applyIntegrations, trackPage } from './lib/integrations';
import WhatsAppButton from './components/WhatsAppButton';

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
const AboutPage = lazy(() => import('./pages/AboutPage'));
const marketing = (name) => lazy(() => import('./pages/MarketingPages').then((m) => ({ default: m[name] })));
const HowItWorksPage = marketing('HowItWorksPage');
const ForCompaniesPage = marketing('ForCompaniesPage');
const ForJobSeekersPage = marketing('ForJobSeekersPage');
const PricingPage = marketing('PricingPage');
const FaqPage = marketing('FaqPage');
const SupportPage = lazy(() => import('./pages/SupportPage'));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'));
const AdminReports = lazy(() => import('./pages/admin/AdminReports'));
const AdminReview = lazy(() => import('./pages/admin/AdminReview'));
const AdminTickets = lazy(() => import('./pages/admin/AdminTickets'));
const AdminAnnounce = lazy(() => import('./pages/admin/AdminAnnounce'));
const AdminPlans = lazy(() => import('./pages/admin/AdminPlans'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminIntegrations = lazy(() => import('./pages/admin/AdminIntegrations'));
const AdminContent = lazy(() => import('./pages/admin/AdminContent'));
const AdminAdmins = lazy(() => import('./pages/admin/AdminAdmins'));
const AdminLogs = lazy(() => import('./pages/admin/AdminLogs'));
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage'));
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminJobs = lazy(() => import('./pages/admin/AdminJobs'));
const AdminPayments = lazy(() => import('./pages/admin/AdminPayments'));
const AdminVerifications = lazy(() => import('./pages/admin/AdminVerifications'));
const TeamPage = lazy(() => import('./pages/company/TeamPage'));
const JoinPage = lazy(() => import('./pages/JoinPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const CompanyProfilePage = lazy(() => import('./pages/company/CompanyProfilePage'));
const CompanyFiltersPage = lazy(() => import('./pages/company/CompanyFiltersPage'));
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

function MaintenanceScreen({ message }) {
  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="max-w-md">
        <Illustration name="maintenance" />
        <h1 className="mt-4 text-2xl font-extrabold">We'll be back soon</h1>
        <p className="mt-2 text-white/55">{message || 'Glide Recruit is down for maintenance. Please try again in a little while.'}</p>
        <button onClick={() => window.location.reload()} className="btn-primary mt-6">
          Try again
        </button>
      </div>
    </div>
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
  const { offline, refresh, user } = useAuth();
  const site = useSite();
  // Title, description, canonical and robots for each page.
  useEffect(() => applyRouteMeta(location.pathname), [location.pathname]);
  // Admin-enabled third-party tools: start them on public pages and report page views
  // (the first one is sent by the tools themselves when they load).
  const firstPage = useRef(true);
  useEffect(() => {
    applyIntegrations(site.integrations);
    if (firstPage.current) firstPage.current = false;
    else trackPage(location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);
  // Public pages (home, login) work without the API, so visitors and search engines still
  // see them if it's down; only the signed-in app shows the "can't reach" screen.
  if (offline && !['/', '/auth', '/about', '/how-it-works', '/for-companies', '/for-job-seekers', '/pricing', '/faq', '/adminlogin'].includes(location.pathname)) {
    return <OfflineScreen onRetry={refresh} />;
  }
  // Maintenance mode: admins keep working; the admin login stays reachable.
  if (site.maintenance.on && !user?.isAdmin && !location.pathname.startsWith('/admin')) return <MaintenanceScreen message={site.maintenance.message} />;
  return (
    <>
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<GuestOnly><Page><AuthPage /></Page></GuestOnly>} />
        <Route path="/about" element={<Page><AboutPage /></Page>} />
        <Route path="/how-it-works" element={<Page><HowItWorksPage /></Page>} />
        <Route path="/for-companies" element={<Page><ForCompaniesPage /></Page>} />
        <Route path="/for-job-seekers" element={<Page><ForJobSeekersPage /></Page>} />
        <Route path="/pricing" element={<Page><PricingPage /></Page>} />
        <Route path="/faq" element={<Page><FaqPage /></Page>} />
        <Route path="/verify-email" element={<Unverified><Page><VerifyEmailPage /></Page></Unverified>} />

        <Route path="/candidate/onboarding" element={<Guard role="candidate"><Page><CandidateOnboarding /></Page></Guard>} />
        <Route path="/candidate" element={<Guard role="candidate" onboarded><Page><CandidateHome /></Page></Guard>} />

        <Route path="/company/onboarding" element={<Guard role="company"><Page><CompanyOnboarding /></Page></Guard>} />
        <Route path="/company/swipe" element={<Guard role="company" onboarded><Page><SwipePage /></Page></Guard>} />
        <Route path="/company/filters" element={<Guard role="company" onboarded><Page><CompanyFiltersPage /></Page></Guard>} />
        <Route path="/company/wishlist" element={<Guard role="company" onboarded><Page><CandidateListPage kind="wishlist" /></Page></Guard>} />
        <Route path="/company/shortlisted" element={<Guard role="company" onboarded><Page><CandidateListPage kind="shortlisted" /></Page></Guard>} />
        <Route path="/company/plans" element={<Guard role="company" onboarded><Page><PlansPage /></Page></Guard>} />
        <Route path="/company/jobs" element={<Guard role="company" onboarded><Navigate to="/company/swipe" replace /></Guard>} />
        <Route path="/company/profile" element={<Guard role="company" onboarded><Page><CompanyProfilePage /></Page></Guard>} />
        <Route path="/settings" element={<Guard onboarded><Page><SettingsPage /></Page></Guard>} />
        <Route path="/company/team" element={<Guard role="company" onboarded><Page><TeamPage /></Page></Guard>} />
        <Route path="/join" element={<GuestOnly><Page><JoinPage /></Page></GuestOnly>} />
        <Route path="/company/verify" element={<Guard role="company" onboarded><Page><VerifyPage /></Page></Guard>} />

        <Route path="/messages" element={<Guard onboarded><Page><MessagesPage /></Page></Guard>} />
        <Route path="/interviews" element={<Guard onboarded><Page><InterviewsPage /></Page></Guard>} />
        <Route path="/tasks" element={<Guard onboarded><Page><TasksPage /></Page></Guard>} />
        <Route path="/adminlogin" element={<Page><AdminLoginPage /></Page>} />
        <Route path="/admin" element={<AdminGuard><Page><AdminOverview /></Page></AdminGuard>} />
        <Route path="/admin/candidates" element={<AdminGuard><Page><AdminUsers role="candidate" /></Page></AdminGuard>} />
        <Route path="/admin/companies" element={<AdminGuard><Page><AdminUsers role="company" /></Page></AdminGuard>} />
        <Route path="/admin/recruiters" element={<AdminGuard><Page><AdminUsers role="recruiter" /></Page></AdminGuard>} />
        <Route path="/admin/jobs" element={<AdminGuard><Page><AdminJobs /></Page></AdminGuard>} />
        <Route path="/admin/verifications" element={<AdminGuard><Page><AdminVerifications /></Page></AdminGuard>} />
        <Route path="/admin/payments" element={<AdminGuard><Page><AdminPayments /></Page></AdminGuard>} />
        <Route path="/admin/analytics" element={<AdminGuard><Page><AdminAnalytics /></Page></AdminGuard>} />
        <Route path="/admin/reports" element={<AdminGuard><Page><AdminReports /></Page></AdminGuard>} />
        <Route path="/admin/review" element={<AdminGuard><Page><AdminReview /></Page></AdminGuard>} />
        <Route path="/admin/tickets" element={<AdminGuard><Page><AdminTickets /></Page></AdminGuard>} />
        <Route path="/admin/announce" element={<AdminGuard><Page><AdminAnnounce /></Page></AdminGuard>} />
        <Route path="/admin/plans" element={<AdminGuard><Page><AdminPlans /></Page></AdminGuard>} />
        <Route path="/admin/settings" element={<AdminGuard><Page><AdminSettings /></Page></AdminGuard>} />
        <Route path="/admin/integrations" element={<AdminGuard><Page><AdminIntegrations /></Page></AdminGuard>} />
        <Route path="/admin/content" element={<AdminGuard><Page><AdminContent /></Page></AdminGuard>} />
        <Route path="/admin/admins" element={<AdminGuard><Page><AdminAdmins /></Page></AdminGuard>} />
        <Route path="/admin/logs" element={<AdminGuard><Page><AdminLogs /></Page></AdminGuard>} />
        <Route path="/support" element={<Guard><Page><SupportPage /></Page></Guard>} />

        <Route path="*" element={<Page><NotFoundPage /></Page>} />
      </Routes>
    </AnimatePresence>
    {site.integrations?.whatsapp && !location.pathname.startsWith('/admin') && <WhatsAppButton {...site.integrations.whatsapp} />}
    </>
  );
}
