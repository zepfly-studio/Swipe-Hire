import { Router } from 'express';
import fs from 'node:fs';
import { auth, requireRole, requireVerified } from '../middleware/auth.js';
import { resumeUpload, videoUpload, removeUpload, assertFileSignature } from '../middleware/upload.js';
import { storeUpload } from '../utils/storage.js';
import { CandidateProfile } from '../models/CandidateProfile.js';
import { CompanyProfile } from '../models/CompanyProfile.js';
import { Swipe } from '../models/Swipe.js';
import { Wishlist } from '../models/Wishlist.js';
import { Job } from '../models/Job.js';
import { alertSavedSearches } from '../utils/alerts.js';
import { companiesThatContacted, shortlistedPair } from '../utils/pairs.js';
import { extractProfile, pdfText } from '../utils/resumeParser.js';
import { HttpError } from '../utils/HttpError.js';
import { signUrl, withSignedFiles } from '../utils/signedUrl.js';
import { cleanList } from '../utils/pick.js';
import { num, salary, text, requireFields, stripUndefined } from '../utils/fields.js';

const router = Router();
router.use(auth, requireVerified, requireRole('candidate'));

router.put('/profile', async (req, res) => {
  const b = req.body ?? {};
  const data = stripUndefined({
    headline: text(b.headline, 80),
    phone: text(b.phone, 20),
    age: num(b.age, 'age (16–75)', { min: 16, max: 75, field: 'age' }),
    gender: text(b.gender, 30),
    location: text(b.location, 80),
    qualification: text(b.qualification, 40),
    degree: text(b.degree, 80),
    college: text(b.college, 120),
    graduationYear: num(b.graduationYear, 'passing year, like 2023', { min: 1960, max: 2040, field: 'graduationYear' }),
    skills: cleanList(b.skills),
    experienceYears: num(b.experienceYears, 'experience in years', { max: 50, field: 'experienceYears' }),
    currentCompany: text(b.currentCompany, 80),
    currentPost: text(b.currentPost, 80),
    currentSalary: salary(b.currentSalary, 'current salary', 'currentSalary'),
    expectedSalary: salary(b.expectedSalary, 'minimum expected salary', 'expectedSalary'),
    expectedSalaryMax: salary(b.expectedSalaryMax, 'maximum expected salary', 'expectedSalaryMax'),
    salaryNegotiable: b.salaryNegotiable === undefined ? undefined : b.salaryNegotiable === true,
    noticePeriod: text(b.noticePeriod, 30),
    about: text(b.about, 600),
    workModes: b.workModes === undefined ? undefined : cleanList(b.workModes).filter((m) => ['onsite', 'remote', 'hybrid'].includes(m)),
    jobTypes:
      b.jobTypes === undefined ? undefined : cleanList(b.jobTypes).filter((t) => ['full-time', 'part-time', 'internship', 'contract'].includes(t)),
  });

  if (data.expectedSalaryMax != null && data.expectedSalary != null && data.expectedSalaryMax < data.expectedSalary) {
    throw new HttpError(400, 'Maximum salary should be more than the minimum', { field: 'expectedSalaryMax' });
  }
  if (data.phone && !/^\+?[\d\s-]{10,16}$/.test(data.phone)) {
    throw new HttpError(400, 'Please enter a valid phone number', { field: 'phone' });
  }
  requireFields(data, {
    phone: 'Phone number',
    age: 'Age',
    gender: 'Gender',
    location: 'Location',
    qualification: 'Qualification',
    degree: 'Degree',
    headline: 'Job title / role',
    skills: 'At least one skill',
    experienceYears: 'Experience',
    expectedSalary: 'Minimum expected salary',
  });

  // A resume uploaded earlier (auto-fill) means the resume step is already done.
  const prev = await CandidateProfile.findOne({ user: req.user.id }).select('resumeUrl').lean();
  const profile = await CandidateProfile.findOneAndUpdate(
    { user: req.user.id },
    { $set: data, $max: { step: prev?.resumeUrl ? 2 : 1 } },
    { returnDocument: 'after' },
  ).lean();
  if (profile.step >= 3) alertSavedSearches(req.user.id);
  res.json({ profile: withSignedFiles(profile) });
});

// Upload the resume first and get the details form filled from it.
router.post('/resume/autofill', resumeUpload, async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Please choose your resume (PDF)');
  await assertFileSignature(req.file, 'pdf');
  const prev = await CandidateProfile.findOne({ user: req.user.id }).lean();

  let fields = {};
  try {
    fields = extractProfile(await pdfText(await fs.promises.readFile(req.file.path)));
  } catch {
    // Scanned / image-only PDFs have no text; the upload still counts.
  }
  const url = await storeUpload(req.file);
  const profile = await CandidateProfile.findOneAndUpdate(
    { user: req.user.id },
    { $set: { resumeUrl: url, mediaAt: new Date() }, $unset: { review: 1 }, ...(prev?.step >= 1 && { $max: { step: 2 } }) },
    { returnDocument: 'after' },
  ).lean();
  if (prev?.resumeUrl && prev.resumeUrl !== url) removeUpload(prev.resumeUrl);
  res.json({ fields, profile: withSignedFiles(profile) });
});

async function saveUpload(req, field, requiredStep, nextStep) {
  if (!req.file) throw new HttpError(400, 'Please choose a file to upload');
  await assertFileSignature(req.file, field === 'resumeUrl' ? 'pdf' : 'video');
  const prev = await CandidateProfile.findOne({ user: req.user.id }).lean();
  if (!prev || prev.step < requiredStep) {
    fs.promises.unlink(req.file.path).catch(() => {});
    throw new HttpError(400, 'Please complete the previous step first');
  }
  const url = await storeUpload(req.file);
  const profile = await CandidateProfile.findOneAndUpdate(
    { user: req.user.id },
    { $set: { [field]: url, mediaAt: new Date() }, $unset: { review: 1 }, $max: { step: nextStep } },
    { returnDocument: 'after' },
  ).lean();
  if (prev[field] && prev[field] !== url) removeUpload(prev[field]);
  return withSignedFiles(profile);
}

router.post('/resume', resumeUpload, async (req, res) => {
  res.json({ profile: await saveUpload(req, 'resumeUrl', 1, 2) });
});

router.post('/video', videoUpload, async (req, res) => {
  const profile = await saveUpload(req, 'videoUrl', 2, 3);
  alertSavedSearches(req.user.id); // profile is now live
  res.json({ profile });
});

router.get('/stats', async (req, res) => {
  const [rightSwipes, viewedCount, wishlistedCount] = await Promise.all([
    Swipe.find({ candidate: req.user.id, action: 'right' }).sort({ createdAt: -1 }).lean(),
    Swipe.countDocuments({ candidate: req.user.id }),
    Wishlist.countDocuments({ candidate: req.user.id }),
  ]);

  const [companies, jobs] = await Promise.all([
    CompanyProfile.find({ user: { $in: rightSwipes.map((s) => s.company) } })
      .select('user companyName industry hiringFor location workMode website verification logoUrl')
      .lean(),
    Job.find({ _id: { $in: rightSwipes.map((s) => s.job) } }).select('title jobLocation workMode').lean(),
  ]);
  const byUser = new Map(companies.map((c) => [String(c.user), c]));
  const jobBy = new Map(jobs.map((j) => [String(j._id), j]));

  // Companies that only shortlisted (no message/task/interview yet) are counted, not named.
  const contacted = await companiesThatContacted(req.user.id);
  const hiddenCount = new Set(rightSwipes.filter((s) => !contacted.has(String(s.company))).map((s) => String(s.company))).size;

  const shortlistedBy = rightSwipes
    .filter((s) => contacted.has(String(s.company)))
    .map((s) => {
      const c = byUser.get(String(s.company));
      if (!c) return null;
      const { user, _id, verification, ...info } = c;
      const job = jobBy.get(String(s.job));
      return {
        id: String(s._id),
        companyId: String(s.company),
        ...info,
        hiringFor: job?.title ?? info.hiringFor,
        location: job?.jobLocation || info.location,
        verified: verification?.status === 'verified',
        logoUrl: signUrl(info.logoUrl),
        // The company's private "rejected" label is shown to the candidate as "closed".
        stage: s.stage === 'rejected' ? 'closed' : s.stage,
        date: s.createdAt,
      };
    })
    .filter(Boolean);

  res.json({ shortlistedBy, hiddenCount, viewedCount, wishlistedCount });
});

// "I'm still looking": keeps the profile at the top of company feeds for another ACTIVE_DAYS.
router.post('/active', async (req, res) => {
  const profile = await CandidateProfile.findOneAndUpdate({ user: req.user.id }, { activeAt: new Date() }, { returnDocument: 'after' }).lean();
  if (!profile) throw new HttpError(404, 'Profile not found');
  res.json({ profile: withSignedFiles(profile) });
});

const WORK_MODES = ['onsite', 'remote', 'hybrid'];
const JOB_TYPES = ['full-time', 'part-time', 'internship', 'contract'];

// Job preferences + "open to work" switch (off = hidden from companies).
router.put('/preferences', async (req, res) => {
  const b = req.body ?? {};
  const update = {};
  if (b.openToWork !== undefined) update.openToWork = b.openToWork === true;
  if (b.workModes !== undefined) update.workModes = cleanList(b.workModes).filter((m) => WORK_MODES.includes(m));
  if (b.jobTypes !== undefined) update.jobTypes = cleanList(b.jobTypes).filter((t) => JOB_TYPES.includes(t));
  if (b.preferredLocations !== undefined) update.preferredLocations = cleanList(b.preferredLocations, 10);
  const profile = await CandidateProfile.findOneAndUpdate({ user: req.user.id }, { $set: update }, { returnDocument: 'after' }).lean();
  if (profile.step >= 3) alertSavedSearches(req.user.id);
  res.json({ profile: withSignedFiles(profile) });
});

// Full company details, only for companies that shortlisted this candidate.
router.get('/companies/:companyId', async (req, res) => {
  const { pair } = await shortlistedPair(req.user, req.params.companyId);
  const [c, jobs] = await Promise.all([
    CompanyProfile.findOne({ user: pair.company }).lean(),
    Swipe.find({ ...pair, action: 'right' }).distinct('job'),
  ]);
  if (!c) throw new HttpError(404, 'Company not found');
  const roles = await Job.find({ _id: { $in: jobs } }).select('title jobLocation workMode jobType salaryMin salaryMax description').lean();
  res.json({
    company: {
      id: String(c.user),
      name: c.companyName,
      logoUrl: signUrl(c.logoUrl),
      verified: c.verification?.status === 'verified',
      industry: c.industry,
      companySize: c.companySize,
      location: c.location,
      address: c.address,
      about: c.about,
      website: c.website,
      linkedin: c.linkedin,
      foundedYear: c.foundedYear,
      contactEmail: c.contactEmail,
      phone: c.phone,
      roles: roles.map((j) => ({ id: String(j._id), ...j, _id: undefined })),
    },
  });
});

export default router;
