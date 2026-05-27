/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import PublicForm from './components/PublicForm';
import Dashboard from './components/Dashboard';
import FormManager from './components/FormManager';
import SettingsView from './components/Settings';
import { MeetingRequest, RequestStatus } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutDashboard, FileText, Link as LinkIcon, ExternalLink, Settings, LogOut, Check, Lock, ShieldAlert, QrCode, X, MessageCircle } from 'lucide-react';
import CompanyLogo from './components/CompanyLogo';
import { QRCodeSVG } from 'qrcode.react';
import WhatsAppDispatch from './components/WhatsAppDispatch';

import { initAuth, googleSignIn, googleLogout } from './lib/googleAuth';
import { syncFreeBusyToCache } from './lib/googleCalendar';
import { User } from 'firebase/auth';
import { getForms, getRequests, addRequest as dbAddRequest, updateRequestStatus, seedRequests, deleteRequest, subscribeRequests } from './lib/db';
import { getOrRefreshGoogleToken } from './lib/googleOAuthRefresh';

export default function App() {
  // Check if URL is for public request intake
  const isPublicForm = window.location.search.includes('request=true') || window.location.search.includes('form=true');

  const [view, setView] = useState<'form' | 'dashboard' | 'forms' | 'dispatch' | 'settings'>('dashboard');
  const [requests, setRequests] = useState<MeetingRequest[]>([]);
  const [copied, setCopied] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'warning' | 'error' = 'success', duration = 8000) => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => prev && prev.message === message ? null : prev);
    }, duration);
  };
  
  // Public Form Template Data
  const [publicFormTemplate, setPublicFormTemplate] = useState<any | null>(null);

  // Admin Login State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [loginError, setLoginError] = useState('');

  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(true);

  // Initialize status listener
  useEffect(() => {
    // 1. Check if permanent background connection exists first
    getOrRefreshGoogleToken().then((token) => {
      if (token) {
        setGoogleToken(token);
        setIsGoogleLoading(false);
        syncFreeBusyToCache(token);
      } else {
        // 2. Fall back to standard session popup listener
        const unsubscribe = initAuth(
          (user, token) => {
            setGoogleUser(user);
            setGoogleToken(token);
            setIsGoogleLoading(false);
            syncFreeBusyToCache(token);
          },
          () => {
            setGoogleUser(null);
            setGoogleToken(null);
            setIsGoogleLoading(false);
          }
        );
        return () => {
          if (unsubscribe) unsubscribe();
        };
      }
    });
  }, []);

  // Check for permanent link redirect parameter on boot
  useEffect(() => {
    if (window.location.search.includes('settings=true')) {
      setView('settings');
      setIsLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    if (isPublicForm) {
      // Fetch public form template
      const params = new URLSearchParams(window.location.search);
      const formId = params.get('formId');
      
      getForms()
        .then(forms => {
          if (forms && forms.length > 0) {
            if (formId) {
              const matched = forms.find((f: any) => f.id === formId);
              setPublicFormTemplate(matched || forms[0]);
            } else {
              setPublicFormTemplate(forms[0]);
            }
          }
        })
        .catch(err => console.error("Could not load form template", err));
    }
  }, [isPublicForm]);

  const handleConnectGoogle = async () => {
    try {
      setIsGoogleLoading(true);
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setGoogleToken(res.accessToken);
        syncFreeBusyToCache(res.accessToken);
        showToast("Connected to Google Calendar successfully!", 'success');
      }
    } catch (err: any) {
      console.error("Failed to login to Google:", err);
      const errStr = String(err?.message || err);
      if (errStr.includes("popup-closed-by-user") || errStr.includes("popup_closed_by_user")) {
        showToast(
          "Notice: Google Sign-In window was closed or blocked. If running inside the AI Studio preview iframe, please make sure your browser allows popups, or simply click the 'Open in new tab' button at the top right of AI Studio to sign in safely.",
          'warning'
        );
      } else {
        showToast(`Failed to connect to Google Account: ${errStr}`, 'error');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      setIsGoogleLoading(true);
      await googleLogout();
      setGoogleUser(null);
      setGoogleToken(null);
    } catch (err) {
      console.error("Failed to logout from Google:", err);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Copy public form URL containing the ?request=true flag
  const handleCopyLink = () => {
    const publicUrl = `${window.location.origin}/?request=true`;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Check login session on mount
  useEffect(() => {
    const sessionToken = sessionStorage.getItem('preci_admin_logged_in');
    if (sessionToken === 'true') {
      setIsLoggedIn(true);
    }
  }, []);

  // Listen to requests in real-time with automatic LocalStorage fallback
  useEffect(() => {
    // Only fetch/subscribe requests if we are in admin dashboard mode
    if (isPublicForm) return;

    let fallbackInterval: any = null;

    // Attempt real-time Firestore subscription
    const unsubscribe = subscribeRequests(
      (data) => {
        setRequests(data);
      },
      () => {
        // Fallback: If subscription fails or is unauthorized, use standard fallback polling
        const poll = async () => {
          try {
            const data = await getRequests();
            setRequests(data);
          } catch (e) {
            console.error('LocalStorage requests fallback failed:', e);
          }
        };
        poll();
        fallbackInterval = setInterval(poll, 5000);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, [isPublicForm, isLoggedIn]);

  const addRequest = async (req: MeetingRequest) => {
    // To ensure immediate client-only form reassurance (even if server is loading)
    setRequests(prev => [req, ...prev]);

    try {
      const saved = await dbAddRequest(req);
      // Update local requests list with actual saved item to sync statuses
      setRequests(prev => prev.map(r => r.id === req.id ? saved : r));
    } catch (err) {
      console.error('Failed to report request submission:', err);
    }
  };

  const updateStatus = async (id: string, status: RequestStatus) => {
    // Optimistic local state update
    const reqToUpdate = requests.find(r => r.id === id);
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));

    try {
      await updateRequestStatus(id, status);
      if (googleToken && reqToUpdate) {
        if (status === 'Approved') {
          // Auto-sync to Calendar and generate Meet link
          import('./lib/googleCalendar').then(({ syncToGoogleCalendar, syncFreeBusyToCache }) => {
            syncToGoogleCalendar(googleToken, { ...reqToUpdate, status }).then((syncResult) => {
               // Re-sync availability after booking
               syncFreeBusyToCache(googleToken);
               
               // Send Gmail auto-reply with Meet link
               import('./lib/gmailAutoReply').then(({ sendAutoReply }) => {
                 sendAutoReply(googleToken, reqToUpdate, status, syncResult.hangoutLink);
               });
               showToast('Successfully synced to Google Calendar and sent confirmation!', 'success');
            }).catch(err => {
               showToast(`Google Calendar Auto-Sync failed: ${err.message}. Please re-connect your calendar.`, 'error');
            });
          });
        } else if (status === 'Declined') {
          // Send decline auto-reply
          import('./lib/gmailAutoReply').then(({ sendAutoReply }) => {
            sendAutoReply(googleToken, reqToUpdate, status);
          });
        }
      }
    } catch (err) {
      console.error('Failed to sync status update:', err);
    }
  };

  const handleSeedDemoData = async () => {
    try {
      const sortedSeed = await seedRequests();
      setRequests(sortedSeed);
    } catch (err) {
      console.error('Failed to seed system demo requests:', err);
    }
  };

  const handleDeleteRequest = async (id: string) => {
    // Optimistic local state update
    setRequests(prev => prev.filter(r => r.id !== id));

    try {
      await deleteRequest(id);
    } catch (err) {
      console.error('Failed to sync deletion:', err);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode.trim() === 'precision2026') {
      setIsLoggedIn(true);
      sessionStorage.setItem('preci_admin_logged_in', 'true');
      setLoginError('');
    } else {
      setLoginError('Invalid passcode. Access Denied.');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    sessionStorage.removeItem('preci_admin_logged_in');
  };

  // ----------------------------------------------------
  // PUBLIC REQUEST MODE (Stand-alone Form Intake)
  // ----------------------------------------------------
  if (isPublicForm) {
    if (!publicFormTemplate) {
      return (
        <div className="bg-[#F8FAFC] min-h-screen flex items-center justify-center font-body-md text-[#111827]">
           <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-[#008FD5] border-t-transparent animate-spin"></div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest">Loading Gateway...</p>
           </div>
        </div>
      );
    }

    return (
      <div className="bg-[#F8FAFC] min-h-screen flex flex-col font-body-md text-[#111827] antialiased">
        <header className="bg-white/90 backdrop-blur-md top-0 z-50 shadow-sm border-b border-[#E5E7EB] w-full fixed">
          <div className="flex justify-between items-center w-full px-lg py-3 max-w-container-max mx-auto">
            <CompanyLogo size="sm" className="md:scale-105 origin-left" />
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center pt-[100px] pb-xxl px-margin-mobile md:px-lg w-full">
          <PublicForm template={publicFormTemplate} onSubmit={addRequest} />
        </main>
      </div>
    );
  }

  // ----------------------------------------------------
  // ADMIN PASSCODE LOGIN SCREEN
  // ----------------------------------------------------
  if (!isLoggedIn) {
    return (
      <div className="bg-[#0B1F33] min-h-screen flex flex-col justify-center items-center p-4 text-[#111827] antialiased">
        <div className="absolute top-10 right-0 w-[500px] h-[500px] bg-[#008FD5]/10 rounded-full blur-[100px] -z-10 pointer-events-none"></div>
        <div className="absolute bottom-10 left-0 w-[400px] h-[400px] bg-[#4FC3F7]/10 rounded-full blur-[80px] -z-10 pointer-events-none"></div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white w-[440px] max-w-[95vw] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.24)] border border-[#E5E7EB] overflow-hidden p-6 md:p-8 flex flex-col"
          style={{ width: '440px', maxWidth: '95vw' }}
        >
          <div className="flex flex-col items-center text-center mb-6">
            <CompanyLogo size="md" className="mb-6 scale-105" />
            <h1 className="text-xl font-bold font-sans tracking-tight text-[#0B1F33]">Executive Administration</h1>
            <p className="text-sm text-[#6B7280] mt-1 max-w-xs">Management Access Portal Only</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2">Secure Passcode</label>
              <input 
                type="password" 
                required
                className="w-full bg-[#F8FAFC] border border-[#E5E7EB] text-[#111827] rounded-xl px-4 py-3.5 text-center font-mono text-lg tracking-widest focus:outline-none focus:border-[#008FD5] focus:ring-4 focus:ring-[#008FD5]/10 transition-all placeholder:text-gray-300 placeholder:tracking-normal" 
                placeholder="Enter passcode (precision2026)"
                value={passcode}
                onChange={e => setPasscode(e.target.value)}
              />
            </div>

            <AnimatePresence mode="wait">
              {loginError && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 text-xs font-medium"
                >
                  <ShieldAlert size={16} />
                  <span>{loginError}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button type="submit" className="w-full py-3.5 bg-[#008FD5] text-white hover:bg-[#008FD5]/90 active:scale-[0.98] rounded-xl font-medium shadow-md transition-all">
              Log Into PRECI FORM
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#E5E7EB] text-center">
            <a 
              href="/?request=true" 
              className="text-xs text-[#008FD5] hover:underline font-medium inline-flex items-center gap-1"
            >
              <ExternalLink size={12} /> Go to Public Meeting Request Form
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  // ----------------------------------------------------
  // ADMIN DASHBOARD & REVIEW MODE (Yunus Only)
  // ----------------------------------------------------
  return (
    <div className="bg-[#F8FAFC] text-[#111827] font-body-md antialiased overflow-hidden flex h-screen">
      {/* Floating Toast Notification */}
      <AnimatePresence>
        {copied && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%', scale: 0.95 }}
            animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
            exit={{ opacity: 0, y: -20, x: '-50%', scale: 0.95 }}
            className="fixed top-6 left-1/2 z-50 flex items-center gap-2 px-4 py-3 bg-gray-900/95 backdrop-blur-md border border-gray-800 text-white rounded-xl shadow-xl font-sans text-xs md:text-sm font-semibold tracking-wide w-[90vw] md:w-auto md:max-w-md justify-center"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            <span>Link Copied! Ready to paste and share on WhatsApp.</span>
          </motion.div>
        )}

        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%', scale: 0.95 }}
            animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
            exit={{ opacity: 0, y: -20, x: '-50%', scale: 0.95 }}
            className={`fixed top-6 left-1/2 z-[100] flex items-start gap-3 px-4 py-3.5 rounded-xl shadow-2xl font-sans text-xs md:text-sm font-medium tracking-wide w-[90vw] md:w-[480px] border ${
              toast.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : toast.type === 'warning' 
                ? 'bg-amber-50 border-amber-200 text-amber-800' 
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 animate-pulse ${
              toast.type === 'success' 
                ? 'bg-emerald-500' 
                : toast.type === 'warning' 
                ? 'bg-amber-500' 
                : 'bg-rose-500'
            }`}></span>
            <div className="flex-1">
              <p className="font-semibold mb-0.5">{toast.type === 'success' ? 'Google Calendar Connection' : toast.type === 'warning' ? 'Connection Notice' : 'Connection Error'}</p>
              <p className="opacity-95 leading-normal">{toast.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SideNavBar (Desktop) */}
      <nav className="hidden md:flex flex-col h-screen p-md gap-md border-r border-[#E5E7EB] bg-white w-64 shrink-0 z-40 relative">
        <div className="px-md py-lg mb-8 flex items-center w-full">
          <CompanyLogo size="sm" />
        </div>
        
        <div className="flex flex-col gap-2 flex-1 px-2">
          <div className="font-label-sm text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2 px-2">Menu</div>
          <button onClick={() => setView('dashboard')} className={`group flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-200 w-full text-left relative overflow-hidden ${view === 'dashboard' ? 'bg-[#008FD5]/10 text-[#008FD5]' : 'text-[#6B7280] hover:bg-gray-50'}`}>
            {view === 'dashboard' && <motion.div layoutId="active-indicator" className="absolute left-0 top-0 bottom-0 w-1 bg-[#008FD5] rounded-r-full" />}
            <LayoutDashboard size={20} className={view === 'dashboard' ? 'text-[#008FD5] relative z-10' : 'relative z-10'} />
            <span className="font-label-md text-label-md relative z-10">Requests</span>
          </button>
          
          <button onClick={() => setView('forms')} className={`group flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-200 w-full text-left relative overflow-hidden ${view === 'forms' ? 'bg-[#008FD5]/10 text-[#008FD5]' : 'text-[#6B7280] hover:bg-gray-50'}`}>
            {view === 'forms' && <motion.div layoutId="active-indicator" className="absolute left-0 top-0 bottom-0 w-1 bg-[#008FD5] rounded-r-full" />}
            <FileText size={20} className={view === 'forms' ? 'text-[#008FD5] relative z-10' : 'relative z-10'} />
            <span className="font-label-md text-label-md relative z-10">Form Creator</span>
          </button>
          
          <button onClick={() => setView('dispatch')} className={`group flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-200 w-full text-left relative overflow-hidden ${view === 'dispatch' ? 'bg-[#008FD5]/10 text-[#008FD5]' : 'text-[#6B7280] hover:bg-gray-50'}`}>
            {view === 'dispatch' && <motion.div layoutId="active-indicator" className="absolute left-0 top-0 bottom-0 w-1 bg-[#008FD5] rounded-r-full" />}
            <MessageCircle size={20} className={view === 'dispatch' ? 'text-[#008FD5] relative z-10' : 'relative z-10'} />
            <span className="font-label-md text-label-md relative z-10">WhatsApp</span>
          </button>
          
          <div className="font-label-sm text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2 px-2 mt-8">System</div>
          <button onClick={() => setView('settings')} className={`group flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-200 w-full text-left relative overflow-hidden ${view === 'settings' ? 'bg-[#008FD5]/10 text-[#008FD5]' : 'text-[#6B7280] hover:bg-gray-50'}`}>
            {view === 'settings' && <motion.div layoutId="active-indicator" className="absolute left-0 top-0 bottom-0 w-1 bg-[#008FD5] rounded-r-full" />}
            <Settings size={20} className={view === 'settings' ? 'text-[#008FD5] relative z-10' : 'relative z-10'} />
            <span className="font-label-md text-label-md relative z-10">Settings</span>
          </button>
        </div>

        <div onClick={handleLogout} className="p-4 border-t border-[#E5E7EB] mt-auto flex items-center gap-3 rounded-xl hover:bg-red-50/50 hover:text-red-600 transition-colors cursor-pointer w-full group">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-[#008FD5] flex items-center justify-center font-bold shrink-0 text-sm">Y</div>
            <div className="min-w-0 flex-1">
              <p className="font-label-md text-xs font-semibold text-[#111827] truncate">Yunus Sir</p>
              <p className="font-body-sm text-[10px] text-[#6B7280] truncate uppercase tracking-wider font-semibold">Sign Out</p>
            </div>
            <LogOut size={16} className="text-gray-400 group-hover:text-red-500 shrink-0 transition-colors" />
        </div>
      </nav>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* TopNavBar */}
        <header className="flex justify-between items-center w-full px-lg py-4 shadow-sm border-b border-[#E5E7EB] bg-white z-30 shrink-0">
          <div className="md:hidden">
            <CompanyLogo size="sm" />
          </div>
          <div className="hidden md:block"></div>
          <div className="flex items-center gap-3 text-[#008FD5]">
            {/* Google Calendar Connection Status */}
            <div className="flex items-center gap-2">
              {isGoogleLoading ? (
                <div className="text-xs text-gray-400 font-sans italic">Loading...</div>
              ) : googleUser ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-full text-[11px] font-bold select-none font-sans shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse"></span>
                  <span className="max-w-[120px] md:max-w-none truncate">Connected</span>
                  <button 
                    onClick={handleDisconnectGoogle} 
                    className="text-green-800 hover:text-red-600 ml-1 font-black text-[9px] uppercase tracking-wide cursor-pointer focus:outline-none"
                    title="Disconnect Google Account"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleConnectGoogle}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-[#D1D5DB] hover:bg-gray-50 rounded-full text-xs font-bold text-[#4B5563] shadow-sm transition-all focus:outline-none cursor-pointer font-sans"
                  title="Connect Google Calendar to synchronize meeting requests and create Google Meet coordinates automatically."
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Connect Calendar</span>
                </button>
              )}
            </div>

            <button 
              onClick={() => {
                handleCopyLink();
                setIsQrModalOpen(true);
              }} 
              className="hidden md:flex items-center gap-2 px-5 py-2 bg-[#008FD5]/5 text-[#008FD5] hover:bg-[#008FD5]/10 rounded-full font-black text-xs transition-colors shadow-sm border-2 border-[#008FD5]/30 cursor-pointer"
              title="Copy intake form link and show QR scanner code"
            >
                {copied ? <Check size={16} className="text-[#16a34a]" /> : <QrCode size={16} />}
                <span>{copied ? 'Copied!' : 'Copy Form'}</span>
            </button>
            <button 
              onClick={() => {
                handleCopyLink();
                setIsQrModalOpen(true);
              }} 
              className="md:hidden p-2 hover:bg-gray-100 rounded-full transition-colors text-[#008FD5]"
              title="Copy Form"
            >
                {copied ? <Check size={20} className="text-[#15803d]" /> : <QrCode size={20} />}
            </button>
            <button onClick={handleLogout} className="md:hidden p-2 hover:bg-red-50 text-red-500 rounded-full transition-colors ml-1" title="Sign Out">
                <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* Main Canvas */}
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC] p-margin-mobile md:p-xl lg:p-xxl">
          {view === 'dashboard' ? (
            <Dashboard 
              requests={requests} 
              onUpdateStatus={updateStatus} 
              onSeedDemoData={handleSeedDemoData} 
              onDeleteRequest={handleDeleteRequest} 
              googleToken={googleToken}
              onConnectGoogle={handleConnectGoogle}
              onShareLink={() => {
                handleCopyLink();
                setIsQrModalOpen(true);
              }}
            />
          ) : view === 'forms' ? (
            <FormManager />
          ) : view === 'dispatch' ? (
            <WhatsAppDispatch />
          ) : view === 'settings' ? (
            <SettingsView />
          ) : null}
        </main>

        {/* BottomNavBar (Mobile Only) */}
        <nav className="md:hidden fixed bottom-0 w-full flex justify-around items-center px-2 py-2 pb-safe bg-white/95 backdrop-blur-md shadow-lg border-t border-[#E5E7EB] z-50">
          <button onClick={() => setView('dashboard')} className={`flex flex-col flex-1 items-center justify-center transition-transform duration-100 py-2 relative ${view === 'dashboard' ? 'text-[#008FD5]' : 'text-[#6B7280]'}`}>
            {view === 'dashboard' && <div className="absolute top-0 w-12 h-1 bg-[#008FD5] rounded-full"></div>}
            <LayoutDashboard size={24} className="mb-1 mt-1" />
            <span className="font-label-sm text-[11px] font-medium">Dashboard</span>
          </button>
          <button onClick={() => setView('forms')} className={`flex flex-col flex-1 items-center justify-center transition-colors py-2 relative ${view === 'forms' ? 'text-[#008FD5]' : 'text-[#6B7280]'}`}>
            {view === 'forms' && <div className="absolute top-0 w-12 h-1 bg-[#008FD5] rounded-full"></div>}
            <FileText size={24} className="mb-1 mt-1" />
            <span className="font-label-sm text-[11px]">Form Creator</span>
          </button>
          <button onClick={() => setView('dispatch')} className={`flex flex-col flex-1 items-center justify-center transition-colors py-2 relative ${view === 'dispatch' ? 'text-[#008FD5]' : 'text-[#6B7280]'}`}>
            {view === 'dispatch' && <div className="absolute top-0 w-12 h-1 bg-[#008FD5] rounded-full"></div>}
            <MessageCircle size={24} className="mb-1 mt-1" />
            <span className="font-label-sm text-[11px]">WhatsApp</span>
          </button>
          <button onClick={() => setView('settings')} className={`flex flex-col flex-1 items-center justify-center transition-colors py-2 relative ${view === 'settings' ? 'text-[#008FD5]' : 'text-[#6B7280]'}`}>
            {view === 'settings' && <div className="absolute top-0 w-12 h-1 bg-[#008FD5] rounded-full"></div>}
            <Settings size={24} className="mb-1 mt-1" />
            <span className="font-label-sm text-[11px]">Settings</span>
          </button>
        </nav>
      </div>

      {/* QR Code and Share Modal */}
      <AnimatePresence>
        {isQrModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsQrModalOpen(false)}
              className="fixed inset-0 bg-[#0B1F33]/60 backdrop-blur-xs cursor-pointer"
            />
            
            {/* Modal Body */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-white w-[380px] max-w-[95vw] rounded-2xl shadow-[0_20px_50px_rgba(11,31,51,0.15)] border border-[#E5E7EB] p-6 relative z-10 font-sans text-center"
            >
              <button 
                onClick={() => setIsQrModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-full transition-colors focus:outline-none"
              >
                <X size={18} />
              </button>
              
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-[#008FD5]/10 text-[#008FD5] rounded-xl flex items-center justify-center mb-3">
                  <QrCode size={24} />
                </div>
                <h3 className="text-base font-bold text-[#0B1F33] tracking-tight">Public Intake QR Code</h3>
                <p className="text-xs text-[#6B7280] max-w-xs mt-1">
                  Let visitors scan this code on your device to immediately open the intake form.
                </p>
                
                {/* QR Code container with stylized border */}
                <div className="my-5 p-4 bg-gray-50 rounded-2xl border border-gray-100 shadow-inner flex items-center justify-center">
                  <QRCodeSVG 
                    value={`${window.location.origin}/?request=true`} 
                    size={160} 
                    includeMargin={true}
                    fgColor="#0B1F33"
                    bgColor="#F9FAFB"
                    level="H"
                  />
                </div>

                <div className="w-full bg-[#F3F4F6] p-2.5 rounded-lg text-[11px] font-mono select-all text-[#374151] break-all border border-[#E5E7EB] mb-4 text-center">
                  {`${window.location.origin}/?request=true`}
                </div>
                
                <div className="flex gap-2 w-full">
                  <button 
                    onClick={handleCopyLink}
                    className="flex-1 py-2.5 px-4 bg-[#008FD5] text-white hover:bg-[#008FD5]/90 rounded-xl font-semibold text-xs tracking-wide transition-all shadow-sm flex items-center justify-center gap-1.5"
                  >
                    {copied ? <Check size={14} /> : <LinkIcon size={14} />}
                    <span>{copied ? 'Copied Link!' : 'Copy Link Address'}</span>
                  </button>
                  <button 
                    onClick={() => setIsQrModalOpen(false)}
                    className="py-2.5 px-4 border border-[#E5E7EB] hover:bg-gray-50 text-[#374151] rounded-xl font-bold text-xs transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
