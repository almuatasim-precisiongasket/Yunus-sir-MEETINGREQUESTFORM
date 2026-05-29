import React, { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, X, Sparkles } from 'lucide-react';
import { hapticFeedback } from '../lib/haptics';

export default function PWAUpdater() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW successfully registered to gateway:', r);
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  // Trigger a soft alert haptic pulse when an update becomes available on mobile
  useEffect(() => {
    if (needRefresh) {
      hapticFeedback.error(); // Trigger subtle warning pulse
    }
  }, [needRefresh]);

  const handleUpdate = () => {
    hapticFeedback.success();
    updateServiceWorker(true);
  };

  const handleClose = () => {
    hapticFeedback.tap();
    setNeedRefresh(false);
  };

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="fixed bottom-6 right-6 z-[100] flex items-start gap-4 p-4 md:p-5 rounded-2xl bg-white/80 backdrop-blur-md border border-[#E5E7EB] text-[#111827] shadow-[0_20px_50px_rgba(11,31,51,0.22)] w-[90vw] md:w-[420px]"
        >
          {/* Subtle blue pulsing glow */}
          <div className="absolute -inset-px rounded-2xl border-2 border-[#008FD5]/20 animate-pulse pointer-events-none" />
          
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#008FD5] flex items-center justify-center shrink-0 shadow-3xs">
            <RefreshCw size={20} className="animate-spin text-[#008FD5] [animation-duration:8s]" />
          </div>

          <div className="flex-1 space-y-1 md:space-y-1.5 min-w-0">
            <div className="flex items-center gap-1.5">
              <Sparkles size={13} className="text-[#008FD5] animate-pulse" />
              <h4 className="font-sans text-xs font-black text-[#0B1F33] uppercase tracking-wider">System Update Ready</h4>
            </div>
            <p className="text-[11px] md:text-xs text-slate-500 leading-normal font-semibold">
              A premium new version is available. Reload the gateway now to apply instant speed boosts and scheduling updates.
            </p>
            
            <div className="flex gap-2 pt-1">
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: "0 4px 12px rgba(0, 143, 213, 0.2)" }}
                whileTap={{ scale: 0.98 }}
                onClick={handleUpdate}
                className="py-1.5 px-4 bg-[#008FD5] hover:bg-[#007AB8] text-white rounded-lg font-black text-xs transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <RefreshCw size={12} className="stroke-[2.5px]" />
                <span>Reload & Update</span>
              </motion.button>
              
              <button
                onClick={handleClose}
                className="py-1.5 px-3 border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-gray-700 rounded-lg font-bold text-xs transition-colors flex items-center justify-center cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full focus:outline-none shrink-0"
          >
            <X size={15} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
