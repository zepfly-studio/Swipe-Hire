// Candidates confirm "I'm still looking" every ACTIVE_DAYS days to stay at the top of
// company feeds. The website shows the same number (client/src/lib/activity.js).
export const ACTIVE_DAYS = 15;
const DAY = 24 * 60 * 60 * 1000;
// New candidates get a small push up the feed for their first week.
const NEW_DAYS = 7;
const NEW_BOOST = 10;

export const isStale = (profile, now = Date.now()) => now - new Date(profile.activeAt ?? profile.updatedAt).getTime() > ACTIVE_DAYS * DAY;

// Feed order: candidates who haven't confirmed recently always come after active ones;
// within each group, the match score (plus a boost for new joiners) decides.
export function feedRank(profile, matchScore, now = Date.now()) {
  const isNew = now - new Date(profile.createdAt).getTime() < NEW_DAYS * DAY;
  return { stale: isStale(profile, now), score: (matchScore ?? 0) + (isNew ? NEW_BOOST : 0) };
}
