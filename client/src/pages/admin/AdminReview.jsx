import { useEffect, useState } from 'react';
import { FileText, Video, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Illustration from '../../components/Illustration';
import { Spinner } from '../../components/ui';
import { api, cx, errorMessage, fileUrl } from '../../lib/api';
import AdminShell, { dateOf, Pager, Pill, useLive } from './AdminShell';
import UserDetail from './UserDetail';

const TABS = [['live', 'Latest uploads'], ['removed', 'Removed']];

// Resumes and intro videos go live as soon as candidates upload them. Admins watch the latest
// uploads here and remove anything fake or inappropriate (the candidate is asked to upload again).
export default function AdminReview() {
  const [status, setStatus] = useState('live');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);

  const load = (quiet) =>
    api
      .get('/admin/review', { params: { status, page } })
      .then(({ data }) => setData(data))
      .catch((err) => quiet || toast.error(errorMessage(err)));
  useLive(() => load(true));
  useEffect(() => {
    setData(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page]);

  const remove = async (c, action) => {
    const what = action === 'reject-video' ? 'intro video' : 'resume';
    const note = window.prompt(`Why remove ${c.name}'s ${what}? The candidate sees this note and is asked to upload a new one.`, '');
    if (note === null) return;
    try {
      await api.post(`/admin/review/${c.id}`, { action, note });
      toast.success(`${what[0].toUpperCase() + what.slice(1)} removed; the candidate was told`);
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <AdminShell title="Uploads" subtitle="Every resume and intro video is live as soon as it is uploaded. Watch the newest ones here and remove anything fake or inappropriate.">
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map(([v, l]) => (
          <button key={v} onClick={() => { setStatus(v); setPage(1); }} className={cx('rounded-full px-3.5 py-1.5 text-sm font-semibold', status === v ? 'bg-brand-500 text-[#fff]' : 'bg-white/[0.06] text-white/60 hover:text-white')}>
            {l}
          </button>
        ))}
      </div>
      {!data ? (
        <Spinner className="py-20" />
      ) : !data.candidates.length ? (
        <div className="glass rounded-3xl p-10 text-center">
          <Illustration name="record-video" />
          <p className="mt-4 text-white/55">{status === 'live' ? 'No uploads yet.' : 'Nothing has been removed.'}</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.candidates.map((c) => (
              <div key={c.id} className="glass overflow-hidden rounded-3xl">
                {c.videoUrl ? (
                  <video src={fileUrl(c.videoUrl)} controls preload="metadata" className="aspect-video w-full bg-black object-contain" />
                ) : (
                  <div className="grid aspect-video place-items-center bg-white/[0.04] text-sm text-white/45">
                    <span className="flex items-center gap-2"><Video size={18} /> No video</span>
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start gap-2">
                    <button onClick={() => setOpen(c.id)} className="min-w-0 flex-1 text-left">
                      <p className="truncate font-bold hover:underline">{c.name}</p>
                      <p className="truncate text-xs text-white/50">
                        {[c.headline, c.location].filter(Boolean).join(' · ')} · uploaded {dateOf(c.uploadedAt)}
                      </p>
                    </button>
                    {status === 'removed' ? <Pill tone="red">Removed</Pill> : <Pill tone="green">Live</Pill>}
                  </div>
                  {c.review?.note && <p className="mt-2 text-xs text-white/55">Reason: {c.review.note}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {c.resumeUrl && (
                      <a href={fileUrl(c.resumeUrl)} target="_blank" rel="noreferrer" className="btn-ghost px-3 py-1.5 text-sm">
                        <FileText size={15} /> Resume
                      </a>
                    )}
                    {status === 'live' && c.videoUrl && (
                      <button className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-sm font-semibold text-danger hover:bg-red-500/10" onClick={() => remove(c, 'reject-video')}>
                        <X size={15} /> Remove video
                      </button>
                    )}
                    {status === 'live' && c.resumeUrl && (
                      <button className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-sm font-semibold text-danger hover:bg-red-500/10" onClick={() => remove(c, 'reject-resume')}>
                        <X size={15} /> Remove resume
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Pager page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
        </>
      )}
      <UserDetail id={open} onClose={() => setOpen(null)} onChanged={load} />
    </AdminShell>
  );
}
