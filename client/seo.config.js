// SEO files generated from one place: robots.txt, sitemap.xml and llms.txt.
// They are served by the dev server and written into dist/ on build (see vite.config.js).

// Public pages that search engines should index. Everything behind login is excluded.
export const PUBLIC_PAGES = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/auth', changefreq: 'monthly', priority: '0.6' },
];

// Logged-in areas: no value in search results, and they only show a login redirect.
const PRIVATE_PREFIXES = ['/api/', '/uploads/', '/candidate', '/company/', '/messages', '/interviews', '/tasks', '/settings', '/admin', '/join'];

export function seoFiles(siteUrl) {
  const today = new Date().toISOString().slice(0, 10);
  return {
    'robots.txt': {
      type: 'text/plain',
      body: ['User-agent: *', 'Allow: /', ...PRIVATE_PREFIXES.map((p) => `Disallow: ${p}`), '', `Sitemap: ${siteUrl}/sitemap.xml`, ''].join('\n'),
    },
    'sitemap.xml': {
      type: 'application/xml',
      body: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PUBLIC_PAGES.map(
  (p) => `  <url>
    <loc>${siteUrl}${p.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`,
).join('\n')}
</urlset>
`,
    },
    // A plain summary for AI assistants and AI search (https://llmstxt.org).
    'llms.txt': {
      type: 'text/plain',
      body: `# Swipe Hire

> Swipe Hire is a hiring platform in India where companies swipe through candidate resumes and 15-second intro videos, Tinder-style, to find the right people fast. Job seekers create one profile and get discovered for the best job opportunities without sending hundreds of applications.

## For companies
- Swipe right to shortlist a candidate and unlock their phone and email; swipe left to pass.
- Every candidate shows a match score against the job (skills, experience, salary, location).
- Only candidates whose salary expectation fits the job budget (or who are open to negotiate) can be shortlisted.
- Chat with shortlisted candidates, send take-home tasks with deadlines, and schedule interviews.
- Multiple jobs, team accounts for recruiters, saved searches with alerts, and a verified company badge.
- Pricing: 5 free swipes to start; the Starter plan is ₹399 for 150 swipes.

## For job seekers
- Free to use. Fill your profile from your resume, record a 15-second intro video and get discovered.
- Set an expected salary range and whether it is negotiable.
- Companies see your contact details only after they shortlist you; age and gender are never shown to companies.
- Companies stay anonymous until they contact you.

## Links
- Home: ${siteUrl}/
- Sign up / log in: ${siteUrl}/auth
`,
    },
  };
}
