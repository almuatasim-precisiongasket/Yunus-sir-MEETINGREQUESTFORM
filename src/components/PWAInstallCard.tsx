import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { Download, Monitor, Smartphone, Sparkles, CheckCircle2, X, Share2, PlusSquare, MoreVertical } from 'lucide-react';
import { hapticFeedback } from '../lib/haptics';
import CompanyLogo from './CompanyLogo';

export default function PWAInstallCard() {
  const { isInstallable, installApp } = usePWAInstall();
  const [isStandalone, setIsStandalone] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const checkStandalone = () => {
      const standalone = 
        window.matchMedia('(display-mode: standalone)').matches || 
        (navigator as any).standalone || 
        document.referrer.includes('android-app://');
      setIsStandalone(!!standalone);
    };
    checkStandalone();
  }, []);

  const isIframe = typeof window !== 'undefined' && window.self !== window.top;
  const showNativeInstall = isInstallable && !isIframe && !isStandalone;

  const handleInstallClick = async () => {
    hapticFeedback.tap();
    if (showNativeInstall) {
      try {
        const success = await installApp();
        if (success) {
          hapticFeedback.success();
        } else {
          // If native prompt was cancelled by user, guide them on custom standalone features
          setShowGuide(true);
        }
      } catch (err) {
        console.warn("Native PWA installation failed, falling back to guide:", err);
        setShowGuide(true);
      }
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <div className="bg-gradient-to-br from-[#0B1F33] to-[#0A1724] text-white rounded-xl border border-blue-500/20 p-5 space-y-4 shadow-[0_12px_30px_rgba(11,31,51,0.3)] relative overflow-hidden">
        {/* Subtle background gradient glow */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#008FD5]/10 rounded-full blur-2xl pointer-events-none -z-10" />
        
        <div className="flex items-start justify-between">
          <CompanyLogo size="sm" whiteText={true} className="scale-90 origin-left" />
          <div className="flex items-center gap-1 bg-sky-950/40 border border-sky-500/20 px-2 py-0.5 rounded-full shrink-0">
            <Sparkles size={10} className="text-[#4FC3F7] animate-pulse" />
            <span className="font-sans text-[8px] font-black uppercase tracking-wider text-sky-400">Official App</span>
          </div>
        </div>

        <div className="space-y-2 text-left">
          <h4 className="font-sans text-sm font-black leading-snug">
            {isStandalone ? 'PRECI FORM Installed & Active' : 'Install PRECI FORM App'}
          </h4>
          <p className="text-[10px] text-slate-300 leading-relaxed font-sans">
            {isStandalone 
              ? 'PRECI FORM is running successfully inside its native PWA standalone application wrapper with offline capabilities active.'
              : 'Add PRECI FORM directly to your mobile home screen or desktop application list for instant startup, offline access, and an immersive native visual wrapper.'}
          </p>
        </div>

        {isStandalone ? (
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-950/30 border border-emerald-500/10 p-3 rounded-xl">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
            <span>Application running in native standalone window shell</span>
          </div>
        ) : (
          <div className="flex gap-4 items-center pt-1">
            <div className="flex -space-x-1 shrink-0">
              <div className="w-6 h-6 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400" title="Android & iOS Mobile App Support">
                <Smartphone size={11} />
              </div>
              <div className="w-6 h-6 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400" title="Windows & macOS Desktop App Support">
                <Monitor size={11} />
              </div>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.03, boxShadow: "0 6px 15px rgba(0, 143, 213, 0.3)" }}
              whileTap={{ scale: 0.97 }}
              onClick={handleInstallClick}
              className="flex-1 py-2 bg-[#008FD5] hover:bg-[#007AB8] text-white rounded-lg font-black text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-blue-500/20"
            >
              <Download size={13} className="stroke-[2.5px]" />
              <span>{showNativeInstall ? 'Install Now' : 'How to Install'}</span>
            </motion.button>
          </div>
        )}
      </div>

      {/* Guide Overlay Dialog Modal rendered via React Portal to prevent CSS squish */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showGuide && (
            <div 
              onClick={() => setShowGuide(false)}
              className="fixed inset-0 z-[1000] flex items-center justify-center p-4 cursor-pointer"
            >
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#0B1F33]/80 z-0"
                style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
              />

              {/* Modal Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl w-full max-w-md overflow-hidden border border-slate-200 shadow-2xl relative z-10 p-6 space-y-5 text-[#111827] font-sans cursor-default"
              >
                {/* Close Button */}
                <button 
                  onClick={() => setShowGuide(false)}
                  className="absolute top-5 right-5 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>

                <div className="space-y-2 text-center flex flex-col items-center">
                  <div className="p-3 bg-slate-50 rounded-3xl border border-slate-100 mb-1 shadow-inner inline-flex">
                    <CompanyLogo size="md" hideText={true} />
                  </div>
                  <h3 className="text-lg font-black text-[#0B1F33] tracking-tight">App Installation Guide</h3>
                  <p className="text-xs text-slate-400 font-semibold max-w-[280px] leading-relaxed">
                    Setup native desktop or mobile experiences for PRECI FORM.
                  </p>
                </div>

                <div className="space-y-3.5">
                  {/* Step 1: iOS/Safari */}
                  <div className="flex gap-3.5 p-3 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 text-[#008FD5] border border-slate-150 shrink-0 flex items-center justify-center">
                      <Smartphone size={18} />
                    </div>
                    <div className="space-y-0.5 text-left">
                      <h4 className="text-xs font-bold text-slate-800">iOS (Safari)</h4>
                      <p className="text-[10px] text-slate-500 leading-normal font-semibold font-sans">
                        Tap the **Share** button <Share2 size={10} className="inline mx-0.5 text-slate-405" /> in Safari and select **"Add to Home Screen"** <PlusSquare size={10} className="inline mx-0.5 text-slate-405" />.
                      </p>
                    </div>
                  </div>

                  {/* Step 2: Android/Chrome */}
                  <div className="flex gap-3.5 p-3 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 text-[#008FD5] border border-slate-150 shrink-0 flex items-center justify-center">
                      <Smartphone size={18} />
                    </div>
                    <div className="space-y-0.5 text-left">
                      <h4 className="text-xs font-bold text-slate-800">Android (Chrome)</h4>
                      <p className="text-[10px] text-slate-500 leading-normal font-semibold font-sans">
                        Tap the **Three-Dot Menu** <MoreVertical size={10} className="inline mx-0.5 text-slate-405" /> in Chrome and select **"Install App"** or **"Add to Home screen"**.
                      </p>
                    </div>
                  </div>

                  {/* Step 3: Desktop (Chrome/Edge) */}
                  <div className="flex gap-3.5 p-3 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 text-[#008FD5] border border-slate-150 shrink-0 flex items-center justify-center">
                      <Monitor size={18} />
                    </div>
                    <div className="space-y-0.5 text-left">
                      <h4 className="text-xs font-bold text-slate-800">Desktop (Chrome / Edge)</h4>
                      <p className="text-[10px] text-slate-500 leading-normal font-semibold font-sans">
                        Click the **Install Icon** inside the URL address bar, or click Menu <MoreVertical size={10} className="inline mx-0.5 text-slate-405" /> &gt; **"Save and share"** &gt; **"Install page as app"**.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 text-center select-none">
                  <button
                    onClick={() => setShowGuide(false)}
                    className="px-6 py-2.5 bg-[#0B1F33] hover:bg-[#008FD5] text-white rounded-xl text-xs font-black transition-all cursor-pointer inline-flex shadow-sm hover:shadow active:scale-[0.98]"
                  >
                    Got It, Thanks!
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
