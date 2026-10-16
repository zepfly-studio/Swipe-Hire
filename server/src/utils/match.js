// How far above the budget a candidate who is "open to negotiate" may still be (20%).
// Anyone further off would not take the job, so they aren't shown.
export const NEGOTIATE_MARGIN = 1.2;

// The company's budget must reach the candidate's minimum; a candidate open to negotiate
// may ask up to 20% more. Jobs without a budget, or candidates without an expectation, always fit.
export function salaryFits(candidate, job) {
  if (!job.salaryMax || candidate.expectedSalary == null) return true;
  const limit = candidate.salaryNegotiable ? job.salaryMax * NEGOTIATE_MARGIN : job.salaryMax;
  return candidate.expectedSalary <= limit;
}

// The same rule as a Mongo condition on CandidateProfile.
export function salaryFitWhere(job) {
  if (!job.salaryMax) return {};
  return {
    $or: [
      { expectedSalary: null },
      { expectedSalary: { $lte: job.salaryMax } },
      { salaryNegotiable: true, expectedSalary: { $lte: job.salaryMax * NEGOTIATE_MARGIN } },
    ],
  };
}

// Scores how well a candidate fits a company's requirements (0-100).
export function matchCandidate(candidate, company) {
  let score = 0;
  let max = 0;

  const have = new Map((candidate.skills || []).map((s) => [s.toLowerCase(), s]));
  const required = company.requiredSkills || [];
  const matchedSkills = required.filter((s) => have.has(s.toLowerCase()));
  if (required.length) {
    max += 50;
    score += (50 * matchedSkills.length) / required.length;
  }

  const exp = candidate.experienceYears ?? 0;
  const minExp = company.minExperience ?? 0;
  const maxExp = company.maxExperience ?? 50;
  max += 20;
  if (exp >= minExp && exp <= maxExp) score += 20;
  else {
    const gap = exp < minExp ? minExp - exp : exp - maxExp;
    score += Math.max(0, 20 - gap * 6);
  }

  if (company.salaryMax && candidate.expectedSalary != null) {
    max += 20;
    if (candidate.expectedSalary <= company.salaryMax) score += 20;
    else if (candidate.expectedSalary <= company.salaryMax * 1.2) score += 10;
  }

  max += 10;
  const jobLoc = (company.jobLocation || '').toLowerCase();
  const candLoc = (candidate.location || '').toLowerCase();
  if (company.workMode === 'remote' || !jobLoc || (jobLoc && candLoc && (jobLoc.includes(candLoc) || candLoc.includes(jobLoc)))) {
    score += 10;
  }

  return { matchScore: Math.round((100 * score) / max), matchedSkills };
}
