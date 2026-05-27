import React, { useState, useEffect } from 'react';
import { Save, Loader2, AlertCircle, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { getSettings, saveSettings } from '../lib/db';

interface SettingsData {
  businessStartHour: number;
  businessEndHour: number;
}

export default function Settings() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    getSettings()
      .then(data => setSettings(data))
      .catch(console.error);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
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

  if (!settings) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-sans text-[#0B1F33] tracking-tight">System Settings</h1>
        <p className="text-sm text-[#6B7280] mt-1">Manage global system configurations and availability.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
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
            className="bg-[#008FD5] text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-[#008FD5]/90 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            <span>Save Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
}
