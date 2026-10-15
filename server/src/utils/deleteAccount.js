import { User } from '../models/User.js';
import { CandidateProfile } from '../models/CandidateProfile.js';
import { CompanyProfile } from '../models/CompanyProfile.js';
import { Job } from '../models/Job.js';
import { Swipe } from '../models/Swipe.js';
import { Wishlist } from '../models/Wishlist.js';
import { Message } from '../models/Message.js';
import { Interview } from '../models/Interview.js';
import { Task } from '../models/Task.js';
import { Notification } from '../models/Notification.js';
import { SavedSearch } from '../models/SavedSearch.js';
import { TeamInvite } from '../models/TeamInvite.js';
import { removeUpload } from '../middleware/upload.js';

// Permanently removes an account and everything that hangs off it (used by admins).
// A company owner takes the whole company with them: recruiters, jobs, pipeline, chats.
// Payments are kept as financial records.
export async function deleteAccount(userId) {
  const user = await User.findById(userId).lean();
  if (!user) return null;

  if (user.role === 'candidate') {
    const profile = await CandidateProfile.findOne({ user: user._id }).lean();
    for (const url of [profile?.resumeUrl, profile?.videoUrl, user.avatarUrl]) removeUpload(url);
    const who = { candidate: user._id };
    await Promise.all([
      CandidateProfile.deleteOne({ user: user._id }),
      Swipe.deleteMany(who),
      Wishlist.deleteMany(who),
      Message.deleteMany(who),
      Interview.deleteMany(who),
      Task.deleteMany(who),
      Notification.deleteMany({ $or: [{ user: user._id }, { from: user._id }] }),
    ]);
    await User.deleteOne({ _id: user._id });
    return { role: 'candidate', removedUsers: 1 };
  }

  // A recruiter on someone else's team: only their own login goes.
  if (user.companyId) {
    removeUpload(user.avatarUrl);
    await Notification.deleteMany({ user: user._id });
    await User.deleteOne({ _id: user._id });
    return { role: 'recruiter', removedUsers: 1 };
  }

  // Company owner: the company account and all of its data.
  const team = await User.find({ companyId: user._id }).select('avatarUrl').lean();
  const company = await CompanyProfile.findOne({ user: user._id }).lean();
  for (const url of [company?.logoUrl, user.avatarUrl, ...team.map((t) => t.avatarUrl)]) removeUpload(url);
  const members = [user._id, ...team.map((t) => t._id)];
  const owned = { company: user._id };
  await Promise.all([
    CompanyProfile.deleteOne({ user: user._id }),
    Job.deleteMany(owned),
    Swipe.deleteMany(owned),
    Wishlist.deleteMany(owned),
    Message.deleteMany(owned),
    Interview.deleteMany(owned),
    Task.deleteMany(owned),
    SavedSearch.deleteMany(owned),
    TeamInvite.deleteMany(owned),
    Notification.deleteMany({ $or: [{ user: { $in: members } }, { from: { $in: members } }] }),
  ]);
  await User.deleteMany({ _id: { $in: members } });
  return { role: 'company', removedUsers: members.length };
}
