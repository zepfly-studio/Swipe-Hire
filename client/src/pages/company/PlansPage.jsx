import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import CompanyShell from '../../components/CompanyShell';
import PlanCards from '../../components/PlanCards';
import { useAuth } from '../../context/AuthContext';

export default function PlansPage() {
  const { profile } = useAuth();
  return (
    <CompanyShell>
      <div className="mx-auto max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight">
            Swipe more, <span className="text-gradient">hire faster.</span>
          </h1>
          <p className="mt-3 text-white/55">Every swipe (left or right) uses one credit. Saving candidates to your wishlist is always free.</p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-4 py-2 text-sm ring-1 ring-white/10">
            <Zap size={15} className="text-amber-300" fill="currentColor" />
            You have <b>{profile?.swipesLeft ?? 0}</b> swipes left
          </div>
        </motion.div>
        <PlanCards />
      </div>
    </CompanyShell>
  );
}
