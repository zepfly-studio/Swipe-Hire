import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Building2, Globe, Mail, Phone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import LocationInput from '../../components/LocationInput';
import { api, errorMessage } from '../../lib/api';
import { draftKey, readDraft, useDraft } from '../../hooks/useDraft';
import { OnboardingShell, StepBody, StepFooter, StepModal } from '../../components/Onboarding';
import { Button, Field, Input, Select, Textarea } from '../../components/ui';

const STEPS = [
  { title: 'About your company', subtitle: 'Candidates see this when you shortlist them' },
];

const SIZES = ['1–10', '11–50', '51–200', '201–1000', '1000+'];
const INDUSTRIES = ['IT / Software', 'E-commerce', 'Finance', 'Healthcare', 'Education', 'Manufacturing', 'Marketing / Media', 'Retail', 'Real Estate', 'Other'];

const FIELDS = ['companyName', 'industry', 'companySize', 'website', 'about', 'location', 'phone', 'contactEmail'];

function initialForm(profile) {
  return Object.fromEntries(FIELDS.map((key) => [key, profile?.[key] ?? '']));
}

const COMPANY_FIELDS = FIELDS;
const pickCompanyFields = (f) => Object.fromEntries(COMPANY_FIELDS.map((k) => [k, f[k]]));

function validate(f) {
  const e = {};
  if (!f.companyName.trim()) e.companyName = 'Enter your company name';
  if (!f.industry) e.industry = 'Choose your company sector';
  if (!f.companySize) e.companySize = 'Choose your company size';
  if (!f.location.trim()) e.location = 'Enter your company location';
  if (!f.phone.trim()) e.phone = 'Enter a contact number';
  if (!f.contactEmail.trim()) e.contactEmail = 'Enter the HR email address';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.contactEmail)) e.contactEmail = 'Enter a valid HR email address';
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
  const [form, setForm] = useState(() => ({ ...initialForm(profile), ...draft?.form }));
  const [saved, setSaved] = useState(false);
  const clearDraft = useDraft(key, saved ? null : { step: 0, form });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');

  if (alreadyDone) return <Navigate to="/company/swipe" replace />;

  const set = (key) => (e) => {
    const value = e?.target ? e.target.value : e;
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const next = async () => {
    const e = validate(form);
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    setServerError('');
    try {
      const { data } = await api.put('/company/profile', pickCompanyFields(form));
      clearDraft();
      setSaved(true);
      setProfile(data.profile);
      navigate('/company/swipe', { replace: true });
    } catch (err) {
      const field = err.response?.data?.field;
      if (field) {
        setErrors({ [field]: errorMessage(err) });
      } else {
        setServerError(errorMessage(err));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingShell>
      <StepModal steps={STEPS} step={0} dir={1}>
        <StepBody>
          <Field label="Company name" error={errors.companyName}>
            <Input icon={Building2} value={form.companyName} onChange={set('companyName')} placeholder="Acme Technologies" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Industry / sector" error={errors.industry}>
              <Select options={INDUSTRIES} value={form.industry} onChange={set('industry')} placeholder="Select sector" />
            </Field>
            <Field label="Company size" error={errors.companySize}>
              <Select options={SIZES} value={form.companySize} onChange={set('companySize')} placeholder="Employees" />
            </Field>
            <Field label="Location" error={errors.location}>
              <LocationInput value={form.location} onChange={set('location')} placeholder="Jaipur" />
            </Field>
            <Field label="Website" hint="Optional">
              <Input icon={Globe} value={form.website} onChange={set('website')} placeholder="yourcompany.com" />
            </Field>
          </div>
          <Field label="About the company" hint="Optional">
            <Textarea value={form.about} onChange={set('about')} maxLength={1500} placeholder="What does your company do?" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contact number" error={errors.phone}>
              <Input icon={Phone} type="tel" value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" />
            </Field>
            <Field label="HR email" error={errors.contactEmail}>
              <Input icon={Mail} type="email" value={form.contactEmail} onChange={set('contactEmail')} placeholder="hr@yourcompany.com" />
            </Field>
          </div>
          {serverError && <p className="text-sm font-medium text-brand-400">{serverError}</p>}
        </StepBody>
        <StepFooter>
          <Button className="btn-primary flex-1" onClick={next} loading={saving}>
            {editing ? 'Save changes' : 'Continue to Swipe'}
            <ArrowRight size={18} />
          </Button>
        </StepFooter>
      </StepModal>
    </OnboardingShell>
  );
}
