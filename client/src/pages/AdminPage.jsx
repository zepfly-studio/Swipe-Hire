import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ExternalLink, ShieldCheck, X } from 'lucide-react';
import toast from 'react-hot-toast';
import AppShell from '../components/AppShell';
import { Button, Spinner } from '../components/ui';
import { api, errorMessage } from '../lib/api';

// Review companies that asked to be verified with their GSTIN.
export default function AdminPage() {
  const [items, setItems] = useState(null);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    api
      .get('/admin/verifications')
      .then(({ data }) => setItems(data.companies))
      .catch((err) => {
        toast.error(errorMessage(err));
        setItems([]);
      });
  }, []);

  const decide = async (c, approve) => {
    setBusy(c.id + approve);
    try {
      await api.post(`/admin/verifications/${c.id}`, { approve });
      setItems((list) => list.filter((x) => x.id !== c.id));
      toast.success(approve ? `${c.companyName} verified` : `${c.companyName} rejected`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <AppShell>
      <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight">
        <ShieldCheck className="text-sky-400" />
        Admin · company verification
      </h1>
      <p className="mt-1 mb-8 text-white/50">
        Check each GSTIN on the government portal before approving.
      </p>
      {!items && <Spinner className="py-20" />}
      {items?.length === 0 && <p className="glass rounded-3xl p-10 text-center text-white/50">No pending requests 🎉</p>}
      <div className="space-y-3">
        <AnimatePresence>
          {items?.map((c) => (
            <motion.div
              key={c.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 40 }}
              className="glass flex flex-col gap-4 rounded-3xl p-5 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="font-bold">{c.companyName}</p>
                <p className="text-sm text-white/50">
                  {c.contact.name} · {c.contact.email} · {c.location}
                  {c.website && ` · ${c.website}`}
                </p>
                <p className="mt-2 font-mono text-lg tracking-widest">{c.gstin}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href="https://services.gst.gov.in/services/searchtp"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost py-2 text-sm"
                >
                  <ExternalLink size={15} />
                  Check GSTIN
                </a>
                <Button className="btn-ghost py-2 text-sm" onClick={() => decide(c, false)} loading={busy === c.id + false}>
                  <X size={15} />
                  Reject
                </Button>
                <Button className="btn-primary py-2 text-sm" onClick={() => decide(c, true)} loading={busy === c.id + true}>
                  <Check size={15} />
                  Approve
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}
