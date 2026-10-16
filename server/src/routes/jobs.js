import { Router } from 'express';
import mongoose from 'mongoose';
import { auth, requireRole, requireVerified } from '../middleware/auth.js';
import { Job } from '../models/Job.js';
import { Swipe } from '../models/Swipe.js';
import { HttpError } from '../utils/HttpError.js';
import { jobFields, publicJob } from '../utils/jobs.js';

const router = Router();
router.use(auth, requireVerified, requireRole('company'));

const MAX_OPEN_JOBS = 25;

async function ownJob(req) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, 'Invalid job');
  const job = await Job.findOne({ _id: req.params.id, company: req.user.companyId, internalSearch: { $ne: true } });
  if (!job) throw new HttpError(404, 'Job not found');
  return job;
}

router.get('/', async (req, res) => {
  const cid = new mongoose.Types.ObjectId(req.user.companyId);
  const [jobs, stats] = await Promise.all([
    Job.find({ company: cid }).sort({ status: 1, createdAt: -1 }).lean(),
    Swipe.aggregate([
      { $match: { company: cid } },
      {
        $group: {
          _id: '$job',
          swiped: { $sum: 1 },
          shortlisted: { $sum: { $cond: [{ $eq: ['$action', 'right'] }, 1, 0] } },
          interviewing: { $sum: { $cond: [{ $eq: ['$stage', 'interview'] }, 1, 0] } },
          hired: { $sum: { $cond: [{ $and: [{ $eq: ['$action', 'right'] }, { $eq: ['$stage', 'hired'] }] }, 1, 0] } },
        },
      },
    ]),
  ]);
  const by = new Map(stats.map((s) => [String(s._id), s]));
  const order = { open: 0, paused: 1, closed: 2 };
  res.json({
    jobs: jobs
      .sort((a, b) => order[a.status] - order[b.status])
      .map((j) => {
        const s = by.get(String(j._id)) || {};
        return { ...publicJob(j), stats: { swiped: s.swiped || 0, shortlisted: s.shortlisted || 0, interviewing: s.interviewing || 0, hired: s.hired || 0 } };
      }),
  });
});

router.post('/', async () => {
  throw new HttpError(410, 'Job posting is disabled. Set candidate requirements in Swipe filters instead.');
});

router.put('/:id', async (req, res) => {
  const job = await ownJob(req);
  Object.assign(job, jobFields(req.body));
  await job.save();
  res.json({ job: publicJob(job) });
});

router.patch('/:id/status', async (req, res) => {
  const status = req.body?.status;
  if (!['open', 'paused', 'closed'].includes(status)) throw new HttpError(400, 'Invalid status');
  const job = await ownJob(req);
  if (status !== 'closed' && job.status === 'closed') {
    const active = await Job.countDocuments({ company: req.user.companyId, status: { $ne: 'closed' } });
    if (active >= MAX_OPEN_JOBS) throw new HttpError(400, `You can have up to ${MAX_OPEN_JOBS} active jobs.`);
  }
  job.status = status;
  await job.save();
  res.json({ job: publicJob(job) });
});

export default router;
