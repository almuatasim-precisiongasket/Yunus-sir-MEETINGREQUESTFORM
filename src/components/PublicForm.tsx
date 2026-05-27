import React, { useState, useEffect, useMemo } from 'react';
import { MeetingRequest, FormTemplate, FormField } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, ChevronDown, Send, Loader2, Copy, Check, Calendar, Clock, User, ShieldCheck, Sparkles, CalendarX2, ChevronLeft, ChevronRight } from 'lucide-react';
import { getCalendarAvailability, getSettings } from '../lib/db';

interface CustomDatePickerProps {
  value: string;
  onChange: (val: string) => void;
  hasError: boolean;
}

function CustomDatePicker({ value, onChange, hasError }: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => {
    if (value) {
      try {
        return new Date(value + 'T00:00:00');
      } catch (e) {}
    }
    return new Date();
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // First day of month (0-6)
  const firstDayIndex = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleSelectDay = (day: number) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
    onChange(dateStr);
    setIsOpen(false); // Close dropdown on selection
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Generate days array
  const days = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const cellDate = new Date(year, month, i);
    cellDate.setHours(0, 0, 0, 0);
    const isPast = cellDate < today;
    const isSelected = value === `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const isToday = today.getTime() === cellDate.getTime();
    days.push({ day: i, isPast, isSelected, isToday });
  }

  const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const displayValue = () => {
    if (!value) return "Select preferred date...";
    try {
      const d = new Date(value + 'T00:00:00');
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return value;
    }
  };

  return (
    <div className="w-full relative flex flex-col">
      {/* Clickable Trigger Input */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-slate-50/50 border text-slate-950 rounded-xl px-4 py-3 text-xs flex items-center justify-between cursor-pointer transition-all ${
          isOpen 
            ? 'bg-white border-[#008FD5] ring-4 ring-[#008FD5]/10' 
            : hasError 
            ? 'border-red-400 focus:border-red-400 focus:ring-red-400/10' 
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <div className="flex items-center gap-2">
          <Calendar size={14} className={value ? 'text-[#008FD5]' : 'text-slate-400'} />
          <span className={value ? 'font-bold text-slate-900' : 'text-slate-400 font-semibold'}>
            {displayValue()}
          </span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={14} className="text-slate-400" />
        </motion.div>
      </div>

      {/* Dropdown Calendar Grid */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xl w-full font-sans z-30"
          >
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
              <h4 className="text-xs font-black text-slate-800 tracking-tight">{monthNames[month]} {year}</h4>
              <div className="flex gap-1.5">
                <motion.button 
                  type="button" 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handlePrevMonth}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer flex items-center justify-center border border-slate-100"
                >
                  <ChevronLeft size={13} className="stroke-[2.5px]" />
                </motion.button>
                <motion.button 
                  type="button" 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleNextMonth}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer flex items-center justify-center border border-slate-100"
                >
                  <ChevronRight size={13} className="stroke-[2.5px]" />
                </motion.button>
              </div>
            </div>

            {/* Weekdays Headers */}
            <div className="grid grid-cols-7 gap-1 text-center mb-2 font-sans">
              {weekdays.map(d => (
                <span key={d} className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{d}</span>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 text-center font-sans">
              {/* Empty cells for leading offset */}
              {Array.from({ length: firstDayIndex }).map((_, idx) => (
                <span key={`empty-${idx}`} className="h-7 w-7 flex items-center justify-center"></span>
              ))}

              {/* Real Day cells */}
              {days.map(({ day, isPast, isSelected, isToday }) => (
                <button
                  key={day}
                  type="button"
                  disabled={isPast}
                  onClick={() => handleSelectDay(day)}
                  className={`h-7 w-7 rounded-lg text-xs font-bold flex items-center justify-center relative cursor-pointer transition-all duration-150 select-none ${
                    isPast 
                      ? 'text-slate-200 cursor-not-allowed font-medium' 
                      : isSelected 
                      ? 'text-white' 
                      : isToday 
                      ? 'text-[#008FD5] bg-sky-50/70 border border-sky-100/50' 
                      : 'text-slate-700 hover:bg-slate-50 hover:text-[#008FD5]'
                  }`}
                >
                  {isSelected && (
                    <motion.div 
                      layoutId="active-date-pill"
                      className="absolute inset-0 bg-[#008FD5] rounded-lg -z-10 shadow-sm shadow-blue-500/20"
                      transition={{ type: "spring", stiffness: 380, damping: 28 }}
                    />
                  )}
                  <span>{day}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface PublicFormProps {
  template: FormTemplate;
  onSubmit: (req: MeetingRequest) => void;
}

export default function PublicForm({ template, onSubmit }: PublicFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [lastSubmittedReq, setLastSubmittedReq] = useState<MeetingRequest | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  
  const [responses, setResponses] = useState<Record<string, string | boolean>>({});
  const [priority, setPriority] = useState<'Normal' | 'Important' | 'Urgent'>('Normal');
  const [honeypot, setHoneypot] = useState('');

  const [busySlots, setBusySlots] = useState<{start: string, end: string}[]>([]);
  const [businessSettings, setBusinessSettings] = useState<{businessStartHour: number, businessEndHour: number} | null>(null);

  // Micro-interaction validation and morphing states
  const [errorFields, setErrorFields] = useState<Record<string, string>>({});
  const [shakingFields, setShakingFields] = useState<Record<string, boolean>>({});
  const [submitState, setSubmitState] = useState<'idle' | 'loading' | 'success'>('idle');

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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const newShaking: Record<string, boolean> = {};
    let isValid = true;

    template.fields.forEach(field => {
      const value = responses[field.id];
      
      // Required validation check
      if (field.required && (!value || String(value).trim() === '')) {
        newErrors[field.id] = `${field.label} is required.`;
        newShaking[field.id] = true;
        isValid = false;
      }
      
      // Phone format validation check
      if (field.type === 'phone' && value && String(value).trim() !== '') {
        const phoneClean = String(value).replace(/\D/g, '');
        if (phoneClean.length < 6) {
          newErrors[field.id] = `Please enter a valid phone number.`;
          newShaking[field.id] = true;
          isValid = false;
        }
      }
    });

    setErrorFields(newErrors);
    setShakingFields(newShaking);

    // Reset shaking states after animation completes
    if (!isValid) {
      setTimeout(() => {
        setShakingFields({});
      }, 600);
    }

    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot) {
      console.warn("Spam bot submission caught via honeypot.");
      setSubmitted(true);
      return;
    }

    setErrorFields({});
    if (!validateForm()) {
      return;
    }

    setSubmitState('loading');
    
    // Premium loading delay simulation
    setTimeout(() => {
      const generatedId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
        ? crypto.randomUUID() 
        : `req-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

      const newRequest: MeetingRequest = {
        id: generatedId,
        formId: template.id,
        createdAt: Date.now(),
        status: 'Pending',
        isUrgent: priority === 'Urgent' || priority === 'Important',
        priority,
        responses,
      };

      onSubmit(newRequest);
      setLastSubmittedReq(newRequest);
      
      setSubmitState('success');
      
      // Delay revealing the success screen to showcase checkmark morph
      setTimeout(() => {
        setSubmitted(true);
        setSubmitState('idle');
      }, 1000);
    }, 1500);
  };

  const handleChange = (id: string, value: string) => {
    setResponses(prev => ({ ...prev, [id]: value }));
  };

  const renderField = (field: FormField) => {
    const commonClasses = "w-full bg-slate-50/50 border border-slate-200 focus:bg-white text-slate-950 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-[#008FD5] focus:ring-4 focus:ring-[#008FD5]/10 hover:border-slate-300 transition-all placeholder-slate-400";
    
    const isWide = field.id === 'fullName' || field.id === 'company' || field.id === 'purpose';
    const hasError = !!errorFields[field.id];

    // Helper wrapper component for Framer Motion micro-interactions (shake, hover lifts, error fades)
    const inputWrapper = (children: React.ReactNode) => (
      <motion.div
        key={field.id}
        className={`col-span-1 ${isWide ? 'md:col-span-2' : ''} flex flex-col`}
        animate={shakingFields[field.id] ? { x: [-8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        whileHover={{ y: -1.5 }}
      >
        {children}
        <AnimatePresence>
          {hasError && (
            <motion.span
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="text-[10px] text-red-500 font-semibold mt-1 pl-1"
            >
              {errorFields[field.id]}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    );

    const clearError = () => {
      if (errorFields[field.id]) {
        setErrorFields(prev => {
          const fresh = { ...prev };
          delete fresh[field.id];
          return fresh;
        });
      }
    };
    
    switch (field.type) {
      case 'textarea':
        return inputWrapper(
          <>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {field.label} {field.required ? '' : <span className="opacity-60 font-normal">(Optional)</span>}
            </label>
            <textarea 
              rows={4} 
              placeholder={field.placeholder}
              className={`${commonClasses} resize-y ${hasError ? 'border-red-400 focus:border-red-400 focus:ring-red-400/10' : ''}`} 
              value={String(responses[field.id] || '')} 
              onChange={e => { handleChange(field.id, e.target.value); clearError(); }} 
            />
          </>
        );
      case 'dropdown':
        return inputWrapper(
          <>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {field.label} {field.required ? '' : <span className="opacity-60 font-normal">(Optional)</span>}
            </label>
            <div className="relative">
              <select 
                className={`${commonClasses} appearance-none cursor-pointer pr-10 ${hasError ? 'border-red-400 focus:border-red-400 focus:ring-red-400/10' : ''}`}
                value={String(responses[field.id] || '')} 
                onChange={e => { handleChange(field.id, e.target.value); clearError(); }}
              >
                <option value="" disabled>Select an option</option>
                {field.options?.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </>
        );
      case 'date':
        return inputWrapper(
          <>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              {field.label} {field.required ? '' : <span className="opacity-60 font-normal">(Optional)</span>}
            </label>
            <CustomDatePicker 
              value={String(responses[field.id] || '')} 
              onChange={val => { handleChange(field.id, val); clearError(); }}
              hasError={hasError}
            />
          </>
        );
      case 'time':
        const selectedDate = responses[dateFieldId] as string;
        return inputWrapper(
          <>
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
                  className={`${commonClasses} appearance-none cursor-pointer pr-10 ${hasError ? 'border-red-400 focus:border-red-400 focus:ring-red-400/10' : ''}`} 
                  value={String(responses[field.id] || '')} 
                  onChange={e => { handleChange(field.id, e.target.value); clearError(); }} 
                >
                  <option value="" disabled>Select a free time slot</option>
                  {availableTimeSlots.map(timeStr => (
                    <option key={timeStr} value={timeStr}>{formatTimeFriendly(timeStr)}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            )}
          </>
        );
      default:
        // text, phone
        return inputWrapper(
          <>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {field.label} {field.required ? '' : <span className="opacity-60 font-normal">(Optional)</span>}
            </label>
            <input 
              type={field.type === 'phone' ? 'tel' : 'text'} 
              placeholder={field.placeholder}
              className={`${commonClasses} ${hasError ? 'border-red-400 focus:border-red-400 focus:ring-red-400/10' : ''}`} 
              value={String(responses[field.id] || '')} 
              onChange={e => { handleChange(field.id, e.target.value); clearError(); }} 
            />
          </>
        );
    }
  };

  return (
    <AnimatePresence mode="wait">
      {submitted && lastSubmittedReq ? (
        <motion.div 
           key="success"
           initial={{ opacity: 0, scale: 0.97, y: 15 }}
           animate={{ opacity: 1, scale: 1, y: 0 }}
           exit={{ opacity: 0, y: -15 }}
           transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
           className="w-full max-w-[560px] flex justify-center relative z-10 mt-lg mb-xxl mx-auto text-left"
        >
          {/* Ambient background glows */}
          <div className="absolute top-10 right-0 w-[400px] h-[400px] bg-[#008FD5]/5 rounded-full blur-[80px] -z-10 translate-x-1/4 -translate-y-1/4 pointer-events-none"></div>
          <div className="absolute bottom-10 left-0 w-[300px] h-[300px] bg-sky-200/5 rounded-full blur-[60px] -z-10 -translate-x-1/4 translate-y-1/4 pointer-events-none"></div>

          <div className="bg-white bg-texture border border-slate-200/80 rounded-3xl p-8 md:p-12 text-center w-full shadow-xl relative z-10 flex flex-col items-center">
            {/* Top Seal / Badge */}
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

            {/* Verified Receipt Detail Card */}
            <div className="w-full bg-slate-50/80 border border-slate-200/50 rounded-xl p-4 md:p-5 mb-6 text-left space-y-3.5 relative font-sans">
              <div className="flex items-center justify-between border-b border-slate-200/50 pb-2.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Verification ID</span>
                <div className="flex items-center gap-1.5 bg-white border border-slate-200/80 px-2.5 py-1 rounded-lg text-[10px] text-[#0B1F33] font-mono shadow-2xs">
                  <span>PEG-{lastSubmittedReq.id.slice(0, 8).toUpperCase()}</span>
                  
                  <motion.button 
                    whileTap={{ scale: 0.85 }}
                    onClick={() => handleCopyId(`PEG-${lastSubmittedReq.id.slice(0, 8).toUpperCase()}`)}
                    className="text-slate-400 hover:text-[#008FD5] transition-colors focus:outline-none cursor-pointer p-0.5"
                    title="Copy Reference ID"
                  >
                    <AnimatePresence mode="wait">
                      {copiedId ? (
                        <motion.div
                          key="copied"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          transition={{ type: "spring", stiffness: 300, damping: 15 }}
                        >
                          <Check size={11} className="text-emerald-500" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="copy"
                          initial={{ scale: 0.8 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0.8 }}
                        >
                          <Copy size={11} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </div>
              </div>

              {/* Grid Content */}
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
                    {lastSubmittedReq.priority === 'Urgent' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100">
                        Urgent
                      </span>
                    ) : lastSubmittedReq.priority === 'Important' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                        Important
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/60">
                        Normal
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

            {/* Back Actions */}
            <div className="w-full flex flex-col gap-2 font-sans">
              <button 
                onClick={() => {
                  setSubmitted(false);
                  setResponses({});
                  setPriority('Normal');
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
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          className="w-full max-w-[840px] bg-white bg-texture rounded-2xl shadow-ambient border border-slate-200/50 p-lg md:p-xxl mt-lg mb-xxl relative font-sans text-left"
        >
          <div className="mb-xl text-center md:text-left border-b border-slate-100 pb-lg">
            <h1 className="font-sans text-xl md:text-2xl font-bold text-[#0B1F33] tracking-tight mb-2">{template.title}</h1>
            <p className="font-sans text-xs md:text-sm text-gray-500 max-w-2xl leading-relaxed">
              {template.description}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-lg gap-y-5">
            {/* Honeypot Spam Trap */}
            <div className="hidden" aria-hidden="true">
              <input 
                type="text" 
                name="website_url_field" 
                value={honeypot} 
                onChange={e => setHoneypot(e.target.value)} 
                tabIndex={-1} 
                autoComplete="off" 
              />
            </div>

            {template.fields.map(renderField)}

            <div className="col-span-1 md:col-span-2 py-1 mt-2 border-t border-slate-100 pt-5">
              <label className="block text-xs font-semibold text-slate-700 mb-2">Request Priority</label>
              <div className="flex flex-wrap gap-3 w-full sm:w-auto relative p-1 bg-slate-100/50 rounded-2xl border border-slate-200/40">
                {/* Normal button */}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setPriority('Normal')}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium text-xs cursor-pointer focus:outline-none relative transition-colors duration-200 overflow-hidden"
                  style={{ color: priority === 'Normal' ? '#0B1F33' : '#64748b', zIndex: 10 }}
                >
                  {priority === 'Normal' && (
                    <motion.div
                      layoutId="active-priority"
                      className="absolute inset-0 bg-white border border-slate-300/60 shadow-sm rounded-xl -z-10"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className={`w-1.5 h-1.5 rounded-full ${priority === 'Normal' ? 'bg-slate-500' : 'bg-slate-300'}`}></span>
                  Normal
                </motion.button>

                {/* Important button */}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setPriority('Important')}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium text-xs cursor-pointer focus:outline-none relative transition-colors duration-200 overflow-hidden"
                  style={{ color: priority === 'Important' ? '#d97706' : '#64748b', zIndex: 10 }}
                >
                  {priority === 'Important' && (
                    <motion.div
                      layoutId="active-priority"
                      className="absolute inset-0 bg-amber-50 border border-amber-200 shadow-sm rounded-xl -z-10"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className={`w-1.5 h-1.5 rounded-full ${priority === 'Important' ? 'bg-amber-500' : 'bg-slate-300'}`}></span>
                  Important
                </motion.button>

                {/* Urgent button */}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setPriority('Urgent')}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium text-xs cursor-pointer focus:outline-none relative transition-colors duration-200 overflow-hidden"
                  style={{ color: priority === 'Urgent' ? '#e11d48' : '#64748b', zIndex: 10 }}
                >
                  {priority === 'Urgent' && (
                    <motion.div
                      layoutId="active-priority"
                      className="absolute inset-0 bg-rose-50 border border-rose-200 shadow-sm rounded-xl -z-10"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className={`w-1.5 h-1.5 rounded-full ${priority === 'Urgent' ? 'bg-rose-500 animate-pulse' : 'bg-slate-300'}`}></span>
                  Urgent
                </motion.button>
              </div>
            </div>

            <div className="col-span-1 md:col-span-2 mt-md flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 border-t border-slate-100">
              <span className="text-[10px] md:text-xs text-slate-400 font-medium flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-[#008FD5]" /> All submissions are reviewed confidentially by our coordination office.
              </span>
              
              <div className="flex items-center justify-end w-full sm:w-auto h-[48px]">
                <motion.button 
                  type="submit" 
                  disabled={submitState !== 'idle'}
                  layout
                  animate={{
                    width: submitState === 'idle' ? 'auto' : '48px',
                    borderRadius: submitState === 'idle' ? '12px' : '9999px',
                    backgroundColor: submitState === 'success' ? '#10b981' : '#008FD5',
                  }}
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                  className="text-white font-label-md text-xs px-8 py-3.5 flex items-center justify-center gap-2 cursor-pointer focus:outline-none shrink-0 min-w-[48px] h-[48px]"
                  style={{ overflow: 'hidden' }}
                >
                  <AnimatePresence mode="wait">
                    {submitState === 'idle' && (
                      <motion.div 
                        key="idle"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center gap-2 whitespace-nowrap"
                      >
                        <span>Submit Meeting Proposal</span>
                        <Send size={14} />
                      </motion.div>
                    )}
                    {submitState === 'loading' && (
                      <motion.div 
                        key="loading"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center justify-center shrink-0"
                      >
                        <Loader2 className="animate-spin text-white" size={18} />
                      </motion.div>
                    )}
                    {submitState === 'success' && (
                      <motion.div 
                        key="success"
                        initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        className="flex items-center justify-center shrink-0"
                      >
                        <Check size={20} className="stroke-[3px] text-white" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              </div>
            </div>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
