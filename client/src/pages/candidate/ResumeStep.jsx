import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText, RefreshCw, UploadCloud } from 'lucide-react';
import { PdfFirstPage } from '../../components/Pdf';
import { StepBody, StepFooter } from '../../components/Onboarding';
import { Button, ProgressBar } from '../../components/ui';
import { useElementWidth } from '../../hooks/useElementWidth';
import { api, cx, errorMessage, fileUrl } from '../../lib/api';

const MAX_SIZE = 5 * 1024 * 1024;

export default function ResumeStep({ existing, onBack, onDone }) {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');
  const [previewRef, previewWidth] = useElementWidth();

  const choose = (f) => {
    setError('');
    if (!f) return;
    // Some Android pickers give PDFs an empty type, so fall back to the extension.
    const looksPdf = f.type === 'application/pdf' || (!f.type && /\.pdf$/i.test(f.name));
    if (!looksPdf) return setError('Please choose a PDF file');
    if (f.size > MAX_SIZE) return setError('Your PDF must be under 5 MB');
    setFile(f);
  };

  const submit = async () => {
    if (!file) return existing ? onDone(null) : setError('Please choose your resume');
    const fd = new FormData();
    fd.append('resume', file);
    setProgress(0);
    try {
      const { data } = await api.post('/candidate/resume', fd, {
        onUploadProgress: (e) => setProgress(Math.round((e.loaded * 100) / (e.total || e.loaded))),
      });
      onDone(data.profile);
    } catch (err) {
      setError(errorMessage(err));
      setProgress(null);
    }
  };

  const preview = file || (existing ? fileUrl(existing) : null);

  return (
    <>
      <StepBody>
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files.length > 1) return setError('Only one resume is allowed. Please drop a single PDF.');
            choose(e.dataTransfer.files[0]);
          }}
          className={cx(
            'relative flex cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl border-2 border-dashed p-8 text-center transition-colors',
            dragOver ? 'border-brand-500 bg-brand-500/10' : 'border-white/15 bg-white/[0.03] hover:border-white/30',
          )}
        >
          <input type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => choose(e.target.files?.[0])} />
          <motion.span
            animate={dragOver ? { y: -8, scale: 1.1 } : { y: [0, -6, 0] }}
            transition={dragOver ? { type: 'spring' } : { duration: 2, repeat: Infinity }}
            className="grid h-14 w-14 place-items-center rounded-2xl bg-linear-to-br from-brand-500 to-violet-brand shadow-lg shadow-brand-500/30"
          >
            <UploadCloud size={26} />
          </motion.span>
          <div>
            <p className="font-semibold">{preview ? 'Choose a different PDF' : 'Drop your resume here'}</p>
            <p className="text-sm text-white/40">or click to browse · 1 PDF only · max 5 MB</p>
          </div>
        </label>

        {preview && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4 rounded-3xl bg-white/[0.04] p-3 ring-1 ring-white/10">
            <div ref={previewRef} className="relative h-44 w-32 shrink-0 overflow-hidden rounded-xl bg-[#fff]">
              <PdfFirstPage file={preview} width={previewWidth} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
              <p className="flex items-center gap-2 font-semibold">
                <FileText size={16} className="text-brand-400" />
                <span className="truncate">{file ? file.name : 'Current resume'}</span>
              </p>
              <p className="text-sm text-white/40">{file ? `${(file.size / 1024).toFixed(0)} KB · ready to upload` : 'Already uploaded'}</p>
              {file && existing && (
                <button type="button" onClick={() => setFile(null)} className="mt-2 flex w-fit items-center gap-1.5 text-sm text-white/60 hover:text-white">
                  <RefreshCw size={14} />
                  Keep current resume
                </button>
              )}
            </div>
          </motion.div>
        )}

        {progress !== null && (
          <div className="space-y-2">
            <ProgressBar value={progress} />
            <p className="text-right text-xs text-white/50">Uploading… {progress}%</p>
          </div>
        )}
        {error && <p className="text-sm font-medium text-danger">{error}</p>}
      </StepBody>
      <StepFooter>
        <Button type="button" className="btn-ghost" onClick={onBack} disabled={progress !== null}>
          <ArrowLeft size={18} />
        </Button>
        <Button className="btn-primary flex-1" onClick={submit} loading={progress !== null}>
          {file ? 'Upload & continue' : existing ? 'Continue' : 'Upload & continue'}
        </Button>
      </StepFooter>
    </>
  );
}
