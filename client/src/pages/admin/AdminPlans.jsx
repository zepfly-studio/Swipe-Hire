import { useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Field, Input, Spinner, Textarea } from '../../components/ui';
import { api, cx, errorMessage } from '../../lib/api';
import AdminShell from './AdminShell';

const blankPlan = () => ({ name: '', price: '', swipes: '', perks: '', popular: false });
const toForm = (p) => ({ ...p, price: String(p.price), swipes: String(p.swipes), perks: (p.perks || []).join('\n') });

// Swipe-credit plans (what companies can buy).
export default function AdminPlans() {
  const [plans, setPlans] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.get('/admin/settings').then(({ data }) => setPlans(data.plans.map(toForm))).catch((err) => toast.error(errorMessage(err)));
  };
  useEffect(load, []);

  const edit = (i, k, v) => setPlans((ps) => ps.map((p, j) => (j === i ? { ...p, [k]: v } : k === 'popular' && v ? { ...p, popular: false } : p)));
  const save = async () => {
    setSaving(true);
    try {
      const body = plans.map((p) => ({ id: p.id, name: p.name, price: Number(p.price), swipes: Number(p.swipes), perks: p.perks.split('\n'), popular: p.popular }));
      const { data } = await api.put('/admin/settings/plans', { plans: body });
      setPlans(data.plans.map(toForm));
      toast.success('Plans saved. Companies see them now.');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };


  return (
    <AdminShell
      title="Plans"
      subtitle="Create the swipe packs companies can buy and change prices."
      actions={
        plans && (
          <Button className="btn-primary" loading={saving} onClick={save}>
            <Save size={17} /> Save plans
          </Button>
        )
      }
    >
      {!plans ? (
        <Spinner className="py-20" />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {plans.map((p, i) => (
              <section key={i} className={cx('glass space-y-3 rounded-3xl p-5', p.popular && 'ring-2 ring-brand-500')}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-white/60">Plan {i + 1}</p>
                  <button onClick={() => setPlans((ps) => ps.filter((_, j) => j !== i))} disabled={plans.length === 1} className="rounded-lg p-1.5 text-danger hover:bg-red-500/10 disabled:opacity-30" aria-label="Remove plan">
                    <Trash2 size={16} />
                  </button>
                </div>
                <Field label="Name">
                  <Input value={p.name} onChange={(e) => edit(i, 'name', e.target.value)} maxLength={40} placeholder="e.g. Growth" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Price (₹)">
                    <Input type="number" min="1" value={p.price} onChange={(e) => edit(i, 'price', e.target.value)} placeholder="599" />
                  </Field>
                  <Field label="Swipes">
                    <Input type="number" min="1" value={p.swipes} onChange={(e) => edit(i, 'swipes', e.target.value)} placeholder="350" />
                  </Field>
                </div>
                {Number(p.price) > 0 && Number(p.swipes) > 0 && <p className="text-xs text-white/50">₹{(Number(p.price) / Number(p.swipes)).toFixed(2)} per swipe</p>}
                <Field label="Perks" hint="One per line, up to 6">
                  <Textarea value={p.perks} onChange={(e) => edit(i, 'perks', e.target.value)} placeholder={'350 candidate swipes\nFull resume & intro video access'} />
                </Field>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" checked={p.popular} onChange={(e) => edit(i, 'popular', e.target.checked)} className="size-4 accent-[#0f4d42]" />
                  Highlight as “Most popular”
                </label>
              </section>
            ))}
            {plans.length < 6 && (
              <button onClick={() => setPlans((ps) => [...ps, blankPlan()])} className="grid min-h-48 place-items-center rounded-3xl border-2 border-dashed border-white/15 text-white/55 hover:border-brand-500/50 hover:text-brand-500">
                <span className="flex items-center gap-2 font-bold">
                  <Plus size={18} /> Add a plan
                </span>
              </button>
            )}
          </div>

        </div>
      )}
    </AdminShell>
  );
}
