import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Crown, Gift, TicketPercent, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Spinner } from './ui';
import { useAuth } from '../context/AuthContext';
import { api, cx, errorMessage } from '../lib/api';

function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function PlanCards({ onPurchased }) {
  const { user, setProfile } = useAuth();
  const [info, setInfo] = useState(null);
  const [buying, setBuying] = useState(null);
  // Discount code: typed text, and the checked coupon ({ code, percentOff }).
  const [codeInput, setCodeInput] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    api.get('/payment/plans').then(({ data }) => setInfo(data)).catch(() => toast.error('Could not load plans'));
  }, []);

  const verify = async (payload) => {
    const { data } = await api.post('/payment/verify', payload);
    setProfile(data.profile);
    toast.success(`${data.added} swipes added. Happy hiring!`);
    onPurchased?.(data);
  };

  const applyCoupon = async () => {
    const code = codeInput.trim();
    if (!code) return;
    setChecking(true);
    try {
      // Checked against the first plan it applies to; the price per plan is worked out below.
      let ok = null;
      let lastErr;
      for (const p of info.plans) {
        try {
          const { data } = await api.get('/payment/coupon', { params: { code, planId: p.id } });
          ok = ok || { code: data.code, percentOff: data.percentOff, plans: [] };
          ok.plans.push(p.id);
        } catch (err) {
          lastErr = err;
        }
      }
      if (!ok) throw lastErr;
      setCoupon(ok);
      toast.success(`${ok.code} applied: ${ok.percentOff}% off`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setChecking(false);
    }
  };
  const priceOf = (plan) => (coupon?.plans.includes(plan.id) ? Math.max(1, Math.round(plan.price * (1 - coupon.percentOff / 100))) : plan.price);

  const buy = async (plan) => {
    setBuying(plan.id);
    try {
      const { data: order } = await api.post('/payment/order', { planId: plan.id, ...(coupon?.plans.includes(plan.id) && { coupon: coupon.code }) });
      if (order.mode === 'demo') {
        await new Promise((r) => setTimeout(r, 900));
        await verify({ orderId: order.orderId });
        return;
      }
      if (!(await loadRazorpay())) throw new Error('Could not open payment window, check your internet');
      await new Promise((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          order_id: order.orderId,
          name: 'Glide Recruit',
          description: `${plan.name} plan · ${plan.swipes} swipes`,
          prefill: { name: user?.name, email: user?.email },
          // Razorpay checkout in the site's accent colour.
          theme: { color: getComputedStyle(document.documentElement).getPropertyValue('--color-brand-500').trim() || '#0f4d42' },
          handler: (resp) =>
            verify({
              orderId: resp.razorpay_order_id,
              paymentId: resp.razorpay_payment_id,
              signature: resp.razorpay_signature,
            }).then(resolve, reject),
          modal: { ondismiss: () => resolve() },
        });
        rzp.on('payment.failed', (r) => reject(new Error(r.error?.description || 'Payment failed')));
        rzp.open();
      });
    } catch (err) {
      toast.error(err.response ? errorMessage(err) : err.message);
    } finally {
      setBuying(null);
    }
  };

  if (!info) return <Spinner className="py-16" />;

  return (
    <div className="space-y-4">
      <div className={cx('grid gap-4 sm:grid-cols-2', info.plans.length >= 2 && 'lg:grid-cols-3', info.plans.length >= 3 && 'xl:grid-cols-4')}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[26px] border border-white/10 bg-white/[0.03] p-6"
        >
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/[0.07] text-white/70">
            <Gift size={20} />
          </span>
          <p className="mt-4 text-lg font-bold">Free</p>
          <p className="mt-1 text-4xl font-extrabold">₹0</p>
          <p className="mt-1 text-sm text-white/50">{info.freeSwipes} swipes to try Glide Recruit</p>
          <ul className="mt-5 space-y-2 text-sm text-white/60">
            <li className="flex gap-2"><Check size={16} className="text-white/40" />Given on sign-up</li>
            <li className="flex gap-2"><Check size={16} className="text-white/40" />Resume & video access</li>
          </ul>
        </motion.div>

        {info.plans.map((plan, i) => {
          const featured = plan.popular || info.plans.length === 1;
          const price = priceOf(plan);
          return (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * (i + 1) }}
            whileHover={{ y: -4 }}
            className={cx('relative overflow-hidden rounded-[26px] p-[1.5px]', !featured && 'bg-white/10')}
          >
            {featured && (
              <motion.div
                className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,var(--color-brand-500),var(--color-violet-brand),#38bdf8,var(--color-brand-500))]"
                animate={{ rotate: 360 }}
                transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
              />
            )}
            <div className="relative h-full rounded-[25px] bg-ink-900 p-6">
              <div className="flex items-center justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-linear-to-br from-brand-500 to-violet-brand text-[#fff]">
                  <Crown size={20} />
                </span>
                {featured && <span className="rounded-full bg-brand-500/15 px-3 py-1 text-xs font-bold text-brand-400">Most popular</span>}
              </div>
              <p className="mt-4 text-lg font-bold">{plan.name}</p>
              <p className="mt-1 text-4xl font-extrabold">
                ₹{price}
                {price !== plan.price && <span className="ml-2 text-lg font-semibold text-white/40 line-through">₹{plan.price}</span>}
                <span className="ml-1 text-base font-medium text-white/40">one-time</span>
              </p>
              <p className="mt-1 text-sm text-white/50">
                {plan.swipes} swipes · ₹{(price / plan.swipes).toFixed(1)} per candidate
              </p>
              <ul className="mt-5 space-y-2 text-sm text-white/75">
                {plan.perks.map((p) => (
                  <li key={p} className="flex gap-2">
                    <Check size={16} className="text-emerald-400" />
                    {p}
                  </li>
                ))}
              </ul>
              <Button className="btn-primary mt-6 w-full" loading={buying === plan.id} disabled={Boolean(buying)} onClick={() => buy(plan)}>
                Buy {plan.swipes} swipes
              </Button>
            </div>
          </motion.div>
          );
        })}
      </div>
      <div className="mx-auto flex max-w-md flex-wrap items-center justify-center gap-2">
        {coupon ? (
          <p className="flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1.5 text-sm font-semibold text-emerald-300">
            <TicketPercent size={16} /> {coupon.code}: {coupon.percentOff}% off applied
            <button onClick={() => setCoupon(null)} className="rounded-full p-0.5 hover:bg-white/10" aria-label="Remove coupon">
              <X size={14} />
            </button>
          </p>
        ) : (
          <>
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && applyCoupon()}
              placeholder="Have a coupon code?"
              aria-label="Coupon code"
              className="input w-56 py-2 text-sm"
            />
            <Button className="btn-ghost py-2 text-sm" loading={checking} disabled={!codeInput.trim()} onClick={applyCoupon}>
              Apply
            </Button>
          </>
        )}
      </div>
      {info.demoMode && (
        <p className="text-center text-xs text-amber-300/80">
          Demo mode: Razorpay keys are not set, so purchases are simulated (no real money is charged).
        </p>
      )}
    </div>
  );
}
