import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, KeyRound, Lock, LogOut, Mail, Phone, User, UserCog } from 'lucide-react';
import toast from 'react-hot-toast';
import AppShell from '../components/AppShell';
import ImageUploader from '../components/ImageUploader';
import { Button, Field, Input } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { api, errorMessage } from '../lib/api';

function Section({ icon: Icon, title, children }) {
  return (
    <section className="glass space-y-5 rounded-3xl p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-bold">
        <Icon size={18} className="text-brand-400" />
        {title}
      </h2>
      {children}
    </section>
  );
}

// Your own account: photo, name, phone, password. Works for every role.
export default function SettingsPage() {
  const { user, updateSession, logout } = useAuth();
  const [endingAll, setEndingAll] = useState(false);

  // Ends every login, including this one (e.g. after using a shared computer).
  const logoutEverywhere = async () => {
    if (!window.confirm('Log out of Glide Recruit on all devices, including this one?')) return;
    setEndingAll(true);
    try {
      await api.post('/auth/logout-all');
      logout();
      toast.success('Logged out of all devices');
    } catch (err) {
      toast.error(errorMessage(err));
      setEndingAll(false);
    }
  };
  const isCompany = user.role === 'company';
  const [form, setForm] = useState({ name: user.name, phone: user.phone ?? '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [pwSaving, setPwSaving] = useState(false);

  const dirty = form.name !== user.name || form.phone !== (user.phone ?? '');

  const save = async () => {
    setErrors({});
    if (!form.name.trim()) return setErrors({ name: 'Please enter your name' });
    setSaving(true);
    try {
      const { data } = await api.put('/account', isCompany ? form : { name: form.name });
      updateSession(data);
      toast.success('Saved');
    } catch (err) {
      const field = err.response?.data?.field;
      if (field) setErrors({ [field]: errorMessage(err) });
      else toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    const e = {};
    if (!pw.current) e.current = 'Enter your current password';
    if (pw.next.length < 6) e.next = 'At least 6 characters';
    else if (pw.next !== pw.confirm) e.confirm = 'Passwords do not match';
    setPwErrors(e);
    if (Object.keys(e).length) return;
    setPwSaving(true);
    try {
      await api.put('/account/password', { current: pw.current, next: pw.next });
      setPw({ current: '', next: '', confirm: '' });
      toast.success('Password changed. Other devices have been logged out.');
    } catch (err) {
      const field = err.response?.data?.field;
      if (field) setPwErrors({ [field]: errorMessage(err) });
      else toast.error(errorMessage(err));
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight">
            <UserCog className="text-brand-500" />
            Account settings
          </h1>
          <p className="mt-1 text-white/50">Your photo, name and login details.</p>
        </div>

        <Section icon={User} title="Profile">
          <ImageUploader
            src={user.avatarUrl}
            name={form.name || user.name}
            endpoint="/account/avatar"
            label="Profile photo"
            onSaved={updateSession}
          />
          <Field label="Full name" error={errors.name}>
            <Input icon={User} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} maxLength={80} />
          </Field>
          {isCompany && (
            <Field label="Your phone (optional)" error={errors.phone} hint="Only your teammates see this">
              <Input icon={Phone} type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="98765 43210" />
            </Field>
          )}
          <Field label="Email" hint="Your login email can't be changed">
            <Input icon={Mail} value={user.email} disabled className="opacity-60" />
          </Field>
          {!isCompany && (
            <p className="text-sm text-white/50">
              Phone, skills, resume and video are on{' '}
              <Link to="/candidate/onboarding?edit" className="font-semibold text-brand-400 hover:underline">
                Edit profile
              </Link>
              .
            </p>
          )}
          {dirty && (
            <Button className="btn-primary w-full" onClick={save} loading={saving}>
              Save changes
            </Button>
          )}
        </Section>

        {isCompany && (
          <Link to="/company/profile" className="glass flex items-center gap-3 rounded-3xl p-5 transition-colors hover:border-white/20">
            <Building2 className="text-brand-400" />
            <span className="flex-1">
              <span className="block font-bold">Company profile</span>
              <span className="text-sm text-white/50">Logo, website, contact number and email, address and more</span>
            </span>
          </Link>
        )}

        <Section icon={KeyRound} title="Change password">
          <Field label="Current password" error={pwErrors.current}>
            <Input icon={Lock} type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="New password" error={pwErrors.next}>
              <Input icon={Lock} type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} />
            </Field>
            <Field label="Confirm new password" error={pwErrors.confirm}>
              <Input icon={Lock} type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} />
            </Field>
          </div>
          <Button className="btn-ghost" onClick={changePassword} loading={pwSaving}>
            Update password
          </Button>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
            <p className="text-sm text-white/55">Used Glide Recruit on a shared or lost device?</p>
            <Button className="btn-ghost text-sm" onClick={logoutEverywhere} loading={endingAll}>
              <LogOut size={16} />
              Log out of all devices
            </Button>
          </div>
        </Section>
      </div>
    </AppShell>
  );
}
