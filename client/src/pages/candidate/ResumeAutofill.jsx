import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, FileText, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, ProgressBar } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';

const FIELDS = [
  'phone', 'skills', 'degree', 'qualification', 'college', 'graduationYear', 'headline', 'location',
  'experienceYears', 'currentCompany', 'currentPost',
];
const isEmpty = (v) => v === '' || v == null || (Array.isArray(v) && v.length === 0);

// "Upload your resume and we'll fill the form": saves the resume and copies the
// details we could read into fields the candidate hasn't filled yet.
export default function ResumeAutofill({ form, setForm, onProfile }) {
  const input = useRef(null);
  const [progress, setProgress] = useState(null);
  const [filled, setFilled] = useState(null);

  const upload = async (file) => {
    if (!file) return;
    const looksPdf = file.type === 'application/pdf' || (!file.type && /\.pdf$/i.test(file.name));
    if (!looksPdf) return toast.error('Please choose a PDF file');
    if (file.size > 5 * 1024 * 1024) return toast.error('Your PDF must be under 5 MB');
    const fd = new FormData();
    fd.append('resume', file);
    setProgress(0);
    try {
      const { data } = await api.post('/candidate/resume/autofill', fd, {
        onUploadProgress: (e) => setProgress(Math.round((e.loaded * 100) / (e.total || e.loaded))),
      });
      onProfile(data.profile);
      const picked = FIELDS.filter((k) => !isEmpty(data.fields[k]) && isEmpty(form[k]));
      setForm((f) => {
        const next = { ...f };
        for (const k of picked) next[k] = Array.isArray(data.fields[k]) ? data.fields[k] : String(data.fields[k]);
        return next;
      });
      setFilled(picked.length);
      toast.success(
        picked.length
          ? `Filled ${picked.length} field${picked.length > 1 ? 's' : ''} from your resume. Please check them.`
          : "Resume saved. We couldn't read new details from it, please fill the form.",
      );
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setProgress(null);
    }
  };

  if (filled !== null) {
    return (
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 rounded-2xl bg-emerald-400/10 p-3 text-sm text-emerald-200 ring-1 ring-emerald-400/30">
        <CheckCircle2 size={18} className="shrink-0" />
        Resume uploaded{filled ? ` · ${filled} fields filled for you` : ''}. You won't need to upload it again.
      </motion.div>
    );
  }

  return (
    <div className="rounded-2xl bg-linear-to-r from-brand-500/15 to-violet-brand/15 p-4 ring-1 ring-brand-500/30">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-linear-to-br from-brand-500 to-violet-brand">
          <Sparkles size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold">Save time: fill this from your resume</p>
          <p className="text-sm text-white/55">Upload your PDF resume and we'll fill in your skills, college, experience, last company and more.</p>
        </div>
      </div>
      <input ref={input} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} aria-label="Resume PDF for auto-fill" />
      {progress === null ? (
        <Button className="btn-ghost mt-3 w-full py-2.5 text-sm" onClick={() => input.current?.click()}>
          <FileText size={16} />
          Upload resume & auto-fill
        </Button>
      ) : (
        <div className="mt-3 space-y-1.5">
          <ProgressBar value={progress} />
          <p className="text-xs text-white/50">{progress < 100 ? `Uploading… ${progress}%` : 'Reading your resume…'}</p>
        </div>
      )}
    </div>
  );
}
