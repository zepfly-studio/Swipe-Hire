import { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Calendar, Globe, Link2, Mail, MapPin, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import CompanyShell from '../../components/CompanyShell';
import ImageUploader from '../../components/ImageUploader';
import { Button, Field, Input, Select, Textarea, VerifiedBadge } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { api, errorMessage } from '../../lib/api';

const SIZES = ['1–10', '11–50', '51–200', '201–1000', '1000+'];
const INDUSTRIES = ['IT / Software', 'E-commerce', 'Finance', 'Healthcare', 'Education', 'Manufacturing', 'Marketing / Media', 'Retail', 'Real Estate', 'Other'];
const FIELDS = ['companyName', 'industry', 'companySize', 'location', 'address', 'website', 'linkedin', 'phone', 'contactEmail', 'foundedYear', 'about'];

const initial = (p) => Object.fromEntries(FIELDS.map((k) => [k, p?.[k] ?? '']));

// Everything candidates see about the company once it shortlists them.
export default function CompanyProfilePage() {
  const { profile, setProfile } = useAuth();
  const [form, setForm] = useState(() => initial(profile));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial(profile));

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const save = async () => {
    const e = {};
    if (!form.companyName.trim()) e.companyName = 'Enter your company name';
    if (!form.location.trim()) e.location = 'Enter your city';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      const { data } = await api.put('/company/profile', form);
      setProfile(data.profile);
      setForm(initial(data.profile));
      toast.success('Company profile saved');
    } catch (err) {
      const field = err.response?.data?.field;
      if (field) setErrors({ [field]: errorMessage(err) });
      else toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <CompanyShell>
      <div className="mx-auto max-w-3xl space-y-6 pb-24">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight">
            <Building2 className="text-brand-500" />
            Company profile
            {profile?.verification?.status === 'verified' && <VerifiedBadge />}
          </h1>
          <p className="mt-1 text-white/50">Candidates you shortlist see these details. A complete profile gets more replies.</p>
        </div>

        <section className="glass rounded-3xl p-5 sm:p-6">
          <ImageUploader
            src={profile?.logoUrl}
            name={profile?.companyName}
            endpoint="/company/logo"
            label="Company logo"
            company
            onSaved={(data) => setProfile(data.profile)}
          />
        </section>

        <section className="glass space-y-4 rounded-3xl p-5 sm:p-6">
          <h2 className="font-bold">About the company</h2>
          <Field label="Company name" error={errors.companyName}>
            <Input icon={Building2} value={form.companyName} onChange={set('companyName')} maxLength={100} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Industry">
              <Select options={INDUSTRIES} value={form.industry} onChange={set('industry')} />
            </Field>
            <Field label="Company size">
              <Select options={SIZES} value={form.companySize} onChange={set('companySize')} placeholder="Employees" />
            </Field>
            <Field label="Founded in" error={errors.foundedYear}>
              <Input icon={Calendar} type="number" inputMode="numeric" value={form.foundedYear} onChange={set('foundedYear')} placeholder="2018" />
            </Field>
          </div>
          <Field label="Description" hint="What you do, your culture, why people love working with you">
            <Textarea value={form.about} onChange={set('about')} maxLength={1500} className="min-h-32" placeholder="We build…" />
          </Field>
        </section>

        <section className="glass space-y-4 rounded-3xl p-5 sm:p-6">
          <h2 className="font-bold">Contact & links</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Website" error={errors.website}>
              <Input icon={Globe} value={form.website} onChange={set('website')} placeholder="yourcompany.com" />
            </Field>
            <Field label="LinkedIn page" error={errors.linkedin}>
              <Input icon={Link2} value={form.linkedin} onChange={set('linkedin')} placeholder="linkedin.com/company/…" />
            </Field>
            <Field label="Contact number" error={errors.phone}>
              <Input icon={Phone} type="tel" value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" />
            </Field>
            <Field label="Contact email" error={errors.contactEmail} hint="For candidates, e.g. careers@…">
              <Input icon={Mail} type="email" value={form.contactEmail} onChange={set('contactEmail')} placeholder="careers@yourcompany.com" />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="City" error={errors.location}>
              <Input icon={MapPin} value={form.location} onChange={set('location')} placeholder="Jaipur" />
            </Field>
            <Field label="Office address" hint="Used for in-person interviews">
              <Input icon={MapPin} value={form.address} onChange={set('address')} placeholder="Floor, building, area" />
            </Field>
          </div>
        </section>
      </div>

      {dirty && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed inset-x-3 bottom-24 z-40 mx-auto flex max-w-3xl items-center gap-3 rounded-2xl border border-white/10 bg-ink-800/95 p-3 shadow-2xl backdrop-blur md:bottom-6"
        >
          <p className="flex-1 pl-2 text-sm text-white/60">You have unsaved changes</p>
          <Button className="btn-ghost py-2 text-sm" onClick={() => setForm(initial(profile))}>
            Discard
          </Button>
          <Button className="btn-primary py-2 text-sm" onClick={save} loading={saving}>
            Save changes
          </Button>
        </motion.div>
      )}
    </CompanyShell>
  );
}
