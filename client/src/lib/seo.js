// Per-page <title>, description, canonical URL and robots tag for this single-page app.
// Public pages are indexed; everything behind login is marked noindex.

export const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://swipehire.in';
export const SITE_NAME = 'Swipe Hire';

const HOME = {
  title: 'Swipe Hire – Best Hiring Platform & Job App in India',
  description:
    'Find the best job opportunities and hire faster. Companies swipe through resumes and 15-second video intros; candidates get shortlisted without endless applications.',
};

const PUBLIC = {
  '/': HOME,
  '/auth': {
    title: 'Sign Up or Log In – Swipe Hire',
    description:
      'Create a free Swipe Hire account. Job seekers get discovered by top companies; recruiters hire faster by swiping through video resumes.',
  },
};

// Browser-tab titles for logged-in pages (never indexed).
const PRIVATE_TITLES = {
  '/candidate': 'My dashboard',
  '/candidate/onboarding': 'My profile',
  '/company/onboarding': 'Company setup',
  '/company/swipe': 'Swipe candidates',
  '/company/jobs': 'Jobs',
  '/company/shortlisted': 'Shortlisted',
  '/company/wishlist': 'Wishlist',
  '/company/plans': 'Plans',
  '/company/verify': 'Verify company',
  '/company/team': 'Team',
  '/company/profile': 'Company profile',
  '/messages': 'Messages',
  '/interviews': 'Interviews',
  '/tasks': 'Tasks',
  '/settings': 'Account settings',
  '/admin': 'Admin',
  '/join': 'Join your team',
  '/verify-email': 'Verify your email',
};

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = href;
}

// Called on every route change.
export function applyRouteMeta(pathname) {
  const page = PUBLIC[pathname];
  if (page) {
    const url = `${SITE_URL}${pathname}`;
    document.title = page.title;
    setMeta('name', 'description', page.description);
    setMeta('name', 'robots', 'index, follow, max-image-preview:large');
    setMeta('property', 'og:title', page.title);
    setMeta('property', 'og:description', page.description);
    setMeta('property', 'og:url', url);
    setMeta('name', 'twitter:title', page.title);
    setMeta('name', 'twitter:description', page.description);
    setCanonical(url);
    return;
  }
  const known = PRIVATE_TITLES[pathname];
  document.title = known ? `${known} · ${SITE_NAME}` : `Page not found · ${SITE_NAME}`;
  setMeta('name', 'robots', 'noindex, nofollow');
  setCanonical(`${SITE_URL}/`);
}

// Adds a JSON-LD block to <head> while a page is shown; returns a cleanup function.
export function addJsonLd(id, data) {
  const el = document.createElement('script');
  el.type = 'application/ld+json';
  el.id = id;
  el.textContent = JSON.stringify(data);
  document.head.appendChild(el);
  return () => el.remove();
}
