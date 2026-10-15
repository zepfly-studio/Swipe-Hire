import { useEffect, useState } from 'react';
import { Ban, BadgeCheck, Coins, FileText, MailCheck, RotateCcw, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Avatar from '../../components/Avatar';
import Modal from '../../components/Modal';
import { Button, Spinner, StagePill } from '../../components/ui';
import { api, errorMessage, fileUrl } from '../../lib/api';
import { dateOf, lpa, Pill } from './AdminShell';

function Row({ label, value }) {
  if (value == null || value === '' || (Array.isArray(value) && !value.length)) return null;
  return (
    <div className="rounded-xl bg-white/[0.04] px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/45">{label}</p>
      <p className="mt-0.5 break-words text-sm font-semibold">{Array.isArray(value) ? value.join(', ') : value}</p>
    </div>
  );
}

function Counts({ items }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {items.map(([label, n]) => (
        <div key={label} className="rounded-xl bg-white/[0.04] px-2 py-2.5 text-center">
          <p className="text-lg font-extrabold tabular-nums">{n ?? 0}</p>
          <p className="text-[10px] font-semibold uppercase text-white/45">{label}</p>
        </div>
      ))}
    </div>
  );
}

const H = ({ children }) => <h3 className="mb-2 mt-6 text-[11px] font-bold uppercase tracking-[0.14em] text-white/45">{children}</h3>;

// Full view of one account with admin actions. `id` = user id (owner id for companies).
export default function UserDetail({ id, onClose, onChanged }) {
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState('');
  const [credits, setCredits] = useState('');

  const load = () => {
    setD(null);
    api
      .get(`/admin/users/${id}`)
      .then(({ data }) => setD(data))
      .catch((err) => {
        toast.error(errorMessage(err));
        onClose();
      });
  };
  useEffect(() => {
    if (id) load();
    setCredits('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const act = async (key, fn, ok) => {
    setBusy(key);
    try {
      await fn();
      toast.success(ok);
      onChanged?.();
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy('');
    }
  };

  const u = d?.user;
  const companyId = d?.company ? d.owner?.id || u?.id : null;

  const suspend = () => {
    const next = !u.suspended;
    const who = u.role === 'company' ? `${u.name} and their whole team` : u.name;
    if (next && !window.confirm(`Suspend ${who}? They will be logged out and cannot log in until reinstated.`)) return;
    act('suspend', () => api.patch(`/admin/users/${u.id}`, { suspended: next }), next ? 'Account suspended' : 'Account reinstated');
  };
  const remove = async () => {
    const what =
      u.role === 'candidate'
        ? 'their profile, resume, video, shortlists, chats, tasks and interviews'
        : u.role === 'company'
          ? 'the whole company: team logins, jobs, pipeline, chats, tasks and interviews (payment records are kept)'
          : 'this recruiter login';
    const typed = window.prompt(`Permanently delete ${u.name} (${u.email})?\nThis removes ${what}. It cannot be undone.\n\nType DELETE to confirm.`);
    if (typed !== 'DELETE') return;
    setBusy('delete');
    try {
      await api.delete(`/admin/users/${u.id}`);
      toast.success('Account deleted');
      onChanged?.();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy('');
    }
  };
  const addCredits = (sign) => {
    const n = Number.parseInt(credits, 10);
    if (!n || n < 1) return toast.error('Enter a number of swipes');
    act('credits', () => api.patch(`/admin/companies/${companyId}`, { swipesDelta: sign * n }), `${sign > 0 ? 'Added' : 'Removed'} ${n} swipes`).then(() => setCredits(''));
  };
  const setVerified = (verification) => act('verify', () => api.patch(`/admin/companies/${companyId}`, { verification }), verification === 'verified' ? 'Company verified' : 'Badge removed');

  return (
    <Modal open={Boolean(id)} onClose={onClose} className="sm:max-w-3xl">
      {!d ? (
        <Spinner className="py-24" />
      ) : (
        <>
          <div className="flex items-start gap-4 border-b border-white/10 p-5">
            <Avatar src={d.company?.logoUrl || u.avatarUrl} name={d.company?.companyName || u.name} size="lg" company={Boolean(d.company)} />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xl font-extrabold">{d.company?.companyName || u.name}</h2>
              <p className="truncate text-sm text-white/55">
                {d.company ? `${u.name} · ` : ''}
                {u.email}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Pill tone={u.role === 'candidate' ? 'green' : 'blue'}>{u.role}</Pill>
                {u.suspended && <Pill tone="red">Suspended</Pill>}
                {!u.emailVerified && <Pill tone="amber">Email not verified</Pill>}
                {d.company?.verification?.status === 'verified' && <Pill tone="blue">Verified company</Pill>}
                {d.company?.verification?.status === 'pending' && <Pill tone="amber">Verification pending</Pill>}
                {d.profile && (d.profile.step >= 3 ? <Pill tone={d.profile.openToWork === false ? 'gray' : 'green'}>{d.profile.openToWork === false ? 'Hidden' : 'Live'}</Pill> : <Pill tone="amber">Profile step {d.profile.step + 1} of 4</Pill>)}
                <Pill>Joined {dateOf(u.createdAt)}</Pill>
              </div>
            </div>
            <button onClick={onClose} className="btn-ghost p-2" aria-label="Close">
              <X size={18} />
            </button>
          </div>

          <div className="no-scrollbar flex-1 overflow-y-auto p-5">
            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {!u.isAdmin && (
                <Button className="btn-ghost py-2 text-sm" onClick={suspend} loading={busy === 'suspend'}>
                  {u.suspended ? <RotateCcw size={15} /> : <Ban size={15} />}
                  {u.suspended ? 'Reinstate' : 'Suspend'}
                </Button>
              )}
              {!u.emailVerified && (
                <Button className="btn-ghost py-2 text-sm" onClick={() => act('email', () => api.patch(`/admin/users/${u.id}`, { emailVerified: true }), 'Email marked verified')} loading={busy === 'email'}>
                  <MailCheck size={15} /> Mark email verified
                </Button>
              )}
              {d.company && (
                d.company.verification?.status === 'verified' ? (
                  <Button className="btn-ghost py-2 text-sm" onClick={() => setVerified('none')} loading={busy === 'verify'}>
                    <BadgeCheck size={15} /> Remove verified badge
                  </Button>
                ) : (
                  <Button className="btn-ghost py-2 text-sm" onClick={() => setVerified('verified')} loading={busy === 'verify'}>
                    <BadgeCheck size={15} /> Mark as verified
                  </Button>
                )
              )}
              {!u.isAdmin && (
                <Button className="btn-ghost py-2 text-sm text-danger" onClick={remove} loading={busy === 'delete'}>
                  <Trash2 size={15} /> Delete account
                </Button>
              )}
            </div>

            {d.profile && (
              <>
                <H>Activity</H>
                <Counts items={[['Views', d.counts.views], ['Shortlists', d.counts.shortlists], ['Wishlisted', d.counts.wishlisted], ['Messages', d.counts.messages], ['Interviews', d.counts.interviews], ['Tasks', d.counts.tasks]]} />
                <H>Profile</H>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Row label="Headline" value={d.profile.headline} />
                  <Row label="Phone" value={d.profile.phone} />
                  <Row label="Location" value={d.profile.location} />
                  <Row label="Experience" value={d.profile.experienceYears != null ? (d.profile.experienceYears ? `${d.profile.experienceYears} yrs` : 'Fresher') : null} />
                  <Row label="Expected salary" value={d.profile.expectedSalary != null ? `${lpa(d.profile.expectedSalary, d.profile.expectedSalaryMax)}${d.profile.salaryNegotiable ? ' · negotiable' : ''}` : null} />
                  <Row label="Notice" value={d.profile.noticePeriod} />
                  <Row label="Current company" value={[d.profile.currentPost, d.profile.currentCompany].filter(Boolean).join(' at ')} />
                  <Row label="Education" value={[d.profile.qualification, d.profile.degree, d.profile.college, d.profile.graduationYear].filter(Boolean).join(' · ')} />
                  <Row label="Age / gender" value={[d.profile.age, d.profile.gender].filter(Boolean).join(' · ')} />
                  <Row label="Preferred cities" value={d.profile.preferredLocations} />
                  <Row label="Last active" value={dateOf(d.profile.activeAt)} />
                </div>
                <div className="mt-2">
                  <Row label="Skills" value={d.profile.skills} />
                </div>
                {d.profile.about && (
                  <div className="mt-2">
                    <Row label="About" value={d.profile.about} />
                  </div>
                )}
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {d.profile.resumeUrl && (
                    <a href={fileUrl(d.profile.resumeUrl)} target="_blank" rel="noreferrer" className="btn-ghost text-sm">
                      <FileText size={16} /> Open resume
                    </a>
                  )}
                  {d.profile.videoUrl && <video src={fileUrl(d.profile.videoUrl)} controls className="max-h-56 w-full rounded-xl bg-black" />}
                </div>
                <H>Shortlisted by ({d.shortlistedBy.length})</H>
                {d.shortlistedBy.length ? (
                  <ul className="space-y-1.5">
                    {d.shortlistedBy.map((s, i) => (
                      <li key={i} className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.04] px-3 py-2 text-sm">
                        <span className="min-w-0 truncate">
                          <b>{s.companyName}</b> <span className="text-white/50">· {s.job || 'Job removed'}</span>
                        </span>
                        <StagePill stage={s.stage} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-white/45">No company has shortlisted this candidate yet.</p>
                )}
              </>
            )}

            {d.company && (
              <>
                <H>Activity</H>
                <Counts items={[['Swipes', d.counts.swipes], ['Shortlists', d.counts.shortlists], ['Hired', d.counts.hired], ['Messages', d.counts.messages], ['Interviews', d.counts.interviews], ['Tasks', d.counts.tasks]]} />
                <H>Swipe credits</H>
                <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/[0.04] p-3">
                  <p className="mr-auto text-sm">
                    <Coins size={15} className="mr-1 inline text-amber-300" />
                    <b className="tabular-nums">{d.company.swipesLeft}</b> left · {d.company.swipesPurchased || 0} bought in total
                  </p>
                  <input type="number" min="1" value={credits} onChange={(e) => setCredits(e.target.value)} placeholder="Swipes" className="input w-28 py-2 text-sm" aria-label="Number of swipes" />
                  <Button className="btn-primary py-2 text-sm" onClick={() => addCredits(1)} loading={busy === 'credits'}>
                    Add
                  </Button>
                  <Button className="btn-ghost py-2 text-sm" onClick={() => addCredits(-1)} disabled={busy === 'credits'}>
                    Remove
                  </Button>
                </div>
                <H>Company</H>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Row label="Industry" value={d.company.industry} />
                  <Row label="Size" value={d.company.companySize} />
                  <Row label="Location" value={d.company.location} />
                  <Row label="Website" value={d.company.website} />
                  <Row label="LinkedIn" value={d.company.linkedin} />
                  <Row label="Phone" value={d.company.phone} />
                  <Row label="Contact email" value={d.company.contactEmail} />
                  <Row label="Founded" value={d.company.foundedYear} />
                  <Row label="GSTIN" value={d.company.gstin} />
                </div>
                {d.company.about && (
                  <div className="mt-2">
                    <Row label="About" value={d.company.about} />
                  </div>
                )}
                <H>Team ({1 + d.team.length})</H>
                <ul className="space-y-1.5 text-sm">
                  {d.owner && (
                    <li className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2">
                      <span className="truncate">
                        <b>{d.owner.name}</b> <span className="text-white/50">· {d.owner.email}</span>
                      </span>
                      <Pill tone="amber">Owner</Pill>
                    </li>
                  )}
                  {d.team.map((t) => (
                    <li key={t.id} className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2">
                      <span className="truncate">
                        <b>{t.name}</b> <span className="text-white/50">· {t.email}</span>
                      </span>
                      {t.suspended ? <Pill tone="red">Suspended</Pill> : <Pill>Recruiter</Pill>}
                    </li>
                  ))}
                </ul>
                <H>Jobs ({d.jobs.length})</H>
                <ul className="space-y-1.5 text-sm">
                  {d.jobs.map((j) => (
                    <li key={j.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.04] px-3 py-2">
                      <span className="min-w-0 truncate">
                        <b>{j.title}</b> <span className="text-white/50">· {j.jobLocation || '–'} · {lpa(j.salaryMin, j.salaryMax)}</span>
                      </span>
                      <Pill tone={j.status === 'open' ? 'green' : j.status === 'paused' ? 'amber' : 'gray'}>{j.status}</Pill>
                    </li>
                  ))}
                  {!d.jobs.length && <p className="text-white/45">No jobs yet.</p>}
                </ul>
                <H>Payments ({d.payments.length})</H>
                <ul className="space-y-1.5 text-sm">
                  {d.payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.04] px-3 py-2">
                      <span className="truncate">
                        ₹{p.amount} · {p.swipes} swipes <span className="text-white/50">· {dateOf(p.createdAt)}</span>
                      </span>
                      <span className="flex gap-1">
                        {p.mode === 'demo' && <Pill tone="amber">demo</Pill>}
                        <Pill tone={p.status === 'paid' ? 'green' : 'gray'}>{p.status}</Pill>
                      </span>
                    </li>
                  ))}
                  {!d.payments.length && <p className="text-white/45">No payments yet.</p>}
                </ul>
              </>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
