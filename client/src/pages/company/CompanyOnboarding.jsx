import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Building2, Globe, MapPin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import LocationInput from '../../components/LocationInput';
import { api, errorMessage, salaryHint, toLpa } from '../../lib/api';
import { draftKey, readDraft, useDraft } from '../../hooks/useDraft';
import { DoneScreen, OnboardingShell, StepBody, StepFooter, StepModal } from '../../components/Onboarding';
import { Button, ChipSelect, Field, Input, Select, Textarea } from '../../components/ui';
import TagInput from '../../components/TagInput';
import Autocomplete from '../../components/Autocomplete';
import { ROLES } from '../../lib/suggestions';

const STEPS = [
  { title: 'About your company', subtitle: 'Candidates see this when you shortlist them' },
  { title: 'Who are you hiring?', subtitle: 'We rank candidates by how well they match this' },
];

const SIZES = ['1–10', '11–50', '51–200', '201–1000', '1000+'];
const INDUSTRIES = ['IT / Software', 'E-commerce', 'Finance', 'Healthcare', 'Education', 'Manufacturing', 'Marketing / Media', 'Retail', 'Real Estate', 'Other'];
const WORK_MODES = [
  { value: 'onsite', label: 'On-site' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'remote', label: 'Remote' },
];

const FIELDS = [
  'companyName', 'industry', 'website', 'companySize', 'location', 'about', 'hiringFor',
  'minExperience', 'maxExperience', 'salaryMin', 'salaryMax', 'jobLocation',
];

function initialForm(profile) {
  const form = { requiredSkills: profile?.requiredSkills ?? [], workMode: profile?.workMode ?? 'onsite' };
  for (const k of FIELDS) form[k] = profile?.[k] ?? '';
  return form;
}

const COMPANY_FIELDS = ['companyName', 'industry', 'website', 'companySize', 'location', 'about'];
const pickCompanyFields = (f) => Object.fromEntries(COMPANY_FIELDS.map((k) => [k, f[k]]));

const empty = (v) => v === '' || v === null || v === undefined;

function validate(step, f) {
  const e = {};
  if (step === 0) {
    if (!f.companyName.trim()) e.companyName = 'Enter your company name';
    if (!f.location.trim()) e.location = 'Enter your company location';
  } else {
    if (!f.hiringFor.trim()) e.hiringFor = 'Enter the role you are hiring for';
    if (!f.requiredSkills.length) e.requiredSkills = 'Add at least one skill';
    const min = toLpa(f.salaryMin);
    const max = toLpa(f.salaryMax);
    if (empty(f.salaryMax)) e.salaryMax = 'Enter the maximum salary you can offer';
    else if (Number.isNaN(max) || max > 1000) e.salaryMax = 'Enter a valid salary';
    if (Number.isNaN(min) || min > 1000) e.salaryMin = 'Enter a valid salary';
    else if (min != null && max != null && min > max) e.salaryMin = 'Must be less than maximum';
    for (const k of ['minExperience', 'maxExperience']) {
      if (!empty(f[k]) && (f[k] < 0 || f[k] > 50)) e[k] = 'Enter years between 0 and 50';
    }
    if (!e.minExperience && !empty(f.minExperience) && !empty(f.maxExperience) && Number(f.minExperience) > Number(f.maxExperience)) e.minExperience = 'Must be less than maximum';
  }
  return e;
}

export default function CompanyOnboarding() {
  const { user, profile, setProfile } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editing = params.has('edit');

  // Unsaved answers survive a page refresh.
  const key = draftKey(user, 'company', editing);
  const [draft] = useState(() => readDraft(key));
  const [alreadyDone] = useState(() => profile?.completed && !editing);
  const [step, setStep] = useState(() => (draft && [0, 1].includes(draft.step) ? draft.step : 0));
  const [dir, setDir] = useState(1);
  const [form, setForm] = useState(() => ({ ...initialForm(profile), ...draft?.form }));
  const [saved, setSaved] = useState(false);
  const clearDraft = useDraft(key, saved ? null : { step, form });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');

  if (alreadyDone) return <Navigate to="/company/swipe" replace />;

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
    // Editing later only changes company details; jobs live on the Jobs page.
    if (step === 0 && !editing) {
      if (!form.jobLocation) setForm((f) => ({ ...f, jobLocation: f.location }));
      return go(1);
    }
    setSaving(true);
    setServerError('');
    try {
      const { data } = await api.put('/company/profile', editing ? pickCompanyFields(form) : form);
      clearDraft();
      setSaved(true);
      setProfile(data.profile);
      if (editing) navigate('/company/swipe', { replace: true });
      else go(2);
    } catch (err) {
      const field = err.response?.data?.field;
      if (field) {
        setErrors({ [field]: errorMessage(err) });
        if (['companyName', 'location'].includes(field)) go(0);
      } else {
        setServerError(errorMessage(err));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingShell>
      <StepModal steps={editing ? STEPS.slice(0, 1) : STEPS} step={step} dir={dir}>
        {step === 0 && (
          <>
            <StepBody>
              <Field label="Company name" error={errors.companyName}>
                <Input icon={Building2} value={form.companyName} onChange={set('companyName')} placeholder="Acme Technologies" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Industry" className="col-span-2 sm:col-span-1">
                  <Select options={INDUSTRIES} value={form.industry} onChange={set('industry')} />
                </Field>
                <Field label="Company size" className="col-span-2 sm:col-span-1">
                  <Select options={SIZES} value={form.companySize} onChange={set('companySize')} placeholder="Employees" />
                </Field>
                <Field label="Location" error={errors.location} className="col-span-2 sm:col-span-1">
                  <LocationInput value={form.location} onChange={set('location')} placeholder="Jaipur" />
                </Field>
                <Field label="Website" className="col-span-2 sm:col-span-1">
                  <Input icon={Globe} value={form.website} onChange={set('website')} placeholder="Optional" />
                </Field>
              </div>
              <Field label="About the company" hint="Optional">
                <Textarea value={form.about} onChange={set('about')} maxLength={600} placeholder="What do you do? Why is it great to work with you?" />
              </Field>
            </StepBody>
            <StepFooter>
              <Button className="btn-primary flex-1" onClick={next} loading={editing && saving}>
                {editing ? 'Save changes' : 'Continue'}
                <ArrowRight size={18} />
              </Button>
            </StepFooter>
            {editing && serverError && <p className="px-6 pb-4 text-sm font-medium text-brand-400">{serverError}</p>}
          </>
        )}

        {step === 1 && (
          <>
            <StepBody>
              <Field label="Role you are hiring for" error={errors.hiringFor}>
                <Autocomplete options={ROLES} value={form.hiringFor} onChange={set('hiringFor')} placeholder="e.g. Frontend Developer" />
              </Field>
              <Field label="Skills you need" error={errors.requiredSkills} hint="Candidates with these skills are shown first · comma adds exactly what you typed" as="div">
                <TagInput value={form.requiredSkills} onChange={set('requiredSkills')} placeholder="React, JavaScript…" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Min experience (yrs)" error={errors.minExperience}>
                  <Input type="number" inputMode="decimal" min={0} value={form.minExperience} onChange={set('minExperience')} placeholder="0" />
                </Field>
                <Field label="Max experience (yrs)" error={errors.maxExperience}>
                  <Input type="number" inputMode="decimal" min={0} value={form.maxExperience} onChange={set('maxExperience')} placeholder="5" />
                </Field>
                <Field label="Min salary (LPA)" error={errors.salaryMin} hint={salaryHint(form.salaryMin)}>
                  <Input type="number" inputMode="decimal" min={0} step="0.1" value={form.salaryMin} onChange={set('salaryMin')} placeholder="3" />
                </Field>
                <Field label="Max salary (LPA)" error={errors.salaryMax} hint={salaryHint(form.salaryMax)}>
                  <Input type="number" inputMode="decimal" min={0} step="0.1" value={form.salaryMax} onChange={set('salaryMax')} placeholder="8" />
                </Field>
              </div>
              <Field label="Job location">
                <LocationInput value={form.jobLocation} onChange={set('jobLocation')} placeholder="Jaipur" />
              </Field>
              <Field label="Work mode" as="div">
                <ChipSelect layoutId="work-mode" options={WORK_MODES} value={form.workMode} onChange={set('workMode')} />
              </Field>
              {serverError && <p className="text-sm font-medium text-brand-400">{serverError}</p>}
            </StepBody>
            <StepFooter>
              <Button className="btn-ghost" onClick={() => go(0)}>
                <ArrowLeft size={18} />
              </Button>
              <Button className="btn-primary flex-1" onClick={next} loading={saving}>
                {editing ? 'Save changes' : 'Start swiping'}
                <ArrowRight size={18} />
              </Button>
            </StepFooter>
          </>
        )}

        {step === 2 && (
          <DoneScreen
            title="You're all set!"
            text={`You have ${profile?.swipesLeft ?? 5} free swipes. Swipe right to shortlist a candidate, left to pass.`}
            action="Start swiping"
            onAction={() => navigate('/company/swipe', { replace: true })}
          />
        )}
      </StepModal>
    </OnboardingShell>
  );
}
