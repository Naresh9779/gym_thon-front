"use client";

import { AnimatePresence, motion } from 'framer-motion';
import { useToastStore } from '@/hooks/useToast';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence mode="sync">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  onClose: () => void;
}

const configs = {
  success: { icon: CheckCircle2, bg: 'bg-green-500', ring: 'ring-green-400' },
  error:   { icon: XCircle,      bg: 'bg-red-500',   ring: 'ring-red-400' },
  info:    { icon: Info,         bg: 'bg-blue-500',  ring: 'ring-blue-400' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-500', ring: 'ring-amber-400' },
} as const;

function Toast({ message, type, onClose }: ToastProps) {
  const { icon: Icon, bg, ring } = configs[type];

  return (
    <motion.div
      initial={{ opacity: 0, x: 60, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`pointer-events-auto ${bg} ring-1 ${ring} text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 min-w-[280px]`}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <p className="flex-1 text-sm font-medium leading-snug">{message}</p>
      <button
        onClick={onClose}
        className="flex-shrink-0 hover:bg-white/20 rounded-lg p-1 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
