import React, { useState, useEffect, useMemo } from 'react';
import { MeetingRequest, FormTemplate, FormField } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, ChevronDown, Send, Loader2, Copy, Check, Calendar, Clock, User, ShieldCheck, Sparkles, CalendarX2 } from 'lucide-react';
import { getCalendarAvailability, getSettings } from '../lib/db';

interface PublicFormProps {
  template: FormTemplate;
  onSubmit: (req: MeetingRequest) => void;
}

export default function PublicForm({ template, onSubmit }: PublicFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmittedReq, setLastSubmittedReq] = useState<MeetingRequest | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  
  const [responses, setResponses] = useState<Record<string, string | boolean>>({});
  const [isUrgent, setIsUrgent] = useState(false);

  const [busySlots, setBusySlots] = useState<{start: string, end: string}[]>([]);
  const [businessSettings, setBusinessSettings] = useState<{businessStartHour: number, businessEndHour: number} | null>(null);

  const dateFieldId = useMemo(() => {
    return template.fields.find(f => f.type === 'date')?.id || 'preferredDate';
  }, [template]);

  const timeFieldId = useMemo(() => {
    return template.fields.find(f => f.type === 'time')?.id || 'preferredTime';
  }, [template]);

  const durationFieldId = useMemo(() => {
    return template.fields.find(f => f.label.toLowerCase().includes('duration') || f.id.toLowerCase().includes('duration'))?.id || 'expectedDuration';
  }, [template]);

  useEffect(() => {
    getCalendarAvailability()
      .then(data => {
        if (data && data.busy) {
          setBusySlots(data.busy);
        }
      })
      .catch(err => console.error("Could not fetch calendar availability", err));
      
    getSettings()
      .then(data => setBusinessSettings(data))
      .catch(err => console.error("Could not fetch settings", err));
  }, []);

  const availableTimeSlots = useMemo(() => {
    const selectedDate = responses[dateFieldId] as string;
    if (!selectedDate) return [];

    const slots: string[] = [];
    const dateObj = new Date(selectedDate);
    
    // Use dynamic settings or fallback to 9-17
    const startHour = businessSettings?.businessStartHour ?? 9;
    const endHour = businessSettings?.businessEndHour ?? 17;
    
    for (let hour = startHour; hour <= endHour; hour++) {
      for (let min of [0, 30]) {
        if (hour === endHour && min === 30) continue; // End exactly at endHour:00

        
        const pad = (n: number) => String(n).padStart(2, '0');
        const timeString = `${pad(hour)}:${pad(min)}`; // Local time string
        
        // Build a start Date for this exact slot in local time to compare
        const slotStart = new Date(`${selectedDate}T${timeString}:00`);
        const slotEnd = new Date(slotStart.getTime() + 30 * 60000); // assume 30 min default duration here
        
        // Check if overlaps with any busy block
        const isBusy = busySlots.some(b => {
          const bStart = new Date(b.start);
          const bEnd = new Date(b.end);
          return (slotStart < bEnd && slotEnd > bStart);
        });

        if (!isBusy) {
          slots.push(timeString);
        }
      }
    }
    return slots;
  }, [responses, busySlots, dateFieldId, businessSettings]);

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const formatDateFriendly = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr + 'T00:00:00');
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  const formatTimeFriendly = (timeStr: string) => {
    if (!timeStr) return '';
    try {
      const [hours, minutes] = timeStr.split(':');
      const hourNum = parseInt(hours, 10);
      const ampm = hourNum >= 12 ? 'PM' : 'AM';
      const formattedHour = hourNum % 12 || 12;
      return `${formattedHour}:${minutes} ${ampm}`;
    } catch (e) {
      return timeStr;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Fake network request delay for premium feel
    setTimeout(() => {
      const generatedId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
        ? crypto.randomUUID() 
        : `req-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

      const newRequest: MeetingRequest = {
        id: generatedId,
        formId: template.id,
        createdAt: Date.now(),
        status: 'Pending',
        isUrgent,
        responses,
      };

      onSubmit(newRequest);
      setLastSubmittedReq(newRequest);
      setIsSubmitting(false);
      setSubmitted(true);
    }, 1200);
  };

  const handleChange = (id: string, value: string) => {
    setResponses(prev => ({ ...prev, [id]: value }));
  };

  const renderField = (field: FormField) => {
    const commonClasses = "w-full bg-slate-50/50 border border-slate-200 focus:bg-white text-slate-950 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-[#008FD5] focus:ring-4 focus:ring-[#008FD5]/10 hover:border-slate-300 transition-all placeholder-slate-400";
    
    switch (field.type) {
      case 'textarea':
        return (
          <div key={field.id} className="col-span-1 md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {field.label} {field.required ? '' : <span className="opacity-60 font-normal">(Optional)</span>}
            </label>
            <textarea 
              required={field.required} 
              rows={4} 
              className={`${commonClasses} resize-y`} 
              value={String(responses[field.id] || '')} 
              onChange={e => handleChange(field.id, e.target.value)} 
            />
          </div>
        );
      case 'dropdown':
        return (
          <div key={field.id} className="col-span-1">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {field.label} {field.required ? '' : <span className="opacity-60 font-normal">(Optional)</span>}
            </label>
            <div className="relative">
              <select 
                required={field.required} 
                className={`${commonClasses} appearance-none cursor-pointer pr-10`}
                value={String(responses[field.id] || '')} 
                onChange={e => handleChange(field.id, e.target.value)}
              >
                <option value="" disabled>Select an option</option>
                {field.options?.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        );
      case 'date':
        return (
          <div key={field.id} className="col-span-1">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {field.label} {field.required ? '' : <span className="opacity-60 font-normal">(Optional)</span>}
            </label>
            <input 
              type="date" 
              required={field.required} 
              className={commonClasses} 
              value={String(responses[field.id] || '')} 
              onChange={e => handleChange(field.id, e.target.value)} 
            />
          </div>
        );
      case 'time':
        const selectedDate = responses[dateFieldId] as string;
        return (
          <div key={field.id} className="col-span-1">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                {field.label} {field.required ? '' : <span className="opacity-60 font-normal">(Optional)</span>}
              </label>
              {busySlots.length > 0 && <span className="text-[9px] text-[#008FD5] font-bold bg-sky-50 px-1.5 py-0.5 rounded uppercase tracking-wider">Live Sync</span>}
            </div>
            
            {!selectedDate ? (
               <div className="w-full bg-slate-50/50 border border-slate-200 text-slate-400 rounded-xl px-4 py-3 text-xs flex items-center gap-2 cursor-not-allowed">
                  <CalendarX2 size={14} /> Please select a date first
               </div>
            ) : availableTimeSlots.length === 0 ? (
               <div className="w-full bg-rose-50/50 border border-rose-200 text-rose-500 rounded-xl px-4 py-3 text-xs flex items-center gap-2 cursor-not-allowed">
                  <CalendarX2 size={14} /> No availability on this date
               </div>
            ) : (
              <div className="relative">
                <select 
                  required={field.required} 
                  className={`${commonClasses} appearance-none cursor-pointer pr-10`} 
                  value={String(responses[field.id] || '')} 
                  onChange={e => handleChange(field.id, e.target.value)} 
                >
                  <option value="" disabled>Select a free time slot</option>
                  {availableTimeSlots.map(timeStr => (
                    <option key={timeStr} value={timeStr}>{formatTimeFriendly(timeStr)}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            )}
            
          </div>
        );
      default:
        // text, phone
        const isWide = field.id === 'fullName' || field.id === 'company' || field.id === 'purpose';
        return (
          <div key={field.id} className={`col-span-1 ${isWide ? 'md:col-span-2' : ''}`}>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {field.label} {field.required ? '' : <span className="opacity-60 font-normal">(Optional)</span>}
            </label>
            <input 
              required={field.required} 
              type={field.type === 'phone' ? 'tel' : 'text'} 
              className={commonClasses} 
              value={String(responses[field.id] || '')} 
              onChange={e => handleChange(field.id, e.target.value)} 
            />
          </div>
        );
    }
  };

  return (
    <AnimatePresence mode="wait">
      {submitted && lastSubmittedReq ? (
        <motion.div 
           key="success"
           initial={{ opacity: 0, scale: 0.97, y: 8 }}
           animate={{ opacity: 1, scale: 1, y: 0 }}
           exit={{ opacity: 0, y: -8 }}
           transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
           className="w-full max-w-[560px] flex justify-center relative z-10 mt-lg mb-xxl mx-auto text-left"
        >
          {/* Elegantly ambient backdrop glows */}
          <div className="absolute top-10 right-0 w-[400px] h-[400px] bg-[#008FD5]/5 rounded-full blur-[80px] -z-10 translate-x-1/4 -translate-y-1/4 pointer-events-none"></div>
          <div className="absolute bottom-10 left-0 w-[300px] h-[300px] bg-sky-200/5 rounded-full blur-[60px] -z-10 -translate-x-1/4 translate-y-1/4 pointer-events-none"></div>

          <div className="bg-white border border-slate-200/80 rounded-3xl p-8 md:p-12 text-center w-full shadow-xl relative z-10 flex flex-col items-center">
            {/* Top Badge / Seal */}
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-emerald-50 mb-6 relative border border-emerald-100 shadow-sm">
                <motion.div 
                  initial={{ scale: 0 }} 
                  animate={{ scale: 1 }} 
                  transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 15 }}
                >
                  <CheckCircle2 size={40} className="text-emerald-500" />
                </motion.div>
            </div>

            <h1 className="font-sans text-2xl md:text-3xl font-black text-[#0B1F33] tracking-tight mb-3">Request Received</h1>
            <p className="font-sans text-sm md:text-base text-gray-500 mb-8 max-w-[420px] leading-relaxed">
              {template.successMessage || 'Your executive request has been safely cataloged and is queued for verification.'}
            </p>

            {/* Verified Receipt / Receipt Detail Card */}
            <div className="w-full bg-slate-50/80 border border-slate-200/50 rounded-xl p-4 md:p-5 mb-6 text-left space-y-3.5 relative font-sans">
              <div className="flex items-center justify-between border-b border-slate-200/50 pb-2.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Verification ID</span>
                <div className="flex items-center gap-1.5 bg-white border border-slate-200/80 px-2 py-1 rounded text-[10px] text-[#0B1F33] font-mono shadow-2xs">
                  <span>PEG-{lastSubmittedReq.id.slice(0, 8).toUpperCase()}</span>
                  <button 
                    onClick={() => handleCopyId(`PEG-${lastSubmittedReq.id.slice(0, 8).toUpperCase()}`)}
                    className="text-slate-400 hover:text-[#008FD5] transition-colors focus:outline-none cursor-pointer"
                    title="Copy Reference ID"
                  >
                    {copiedId ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                  </button>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                <div>
                  <span className="text-[10px] text-gray-400 font-medium block">Requester Name</span>
                  <span className="text-[#0B1F33] font-semibold flex items-center gap-1 mt-0.5 max-w-[170px] truncate">
                    <User size={12} className="text-slate-400 shrink-0" />
                    {String(lastSubmittedReq.responses?.fullName || 'Unknown')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-medium block">Institution/Company</span>
                  <span className="text-[#0B1F33] font-semibold block mt-0.5 truncate">
                    {String(lastSubmittedReq.responses?.company || 'Private Citizen')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-medium block">Preferred Slot</span>
                  <span className="text-[#0B1F33] font-semibold flex items-center gap-1 mt-0.5">
                    <Calendar size={12} className="text-[#008FD5] shrink-0" />
                    {formatDateFriendly(String(lastSubmittedReq.responses?.[dateFieldId] || ''))}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-medium block">Proposed Time</span>
                  <span className="text-[#0B1F33] font-semibold flex items-center gap-1 mt-0.5">
                    <Clock size={12} className="text-[#008FD5] shrink-0" />
                    {formatTimeFriendly(String(lastSubmittedReq.responses?.[timeFieldId] || ''))}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-medium block">Expected Duration</span>
                  <span className="text-[#0B1F33] font-semibold block mt-0.5">
                    {String(lastSubmittedReq.responses?.[durationFieldId] || '')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-medium block">Review Priority</span>
                  <span className="block mt-0.5">
                    {lastSubmittedReq.isUrgent ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100">
                        Urgent Escalation
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/60">
                        Standard Review
                      </span>
                    )}
                  </span>
                </div>
              </div>

              <div className="pt-2.5 border-t border-slate-200/50 flex items-center gap-1.5 text-[10px] text-slate-500">
                <ShieldCheck size={12} className="text-emerald-500 shrink-0" />
                <span>Precision Engineering Group — Secure Executive Queue</span>
              </div>
            </div>

            {/* Submit another or back */}
            <div className="w-full flex flex-col gap-2 font-sans">
              <button 
                onClick={() => {
                  setSubmitted(false);
                  setResponses({});
                  setIsUrgent(false);
                }} 
                className="w-full px-5 py-3 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 transition-all hover:shadow-xs focus:outline-none cursor-pointer"
              >
                Submit New Request
              </button>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div 
          key="form"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="w-full max-w-[840px] bg-white rounded-2xl shadow-ambient border border-slate-200/50 p-lg md:p-xxl mt-lg mb-xxl relative font-sans text-left"
        >
          {isSubmitting && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-xs z-20 rounded-2xl flex items-center justify-center">
               <div className="bg-white p-lg rounded-xl shadow-lg border border-slate-200/60 flex flex-col items-center gap-3">
                  <Loader2 className="animate-spin text-[#008FD5]" size={28} />
                  <p className="text-xs font-bold text-[#0B1F33]">Securing Request...</p>
               </div>
            </div>
          )}

          <div className="mb-xl text-center md:text-left border-b border-slate-100 pb-lg">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200/60 text-slate-500 text-[10px] font-semibold mb-3 uppercase tracking-wide">
              <Sparkles size={11} className="text-[#008FD5]" />
              <span>Precision Operations Portal</span>
            </div>
            <h1 className="font-sans text-xl md:text-2xl font-bold text-[#0B1F33] tracking-tight mb-2">{template.title}</h1>
            <p className="font-sans text-xs md:text-sm text-gray-500 max-w-2xl leading-relaxed">
              {template.description}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-lg gap-y-5">
            {template.fields.map(renderField)}

            <div className="col-span-1 md:col-span-2 py-1 mt-2 border-t border-slate-100 pt-5">
              <label className="block text-xs font-semibold text-slate-700 mb-2">Is this urgent?</label>
              <div className="flex gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsUrgent(false)}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs transition-all border cursor-pointer focus:outline-none ${
                    !isUrgent
                      ? 'bg-slate-100 border-slate-300 text-slate-800 shadow-3xs font-semibold'
                      : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${!isUrgent ? 'bg-slate-500' : 'bg-slate-200'}`}></span>
                  Standard Review
                </button>
                <button
                  type="button"
                  onClick={() => setIsUrgent(true)}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs transition-all border cursor-pointer focus:outline-none ${
                    isUrgent
                      ? 'bg-rose-50 border-rose-200 text-rose-700 shadow-3xs font-semibold ring-2 ring-rose-500/5'
                      : 'bg-white border-slate-200 text-slate-400 hover:text-rose-500 hover:bg-rose-50/20'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isUrgent ? 'bg-rose-500 animate-pulse' : 'bg-slate-200'}`}></span>
                  Urgent Escalation
                </button>
              </div>
            </div>

            <div className="col-span-1 md:col-span-2 mt-md flex justify-end">
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full md:w-auto bg-[#008FD5] text-white font-label-md text-xs px-8 py-3.5 rounded-xl hover:bg-[#008FD5]/90 transition-all hover:shadow-md active:scale-97 flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none cursor-pointer focus:outline-none"
              >
                  {isSubmitting ? 'Securing Request...' : 'Submit Meeting Proposal'}
                  {!isSubmitting && <Send size={14} />}
              </button>
            </div>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
