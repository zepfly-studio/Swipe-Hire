import { PDFParse } from 'pdf-parse';
import { CITIES, DEGREES, ROLES, SKILLS } from '../../../shared/taxonomy.js';

const escape = (v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Word-ish boundaries that also work for names like "C++", "Node.js", ".NET".
const findTerm = (text, term) => new RegExp(`(^|[^a-z0-9])${escape(term.toLowerCase())}(?=$|[^a-z0-9])`, 'i').exec(text);

export async function pdfText(buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const { text } = await parser.getText();
    return text.replace(/-- \d+ of \d+ --/g, '\n');
  } finally {
    await parser.destroy().catch(() => {});
  }
}

function qualificationFor(degree) {
  if (!degree) return undefined;
  if (/phd/i.test(degree)) return 'PhD';
  if (/^(M\.|MBA|MCA|PGDM|LLM|MA$|M\.Sc|M\.Com)/i.test(degree)) return 'Post Graduate';
  if (/diploma|polytechnic|ITI/i.test(degree)) return 'Diploma';
  if (/^12th/i.test(degree)) return '12th';
  if (/^10th/i.test(degree)) return '10th';
  return 'Graduate';
}

// ---- Degrees: short forms and spelled-out names, mapped to our list ----
const DEGREE_PATTERNS = [
  ['PhD', /\bph\.?\s?d\b|doctor(?:ate)? of philosophy/],
  ['M.Tech', /\bm\.?\s?tech\b|master of technology/],
  ['M.E.', /\bm\.\s?e\.|master of engineering/],
  ['MCA', /\bmca\b|master of computer applications?/],
  ['MBA', /\bmba\b|master of business administration/],
  ['PGDM', /\bpgdm\b|post graduate diploma in management/],
  ['M.Sc', /\bm\.?\s?sc\b|master of science/],
  ['M.Com', /\bm\.?\s?com\b|master of commerce/],
  ['M.Des', /\bm\.?\s?des\b|master of design/],
  ['M.Ed', /\bm\.\s?ed\b|master of education/],
  ['M.Pharm', /\bm\.?\s?pharm/],
  ['LLM', /\bll\.?\s?m\b|master of laws/],
  ['MA', /\bm\.\s?a\b|\bma\b(?=\s*(?:\(|,|-|in\b|\d|$))|master of arts/],
  ['B.Tech', /\bb\.?\s?tech\b|bachelor of technology/],
  ['B.E.', /\bb\.\s?e\b\.?|bachelor of engineering/],
  ['BCA', /\bbca\b|bachelor of computer applications?/],
  ['BBA', /\bbba\b|bachelor of business administration/],
  ['B.Sc', /\bb\.?\s?sc\b|bachelor of science/],
  ['B.Com', /\bb\.?\s?com\b|bachelor of commerce/],
  ['B.Des', /\bb\.?\s?des\b|bachelor of design/],
  ['B.Ed', /\bb\.\s?ed\b|bachelor of education/],
  ['B.Pharm', /\bb\.?\s?pharm/],
  ['B.Arch', /\bb\.?\s?arch\b|bachelor of architecture/],
  ['LLB', /\bll\.?\s?b\b|bachelor of laws/],
  ['MBBS', /\bmbbs\b/],
  ['BDS', /\bbds\b/],
  ['BHM', /\bbhm\b|bachelor of hotel management/],
  ['BA', /\bb\.\s?a\b|\bba\b(?=\s*(?:\(|,|-|in\b|hons|\d|$))|bachelor of arts/],
  ['CA', /chartered accountant/],
  ['D.Pharm', /\bd\.?\s?pharm/],
  ['Diploma (Engineering)', /diploma in .*engineering|polytechnic/],
  ['ITI', /\biti\b/],
  ['12th', /\b12th\b|\bxii\b|senior secondary|higher secondary|\bhsc\b|intermediate/],
  ['10th', /\b10th\b|\bssc\b|matriculation|secondary school/],
];
const SPECIALISATIONS = {
  'B.Tech': [['B.Tech (CSE)', /\bcse\b|computer science/], ['B.Tech (IT)', /\bit\b|information technology/], ['B.Tech (ECE)', /\bece\b|electronics/], ['B.Tech (Mechanical)', /mechanical/], ['B.Tech (Civil)', /\bcivil\b/], ['B.Tech (Electrical)', /electrical|\beee\b/]],
  'B.Sc': [['B.Sc (Computer Science)', /computer science/], ['B.Sc (IT)', /\bit\b|information technology/]],
  '12th': [['12th (Science)', /science|pcm|pcb/], ['12th (Commerce)', /commerce/], ['12th (Arts)', /arts|humanities/]],
};
const RANK = { PhD: 6, 'Post Graduate': 5, Graduate: 4, Diploma: 3, '12th': 2, '10th': 1 };

// The highest degree listed (resumes often list 12th/10th too), with its line.
function findDegree(lines) {
  let best = null;
  lines.forEach((line, i) => {
    const l = line.toLowerCase();
    for (const [name, rx] of DEGREE_PATTERNS) {
      if (!rx.test(l)) continue;
      const spec = SPECIALISATIONS[name]?.find(([, r]) => r.test(l))?.[0];
      const degree = spec || (name === '12th' ? '12th (Science)' : name);
      const rank = RANK[qualificationFor(degree)] ?? 0;
      if (!best || rank > best.rank) best = { degree, rank, line: i };
      break;
    }
  });
  return best;
}

// ---- Dates: "Jan 2021 – Present", "06/2019 - 03/2022", "2018 to 2020" ----
const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
const MONTH = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?';
const DATE = `(?:${MONTH}\\s*[',]?\\s*(?:\\d{4}|\\d{2})|\\d{1,2}\\s*[/.-]\\s*\\d{4}|(?:19|20)\\d{2})`;
const NOW = '(?:present|current(?:ly)?|now|till\\s*(?:date|now)|to\\s*date|ongoing)';
const RANGE = new RegExp(`(${DATE})\\s*(?:–|—|-|to|till|until)\\s*(${DATE}|${NOW})`, 'gi');
const IS_NOW = new RegExp(`^${NOW}$`, 'i');
const DATES = new RegExp(`${DATE}(?:\\s*(?:–|—|-|to|till|until)\\s*(?:${DATE}|${NOW}))?`, 'gi');

function monthIndex(token, isEnd) {
  const t = token.toLowerCase().trim();
  const yy = Number(t.match(/(\d{4}|\d{2})\s*$/)?.[1]);
  const year = yy < 100 ? 2000 + yy : yy;
  const named = t.match(/^([a-z]{3})/);
  const numeric = t.match(/^(\d{1,2})\s*[/.-]/);
  let month = isEnd ? 11 : 0; // a bare year means "from January" / "until December"
  if (named && MONTHS[named[1]] !== undefined) month = MONTHS[named[1]];
  else if (numeric) month = Number(numeric[1]) - 1;
  return year * 12 + month;
}

// Every date range in the given lines, as month numbers.
function dateRanges(lines) {
  const today = new Date();
  const now = today.getFullYear() * 12 + today.getMonth();
  const out = [];
  lines.forEach((line, i) => {
    for (const m of line.matchAll(RANGE)) {
      const start = monthIndex(m[1], false);
      const isCurrent = IS_NOW.test(m[2].trim());
      const end = isCurrent ? now : monthIndex(m[2], true);
      if (start > now || end < start || end - start > 45 * 12 || start < 1970 * 12) continue;
      out.push({ start, end: Math.min(end, now), current: isCurrent || end >= now, line: i, text: m[0] });
    }
  });
  return out;
}

// Total months worked, counting overlapping jobs only once.
function monthsWorked(ranges) {
  let total = 0;
  let cur = null;
  for (const r of [...ranges].sort((a, b) => a.start - b.start)) {
    if (cur && r.start <= cur.end + 1) {
      cur.end = Math.max(cur.end, r.end);
      continue;
    }
    if (cur) total += cur.end - cur.start + 1;
    cur = { ...r };
  }
  if (cur) total += cur.end - cur.start + 1;
  return total;
}

// ---- Sections: headings usually sit on their own line ----
const SECTIONS = {
  experience:
    /^(?:work\s+|professional\s+|employment\s+|relevant\s+|industry\s+|job\s+)?(?:experience|employment(?:\s+history)?|work\s+history|career\s+history|internships?)\s*:?$/i,
  education: /^(?:education(?:al)?(?:\s+(?:details|qualifications?|background))?|academics?(?:\s+(?:details|qualifications?|background))?|academic\s+(?:details|qualifications?|background)|qualifications?)\s*:?$/i,
  other:
    /^(?:skills?|technical\s+skills|key\s+skills|core\s+skills|projects?|academic\s+projects|personal\s+projects|certifications?|courses|trainings?|achievements?|awards|summary|profile(?:\s+summary)?|professional\s+summary|objective|career\s+objective|about\s+me|hobbies|interests|languages?(?:\s+known)?|personal\s+(?:details|information|profile)|declaration|references?|strengths|extra[-\s]?curricular.*|positions?\s+of\s+responsibility|contact(?:\s+details)?)\s*:?$/i,
};

const SECTION_RX = { test: (line) => line.length <= 45 && Object.values(SECTIONS).some((rx) => rx.test(line)) };

function sections(lines) {
  const found = { top: [], experience: [], education: [], other: [] };
  let current = 'top';
  for (const line of lines) {
    const heading = line.length <= 45 && Object.keys(SECTIONS).find((k) => SECTIONS[k].test(line));
    if (heading) current = heading;
    else found[current].push(line);
  }
  return found;
}

const SPLIT = /\s*(?:\||,|•|·|–|—|\s-\s|\t|\s{3,}|\(|\))\s*/;
const BULLET = /^[•●▪◦*➢►✓-]\s/;
const clean = (v) =>
  v
    .replace(/^[\s•●▪◦*➢►✓:,|–-]+|[\s•●▪◦*:,|(–-]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

// ---- College ----
const SCHOOL_RX = /\b(cbse|icse|rbse|state\s+board|board|senior\s+secondary|higher\s+secondary|secondary\s+school|high\s+school|hsc|ssc|12th|10th|xii|matriculation|intermediate)\b/i;
const INSTITUTE_RX =
  /\b(university|college|institute|institution|iit|nit|iiit|iim|bits|vidyapeeth|vidyapith|polytechnic|academy|school\s+of|mahavidyalaya|vishwavidyalaya|vishwavidyalay)\b/i;

function findCollege(lines) {
  for (const [i, line] of lines.entries()) {
    if (!INSTITUTE_RX.test(line) || SCHOOL_RX.test(line)) continue;
    const parts = line.split(SPLIT);
    for (const [j, part] of parts.entries()) {
      let name = clean(part.replace(DATES, ' '));
      if (!INSTITUTE_RX.test(name) || name.length < 4 || name.length > 90 || /^(the\s+)?(college|university|institute)$/i.test(name)) continue;
      // A long name can wrap onto the next line: "…Institute of Business" / "Management".
      const next = lines[i + 1];
      if (j === parts.length - 1 && next && /^[A-Z][A-Za-z.&' ]{2,40}$/.test(next) && next.split(' ').length <= 4 && !isCity(next) && !findDegree([next]) && !SECTION_RX.test(next)) {
        name = `${name} ${next}`;
      }
      return name;
    }
  }
  return undefined;
}

// ---- Latest job: employer and job title ----
const LEGAL_RX = /\b(pvt|private|ltd|limited|llp|llc|inc|corp|corporation|company|technologies|solutions|labs|infotech|infosystems|enterprises|industries|consultancy|ventures)\b\.?/i;
const POST_RX =
  /\b(engineer|developer|manager|intern|trainee|analyst|executive|designer|consultant|lead|associate|officer|specialist|architect|administrator|accountant|teacher|tester|coordinator|assistant|head|director|representative|scientist|programmer|writer|editor|marketer|recruiter|supervisor|technician|sde|qa|founder|freelancer)\b/i;
const NOT_NAME = /^(india|remote|onsite|on-site|hybrid|wfh|full[-\s]?time|part[-\s]?time|internship|contract|present|current)$/i;

const isCity = (v) => CITIES.some((c) => c.toLowerCase() === v.toLowerCase().replace(/,?\s*india$/, '').trim());
const isPost = (v) => POST_RX.test(v) || ROLES.some((r) => findTerm(v.toLowerCase(), r));

function latestJob(lines, ranges) {
  if (!ranges.length) return {};
  const job = [...ranges].sort((a, b) => b.end - a.end || b.start - a.start)[0];
  // The title and employer sit on the job's own line or right next to it, so the
  // closest lines are read first. PDFs drop bullet symbols, so a line further away
  // may be a description of another job and is only used to fill what's missing.
  const usable = (i) => i >= 0 && i < lines.length && !dateRanges([lines[i]]).length && !BULLET.test(lines[i]) && lines[i].split(' ').length <= 9;
  const around = [lines[job.line].replace(job.text, '  ')];
  if (usable(job.line - 1)) around.push(lines[job.line - 1]);
  if (usable(job.line + 1)) around.push(lines[job.line + 1]);
  if (usable(job.line - 1) && usable(job.line - 2)) around.push(lines[job.line - 2]);
  let company;
  let post;
  for (const line of around) {
    if (company && post) break;
    const at = line.match(/^(.+?)\s+(?:at|@)\s+(.+)$/i);
    const parts = at ? [at[1], at[2]] : line.split(SPLIT);
    for (const raw of parts) {
      const part = clean(raw.replace(DATES, ' '));
      if (part.length < 2 || part.length > 70 || part.split(' ').length > 7 || isCity(part) || NOT_NAME.test(part)) continue;
      // "Pvt Ltd" etc. always means an employer; otherwise a job-title word means a post.
      const employer = LEGAL_RX.test(part) || (at && raw === at[2]);
      if (!post && !employer && isPost(part)) post = part;
      else if (!company && (employer || (!isPost(part) && /^[A-Z0-9&]/.test(part)))) company = part;
    }
  }
  return { company, post };
}

// Best-effort extraction of profile fields from resume text. Never guesses wildly:
// a field is only returned when the text clearly contains it.
export function extractProfile(raw) {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.replace(/[  ]+/g, ' ').trim())
    .filter(Boolean);
  const text = lines.join(' ');
  const lower = text.toLowerCase();
  const parts = sections(lines);
  const out = {};

  const phone = text.match(/(?:\+?91[\s-]?)?\b([6-9]\d{4}[\s-]?\d{5})\b/);
  if (phone) out.phone = phone[1].replace(/[\s-]/g, '');

  // Skills: longest names first; each match is blanked out so "React Native"
  // doesn't also count as "React", while a separate "React" still does.
  const skills = [];
  let rest = lower;
  for (const s of [...SKILLS].sort((a, b) => b.length - a.length)) {
    if (skills.length >= 15) break;
    const rx = new RegExp(`(^|[^a-z0-9])${escape(s.toLowerCase())}(?=$|[^a-z0-9])`, 'gi');
    if (rx.test(rest)) {
      skills.push(s);
      rest = rest.replace(rx, '$1 ');
    }
  }
  if (skills.length) out.skills = skills;

  // Degree: the most specific match (e.g. "B.Tech (CSE)" over "B.Tech"), preferring the education section.
  const eduLines = parts.education.length ? parts.education : lines;
  let from = eduLines;
  let degree = findDegree(eduLines);
  if (!degree && eduLines !== lines) degree = findDegree((from = lines));
  if (degree && DEGREES.includes(degree.degree)) {
    out.degree = degree.degree;
    out.qualification = qualificationFor(degree.degree);
    // The latest year on the degree's line (or else the next few lines) is the passing year.
    const maxYear = new Date().getFullYear() + 6;
    const yearsIn = (line = '') => (line.match(/\b(19[6-9]\d|20[0-3]\d)\b/g) || []).map(Number).filter((y) => y <= maxYear);
    const years = [0, 1, 2, 3].map((d) => yearsIn(from[degree.line + d])).find((y) => y.length) || [];
    if (years.length) out.graduationYear = Math.max(...years);
  }

  const college = findCollege(eduLines) || findCollege(lines);
  if (college) out.college = college;

  // Role: the first known job title in the text (usually under the name).
  let role = null;
  for (const r of ROLES) {
    const m = findTerm(lower, r);
    if (m && (!role || m.index < role.index || (m.index === role.index && r.length > role.title.length))) role = { title: r, index: m.index };
  }
  if (role) out.headline = role.title;

  // City: the first known city mentioned.
  let city = null;
  for (const c of CITIES.filter((c) => c !== 'Remote')) {
    const m = findTerm(lower, c);
    if (m && (!city || m.index < city.index)) city = { name: c, index: m.index };
  }
  if (city) out.location = city.name;

  // Jobs: date ranges in the experience section, or else anywhere that isn't about studies.
  const jobLines = parts.experience.length
    ? parts.experience
    : lines.filter((l) => !parts.education.includes(l) && !INSTITUTE_RX.test(l) && !SCHOOL_RX.test(l));
  const ranges = dateRanges(jobLines);

  // Experience: a stated "3+ years of experience" wins; otherwise add up the job dates.
  const stated = [
    ...lower.matchAll(/(\d{1,2}(?:\.\d{1,2})?)\s*\+?\s*(?:years?|yrs?)(?:\s+(?:of|in))?(?:\s+[a-z/&.-]+){0,4}?\s+(?:experience|exp)\b/g),
    ...lower.matchAll(/\b(?:experience|exp)\s*(?:of|:|-)?\s*(\d{1,2}(?:\.\d{1,2})?)\s*\+?\s*(?:years?|yrs?)\b/g),
  ]
    .map((m) => Number(m[1]))
    .filter((n) => n > 0 && n <= 45);
  if (stated.length) out.experienceYears = Math.max(...stated);
  else if (ranges.length) out.experienceYears = Math.floor((monthsWorked(ranges) / 12) * 2) / 2;
  else if (/\bfresher\b/.test(lower)) out.experienceYears = 0;

  const job = latestJob(jobLines, ranges);
  if (job.company) out.currentCompany = job.company;
  if (job.post) out.currentPost = job.post;

  return out;
}
