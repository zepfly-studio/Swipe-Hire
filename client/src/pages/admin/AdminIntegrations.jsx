import { useEffect, useState } from 'react';
import { BarChart3, Code2, MessageCircle, MessagesSquare, MousePointerClick, Save, Tags, Target } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Field, Input, Spinner, Textarea } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import AdminShell, { Pill } from './AdminShell';
import { Toggle } from './AdminSettings';

// The tools an admin can plug in. "id" is what the provider gives you; pasting their whole
// snippet also works, the server keeps just the ID.
const TOOLS = [
  { key: 'googleAnalytics', name: 'Google Analytics', icon: BarChart3, placeholder: 'G-XXXXXXXXXX', help: 'Visitors, pages and traffic sources. Admin → Data streams → Measurement ID.' },
  { key: 'googleTagManager', name: 'Google Tag Manager', icon: Tags, placeholder: 'GTM-XXXXXXX', help: 'Manage many tags (ads, analytics) from one Google account.' },
  { key: 'metaPixel', name: 'Meta (Facebook) Pixel', icon: Target, placeholder: '123456789012345', help: 'Measure Facebook and Instagram ads. Events Manager → Pixel ID.' },
  { key: 'clarity', name: 'Microsoft Clarity', icon: MousePointerClick, placeholder: 'abcd1234ef', help: 'Free heatmaps and session recordings. Settings → Project ID.' },
  { key: 'tawk', name: 'Tawk.to live chat', icon: MessagesSquare, placeholder: '64ab12cd34ef56ab78cd90ef/1h2k3l4m5', help: 'Free chat bubble on the website. Paste the widget link or snippet.' },
  { key: 'crisp', name: 'Crisp live chat', icon: MessagesSquare, placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', help: 'Chat bubble with a shared team inbox. Settings → Website ID.' },
];

function Card({ icon: Icon, name, on, children }) {
  return (
    <section className="glass rounded-3xl p-5">
      <div className="mb-1 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-2xl bg-brand-500/10 text-brand-500">
          <Icon size={19} />
        </span>
        <h2 className="flex-1 font-bold">{name}</h2>
        <Pill tone={on ? 'green' : 'gray'}>{on ? 'Live on website' : 'Off'}</Pill>
      </div>
      {children}
    </section>
  );
}

// Admin → Integrations: switch third-party tools on and off for the public website.
export default function AdminIntegrations() {
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(null);
  const [canEditCode, setCanEditCode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState({});

  useEffect(() => {
    api
      .get('/admin/settings/integrations')
      .then(({ data }) => {
        setForm(data.integrations);
        setSaved(data.integrations);
        setCanEditCode(data.canEditCode);
      })
      .catch((err) => toast.error(errorMessage(err)));
  }, []);

  const set = (key, patch) => setForm((f) => ({ ...f, [key]: { ...f[key], ...patch } }));
  const dirty = form && JSON.stringify(form) !== JSON.stringify(saved);

  const save = async () => {
    setSaving(true);
    setError({});
    try {
      const { custom, ...rest } = form;
      const { data } = await api.put('/admin/settings/integrations', canEditCode ? form : rest);
      setForm(data.integrations);
      setSaved(data.integrations);
      toast.success('Saved. Visitors get the change within a minute, no refresh needed.');
    } catch (err) {
      const field = err.response?.data?.field;
      if (field) setError({ [field]: errorMessage(err) });
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell
      title="Integrations"
      subtitle="Connect analytics, ads tracking and chat tools to the website. Turn each one on or off any time."
      actions={
        <Button className="btn-primary" onClick={save} loading={saving} disabled={!dirty}>
          <Save size={16} /> Save
        </Button>
      }
    >
      {!form ? (
        <Spinner className="py-20" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {TOOLS.map((t) => (
            <Card key={t.key} icon={t.icon} name={t.name} on={saved[t.key]?.on}>
              <Toggle
                on={form[t.key].on}
                onChange={(on) => set(t.key, { on })}
                label={`Show ${t.name} on the website`}
                text={t.help}
                warn={!form[t.key].id ? 'Add the ID below, or it stays off.' : null}
              />
              <Field label="ID" error={error[t.key]}>
                <Input value={form[t.key].id} onChange={(e) => set(t.key, { id: e.target.value })} placeholder={t.placeholder} />
              </Field>
            </Card>
          ))}

          <Card icon={MessageCircle} name="WhatsApp chat button" on={saved.whatsapp?.on}>
            <Toggle
              on={form.whatsapp.on}
              onChange={(on) => set('whatsapp', { on })}
              label="Show the WhatsApp button"
              text="A green button in the corner of every page opens a WhatsApp chat with you."
              warn={!form.whatsapp.number ? 'Add the number below, or it stays off.' : null}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Number with country code" error={error.whatsapp}>
                <Input value={form.whatsapp.number} onChange={(e) => set('whatsapp', { number: e.target.value })} placeholder="919876543210" inputMode="tel" />
              </Field>
              <Field label="First message" hint="Optional">
                <Input value={form.whatsapp.text} onChange={(e) => set('whatsapp', { text: e.target.value })} maxLength={200} placeholder="Hi, I have a question about Glide Recruit" />
              </Field>
            </div>
          </Card>

          <Card icon={Code2} name="Custom code" on={saved.custom?.on}>
            {canEditCode ? (
              <>
                <Toggle
                  on={form.custom.on}
                  onChange={(on) => set('custom', { on })}
                  label="Add custom code to the website"
                  text="For any other tool: paste its <script> snippet. It runs for every visitor (not on admin pages)."
                  warn="Only paste code from a provider you trust. Wrong code can break the website."
                />
                <Field label="Code" error={error.custom}>
                  <Textarea value={form.custom.code} onChange={(e) => set('custom', { code: e.target.value })} className="min-h-36 font-mono text-xs" maxLength={20000} placeholder={'<script src="https://example.com/widget.js" async></script>'} />
                </Field>
              </>
            ) : (
              <p className="py-3 text-sm text-white/55">Only a super admin can add or change custom code.</p>
            )}
          </Card>
        </div>
      )}
    </AdminShell>
  );
}
