import React, { useState, useEffect } from 'react';
import { Save, Loader2, AlertCircle, Clock, ShieldCheck, Key, RefreshCw, Unlink } from 'lucide-react';
import { motion } from 'motion/react';
import { getSettings, saveSettings, getGoogleCredentials, saveGoogleCredentials } from '../lib/db';
import { exchangeCodeForRefreshToken } from '../lib/googleOAuthRefresh';

interface SettingsData {
  businessStartHour: number;
  businessEndHour: number;
}

export default function Settings() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Google Permanent Connection State
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [isLinked, setIsLinked] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [linkStatus, setLinkStatus] = useState<'idle' | 'success' | 'error' | 'exchanging'>('idle');

  useEffect(() => {
    // 1. Fetch business hours
    getSettings()
      .then(data => setSettings(data))
      .catch(console.error);

    // 2. Fetch Google credentials state
    getGoogleCredentials()
      .then(creds => {
        if (creds) {
          setClientId(creds.clientId || '');
          setClientSecret(creds.clientSecret || '');
          if (creds.refreshToken) {
            setIsLinked(true);
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
          await exchangeCodeForRefreshToken(
            savedCreds.clientId,
            savedCreds.clientSecret,
            code,
            redirectUri
          );

          setIsLinked(true);
          setLinkStatus('success');
          // Clear query params immediately for security
          window.history.replaceState({}, document.title, window.location.origin + '/?settings=true');
        } catch (err) {
          console.error('Failed to exchange code:', err);
          setLinkStatus('error');
        }
      };

      exchangeCode();
    }
  }, []);

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
      // Remove local storage tokens
      localStorage.removeItem('google_auth_token');
      localStorage.removeItem('google_auth_token_expiry');
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

      {/* CARD 2: Permanent Google Connection */}
      <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key size={18} className="text-[#008FD5]" />
            <h2 className="font-bold text-[#0B1F33]">Permanent Google API Sync</h2>
          </div>
          <div>
            {isLinked ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                <ShieldCheck size={14} /> Connected Always
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100 animate-pulse">
                <AlertCircle size={14} /> Ephemeral (Popups Required)
              </span>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-sm text-gray-600 leading-relaxed">
            Link your Google Workspace permanent credentials below to enable <strong>background calendar synchronization and auto-email replies</strong>. 
            Once authorized, Mr. Yunus will never be asked to click "Connect Calendar" or re-authenticate again.
          </p>

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
