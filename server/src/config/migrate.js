import { User } from '../models/User.js';
import { CandidateProfile } from '../models/CandidateProfile.js';
import { CompanyProfile } from '../models/CompanyProfile.js';
import { Job } from '../models/Job.js';
import { Swipe } from '../models/Swipe.js';

// Brings data from older versions up to date. Safe to run on every start.
export async function migrate() {
  // v1 companies had a single set of hiring requirements on their profile.
  // Turn that into their first Job and attach their old swipes to it.
  const companies = await CompanyProfile.find({ completed: true }).lean();
  for (const c of companies) {
    let job = await Job.findOne({ company: c.user }).sort({ createdAt: 1 });
    if (!job && c.hiringFor) {
      job = await Job.create({
        company: c.user,
        title: c.hiringFor,
        requiredSkills: c.requiredSkills,
        minExperience: c.minExperience,
        maxExperience: c.maxExperience,
        salaryMin: c.salaryMin,
        salaryMax: c.salaryMax,
        jobLocation: c.jobLocation,
        workMode: c.workMode,
      });
    }
    if (job) {
      await Swipe.collection.updateMany({ company: c.user, job: { $exists: false } }, { $set: { job: job._id } });
    }
  }
  // Drops the old one-swipe-per-candidate index and builds the per-job one.
  await Swipe.syncIndexes();

  // Accounts created before email verification existed keep working.
  await User.collection.updateMany({ emailVerified: { $exists: false } }, { $set: { emailVerified: true } });

  // Candidates from before the "still looking" check count as active since their last update.
  await CandidateProfile.collection.updateMany({ activeAt: { $exists: false } }, [{ $set: { activeAt: '$updatedAt' } }]);
}
