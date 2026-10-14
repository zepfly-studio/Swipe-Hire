import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, FileVideo, RotateCcw, Upload } from 'lucide-react';
import Illustration from '../../components/Illustration';
import { StepBody, StepFooter } from '../../components/Onboarding';
import { IntroVideo } from '../../components/CandidateDetails';
import { Button, ChipSelect, ProgressBar } from '../../components/ui';
import { api, cx, errorMessage } from '../../lib/api';

const MIN_SEC = 5;
const MAX_SEC = 15;
const MAX_SIZE = 40 * 1024 * 1024;
const MIME_TYPES = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];

function Recorder({ onClip, onBusyChange }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const mounted = useRef(true);
  const startedAt = useRef(0);
  const [status, setStatus] = useState('idle'); // idle | starting | ready | countdown | recording | error
  const [count, setCount] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  // Leaving mid-recording must turn the camera off and must not produce a clip.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const rec = recorderRef.current;
      if (rec?.state === 'recording') {
        rec.onstop = null;
        rec.stop();
      }
      stopStream();
    };
  }, []);

  useEffect(() => {
    onBusyChange?.(status === 'countdown' || status === 'recording');
  }, [status, onBusyChange]);

  useEffect(() => {
    if (videoRef.current && streamRef.current && videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [status]);

  const startCamera = async () => {
    setError('');
    setStatus('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 } },
        audio: true,
      });
      // The user may have left while the permission prompt was open.
      if (!mounted.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      setStatus('ready');
    } catch {
      setError('We could not access your camera or microphone. Please allow access, or upload a video instead.');
      setStatus('error');
    }
  };

  const startRecording = () => {
    const mimeType = MIME_TYPES.find((t) => window.MediaRecorder?.isTypeSupported?.(t));
    const recorder = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined);
    const chunks = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = () => {
      stopStream();
      const duration = (Date.now() - startedAt.current) / 1000;
      if (duration < MIN_SEC - 0.5) {
        setError(`Please record at least ${MIN_SEC} seconds.`);
        return;
      }
      const type = (recorder.mimeType || 'video/webm').split(';')[0];
      const blob = new Blob(chunks, { type });
      const file = new File([blob], `intro.${type.includes('mp4') ? 'mp4' : 'webm'}`, { type });
      onClip({ file, url: URL.createObjectURL(blob), duration });
    };
    recorderRef.current = recorder;
    startedAt.current = Date.now();
    recorder.start(250);
    setElapsed(0);
    setStatus('recording');
  };

  // 3-2-1 countdown before recording
  useEffect(() => {
    if (status !== 'countdown') return;
    if (count === 0) {
      startRecording();
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, count]);

  useEffect(() => {
    if (status !== 'recording') return;
    const t = setInterval(() => {
      const secs = (Date.now() - startedAt.current) / 1000;
      setElapsed(secs);
      if (secs >= MAX_SEC) stop();
    }, 100);
    return () => clearInterval(t);
  }, [status]);

  const stop = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    setStatus('idle');
  };

  const canStop = elapsed >= MIN_SEC;
  const secs = Math.min(Math.floor(elapsed), MAX_SEC);
  const live = ['ready', 'countdown', 'recording'].includes(status);
  const R = 34;
  const C = 2 * Math.PI * R;

  const onMainButton = () => {
    if (status === 'ready') {
      setCount(3);
      setStatus('countdown');
    } else if (status === 'recording' && canStop) {
      stop();
    }
  };

  // Everything is overlaid on the camera so the controls stay visible on short screens.
  return (
    <div className="relative mx-auto aspect-[3/4] h-[min(44dvh,440px)] max-w-full overflow-hidden rounded-3xl bg-ink-950 ring-1 ring-white/10">
      {live ? (
        <video ref={videoRef} autoPlay muted playsInline className="h-full w-full -scale-x-100 object-cover" />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
          <Illustration name="record-video" size="w-44 sm:w-48" />
          {error ? (
            <p className="text-sm text-danger">{error}</p>
          ) : (
            <p className="text-sm text-white/50">Say your name, your role and why a company should hire you.</p>
          )}
          <Button onClick={startCamera} loading={status === 'starting'} className="btn-primary py-2.5 text-sm">
            Turn on camera
          </Button>
        </div>
      )}

      {status === 'recording' && (
        <>
          <div className="absolute inset-x-0 top-0 h-1.5 bg-white/15">
            <div
              className="h-full bg-linear-to-r from-brand-500 to-violet-brand transition-[width] duration-100 ease-linear"
              style={{ width: `${(Math.min(elapsed, MAX_SEC) / MAX_SEC) * 100}%` }}
            />
            {/* minimum length marker */}
            <span className="absolute top-0 h-full w-0.5 bg-white/80" style={{ left: `${(MIN_SEC / MAX_SEC) * 100}%` }} />
          </div>
          <div className="absolute inset-x-0 top-4 flex justify-center">
            <div className="flex items-center gap-2 rounded-full bg-black/65 px-4 py-1.5 backdrop-blur">
              <motion.span
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="h-2.5 w-2.5 rounded-full bg-red-500"
              />
              <span className="relative inline-flex h-8 min-w-[2ch] items-center justify-center overflow-hidden">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={secs}
                    initial={{ y: 16, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -16, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="text-2xl font-black tabular-nums"
                  >
                    {secs}
                  </motion.span>
                </AnimatePresence>
              </span>
              <span className="text-sm font-semibold text-white/60">/ {MAX_SEC} sec</span>
            </div>
          </div>
        </>
      )}

      <AnimatePresence>
        {status === 'countdown' && count > 0 && (
          <motion.span
            key={count}
            initial={{ scale: 2.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            className="absolute inset-0 grid place-items-center bg-black/30 text-8xl font-black text-white drop-shadow-2xl"
          >
            {count}
          </motion.span>
        )}
      </AnimatePresence>

      {(status === 'ready' || status === 'recording') && (
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1.5 bg-linear-to-t from-black/85 via-black/40 to-transparent pb-4 pt-12">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onMainButton}
            disabled={status === 'recording' && !canStop}
            className="relative grid h-[76px] w-[76px] place-items-center"
            aria-label={status === 'ready' ? 'Start recording' : 'Stop recording'}
          >
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r={R} stroke="rgb(255 255 255 / 0.35)" strokeWidth="5" fill="none" />
              <circle
                cx="40"
                cy="40"
                r={R}
                stroke="#ff4d6d"
                strokeWidth="5"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={C - (C * Math.min(elapsed, MAX_SEC)) / MAX_SEC}
                className="transition-[stroke-dashoffset] duration-100 ease-linear"
              />
            </svg>
            {status === 'ready' ? (
              <span className="h-12 w-12 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
            ) : canStop ? (
              <motion.span initial={{ scale: 0.6 }} animate={{ scale: 1 }} className="h-7 w-7 rounded-md bg-red-500" />
            ) : (
              <motion.span
                animate={{ scale: [1, 0.85, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="h-10 w-10 rounded-full bg-red-500/80"
              />
            )}
          </motion.button>
          <p className="text-xs font-semibold text-white/85 drop-shadow">
            {status === 'ready'
              ? `Tap to start · ${MIN_SEC}–${MAX_SEC} seconds`
              : canStop
                ? `Tap to stop · stops by itself at ${MAX_SEC} sec`
                : `Keep talking… ${Math.ceil(MIN_SEC - elapsed)} sec more`}
          </p>
        </div>
      )}
    </div>
  );
}

function FilePicker({ onClip }) {
  const [error, setError] = useState('');

  const choose = (file) => {
    setError('');
    if (!file) return;
    if (!file.type.startsWith('video/')) return setError('Please choose a video file');
    if (!['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type)) return setError('Please choose an MP4, WebM or MOV video');
    if (file.size > MAX_SIZE) return setError('Video must be under 40 MB');
    const url = URL.createObjectURL(file);
    const probe = document.createElement('video');
    probe.preload = 'metadata';
    probe.onloadedmetadata = () => {
      const d = probe.duration;
      if (Number.isFinite(d) && (d < MIN_SEC - 0.5 || d > MAX_SEC + 0.5)) {
        URL.revokeObjectURL(url);
        setError(`Your video is ${d.toFixed(0)} seconds. Please upload a ${MIN_SEC}–${MAX_SEC} second video.`);
        return;
      }
      onClip({ file, url, duration: d });
    };
    probe.onerror = () => onClip({ file, url, duration: null });
    probe.src = url;
  };

  return (
    <label className="flex cursor-pointer flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-white/15 bg-white/[0.03] p-10 text-center transition-colors hover:border-white/30">
      <input type="file" accept="video/*" className="sr-only" onChange={(e) => choose(e.target.files?.[0])} />
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-linear-to-br from-brand-500 to-violet-brand">
        <FileVideo size={26} />
      </span>
      <p className="font-semibold">Choose a video</p>
      <p className="text-sm text-white/40">
        {MIN_SEC}–{MAX_SEC} seconds · MP4 / WebM / MOV · max 40 MB
      </p>
      {error && <p className="text-sm font-medium text-danger">{error}</p>}
    </label>
  );
}

export default function VideoStep({ existing, onBack, onDone }) {
  const [mode, setMode] = useState('record');
  const [clip, setClip] = useState(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');
  const [recording, setRecording] = useState(false);

  // Free the in-memory preview when the clip changes or the step closes.
  useEffect(() => {
    if (!clip) return;
    return () => URL.revokeObjectURL(clip.url);
  }, [clip]);

  const retake = () => {
    setClip(null);
    setError('');
  };

  const submit = async () => {
    if (!clip) return existing ? onDone(null) : setError('Please record or upload your intro video');
    const fd = new FormData();
    fd.append('video', clip.file);
    setProgress(0);
    try {
      const { data } = await api.post('/candidate/video', fd, {
        onUploadProgress: (e) => setProgress(Math.round((e.loaded * 100) / (e.total || e.loaded))),
      });
      onDone(data.profile);
    } catch (err) {
      setError(errorMessage(err));
      setProgress(null);
    }
  };

  return (
    <>
      <StepBody>
        {clip ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-3">
            <video src={clip.url} controls playsInline className="mx-auto max-h-[50dvh] w-full rounded-3xl bg-black object-contain" />
            <div className="flex items-center justify-between text-sm text-white/50">
              <span>{clip.duration ? `${clip.duration.toFixed(1)} seconds` : 'Video ready'}</span>
              <button onClick={retake} disabled={progress !== null} className="flex items-center gap-1.5 hover:text-white">
                <RotateCcw size={14} />
                Retake
              </button>
            </div>
          </motion.div>
        ) : (
          <>
            <div className={cx('flex justify-center transition-opacity', recording && 'pointer-events-none opacity-0')}>
              <ChipSelect
                layoutId="video-mode"
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'record', label: 'Record now' },
                  { value: 'upload', label: 'Upload video' },
                ]}
              />
            </div>
            {mode === 'record' ? <Recorder onClip={setClip} onBusyChange={setRecording} /> : <FilePicker onClip={setClip} />}
            {existing && (
              <details className="rounded-2xl bg-white/[0.04] p-3 text-sm text-white/60">
                <summary className="cursor-pointer">Your current intro video</summary>
                <IntroVideo url={existing} className="mt-3" />
              </details>
            )}
          </>
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
        <Button className="btn-ghost" onClick={onBack} disabled={progress !== null || recording}>
          <ArrowLeft size={18} />
        </Button>
        <Button className="btn-primary flex-1" onClick={submit} loading={progress !== null} disabled={!clip && !existing}>
          <Upload size={18} />
          {clip ? 'Upload & finish' : existing ? 'Keep current & finish' : 'Upload & finish'}
        </Button>
      </StepFooter>
    </>
  );
}
