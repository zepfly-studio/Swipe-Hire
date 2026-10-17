// Loads the code of the other pages in the background once someone is inside the admin panel
// or the app, so clicking a menu item opens the page at once instead of showing a spinner.
// (Same import paths as App.jsx, so the browser reuses these downloads.)
const ADMIN = [
  () => import('../pages/admin/AdminOverview'), () => import('../pages/admin/AdminAnalytics'), () => import('../pages/admin/AdminUsers'),
  () => import('../pages/admin/AdminJobs'), () => import('../pages/admin/AdminPayments'), () => import('../pages/admin/AdminVerifications'),
  () => import('../pages/admin/AdminReports'), () => import('../pages/admin/AdminReview'), () => import('../pages/admin/AdminTickets'),
  () => import('../pages/admin/AdminAnnounce'), () => import('../pages/admin/AdminPlans'), () => import('../pages/admin/AdminSettings'),
  () => import('../pages/admin/AdminContent'), () => import('../pages/admin/AdminIntegrations'), () => import('../pages/admin/AdminAdmins'),
  () => import('../pages/admin/AdminLogs'),
];
const SHARED = [() => import('../pages/MessagesPage'), () => import('../pages/InterviewsPage'), () => import('../pages/TasksPage'), () => import('../pages/SettingsPage'), () => import('../pages/SupportPage')];
const COMPANY = [
  () => import('../pages/company/SwipePage'), () => import('../pages/company/CandidateListPage'), () => import('../pages/company/CompanyFiltersPage'),
  () => import('../pages/company/PlansPage'), () => import('../pages/company/CompanyProfilePage'), () => import('../pages/company/TeamPage'),
  () => import('../pages/company/VerifyPage'),
];
const CANDIDATE = [() => import('../pages/candidate/CandidateHome')];

const done = new Set();
function preload(name, list) {
  if (done.has(name)) return;
  done.add(name);
  const run = () => list.forEach((load) => load().catch(() => {}));
  // After the current page has finished its own work.
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 3000 });
  else setTimeout(run, 1500);
}

export const preloadAdminPages = () => preload('admin', ADMIN);
export const preloadAppPages = (role) => preload(role, [...SHARED, ...(role === 'company' ? COMPANY : CANDIDATE)]);
