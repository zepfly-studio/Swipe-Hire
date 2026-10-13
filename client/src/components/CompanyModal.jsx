import { useEffect, useState } from 'react';
import { Briefcase, Building2, Calendar, Globe, Link2, Mail, MapPin, MessageCircle, Phone, Users, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import Modal from './Modal';
import Avatar from './Avatar';
import { Spinner, VerifiedBadge } from './ui';
import { api, errorMessage } from '../lib/api';

function Row({ icon: Icon, label, value, href }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-2.5 text-sm">
      <Icon size={16} className="shrink-0 text-brand-400" />
      <span className="w-20 shrink-0 text-xs font-semibold uppercase tracking-wider text-white/40">{label}</span>
      {href ? (
        <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="min-w-0 truncate font-medium hover:underline">
          {value}
        </a>
      ) : (
        <span className="min-w-0 truncate font-medium">{value}</span>
      )}
    </div>
  );
}

function Details({ companyId, onClose }) {
  const [c, setC] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api
      .get(`/candidate/companies/${companyId}`)
      .then(({ data }) => setC(data.company))
      .catch((err) => setError(errorMessage(err)));
  }, [companyId]);

  if (error) return <p className="p-8 text-center text-white/55">{error}</p>;
  if (!c) return <Spinner className="py-16" />;
  const pretty = (url) => url?.replace(/^https?:\/\/(www\.)?/, '');

  return (
    <>
      <div className="flex items-start gap-4 border-b border-white/10 p-5">
        <Avatar src={c.logoUrl} name={c.name} size="lg" company />
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-1.5 text-xl font-extrabold">
            <span className="truncate">{c.name}</span>
            {c.verified && <VerifiedBadge />}
          </h2>
          <p className="truncate text-sm text-white/55">{[c.industry, c.location].filter(Boolean).join(' · ')}</p>
        </div>
        <button onClick={onClose} className="btn-ghost p-2" aria-label="Close">
          <X size={18} />
        </button>
      </div>
      <div className="no-scrollbar flex-1 space-y-5 overflow-y-auto p-5">
        {c.roles?.length > 0 && (
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">Shortlisted you for</p>
            <div className="space-y-2">
              {c.roles.map((r) => (
                <div key={r.id} className="rounded-2xl bg-white/[0.04] p-3">
                  <p className="flex items-center gap-2 font-semibold">
                    <Briefcase size={15} className="text-violet-300" />
                    {r.title}
                  </p>
                  <p className="mt-1 text-xs text-white/50">
                    {[r.jobLocation, r.workMode, r.jobType?.replace('-', ' '), r.salaryMax != null && `₹${r.salaryMin ?? 0}–${r.salaryMax} LPA`]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  {r.description && <p className="mt-2 whitespace-pre-line text-sm text-white/65">{r.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
        {c.about && (
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">About</p>
            <p className="whitespace-pre-line text-sm leading-relaxed text-white/70">{c.about}</p>
          </div>
        )}
        <div className="space-y-2">
          <Row icon={Globe} label="Website" value={pretty(c.website)} href={c.website} />
          <Row icon={Link2} label="LinkedIn" value={pretty(c.linkedin)} href={c.linkedin} />
          <Row icon={Mail} label="Email" value={c.contactEmail} href={c.contactEmail && `mailto:${c.contactEmail}`} />
          <Row icon={Phone} label="Phone" value={c.phone} href={c.phone && `tel:${c.phone.replace(/\s/g, '')}`} />
          <Row icon={MapPin} label="Address" value={c.address} />
          <Row icon={Users} label="Size" value={c.companySize && `${c.companySize} employees`} />
          <Row icon={Calendar} label="Founded" value={c.foundedYear} />
        </div>
        {!c.website && !c.contactEmail && !c.phone && !c.about && (
          <p className="flex items-center gap-2 text-sm text-white/45">
            <Building2 size={15} />
            This company hasn't added more details yet.
          </p>
        )}
      </div>
      <div className="border-t border-white/10 p-4">
        <Link to={`/messages?with=${c.id}`} className="btn-primary w-full">
          <MessageCircle size={17} />
          Message {c.name}
        </Link>
      </div>
    </>
  );
}

// Company details for a candidate (only available after that company shortlisted them).
export default function CompanyModal({ companyId, onClose }) {
  return (
    <Modal open={Boolean(companyId)} onClose={onClose} className="sm:max-w-xl">
      {companyId && <Details companyId={companyId} onClose={onClose} />}
    </Modal>
  );
}
