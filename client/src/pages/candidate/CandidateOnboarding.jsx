import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, MapPin, Phone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api, errorMessage, salaryHint, toLpa } from '../../lib/api';
import { draftKey, readDraft, useDraft } from '../../hooks/useDraft';
import { DoneScreen, OnboardingShell, StepBody, StepFooter, StepModal } from '../../components/Onboarding';
import { Button, ChipSelect, Field, Input, MultiChipSelect, Select, Textarea } from '../../components/ui';
import TagInput from '../../components/TagInput';
import { JOB_TYPE_OPTIONS, WORK_MODE_OPTIONS } from '../../lib/options';
import Autocomplete from '../../components/Autocomplete';
import { DEGREES, ROLES } from '../../lib/suggestions';
import ResumeStep from './ResumeStep';
import ResumeAutofill from './ResumeAutofill';
import VideoStep from './VideoStep';

const STEPS = [
  { title: 'Tell us about yourself', subtitle: 'Basic and education details' },
  { title: 'Your work & skills', subtitle: 'This is what companies match you on' },
  { title: 'Upload your resume', subtitle: 'Companies double-tap your card to read it' },
  { title: 'Record a quick intro', subtitle: '5–15 seconds: your name, your role and what makes you great' },
];

const QUALIFICATIONS = ['10th', '12th', 'Diploma', 'Graduate', 'Post Graduate', 'PhD'];
const NOTICE = ['Immediate', '15 days', '30 days', '60 days', '90 days'];
const GENDERS = ['Male', 'Female', 'Other'];

const FIELDS = [
  'phone', 'age', 'gender', 'location', 'qualification', 'degree', 'college', 'graduationYear',
  'headline', 'experienceYears', 'currentCompany', 'currentPost', 'currentSalary', 'expectedSalary', 'expectedSalaryMax', 'noticePeriod', 'about',
];

function initialForm(profile) {
  const form = { skills: profile?.skills ?? [], workModes: profile?.workModes ?? [], jobTypes: profile?.jobTypes ?? [] };
  for (const k of FIELDS) form[k] = profile?.[k] ?? '';
  form.salaryNegotiable = profile?.salaryNegotiable ?? false;
  return form;
}

const required = (v) => v === '' || v === null || v === undefined;

const STEP_ONE_FIELDS = ['phone', 'age', 'gender', 'location', 'qualification', 'degree', 'college', 'graduationYear'];
const badSalary = (v) => {
  const lpa = toLpa(v);
  return Number.isNaN(lpa) || lpa > 1000;
};

// Mirrors the server's rules in server/src/routes/candidate.js
function validate(step, f) {
  const e = {};
  if (step === 0) {
    if (!/^[+\d][\d\s-]{8,15}$/.test(String(f.phone).trim())) e.phone = 'Enter a valid phone number';
    if (required(f.age)) e.age = 'Enter your age';
    else if (f.age < 16 || f.age > 75) e.age = 'Age must be between 16 and 75';
    if (!f.gender) e.gender = 'Select your gender';
    if (!f.location.trim()) e.location = 'Enter your city';
    if (!f.qualification) e.qualification = 'Select your qualification';
    if (!f.degree.trim()) e.degree = 'Enter your degree';
    if (!required(f.graduationYear) && (f.graduationYear < 1960 || f.graduationYear > 2040)) e.graduationYear = 'Enter a year like 2023';
  } else {
    if (!f.headline.trim()) e.headline = 'Enter the role you are looking for';
    if (!f.skills.length) e.skills = 'Add at least one skill';
    if (required(f.experienceYears)) e.experienceYears = 'Enter your experience (0 if fresher)';
    else if (f.experienceYears < 0 || f.experienceYears > 50) e.experienceYears = 'Enter years between 0 and 50';
    if (required(f.expectedSalary)) e.expectedSalary = 'Enter the minimum salary you expect';
    else if (badSalary(f.expectedSalary)) e.expectedSalary = 'Enter a valid salary';
    if (badSalary(f.expectedSalaryMax)) e.expectedSalaryMax = 'Enter a valid salary';
    else if (!required(f.expectedSalaryMax) && !e.expectedSalary && toLpa(f.expectedSalaryMax) < toLpa(f.expectedSalary)) {
      e.expectedSalaryMax = 'Should be more than the minimum';
    }
    if (badSalary(f.currentSalary)) e.currentSalary = 'Enter a valid salary';
  }
  return e;
}

export default function CandidateOnboarding() {
  const { user, profile, setProfile } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editing = params.has('edit');

  // Unsaved answers from the first two steps survive a page refresh.
  const key = draftKey(user, 'candidate', editing);
  const [draft] = useState(() => readDraft(key));
  const [alreadyDone] = useState(() => profile?.step >= 3 && !editing);
  const [step, setStep] = useState(() => {
    if (draft && [0, 1].includes(draft.step)) return draft.step;
    return editing ? 0 : ([0, 2, 3][profile?.step ?? 0] ?? 0);
  });
  const [dir, setDir] = useState(1);
  // Decided once, so the box can show its success message after the upload.
  const [showAutofill] = useState(() => !editing && !profile?.resumeUrl);
  const [form, setForm] = useState(() => ({ ...initialForm(profile), ...draft?.form }));
  // Once the details are saved (step 2+) there is nothing left to keep.
  useDraft(key, step <= 1 ? { step, form } : null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');

  if (alreadyDone) return <Navigate to="/candidate" replace />;

  const go = (next) => {
    setDir(next > step ? 1 : -1);
    setStep(next);
  };

  const set = (key) => (e) => {
    const value = e?.target ? e.target.value : e;
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const next = async () => {
    const e = validate(step, form);
    setErrors(e);
    if (Object.keys(e).length) return;
    if (step === 0) return go(1);

    setSaving(true);
    setServerError('');
    try {
      const { data } = await api.put('/candidate/profile', form);
      setProfile(data.profile);
      go(2);
    } catch (err) {
      const field = err.response?.data?.field;
      if (field) {
        setErrors({ [field]: errorMessage(err) });
        if (STEP_ONE_FIELDS.includes(field)) go(0);
      } else {
        setServerError(errorMessage(err));
      }
    } finally {
      setSaving(false);
    }
  };

  const onUploaded = (nextStep) => (newProfile) => {
    if (newProfile) setProfile(newProfile);
    go(nextStep);
  };

  return (
    <OnboardingShell>
      <StepModal steps={STEPS} step={step} dir={dir}>
        {step === 0 && (
          <>
            <StepBody>
              {showAutofill && <ResumeAutofill form={form} setForm={setForm} onProfile={setProfile} />}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Phone number" error={errors.phone} className="col-span-2 sm:col-span-1">
                  <Input icon={Phone} type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} placeholder="98765 43210" />
                </Field>
                <Field label="Age" error={errors.age} className="col-span-2 sm:col-span-1">
                  <Input type="number" inputMode="numeric" min={16} max={75} value={form.age} onChange={set('age')} placeholder="24" />
                </Field>
              </div>
              <Field label="Gender" error={errors.gender} as="div">
                <ChipSelect layoutId="gender" options={GENDERS} value={form.gender} onChange={set('gender')} />
              </Field>
              <Field label="Current city" error={errors.location}>
                <Input icon={MapPin} value={form.location} onChange={set('location')} placeholder="Jaipur, Rajasthan" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Highest qualification" error={errors.qualification} className="col-span-2 sm:col-span-1">
                  <Select options={QUALIFICATIONS} value={form.qualification} onChange={set('qualification')} />
                </Field>
                <Field label="Degree / course" error={errors.degree} className="col-span-2 sm:col-span-1">
                  <Autocomplete options={DEGREES} value={form.degree} onChange={set('degree')} placeholder="B.Tech (CSE)" />
                </Field>
                <Field label="College / university" className="col-span-2 sm:col-span-1">
                  <Input value={form.college} onChange={set('college')} placeholder="Optional" />
                </Field>
                <Field label="Passing year" error={errors.graduationYear} className="col-span-2 sm:col-span-1">
                  <Input type="number" inputMode="numeric" value={form.graduationYear} onChange={set('graduationYear')} placeholder="2023" />
                </Field>
              </div>
            </StepBody>
            <StepFooter>
              <Button className="btn-primary flex-1" onClick={next}>
                Continue
                <ArrowRight size={18} />
              </Button>
            </StepFooter>
          </>
        )}

        {step === 1 && (
          <>
            <StepBody>
              <Field label="Role you are looking for" error={errors.headline}>
                <Autocomplete options={ROLES} value={form.headline} onChange={set('headline')} placeholder="e.g. Web Developer, Sales Executive" />
              </Field>
              <Field label="Your skills" error={errors.skills} hint="Enter adds the highlighted skill · type a comma to add exactly what you typed" as="div">
                <TagInput value={form.skills} onChange={set('skills')} placeholder="React, Excel, Communication…" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Experience (years)" error={errors.experienceYears}>
                  <Input type="number" inputMode="decimal" min={0} step="0.5" value={form.experienceYears} onChange={set('experienceYears')} placeholder="0 if fresher" />
                </Field>
                <Field label="Notice period">
                  <Select options={NOTICE} value={form.noticePeriod} onChange={set('noticePeriod')} />
                </Field>
                <Field label="Current / last company">
                  <Input value={form.currentCompany} onChange={set('currentCompany')} placeholder="Optional" />
                </Field>
                <Field label="Current / last post">
                  <Autocomplete options={ROLES} value={form.currentPost} onChange={set('currentPost')} placeholder="Optional" />
                </Field>
                <Field label="Current salary (LPA)" error={errors.currentSalary} hint={salaryHint(form.currentSalary)}>
                  <Input type="number" inputMode="decimal" min={0} step="0.1" value={form.currentSalary} onChange={set('currentSalary')} placeholder="e.g. 4.5" />
                </Field>
              </div>
              <div className="space-y-3 rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">Expected salary (LPA)</p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Minimum" error={errors.expectedSalary} hint={salaryHint(form.expectedSalary)}>
                    <Input type="number" inputMode="decimal" min={0} step="0.1" value={form.expectedSalary} onChange={set('expectedSalary')} placeholder="e.g. 6" />
                  </Field>
                  <Field label="Maximum" error={errors.expectedSalaryMax} hint={form.expectedSalaryMax ? salaryHint(form.expectedSalaryMax) : 'Optional'}>
                    <Input type="number" inputMode="decimal" min={0} step="0.1" value={form.expectedSalaryMax} onChange={set('expectedSalaryMax')} placeholder="e.g. 8" />
                  </Field>
                </div>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-white/[0.04] p-3">
                  <input
                    type="checkbox"
                    checked={form.salaryNegotiable}
                    onChange={(e) => set('salaryNegotiable')(e.target.checked)}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-brand-500"
                  />
                  <span className="text-sm">
                    <span className="font-semibold">My salary is negotiable</span>
                    <span className="mt-0.5 block text-xs text-white/50">
                      {form.salaryNegotiable
                        ? 'Companies can shortlist you even if their budget is below your minimum.'
                        : 'Only companies whose budget reaches your minimum can shortlist you.'}
                    </span>
                  </span>
                </label>
              </div>
              <Field label="Preferred work mode (optional)" as="div">
                <MultiChipSelect options={WORK_MODE_OPTIONS} value={form.workModes} onChange={set('workModes')} />
              </Field>
              <Field label="Job type (optional)" as="div">
                <MultiChipSelect options={JOB_TYPE_OPTIONS} value={form.jobTypes} onChange={set('jobTypes')} />
              </Field>
              <Field label="About you" hint="2–3 lines that make you stand out (optional)">
                <Textarea value={form.about} onChange={set('about')} maxLength={600} placeholder="I build fast, accessible web apps…" />
              </Field>
              {serverError && <p className="text-sm font-medium text-brand-400">{serverError}</p>}
            </StepBody>
            <StepFooter>
              <Button className="btn-ghost" onClick={() => go(0)}>
                <ArrowLeft size={18} />
              </Button>
              <Button className="btn-primary flex-1" onClick={next} loading={saving}>
                Save & continue
                <ArrowRight size={18} />
              </Button>
            </StepFooter>
          </>
        )}

        {step === 2 && <ResumeStep existing={profile?.resumeUrl} onBack={() => go(1)} onDone={onUploaded(3)} />}

        {step === 3 && <VideoStep existing={profile?.videoUrl} onBack={() => go(2)} onDone={onUploaded(4)} />}

        {step === 4 && (
          <DoneScreen
            title={editing ? 'Profile updated!' : "You're live!"}
            text="Companies can now discover your profile. We'll show you here when someone shortlists you."
            action="Go to my dashboard"
            onAction={() => navigate('/candidate', { replace: true })}
          />
        )}
      </StepModal>
    </OnboardingShell>
  );
}
