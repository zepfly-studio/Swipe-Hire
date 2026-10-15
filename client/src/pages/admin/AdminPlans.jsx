import { useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Field, Input, Spinner, Textarea } from '../../components/ui';
import { api, cx, errorMessage } from '../../lib/api';
import AdminShell, { dateOf, Pill } from './AdminShell';

const blankPlan = () => ({ name: '', price: '', swipes: '', perks: '', popular: false });
const toForm = (p) => ({ ...p, price: String(p.price), swipes: String(p.swipes), perks: (p.perks || []).join('\n') });

// Swipe-credit plans (what companies can buy) and discount coupons.
export default function AdminPlans() {
  const [plans, setPlans] = useState(null);
  const [saving, setSaving] = useState(false);
  const [coupons, setCoupons] = useState([]);
  const [c, setC] = useState({ code: '', percentOff: '', expiresAt: '', maxUses: '', planIds: [] });
  const [creating, setCreating] = useState(false);

  const load = () => {
    api.get('/admin/settings').then(({ data }) => setPlans(data.plans.map(toForm))).catch((err) => toast.error(errorMessage(err)));
    api.get('/admin/coupons').then(({ data }) => setCoupons(data.coupons)).catch(() => {});
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

  const createCoupon = async () => {
    setCreating(true);
    try {
      await api.post('/admin/coupons', { ...c, percentOff: Number(c.percentOff), maxUses: c.maxUses || null, expiresAt: c.expiresAt || null });
      toast.success(`Coupon ${c.code.toUpperCase()} created`);
      setC({ code: '', percentOff: '', expiresAt: '', maxUses: '', planIds: [] });
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setCreating(false);
    }
  };
  const toggleCoupon = (x) => api.patch(`/admin/coupons/${x.id}`, { active: !x.active }).then(load).catch((err) => toast.error(errorMessage(err)));
  const removeCoupon = (x) => window.confirm(`Delete coupon ${x.code}?`) && api.delete(`/admin/coupons/${x.id}`).then(load).catch((err) => toast.error(errorMessage(err)));

  return (
    <AdminShell
      title="Plans & coupons"
      subtitle="Create the swipe packs companies can buy, change prices, and make discount codes."
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

          <section className="glass rounded-3xl p-5">
            <h2 className="font-bold">Coupons</h2>
            <p className="text-sm text-white/50">Companies enter the code before paying. Up to 90% off.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Field label="Code">
                <Input value={c.code} onChange={(e) => setC({ ...c, code: e.target.value.toUpperCase() })} maxLength={20} placeholder="LAUNCH20" />
              </Field>
              <Field label="Discount %">
                <Input type="number" min="1" max="90" value={c.percentOff} onChange={(e) => setC({ ...c, percentOff: e.target.value })} placeholder="20" />
              </Field>
              <Field label="Expires" hint="Optional">
                <Input type="date" value={c.expiresAt} onChange={(e) => setC({ ...c, expiresAt: e.target.value })} />
              </Field>
              <Field label="Max uses" hint="Optional">
                <Input type="number" min="1" value={c.maxUses} onChange={(e) => setC({ ...c, maxUses: e.target.value })} placeholder="Unlimited" />
              </Field>
              <div className="flex items-end pb-[22px]">
                <Button className="btn-primary w-full" loading={creating} onClick={createCoupon} disabled={!c.code || !c.percentOff}>
                  <Plus size={16} /> Create
                </Button>
              </div>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-white/50">Only for:</span>
              {plans.filter((p) => p.id).map((p) => (
                <label key={p.id} className="flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1">
                  <input
                    type="checkbox"
                    className="accent-[#0f4d42]"
                    checked={c.planIds.includes(p.id)}
                    onChange={(e) => setC({ ...c, planIds: e.target.checked ? [...c.planIds, p.id] : c.planIds.filter((x) => x !== p.id) })}
                  />
                  {p.name}
                </label>
              ))}
              <span className="text-xs text-white/40">(none ticked = every plan)</span>
            </div>
            {coupons.length > 0 && (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="text-[11px] uppercase tracking-[0.1em] text-white/45">
                    <tr>
                      <th className="py-2 font-semibold">Code</th>
                      <th className="py-2 font-semibold">Discount</th>
                      <th className="py-2 font-semibold">Used</th>
                      <th className="py-2 font-semibold">Expires</th>
                      <th className="py-2 font-semibold">Plans</th>
                      <th className="py-2 font-semibold">Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {coupons.map((x) => (
                      <tr key={x.id}>
                        <td className="py-2.5 font-mono font-bold">{x.code}</td>
                        <td className="py-2.5">{x.percentOff}% off</td>
                        <td className="py-2.5 tabular-nums">
                          {x.uses}
                          {x.maxUses ? ` / ${x.maxUses}` : ''}
                        </td>
                        <td className="py-2.5">{x.expiresAt ? dateOf(x.expiresAt) : 'Never'}</td>
                        <td className="py-2.5">{x.planIds.length ? x.planIds.join(', ') : 'All'}</td>
                        <td className="py-2.5">
                          <button onClick={() => toggleCoupon(x)}>
                            <Pill tone={x.active ? 'green' : 'gray'}>{x.active ? 'Active' : 'Paused'}</Pill>
                          </button>
                        </td>
                        <td className="py-2.5 text-right">
                          <button onClick={() => removeCoupon(x)} className="rounded-lg p-1.5 text-danger hover:bg-red-500/10" aria-label={`Delete ${x.code}`}>
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </AdminShell>
  );
}
