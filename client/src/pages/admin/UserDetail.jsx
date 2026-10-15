import { useEffect, useState } from 'react';
import { ArrowLeft, Ban, BadgeCheck, Coins, FileText, KeyRound, MailCheck, Pencil, Receipt, RotateCcw, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Avatar from '../../components/Avatar';
import Modal from '../../components/Modal';
import { Button, Field, Input, Spinner, StagePill, Textarea } from '../../components/ui';
import { api, cx, errorMessage, fileUrl } from '../../lib/api';
import { dateOf, lpa, Pill, useCan } from './AdminShell';

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

const when = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

// Edit the most common profile fields (support role).
function EditForm({ d, onSaved, onCancel }) {
  const u = d.user;
  const isCand = Boolean(d.profile);
  const [f, setF] = useState(
    isCand
      ? { name: u.name, headline: d.profile.headline || '', location: d.profile.location || '', phone: d.profile.phone || '', about: d.profile.about || '' }
      : { name: u.name, companyName: d.company?.companyName || '', location: d.company?.location || '', website: d.company?.website || '', phone: d.company?.phone || '', about: d.company?.about || '' },
  );
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    setBusy(true);
    try {
      const { name, ...rest } = f;
      await api.patch(`/admin/users/${u.id}/profile`, isCand ? { name, candidate: rest } : { name, company: rest });
      toast.success('Profile updated');
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-4 space-y-3 rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/[0.06]">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Person's name"><Input value={f.name} onChange={set('name')} maxLength={80} /></Field>
        {isCand ? (
          <>
            <Field label="Headline"><Input value={f.headline} onChange={set('headline')} maxLength={80} /></Field>
            <Field label="Location"><Input value={f.location} onChange={set('location')} maxLength={80} /></Field>
            <Field label="Phone"><Input value={f.phone} onChange={set('phone')} maxLength={20} /></Field>
          </>
        ) : (
          <>
            <Field label="Company name"><Input value={f.companyName} onChange={set('companyName')} maxLength={100} /></Field>
            <Field label="Location"><Input value={f.location} onChange={set('location')} maxLength={80} /></Field>
            <Field label="Website"><Input value={f.website} onChange={set('website')} maxLength={200} /></Field>
            <Field label="Phone"><Input value={f.phone} onChange={set('phone')} maxLength={20} /></Field>
          </>
        )}
      </div>
      <Field label="About"><Textarea value={f.about} onChange={set('about')} maxLength={isCand ? 600 : 1500} /></Field>
      <div className="flex justify-end gap-2">
        <button className="btn-ghost py-2 text-sm" onClick={onCancel}>Cancel</button>
        <Button className="btn-primary py-2 text-sm" loading={busy} onClick={save}>Save changes</Button>
      </div>
    </div>
  );
}

// Conversations of this account, and one conversation's messages.
function Chats({ userId }) {
  const [list, setList] = useState(null);
  const [open, setOpen] = useState(null);
  const [msgs, setMsgs] = useState(null);
  useEffect(() => {
    api.get(`/admin/users/${userId}/chats`).then(({ data }) => setList(data.chats)).catch(() => setList([]));
  }, [userId]);
  const show = (c) => {
    setOpen(c);
    setMsgs(null);
    api.get('/admin/chats', { params: { company: c.company.id, candidate: c.candidate.id } }).then(({ data }) => setMsgs(data.messages)).catch((err) => toast.error(errorMessage(err)));
  };
  const remove = async (m) => {
    if (!window.confirm('Delete this message for both people?')) return;
    try {
      await api.delete(`/admin/messages/${m.id}`);
      setMsgs((x) => x.filter((y) => y.id !== m.id));
      toast.success('Message deleted');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };
  if (!list) return <Spinner className="py-6" />;
  if (!list.length) return <p className="text-sm text-white/45">No conversations.</p>;
  if (open)
    return (
      <div className="rounded-2xl bg-white/[0.03] p-3 ring-1 ring-white/[0.06]">
        <button onClick={() => setOpen(null)} className="mb-2 flex items-center gap-1 text-sm font-semibold text-white/60 hover:text-white">
          <ArrowLeft size={15} /> {open.company.name} ↔ {open.candidate.name}
        </button>
        {!msgs ? (
          <Spinner className="py-6" />
        ) : (
          <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
            {msgs.map((m) => (
              <div key={m.id} className={cx('group flex items-start gap-2', m.fromCandidate ? '' : 'flex-row-reverse')}>
                <div className={cx('max-w-[80%] rounded-2xl px-3 py-2 text-sm', m.fromCandidate ? 'bg-white/[0.06]' : 'bg-brand-500/10')}>
                  <p className="text-[11px] font-bold text-white/50">{m.sender} · {when(m.at)}</p>
                  <p className="whitespace-pre-wrap">{m.text}</p>
                </div>
                <button onClick={() => remove(m)} className="mt-1 hidden rounded-lg p-1 text-danger hover:bg-red-500/10 group-hover:block" aria-label="Delete message"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  return (
    <ul className="space-y-1.5 text-sm">
      {list.map((c) => (
        <li key={c.company.id + c.candidate.id}>
          <button onClick={() => show(c)} className="flex w-full items-center justify-between gap-2 rounded-xl bg-white/[0.04] px-3 py-2 text-left hover:bg-white/[0.07]">
            <span className="min-w-0 truncate"><b>{c.company.name} ↔ {c.candidate.name}</b> <span className="text-white/50">· {c.last}</span></span>
            <span className="shrink-0 text-xs text-white/45">{c.count} msgs</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

const H = ({ children }) => <h3 className="mb-2 mt-6 text-[11px] font-bold uppercase tracking-[0.14em] text-white/45">{children}</h3>;

// Full view of one account with admin actions. `id` = user id (owner id for companies).
export default function UserDetail({ id, onClose, onChanged }) {
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState('');
  const [credits, setCredits] = useState('');
  const [editing, setEditing] = useState(false);
  const [manual, setManual] = useState({ amount: '', swipes: '', reference: '', note: '' });
  const can = useCan();

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
    setEditing(false);
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
  const tempPassword = async () => {
    if (!window.confirm(`Reset ${u.name}'s password? They will be logged out and get a new password by email.`)) return;
    setBusy('pw');
    try {
      const { data } = await api.post(`/admin/users/${u.id}/temp-password`);
      window.prompt(data.emailed ? 'New password (also emailed to them). Copy it if you need to share it:' : 'Email is not set up, so share this new password with them yourself:', data.password);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy('');
    }
  };
  const addManual = () =>
    act(
      'manual',
      () => api.post('/admin/payments/manual', { companyId, amount: Number(manual.amount), swipes: Number(manual.swipes), reference: manual.reference, note: manual.note }),
      'Payment recorded and swipes added',
    ).then(() => setManual({ amount: '', swipes: '', reference: '', note: '' }));
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
              {!u.isAdmin && can('users.manage') && (
                <Button className="btn-ghost py-2 text-sm" onClick={suspend} loading={busy === 'suspend'}>
                  {u.suspended ? <RotateCcw size={15} /> : <Ban size={15} />}
                  {u.suspended ? 'Reinstate' : 'Suspend'}
                </Button>
              )}
              {!u.emailVerified && can('users.edit') && (
                <Button className="btn-ghost py-2 text-sm" onClick={() => act('email', () => api.patch(`/admin/users/${u.id}`, { emailVerified: true }), 'Email marked verified')} loading={busy === 'email'}>
                  <MailCheck size={15} /> Mark email verified
                </Button>
              )}
              {d.company && can('verify') && (
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
              {can('users.edit') && (d.profile || d.company) && (
                <Button className="btn-ghost py-2 text-sm" onClick={() => setEditing((e) => !e)}>
                  <Pencil size={15} /> Edit profile
                </Button>
              )}
              {!u.isAdmin && can('users.edit') && (
                <Button className="btn-ghost py-2 text-sm" onClick={tempPassword} loading={busy === 'pw'}>
                  <KeyRound size={15} /> Reset password
                </Button>
              )}
              {!u.isAdmin && can('users.delete') && (
                <Button className="btn-ghost py-2 text-sm text-danger" onClick={remove} loading={busy === 'delete'}>
                  <Trash2 size={15} /> Delete account
                </Button>
              )}
            </div>

            {editing && <EditForm d={d} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); load(); onChanged?.(); }} />}

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
                {can('chats') && (
                  <>
                    <H>Chats</H>
                    <Chats userId={u.id} />
                  </>
                )}
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
                <div className={cx('flex flex-wrap items-center gap-2 rounded-2xl bg-white/[0.04] p-3', !can('credits') && 'pointer-events-none opacity-60')}>
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
                {can('credits') && (
                  <>
                    <H>Record a manual payment</H>
                    <p className="mb-2 text-xs text-white/50">For money received by bank transfer or UPI. Adds the swipes straight away.</p>
                    <div className="grid gap-2 sm:grid-cols-4">
                      <Input type="number" min="0" value={manual.amount} onChange={(e) => setManual({ ...manual, amount: e.target.value })} placeholder="Amount ₹" aria-label="Amount received" />
                      <Input type="number" min="1" value={manual.swipes} onChange={(e) => setManual({ ...manual, swipes: e.target.value })} placeholder="Swipes" aria-label="Swipes to add" />
                      <Input value={manual.reference} onChange={(e) => setManual({ ...manual, reference: e.target.value })} placeholder="UPI / bank ref." aria-label="Reference" />
                      <Button className="btn-primary text-sm" onClick={addManual} loading={busy === 'manual'} disabled={!manual.amount || !manual.swipes}>
                        <Receipt size={15} /> Record
                      </Button>
                    </div>
                  </>
                )}
                {can('chats') && (
                  <>
                    <H>Chats</H>
                    <Chats userId={companyId} />
                  </>
                )}
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
