import { SavedSearch } from '../models/SavedSearch.js';
import { CandidateProfile } from '../models/CandidateProfile.js';
import { feedFilters } from './candidates.js';
import { notifyCompany } from './notify.js';

// Call when a candidate goes live or changes their profile. Every saved search
// (with alerts on) that now matches them notifies its company — once per candidate.
export async function alertSavedSearches(candidateId) {
  try {
    const profile = await CandidateProfile.findOne({ user: candidateId, step: 3, openToWork: { $ne: false }, suspended: { $ne: true } })
      .populate('user', 'name')
      .lean();
    if (!profile?.user) return;

    const searches = await SavedSearch.find({ alerts: true, notifiedCandidates: { $ne: candidateId } }).lean();
    for (const s of searches) {
      const match = await CandidateProfile.exists({ _id: profile._id, ...feedFilters(s.filters || {}) });
      if (!match) continue;
      // Claim first so two profile saves at once can't alert twice.
      const claimed = await SavedSearch.updateOne(
        { _id: s._id, notifiedCandidates: { $ne: candidateId } },
        { $push: { notifiedCandidates: { $each: [candidateId], $slice: -5000 } } },
      );
      if (!claimed.modifiedCount) continue;
      await notifyCompany(s.company, {
        type: 'alert',
        title: `New match for "${s.name}"`,
        body: `${profile.user.name} · ${profile.headline || 'Candidate'}${profile.location ? ` · ${profile.location}` : ''} just joined. Swipe now before others do.`,
        link: `/company/swipe?search=${s._id}`,
        email: true,
      });
    }
  } catch (err) {
    console.error('[alerts] failed:', err.message);
  }
}
