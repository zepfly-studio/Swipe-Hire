import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, FileText, Mail, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import CompanyShell from '../../components/CompanyShell';
import { Burst, Button, Field, Input, Spinner } from '../../components/ui';
import Illustration from '../../components/Illustration';
import { useAuth } from '../../context/AuthContext';
import { api, errorMessage } from '../../lib/api';

function Verified({ method }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass relative overflow-hidden rounded-3xl p-10 text-center">
      <div className="relative mx-auto w-fit">
        <Burst count={24} distance={130} />
        <motion.span
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 14 }}
        >
          <Illustration name="verified" />
        </motion.span>
      </div>
      <h2 className="mt-6 text-2xl font-extrabold">Your company is verified</h2>
      <p className="mt-2 text-white/55">
        Candidates see a blue badge next to your name in chats and interview invites
        {method === 'gst' ? ' (verified by GSTIN)' : ' (verified by work email)'}.
      </p>
    </motion.div>
  );
}

export default function VerifyPage() {
  const { setProfile } = useAuth();
  const [info, setInfo] = useState(null);
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(null);
  const [gstin, setGstin] = useState('');
  const [busy, setBusy] = useState('');
  const [errors, setErrors] = useState({});

  const load = () =>
    api.get('/company/verification').then(({ data }) => {
      setInfo(data);
      setGstin(data.gstin || '');
    });
  useEffect(() => {
    load().catch((err) => toast.error(errorMessage(err)));
  }, []);

  const saveStatus = (verification) => {
    setInfo((i) => ({ ...i, verification }));
    setProfile((p) => ({ ...p, verification }));
  };

  const sendCode = async () => {
    setBusy('send');
    setErrors({});
    try {
      const { data } = await api.post('/company/verification/email/send');
      setSent(data);
      toast.success(`Code sent to ${data.sentTo}`);
    } catch (err) {
      setErrors({ email: errorMessage(err) });
    } finally {
      setBusy('');
    }
  };

  const confirmCode = async () => {
    setBusy('confirm');
    setErrors({});
    try {
      const { data } = await api.post('/company/verification/email/confirm', { code });
      saveStatus(data.verification);
    } catch (err) {
      setErrors({ code: errorMessage(err) });
    } finally {
      setBusy('');
    }
  };

  const submitGst = async () => {
    setBusy('gst');
    setErrors({});
    try {
      const { data } = await api.post('/company/verification/gst', { gstin });
      saveStatus(data.verification);
      toast.success('Submitted! We will review it shortly.');
    } catch (err) {
      setErrors({ gst: errorMessage(err) });
    } finally {
      setBusy('');
    }
  };

  const status = info?.verification?.status ?? 'none';

  return (
    <CompanyShell>
      <div className="mx-auto max-w-2xl">
        <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight">
          <ShieldCheck className="text-sky-400" />
          Get verified
        </h1>
        <p className="mt-1 mb-8 text-white/50">
          A verified badge shows candidates you are a real company. Verified companies get more replies.
        </p>

        {!info && <Spinner className="py-20" />}
        {status === 'verified' && <Verified method={info.verification.method} />}

        {info && status !== 'verified' && (
          <div className="space-y-5">
            {status === 'pending' && (
              <div className="flex items-start gap-3 rounded-2xl bg-amber-300/10 p-4 text-sm text-amber-100 ring-1 ring-amber-300/30">
                <Clock size={18} className="mt-0.5 shrink-0" />
                GSTIN {info.gstin} is under review. You will get a notification once it is approved, usually within one working day.
              </div>
            )}
            {status === 'rejected' && (
              <div className="rounded-2xl bg-brand-500/10 p-4 text-sm text-brand-400 ring-1 ring-brand-500/30">
                We could not verify your GSTIN. Please check it, or verify with your work email instead.
              </div>
            )}

            <section className="glass rounded-3xl p-6">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-400/15 text-sky-300">
                  <Mail size={19} />
                </span>
                <div>
                  <h2 className="font-bold">Verify with work email · instant</h2>
                  <p className="text-sm text-white/50">
                    Your login email ({info.email}) must be on your company website's domain
                    {info.website ? ` (${info.website})` : ''}.
                  </p>
                </div>
              </div>
              {!sent ? (
                <div className="mt-5">
                  <Button className="btn-primary" onClick={sendCode} loading={busy === 'send'}>
                    Send code to my email
                  </Button>
                  {errors.email && <p className="mt-3 text-sm font-medium text-brand-400">{errors.email}</p>}
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  <Field label={`Enter the 6-digit code sent to ${sent.sentTo}`} error={errors.code}>
                    <Input
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="123456"
                      className="text-center text-2xl tracking-[0.5em]"
                    />
                  </Field>
                  {sent.devCode && (
                    <p className="text-xs text-amber-300/80">Development mode (no email server): your code is {sent.devCode}</p>
                  )}
                  <div className="flex gap-3">
                    <Button className="btn-ghost" onClick={sendCode} loading={busy === 'send'}>
                      Resend
                    </Button>
                    <Button className="btn-primary flex-1" onClick={confirmCode} loading={busy === 'confirm'} disabled={code.length !== 6}>
                      Verify
                    </Button>
                  </div>
                </div>
              )}
            </section>

            <section className="glass rounded-3xl p-6">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-brand/20 text-violet-300">
                  <FileText size={19} />
                </span>
                <div>
                  <h2 className="font-bold">Verify with GSTIN · reviewed by our team</h2>
                  <p className="text-sm text-white/50">Use this if you sign in with a personal email.</p>
                </div>
              </div>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-start">
                <Field error={errors.gst} className="flex-1">
                  <Input
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase().replace(/\s/g, '').slice(0, 15))}
                    placeholder="22AAAAA0000A1Z5"
                    className="tracking-widest"
                    aria-label="GSTIN"
                  />
                </Field>
                <Button className="btn-ghost" onClick={submitGst} loading={busy === 'gst'} disabled={gstin.length !== 15}>
                  {status === 'pending' ? 'Update' : 'Submit'}
                </Button>
              </div>
            </section>
          </div>
        )}
      </div>
    </CompanyShell>
  );
}
