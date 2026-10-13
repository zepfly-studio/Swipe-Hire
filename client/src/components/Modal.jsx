import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cx } from '../lib/api';

// Open modals, newest last. Only the top one reacts to Escape, and the page
// stays scroll-locked until the last one closes (works with nested modals).
const stack = [];

export default function Modal({ open, onClose, children, className }) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const id = Symbol('modal');
    stack.push(id);
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape' && stack[stack.length - 1] === id) onCloseRef.current?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      stack.splice(stack.indexOf(id), 1);
      if (!stack.length) document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="modal"
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
          // While closing, let clicks pass through to the page underneath.
          exit={{ pointerEvents: 'none' }}
        >
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cx(
              'relative flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-ink-900/95 shadow-2xl shadow-black/60 sm:max-w-lg sm:rounded-[28px]',
              className,
            )}
            initial={{ opacity: 0, y: 80, scale: 0.9, rotateX: 12 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            exit={{ opacity: 0, y: 60, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            style={{ transformPerspective: 1200 }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
