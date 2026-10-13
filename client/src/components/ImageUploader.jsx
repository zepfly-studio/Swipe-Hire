import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Avatar from './Avatar';
import { Button, ProgressBar } from './ui';
import { api, errorMessage } from '../lib/api';

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Choose / replace / remove a profile photo or company logo.
// `endpoint` receives the file as "image"; `onSaved` gets the API response.
export default function ImageUploader({ src, name, endpoint, onSaved, company = false, label }) {
  const input = useRef(null);
  const [progress, setProgress] = useState(null);
  const [removing, setRemoving] = useState(false);

  const upload = async (file) => {
    if (!file) return;
    if (!TYPES.includes(file.type)) return toast.error('Please choose a JPG, PNG or WebP image');
    if (file.size > 3 * 1024 * 1024) return toast.error('Image must be under 3 MB');
    const fd = new FormData();
    fd.append('image', file);
    setProgress(0);
    try {
      const { data } = await api.post(endpoint, fd, {
        onUploadProgress: (e) => setProgress(Math.round((e.loaded * 100) / (e.total || e.loaded))),
      });
      onSaved(data);
      toast.success(company ? 'Logo updated' : 'Photo updated');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setProgress(null);
      if (input.current) input.current.value = '';
    }
  };

  const remove = async () => {
    setRemoving(true);
    try {
      const { data } = await api.delete(endpoint);
      onSaved(data);
      toast.success(company ? 'Logo removed' : 'Photo removed');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="flex items-center gap-5">
      <motion.button
        type="button"
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => input.current?.click()}
        className="group relative shrink-0"
        aria-label={company ? 'Change company logo' : 'Change profile photo'}
      >
        <Avatar src={src} name={name} size="xl" company={company} />
        <span className={`absolute inset-0 grid place-items-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 ${company ? 'rounded-2xl' : 'rounded-full'}`}>
          <Camera size={22} className="text-[#fff]" />
        </span>
      </motion.button>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="font-semibold">{label}</p>
        <p className="text-xs text-white/45">JPG, PNG or WebP · up to 3 MB{company ? ' · square works best' : ''}</p>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} aria-label={label} />
        {progress !== null ? (
          <ProgressBar value={progress} />
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="btn-ghost py-2 text-sm" onClick={() => input.current?.click()}>
              <Camera size={15} />
              {src ? 'Change' : 'Upload'}
            </Button>
            {src && (
              <Button type="button" className="btn-ghost py-2 text-sm" onClick={remove} loading={removing}>
                <Trash2 size={15} />
                Remove
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
