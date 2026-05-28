import React, { useState, useEffect, useMemo } from 'react';
import { MeetingRequest } from '../types';
import { getRequest } from '../lib/db';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  Clock, 
  User, 
  Briefcase, 
  ExternalLink, 
  ShieldCheck, 
  AlertCircle, 
  XCircle, 
  Video, 
  ArrowLeft, 
  Copy, 
  Check, 
  MessageSquare,
  Sparkles,
  Printer
} from 'lucide-react';
import CompanyLogo from './CompanyLogo';

interface RequestDetailProps {
  requestId: string;
  onBackToRequest: () => void;
  onBackToDashboard?: () => void;
  isAdmin?: boolean;
}

export default function RequestDetail({ requestId, onBackToRequest, onBackToDashboard, isAdmin = false }: RequestDetailProps) {
  const [request, setRequest] = useState<MeetingRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedMeet, setCopiedMeet] = useState(false);

  useEffect(() => {
    setLoading(true);
    getRequest(requestId)
      .then(data => {
        setRequest(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [requestId]);

  const handleCopyId = () => {
    if (!request) return;
    navigator.clipboard.writeText(`PEG-${request.id.slice(0, 8).toUpperCase()}`);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyMeet = () => {
    if (!request?.meetLink) return;
    navigator.clipboard.writeText(request.meetLink);
    setCopiedMeet(true);
    setTimeout(() => setCopiedMeet(false), 2000);
  };

  // Helper date/time formats
  const dateFieldId = 'preferredDate';
  const timeFieldId = 'preferredTime';

  const dateValue = request?.responses?.[dateFieldId] || request?.responses?.preferredDate;
  const timeValue = request?.responses?.[timeFieldId] || request?.responses?.preferredTime;

  const formattedDate = useMemo(() => {
    if (!dateValue) return 'No Date Selected';
    try {
      const date = new Date(String(dateValue) + 'T00:00:00');
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', weekday: 'long' });
    } catch (e) {
      return String(dateValue);
    }
  }, [dateValue]);

  const formattedTime = useMemo(() => {
    if (!timeValue) return 'No Time Selected';
    try {
      const [hours, minutes] = String(timeValue).split(':');
      const hourNum = parseInt(hours, 10);
      const ampm = hourNum >= 12 ? 'PM' : 'AM';
      const formattedHour = hourNum % 12 || 12;
      return `${formattedHour}:${minutes} ${ampm}`;
    } catch (e) {
      return String(timeValue);
    }
  }, [timeValue]);

  // Countdown timer calculations
  const countdownText = useMemo(() => {
    if (!dateValue || !timeValue || request?.status !== 'Approved') return null;
    try {
      const targetDate = new Date(`${dateValue}T${timeValue}:00`);
      const now = new Date();
      const diffTime = targetDate.getTime() - now.getTime();
      
      if (diffTime < 0) {
        return "Meeting has already occurred or started.";
      }
      
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
      
      if (diffDays > 0) {
        return `Scheduled to begin in ${diffDays}d ${diffHours}h ${diffMinutes}m`;
      }
      return `Scheduled to begin in ${diffHours}h ${diffMinutes}m`;
    } catch (e) {
      return null;
    }
  }, [dateValue, timeValue, request?.status]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#008FD5] border-t-transparent animate-spin"></div>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Verifying Receipt...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-4 font-sans relative z-10">
        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-rose-100 shadow-sm">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-bold text-[#0B1F33] tracking-tight">Receipt Not Found</h2>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          The booking reference code does not match any current meeting in our records. Please verify the URL parameter or contact operations.
        </p>
        <button 
          onClick={onBackToRequest}
          className="mt-6 inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Intake Portal</span>
        </button>
      </div>
    );
  }

  const isPending = request.status === 'Pending';
  const isApproved = request.status === 'Approved';
  const isDeclined = request.status === 'Declined';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-[720px] mx-auto py-4 px-2 md:px-4 font-sans text-left relative z-10"
    >
      {/* Ambient backgrounds */}
      <div className="absolute top-10 right-0 w-[450px] h-[450px] bg-[#008FD5]/5 rounded-full blur-[90px] -z-10 pointer-events-none" />
      <div className="absolute bottom-10 left-0 w-[350px] h-[350px] bg-sky-200/5 rounded-full blur-[70px] -z-10 pointer-events-none" />

      {/* Header controls */}
      <div className="flex justify-between items-center mb-6">
        <button 
          onClick={isAdmin && onBackToDashboard ? onBackToDashboard : onBackToRequest}
          className="inline-flex items-center gap-1.5 text-xs font-black text-slate-500 hover:text-[#0B1F33] transition-colors cursor-pointer select-none"
        >
          <ArrowLeft size={14} />
          <span>{isAdmin ? 'Back to Dashboard' : 'Back to Intake Portal'}</span>
        </button>
        
        <button 
          onClick={() => window.print()}
          className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#008FD5] transition-colors cursor-pointer select-none border border-slate-200/80 hover:border-slate-300 rounded-lg px-2.5 py-1 bg-white"
        >
          <Printer size={13} />
          <span>Print Receipt</span>
        </button>
      </div>

      {/* Main Glassmorphism Ticket Card */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-[0_15px_45px_rgba(11,31,51,0.08)] relative">
        
        {/* Top styling strip */}
        <div className="h-2 w-full bg-[#0B1F33]" />

        {/* Ticket Header */}
        <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <CompanyLogo size="sm" />
            <div>
              <h1 className="text-sm font-black text-[#0B1F33] tracking-tight uppercase">Yunus Operations Hub</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Verified Meeting Receipt</p>
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end gap-1 font-mono">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Reference ID</span>
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-[10px] text-[#0B1F33] font-bold shadow-3xs">
              <span>PEG-{request.id.slice(0, 8).toUpperCase()}</span>
              <button 
                onClick={handleCopyId}
                className="text-slate-400 hover:text-[#008FD5] cursor-pointer"
                title="Copy ID"
              >
                {copiedId ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
              </button>
            </div>
          </div>
        </div>

        {/* --- DYNAMIC STATUS WIDGET --- */}
        <div className="px-6 md:px-8 py-5 border-b border-slate-100">
          <AnimatePresence mode="wait">
            {isPending && (
              <motion.div 
                key="pending"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row gap-4 items-start select-none"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200/50 shadow-3xs">
                  <AlertCircle size={20} className="animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Pending Executive Review</span>
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  </h3>
                  <p className="text-xs text-amber-800 leading-relaxed font-sans max-w-xl">
                    This scheduling request has been logged successfully and is currently under strategic review by our executive team. Status updates, confirmations, and meeting coordinates will publish automatically here.
                  </p>
                </div>
              </motion.div>
            )}

            {isApproved && (
              <motion.div 
                key="approved"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 flex flex-col gap-4.5"
              >
                <div className="flex flex-col sm:flex-row gap-4 items-start select-none">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200/50 shadow-3xs">
                    <ShieldCheck size={20} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                      <span>Authorization Confirmed</span>
                      <Sparkles size={11} className="text-emerald-600 animate-pulse" />
                    </h3>
                    <p className="text-xs text-emerald-800 leading-relaxed font-sans max-w-xl">
                      Congratulations! Your meeting request has been authorized and securely synchronized with the executive calendar schedule. All coordinates are published below.
                    </p>
                  </div>
                </div>

                {/* Countdown and Meet Box */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1.5 border-t border-emerald-200/30">
                  {countdownText && (
                    <div className="bg-white/80 border border-emerald-200/50 rounded-xl p-3 flex flex-col justify-center">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider select-none">Timeline Countdown</span>
                      <span className="text-[11px] font-bold text-slate-800 mt-0.5">{countdownText}</span>
                    </div>
                  )}
                  {request.meetLink && (
                    <div className="bg-white/80 border border-emerald-200/50 rounded-xl p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-[9px] font-black text-[#008FD5] uppercase tracking-wider select-none flex items-center gap-1">
                          <Video size={10} /> Google Meet Join Link
                        </span>
                        <p className="text-[10px] font-mono text-slate-500 mt-0.5 truncate pr-2 select-all">
                          {request.meetLink}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={handleCopyMeet}
                          className="p-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 shrink-0 cursor-pointer"
                          title="Copy Link"
                        >
                          {copiedMeet ? <Check size={11} className="text-emerald-500 font-bold" /> : <Copy size={11} />}
                        </button>
                        <a 
                          href={request.meetLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-1.5 bg-[#008FD5] text-white hover:bg-[#0076B0] rounded-lg shrink-0 flex items-center justify-center"
                          title="Launch Meet"
                        >
                          <ExternalLink size={11} />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {isDeclined && (
              <motion.div 
                key="declined"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row gap-4 items-start select-none"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200/50 shadow-3xs">
                  <XCircle size={20} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Scheduling Conflict</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-sans max-w-xl">
                    Due to prior commitments or scheduling limits on the requested slot, we regret that we could not accommodate this meeting at this time. We apologize for the inconvenience and welcome a new booking request for an alternative date.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* --- TICKET DETAILS GRID --- */}
        <div className="p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black text-[#0B1F33] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md uppercase tracking-wider">Booking Details</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 text-xs font-sans">
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Guest / Requester</span>
              <span className="text-sm text-[#0B1F33] font-bold flex items-center gap-1.5 mt-1">
                <User size={14} className="text-[#008FD5] shrink-0" />
                {String(request.responses?.fullName || 'Private Guest')}
              </span>
            </div>

            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Institution / Company</span>
              <span className="text-sm text-[#0B1F33] font-bold flex items-center gap-1.5 mt-1">
                <Briefcase size={14} className="text-[#008FD5] shrink-0" />
                {String(request.responses?.company || 'Private Corporation')}
              </span>
            </div>

            <div className="border-t border-slate-50 pt-4.5">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Scheduled Date</span>
              <span className="text-sm text-[#0B1F33] font-bold flex items-center gap-1.5 mt-1">
                <Calendar size={14} className="text-[#008FD5] shrink-0" />
                {formattedDate}
              </span>
            </div>

            <div className="border-t border-slate-50 pt-4.5">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Proposed Time</span>
              <span className="text-sm text-[#0B1F33] font-bold flex items-center gap-1.5 mt-1">
                <Clock size={14} className="text-[#008FD5] shrink-0" />
                {formattedTime}
              </span>
            </div>

            {request.responses?.expectedDuration && (
              <div className="border-t border-slate-50 pt-4.5">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Expected Duration</span>
                <span className="text-sm text-[#0B1F33] font-bold mt-1.5 block">
                  {String(request.responses.expectedDuration)}
                </span>
              </div>
            )}

            {request.responses?.category && (
              <div className="border-t border-slate-50 pt-4.5">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Meeting Category</span>
                <span className="inline-block mt-1.5 text-[10px] font-black text-[#0B1F33] bg-[#008FD5]/5 border border-[#008FD5]/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {String(request.responses.category)}
                </span>
              </div>
            )}
          </div>

          {request.responses?.purpose && (
            <div className="border-t border-slate-100 pt-6">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Inbound Purpose of Meeting</span>
              <p className="text-xs text-slate-700 leading-relaxed mt-2 font-sans pl-1 border-l-2 border-[#008FD5]/30">
                {String(request.responses.purpose)}
              </p>
            </div>
          )}

          {request.responses?.context && (
            <div className="border-t border-slate-100 pt-6">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Supporting Context / Agenda</span>
              <p className="text-xs text-slate-600 leading-relaxed mt-2 font-sans pl-1">
                {String(request.responses.context)}
              </p>
            </div>
          )}
        </div>

        {/* Card Footer branding */}
        <div className="bg-slate-50/80 px-6 md:px-8 py-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] font-sans text-slate-400 select-none">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-emerald-500" />
            <span className="font-bold">Authorized Operations Portal Integration</span>
          </div>
          <div>
            <span>Security: SHA-256 Digital Verification Seal</span>
          </div>
        </div>

      </div>

      {/* Operations Help Box */}
      <div className="mt-6 bg-[#F8FAFC] border border-slate-200/60 rounded-2xl p-5 flex items-center justify-between gap-4 font-sans select-none">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl">
            <MessageSquare size={16} />
          </div>
          <div>
            <h4 className="text-[11px] font-bold text-slate-800">Have questions about this schedule?</h4>
            <p className="text-[10px] text-slate-400 font-medium">Get in touch directly with our operational support team.</p>
          </div>
        </div>
        <a 
          href="https://wa.me/message" 
          target="_blank" 
          rel="noopener noreferrer"
          className="px-3.5 py-1.5 bg-[#16a34a]/10 hover:bg-[#16a34a]/20 text-[#15803d] rounded-xl text-[11px] font-black transition-all flex items-center gap-1 cursor-pointer shrink-0"
        >
          <span>Support Chat</span>
        </a>
      </div>

    </motion.div>
  );
}
