import React, { useState, useEffect } from 'react';
import { Save, Loader2, AlertCircle, Clock, ShieldCheck, Key, RefreshCw, Unlink, Plus, Trash2, Mail, MessageSquare, CalendarX2, Check, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getSettings, saveSettings, getGoogleCredentials, saveGoogleCredentials, BlackoutDate, SettingsData } from '../lib/db';
import { exchangeCodeForRefreshToken, getOrRefreshGoogleToken } from '../lib/googleOAuthRefresh';

interface ToggleProps {
  checked: boolean;
  onChange: (val: boolean) => void;
}

function IOSToggle({ checked, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-10 h-6 rounded-full p-0.5 flex items-center transition-colors duration-200 focus:outline-none relative shrink-0 cursor-pointer ${
        checked ? 'bg-[#008FD5]' : 'bg-slate-200'
      }`}
    >
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="w-5 h-5 bg-white rounded-full shadow-md"
        style={{
          marginLeft: checked ? 'auto' : '0px',
          marginRight: checked ? '0px' : 'auto'
        }}
      />
    </button>
  );
}

interface SettingsProps {
  onLinkSuccess?: (token: string) => void;
  onUnlink?: () => void;
}

export default function Settings({ onLinkSuccess, onUnlink }: SettingsProps) {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Local state for adding blackout dates
  const [newBlackoutDate, setNewBlackoutDate] = useState('');
  const [newBlackoutLabel, setNewBlackoutLabel] = useState('');

  // Google Permanent Connection State
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [isLinked, setIsLinked] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [linkStatus, setLinkStatus] = useState<'idle' | 'success' | 'error' | 'exchanging'>('idle');

  // Live link validation state
  const [connectionStatus, setConnectionStatus] = useState<'unlinked' | 'validating' | 'linked_valid' | 'linked_expired'>('unlinked');
  const [copiedRedirectUri, setCopiedRedirectUri] = useState(false);

  useEffect(() => {
    // 1. Fetch settings (business hours + blackout dates + admin notifications)
    getSettings()
      .then(data => setSettings(data))
      .catch(console.error);

    // 2. Fetch Google credentials state
    getGoogleCredentials()
      .then(async (creds) => {
        if (creds) {
          setClientId(creds.clientId || '');
          setClientSecret(creds.clientSecret || '');
          if (creds.refreshToken) {
            setIsLinked(true);
            setConnectionStatus('validating');
            // Validate the background connection instantly
            const activeToken = await getOrRefreshGoogleToken();
            if (activeToken) {
              setConnectionStatus('linked_valid');
            } else {
              setConnectionStatus('linked_expired');
            }
          } else {
            setConnectionStatus('unlinked');
          }
        }
      })
      .catch(console.error);
  }, []);


  // Handle OAuth Code Redirect Exchange
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    
    if (code && window.location.search.includes('settings=true')) {
      const exchangeCode = async () => {
        setLinkStatus('exchanging');
        try {
          // Fetch saved clientId/clientSecret to run exchange
          const savedCreds = await getGoogleCredentials();
          if (!savedCreds || !savedCreds.clientId || !savedCreds.clientSecret) {
            throw new Error('OAuth Client ID and Client Secret not found in database.');
          }

          const redirectUri = window.location.origin + '/?settings=true';
          const creds = await exchangeCodeForRefreshToken(
            savedCreds.clientId,
            savedCreds.clientSecret,
            code,
            redirectUri
          );

          setIsLinked(true);
          setLinkStatus('success');
          setConnectionStatus('linked_valid');
          if (creds && creds.accessToken && onLinkSuccess) {
            onLinkSuccess(creds.accessToken);
          }
          // Clear query params immediately for security
          window.history.replaceState({}, document.title, window.location.origin + '/?settings=true');
        } catch (err) {
          console.error('Failed to exchange code:', err);
          setLinkStatus('error');
          setConnectionStatus('linked_expired');
        }
      };

      exchangeCode();
    }
  }, []);

  const handleAddBlackoutDate = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newBlackoutDate || !newBlackoutLabel.trim()) {
      alert('Please fill out both the date and the holiday description label.');
      return;
    }
    
    const exists = settings?.blackoutDates.some(bd => bd.date === newBlackoutDate);
    if (exists) {
      alert('This date is already configured as a blackout day.');
      return;
    }

    if (settings) {
      const updatedDates = [...settings.blackoutDates, { date: newBlackoutDate, label: newBlackoutLabel.trim() }]
        .sort((a, b) => a.date.localeCompare(b.date));
      setSettings({
        ...settings,
        blackoutDates: updatedDates
      });
      setNewBlackoutDate('');
      setNewBlackoutLabel('');
    }
  };

  const handleRemoveBlackoutDate = (dateToRemove: string) => {
    if (settings) {
      setSettings({
        ...settings,
        blackoutDates: settings.blackoutDates.filter(bd => bd.date !== dateToRemove)
      });
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      await saveSettings(settings);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartGoogleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId.trim() || !clientSecret.trim()) {
      alert('Please fill out both Client ID and Client Secret.');
      return;
    }

    setIsLinking(true);
    try {
      // 1. Save temporary settings before leaving page
      await saveGoogleCredentials({
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim()
      });

      // 2. Redirect to Google Authorization consent screen requesting offline refresh token access
      const redirectUri = window.location.origin + '/?settings=true';
      const scope = encodeURIComponent(
        'https://www.googleapis.com/auth/calendar.events ' +
        'https://www.googleapis.com/auth/calendar.readonly ' +
        'https://www.googleapis.com/auth/gmail.send'
      );
      
      const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId.trim()}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${scope}&` +
        `access_type=offline&` +
        `prompt=consent`;

      window.location.href = oauthUrl;
    } catch (err) {
      console.error(err);
      alert('Failed to save connection credentials.');
      setIsLinking(false);
    }
  };

  const handleUnlinkGoogle = async () => {
    if (!window.confirm('Are you sure you want to unlink your permanent Google Account connection?')) {
      return;
    }

    try {
      await saveGoogleCredentials({ clientId: '', clientSecret: '' });
      setClientId('');
      setClientSecret('');
      setIsLinked(false);
      setLinkStatus('idle');
      setConnectionStatus('unlinked');
      // Remove local storage tokens
      localStorage.removeItem('google_auth_token');
      localStorage.removeItem('google_auth_token_expiry');
      if (onUnlink) {
        onUnlink();
      }
      alert('Google Account unlinked successfully.');
    } catch (err) {
      console.error(err);
      alert('Failed to unlink account.');
    }
  };

  if (!settings) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-sans text-[#0B1F33] tracking-tight">System Settings</h1>
        <p className="text-sm text-[#6B7280] mt-1">Manage global system configurations, availability windows, and background Google connections.</p>
      </div>

      {/* CARD 1: Business Hours */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <Clock size={18} className="text-[#008FD5]" />
            <h2 className="font-bold text-[#0B1F33]">Dynamic Business Hours</h2>
          </div>
          <div className="p-6 space-y-6">
            <p className="text-sm text-gray-600 mb-4">
              Set the permitted operating window for external schedulers. Available slots will only be derived within these boundaries.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2">Available From (24hr)</label>
                <select 
                  className="w-full bg-[#F8FAFC] border border-[#E5E7EB] text-[#111827] rounded-xl px-4 py-3 focus:outline-none focus:border-[#008FD5] transition-all"
                  value={settings.businessStartHour}
                  onChange={e => setSettings({...settings, businessStartHour: parseInt(e.target.value)})}
                >
                  {Array.from({ length: 24 }).map((_, i) => (
                    <option key={`start-${i}`} value={i}>{String(i).padStart(2, '0')}:00</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2">Available Until (24hr)</label>
                <select 
                  className="w-full bg-[#F8FAFC] border border-[#E5E7EB] text-[#111827] rounded-xl px-4 py-3 focus:outline-none focus:border-[#008FD5] transition-all"
                  value={settings.businessEndHour}
                  onChange={e => setSettings({...settings, businessEndHour: parseInt(e.target.value)})}
                >
                  {Array.from({ length: 24 }).map((_, i) => (
                    <option key={`end-${i}`} value={i}>{String(i).padStart(2, '0')}:00</option>
                  ))}
                </select>
              </div>
            </div>
            
            {settings.businessStartHour >= settings.businessEndHour && (
               <div className="flex items-center gap-2 text-rose-500 bg-rose-50 p-3 rounded-lg text-xs font-medium">
                 <AlertCircle size={16} />
                 <span>Start hour must be explicitly before end hour.</span>
               </div>
            )}
          </div>
        </div>

        {/* CARD 2: Blackout Dates & Holidays Manager */}
        <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <CalendarX2 size={18} className="text-[#008FD5]" />
            <h2 className="font-bold text-[#0B1F33]">Blackout Dates & Holidays</h2>
          </div>
          <div className="p-6 space-y-6">
            <p className="text-sm text-gray-600">
              Select specific holidays or blackout dates. Users visiting your public request form will be blocked from booking these days.
            </p>

            <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-2xl p-4 space-y-4">
              <h3 className="text-xs font-bold text-[#0B1F33] uppercase tracking-wider">Configure New Blackout Day</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="md:col-span-1">
                  <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1.5">Date</label>
                  <input
                    type="date"
                    value={newBlackoutDate}
                    onChange={e => setNewBlackoutDate(e.target.value)}
                    className="w-full bg-white border border-[#E5E7EB] text-[#111827] rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-[#008FD5] transition-all"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1.5">Reason / Holiday Label</label>
                  <input
                    type="text"
                    placeholder="e.g. New Year Break"
                    value={newBlackoutLabel}
                    onChange={e => setNewBlackoutLabel(e.target.value)}
                    className="w-full bg-white border border-[#E5E7EB] text-[#111827] rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-[#008FD5] transition-all"
                  />
                </div>
                <div className="md:col-span-1">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleAddBlackoutDate}
                    className="w-full bg-[#008FD5] hover:bg-[#008FD5]/90 text-white rounded-xl py-2.5 text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Add Blackout Day</span>
                  </motion.button>
                </div>
              </div>
            </div>

            {/* List of Configured Blackout Dates */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Active Blackout Calendar ({settings.blackoutDates?.length || 0})</h3>
              
              {!settings.blackoutDates || settings.blackoutDates.length === 0 ? (
                <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                  <p className="text-xs text-slate-400 font-semibold">No blackout dates or holidays configured yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <AnimatePresence mode="popLayout">
                    {settings.blackoutDates.map(bd => (
                      <motion.div
                        key={bd.date}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white border border-[#E5E7EB] hover:border-slate-300 rounded-xl p-3.5 flex items-center justify-between shadow-sm group hover:shadow transition-all"
                      >
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-black text-[#008FD5] bg-sky-50 px-2 py-0.5 rounded-full w-max">
                            {new Date(bd.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          <span className="text-xs font-bold text-slate-800 tracking-tight">{bd.label}</span>
                        </div>
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleRemoveBlackoutDate(bd.date)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                          title="Delete Blackout Date"
                        >
                          <Trash2 size={14} />
                        </motion.button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CARD 3: Admin Notification Routing */}
        <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <Mail size={18} className="text-[#008FD5]" />
            <h2 className="font-bold text-[#0B1F33]">Admin Alert & Notification Routing</h2>
          </div>
          <div className="p-6 space-y-6">
            <p className="text-sm text-gray-600">
              Get notified immediately whenever a client submits a new booking request. Configure your channels below.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Channel 1: Gmail Alert */}
              <div className={`border rounded-2xl p-5 transition-all ${
                settings.emailAlertsEnabled 
                  ? 'border-[#008FD5]/40 bg-sky-50/10 shadow-sm' 
                  : 'border-[#E5E7EB] bg-slate-50/20'
              }`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-xl ${settings.emailAlertsEnabled ? 'bg-[#008FD5]/10 text-[#008FD5]' : 'bg-slate-100 text-slate-400'}`}>
                      <Mail size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#0B1F33]">Gmail Admin Alerts</h4>
                      <p className="text-[10px] text-gray-500 mt-0.5">Receive structured request summaries via Gmail.</p>
                    </div>
                  </div>
                  <IOSToggle
                    checked={settings.emailAlertsEnabled}
                    onChange={val => setSettings({...settings, emailAlertsEnabled: val})}
                  />
                </div>

                <AnimatePresence>
                  {settings.emailAlertsEnabled && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 28, mass: 0.9 }}
                      className="space-y-1.5 overflow-hidden"
                    >
                      <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Admin Notification Email</label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. admin@precisiongasket.com"
                        value={settings.adminEmail}
                        onChange={e => setSettings({...settings, adminEmail: e.target.value})}
                        className="w-full bg-white border border-[#E5E7EB] text-[#111827] rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-[#008FD5] transition-all"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Channel 2: WhatsApp / SMS Alert */}
              <div className={`border rounded-2xl p-5 transition-all ${
                settings.whatsappAlertsEnabled 
                  ? 'border-[#008FD5]/40 bg-sky-50/10 shadow-sm' 
                  : 'border-[#E5E7EB] bg-slate-50/20'
              }`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-xl ${settings.whatsappAlertsEnabled ? 'bg-[#008FD5]/10 text-[#008FD5]' : 'bg-slate-100 text-slate-400'}`}>
                      <MessageSquare size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#0B1F33]">WhatsApp / SMS Alerts</h4>
                      <p className="text-[10px] text-gray-500 mt-0.5">Logs instant scheduling alerts in your dispatch queue.</p>
                    </div>
                  </div>
                  <IOSToggle
                    checked={settings.whatsappAlertsEnabled}
                    onChange={val => setSettings({...settings, whatsappAlertsEnabled: val})}
                  />
                </div>

                <AnimatePresence>
                  {settings.whatsappAlertsEnabled && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 28, mass: 0.9 }}
                      className="space-y-1.5 overflow-hidden"
                    >
                      <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Admin Notification Phone</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. +1 (555) 123-4567"
                        value={settings.adminPhone}
                        onChange={e => setSettings({...settings, adminPhone: e.target.value})}
                        className="w-full bg-white border border-[#E5E7EB] text-[#111827] rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-[#008FD5] transition-all"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end items-center gap-4">
          {saveStatus === 'success' && <span className="text-emerald-500 text-sm font-bold animate-pulse">Settings Saved</span>}
          {saveStatus === 'error' && <span className="text-rose-500 text-sm font-bold">Failed to save</span>}
          <button 
            type="submit" 
            disabled={isSaving || settings.businessStartHour >= settings.businessEndHour}
            className="bg-[#008FD5] text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-[#008FD5]/90 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            <span>Save Configuration</span>
          </button>
        </div>
      </form>

      {/* CARD 4: Permanent Google Connection */}
      <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key size={18} className="text-[#008FD5]" />
            <h2 className="font-bold text-[#0B1F33]">Permanent Google API Sync</h2>
          </div>
          <div className="min-h-[30px] flex items-center justify-end">
            <AnimatePresence mode="wait">
              {connectionStatus === 'unlinked' && (
                <motion.span 
                  key="unlinked"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100 select-none"
                >
                  <AlertCircle size={14} className="animate-pulse" /> Ephemeral (Popups Required)
                </motion.span>
              )}
              {connectionStatus === 'validating' && (
                <motion.span 
                  key="validating"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-100 select-none"
                >
                  <RefreshCw size={14} className="animate-spin text-[#008FD5]" /> Verifying Sync Health...
                </motion.span>
              )}
              {connectionStatus === 'linked_valid' && (
                <motion.span 
                  key="linked_valid"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 select-none"
                >
                  <ShieldCheck size={14} /> Connected Always
                </motion.span>
              )}
              {connectionStatus === 'linked_expired' && (
                <motion.span 
                  key="linked_expired"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-100 select-none"
                >
                  <AlertCircle size={14} className="animate-bounce" /> Re-Authorization Required
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-sm text-gray-600 leading-relaxed">
            Link your Google Workspace permanent credentials below to enable <strong>background calendar synchronization and auto-email replies</strong>. 
            Once authorized, Mr. Yunus will never be asked to click "Connect Calendar" or re-authenticate again.
          </p>

          {/* Dynamic Redirect URI Copy Instruction helper box */}
          <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-2xl p-4.5 space-y-3.5">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 bg-[#008FD5]/10 rounded-lg text-[#008FD5] mt-0.5 animate-pulse">
                <Key size={14} />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-bold text-[#0B1F33]">Google Console Configuration Helper</h4>
                <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed font-medium">
                  Before linking, ensure you have registered this exact redirect URI in your **Google Cloud Console &gt; OAuth 2.0 Credentials**:
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white border border-[#E5E7EB] rounded-xl p-2.5 pl-3.5 justify-between">
              <code className="text-[10px] font-mono text-slate-700 break-all select-all font-black">
                {window.location.origin}/?settings=true
              </code>
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/?settings=true`);
                  setCopiedRedirectUri(true);
                  setTimeout(() => setCopiedRedirectUri(false), 2500);
                }}
                className="bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-[#E5E7EB] px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all shrink-0"
              >
                {copiedRedirectUri ? <Check size={12} className="text-emerald-600 font-bold" /> : <Copy size={12} />}
                <span>{copiedRedirectUri ? 'Copied' : 'Copy'}</span>
              </motion.button>
            </div>
          </div>

          {linkStatus === 'exchanging' && (
            <div className="p-4 bg-blue-50 border border-blue-100 text-blue-800 rounded-xl flex items-center gap-3 text-xs font-semibold">
              <RefreshCw className="animate-spin text-[#008FD5]" size={18} />
              <span>Exchanging authorization code with Google for permanent refresh credentials. Please wait...</span>
            </div>
          )}

          {linkStatus === 'success' && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl flex items-center gap-2 text-xs font-semibold animate-bounce">
              <ShieldCheck size={18} className="text-emerald-600" />
              <span>Congratulations! Permanent Google sync has been successfully authorized and saved!</span>
            </div>
          )}

          {linkStatus === 'error' && (
            <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl flex items-center gap-2 text-xs font-semibold">
              <AlertCircle size={18} className="text-rose-600" />
              <span>Failed to establish permanent link. Check Google Credentials and ensure you selected the correct Google account.</span>
            </div>
          )}

          {isLinked ? (
            <div className="p-4 bg-emerald-50/30 rounded-xl border border-emerald-100/50 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-[#0B1F33]">Secure Integration Active</h4>
                <p className="text-[10px] text-gray-500 mt-1">Permanently linked to Google Calendar & Gmail Auto-Replies. Background refreshes are handled automatically.</p>
              </div>
              <button 
                onClick={handleUnlinkGoogle}
                className="bg-rose-50 text-rose-700 hover:bg-rose-100 px-4 py-2 rounded-xl text-xs font-bold border border-rose-200/50 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Unlink size={14} /> Unlink Account
              </button>
            </div>
          ) : (
            <form onSubmit={handleStartGoogleLink} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2">Google Client ID</label>
                  <input 
                    type="text"
                    required
                    placeholder="Enter Google Client ID"
                    value={clientId}
                    onChange={e => setClientId(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-[#E5E7EB] text-[#111827] rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-[#008FD5] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2">Google Client Secret</label>
                  <input 
                    type="password"
                    required
                    placeholder="Enter Google Client Secret"
                    value={clientSecret}
                    onChange={e => setClientSecret(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-[#E5E7EB] text-[#111827] rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-[#008FD5] transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button 
                  type="submit"
                  disabled={isLinking}
                  className="bg-[#0B1F33] hover:bg-[#008FD5] text-white px-5 py-3 rounded-xl font-bold text-xs shadow-md transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isLinking ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  <span>Authorize Permanent Link</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
