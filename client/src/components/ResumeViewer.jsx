import { motion } from 'framer-motion';
import { ExternalLink, FileText, X } from 'lucide-react';
import Modal from './Modal';
import { PdfAllPages } from './Pdf';
import { useElementWidth } from '../hooks/useElementWidth';
import { fileUrl } from '../lib/api';

function ResumeBody({ url }) {
  const [ref, width] = useElementWidth();
  return (
    <div ref={ref} className="no-scrollbar flex-1 overflow-y-auto bg-ink-950/60 p-3 sm:p-5">
      <PdfAllPages file={fileUrl(url)} width={Math.min(width, 820)} />
    </div>
  );
}

export default function ResumeViewer({ url, name, onClose }) {
  return (
    <Modal open={Boolean(url)} onClose={onClose} className="h-[94dvh] sm:max-w-3xl">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500/15 text-brand-400">
          <FileText size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{name ? `${name}'s resume` : 'Resume'}</p>
          <p className="text-xs text-white/40">Scroll to read all pages</p>
        </div>
        <a href={fileUrl(url)} target="_blank" rel="noreferrer" className="btn-ghost px-3 py-2 text-sm" title="Open in new tab">
          <ExternalLink size={16} />
          <span className="hidden sm:inline">Open</span>
        </a>
        <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="btn-ghost px-3 py-2" aria-label="Close">
          <X size={18} />
        </motion.button>
      </div>
      {url && <ResumeBody url={url} />}
    </Modal>
  );
}
