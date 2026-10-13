import mongoose from 'mongoose';
import { Swipe } from '../models/Swipe.js';
import { Message } from '../models/Message.js';
import { Task } from '../models/Task.js';
import { Interview } from '../models/Interview.js';
import { HttpError } from './HttpError.js';

// A shortlist alone stays anonymous to the candidate: they only learn which company it is
// once the company reaches out (a message, a task or an interview invite).
// Returns the ids (strings) of companies that have contacted this candidate.
export async function companiesThatContacted(candidateId) {
  const candidate = new mongoose.Types.ObjectId(String(candidateId));
  const [messaged, tasked, invited] = await Promise.all([
    Message.distinct('company', { candidate, $expr: { $ne: ['$sender', '$candidate'] } }),
    Task.distinct('company', { candidate }),
    Interview.distinct('company', { candidate }),
  ]);
  return new Set([...messaged, ...tasked, ...invited].map(String));
}

// Company <-> candidate features (chat, interviews) only exist once the company
// has shortlisted (right-swiped) the candidate for at least one job. A candidate can
// only reach a company after it has contacted them.
// For company users `otherId` is the candidate; for candidates it is the company id.
export async function shortlistedPair(user, otherId) {
  if (!mongoose.isValidObjectId(otherId)) throw new HttpError(400, 'Invalid user');
  const pair =
    user.role === 'company' ? { company: user.companyId, candidate: otherId } : { company: otherId, candidate: user.id };
  const swipe = await Swipe.findOne({ ...pair, action: 'right' }).sort({ createdAt: -1 });
  if (!swipe) throw new HttpError(403, 'You can only contact shortlisted candidates');
  if (user.role !== 'company' && !(await companiesThatContacted(user.id)).has(String(otherId))) {
    throw new HttpError(403, 'This company has not contacted you yet');
  }
  return { pair, swipe, otherId: String(otherId) };
}
