import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Field, Input, Spinner, Textarea } from '../../components/ui';
import { api, cx, errorMessage } from '../../lib/api';
import AdminShell, { Pill } from './AdminShell';

function Toggle({ on, onChange, label, text, warn }) {
  return (
    <div className="flex items-start gap-4 py-4">
      <div className="min-w-0 flex-1">
        <p className="font-bold">{label}</p>
        <p className="mt-0.5 text-sm text-white/55">{text}</p>
        {warn && on && <p className="mt-1 text-xs font-semibold text-amber-200">{warn}</p>}
      </div>
      <button
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        className={cx('relative h-7 w-12 shrink-0 rounded-full transition-colors', on ? 'bg-brand-500' : 'bg-white/15')}
      >
        <span className={cx('absolute top-1 size-5 rounded-full bg-[#fff] shadow transition-all', on ? 'left-6' : 'left-1')} />
      </button>
    </div>
  );
}

// Site-wide switches: maintenance, testing helpers, job approval, admin login, free swipes.
export default function AdminSettings() {
  const [s, setS] = useState(null);
  const [msg, setMsg] = useState('');
  const [free, setFree] = useState('');

  const load = () =>
    api
      .get('/admin/settings')
      .then(({ data }) => {
        setS(data);
        setMsg(data.site.maintenance.message || '');
        setFree(String(data.site.freeSwipes));
      })
      .catch((err) => toast.error(errorMessage(err)));
  useEffect(() => {
    load();
  }, []);

  const save = async (body, ok) => {
    try {
      await api.put('/admin/settings/site', body);
      toast.success(ok);
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  if (!s)
    return (
      <AdminShell title="Settings">
        <Spinner className="py-20" />
      </AdminShell>
    );
  const site = s.site;

  return (
    <AdminShell title="Settings" subtitle="Switches that change how the whole website behaves. Changes apply immediately.">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="glass rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Maintenance mode</h2>
            <Pill tone={site.maintenance.on ? 'red' : 'green'}>{site.maintenance.on ? 'Site paused' : 'Site live'}</Pill>
          </div>
          <p className="mt-1 text-sm text-white/55">Shows a “We’ll be back soon” page to everyone except admins. Use it for big updates.</p>
          <Field label="Message shown to users" className="mt-4">
            <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={300} placeholder="We are upgrading Glide Recruit. Back by 6 pm." />
          </Field>
          <div className="mt-3 flex gap-2">
            {site.maintenance.on ? (
              <>
                <Button className="btn-primary" onClick={() => save({ maintenance: { on: false, message: msg } }, 'Site is live again')}>
                  Turn off — site live
                </Button>
                <Button className="btn-ghost" onClick={() => save({ maintenance: { on: true, message: msg } }, 'Message updated')}>
                  Update message
                </Button>
              </>
            ) : (
              <Button className="btn-ghost text-danger" onClick={() => window.confirm('Pause the website for all users?') && save({ maintenance: { on: true, message: msg } }, 'Maintenance mode is on')}>
                Turn on maintenance
              </Button>
            )}
          </div>
        </section>

        <section className="glass rounded-3xl p-5">
          <h2 className="font-bold">Free swipes for new companies</h2>
          <p className="mt-1 text-sm text-white/55">Every new company account starts with this many swipe credits. Existing companies keep what they have.</p>
          <div className="mt-4 flex gap-2">
            <Input type="number" min="0" max="1000" value={free} onChange={(e) => setFree(e.target.value)} className="w-32" aria-label="Free swipes" />
            <Button className="btn-primary" onClick={() => save({ freeSwipes: Number(free) }, 'Free swipes updated')}>
              <Save size={16} /> Save
            </Button>
          </div>
        </section>

        <section className="glass divide-y divide-white/[0.06] rounded-3xl px-5 lg:col-span-2">
          <Toggle
            label="Approve each new company’s first job"
            text="New companies can’t swipe until an admin approves their first job (Jobs → Awaiting approval). Stops fake companies from seeing candidates."
            on={site.requireJobApproval}
            onChange={(v) => save({ requireJobApproval: v }, v ? 'First jobs now need approval' : 'Jobs go live straight away')}
          />
          <Toggle
            label="Admin login code (two-step)"
            text="Admins must enter a code emailed to them after their password. Strongly recommended."
            on={site.adminTwoStep}
            onChange={(v) => (v || window.confirm('Turn off the admin login code? Anyone with an admin password could get in.')) && save({ adminTwoStep: v }, v ? 'Two-step login on' : 'Two-step login off')}
          />
          <Toggle
            label="Show email codes on screen (testing)"
            text={`Shows sign-up and login codes on the page instead of only emailing them. ${s.overridden.showEmailCode ? 'Set here.' : 'Following the server setting.'}`}
            warn="Turn this off before launch: anyone could sign up with any email address."
            on={site.showEmailCode}
            onChange={(v) => save({ showEmailCode: v }, v ? 'Codes shown on screen' : 'Codes only by email')}
          />
          <Toggle
            label="Demo payments (testing)"
            text={s.env.razorpay ? 'Razorpay is connected, so real payments are used and demo payments are off.' : 'One click gives swipe credits without paying. Only for testing.'}
            warn="Turn this off before launch: companies get free credits."
            on={site.demoPayments}
            onChange={(v) => (s.env.razorpay ? toast.error('Razorpay is connected; demo payments are not available') : save({ demoPayments: v }, v ? 'Demo payments on' : 'Demo payments off'))}
          />
        </section>

        <section className="glass rounded-3xl p-5 lg:col-span-2">
          <h2 className="font-bold">Server</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Pill tone={s.env.production ? 'green' : 'amber'}>{s.env.production ? 'Production' : 'Development'}</Pill>
            <Pill tone={s.env.email ? 'green' : 'red'}>{s.env.email ? 'Email service connected' : 'No email service'}</Pill>
            <Pill tone={s.env.razorpay ? 'green' : 'amber'}>{s.env.razorpay ? 'Razorpay connected' : 'Razorpay not connected'}</Pill>
          </div>
          <p className="mt-2 text-sm text-white/50">These come from the server environment (Render) and can’t be changed here.</p>
        </section>
      </div>
    </AdminShell>
  );
}
