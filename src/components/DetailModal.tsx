import React, { useState, useEffect } from 'react';
import { MeetingRequest, RequestStatus } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Clock, Building2, Phone, Mail, AlertTriangle, ChevronDown, Trash2, Video, ExternalLink, Loader2 } from 'lucide-react';
import { findExistingCalendarEvent, syncToGoogleCalendar } from '../lib/googleCalendar';
import { getForms, updateRequestLinks } from '../lib/db';

interface DetailModalProps {
  request: MeetingRequest;
  onClose: () => void;
  onUpdateStatus: (s: RequestStatus) => void;
  onDelete?: () => void;
  googleToken?: string | null;
  onConnectGoogle?: () => void;
}

export default function DetailModal({ request, onClose, onUpdateStatus, onDelete, googleToken, onConnectGoogle }: DetailModalProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [existingEvent, setExistingEvent] = useState<any | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(false);

  const [formTemplate, setFormTemplate] = useState<any | null>(null);

  useEffect(() => {
    getForms()
      .then(forms => {
        const matched = forms.find((f: any) => f.id === request.formId);
        setFormTemplate(matched || null);
      })
      .catch(console.error);
  }, [request.formId]);

  useEffect(() => {
    if (googleToken && request.id) {
      setLoadingEvent(true);
      findExistingCalendarEvent(googleToken, request.id)
        .then(event => {
          setExistingEvent(event);
        })
        .catch(err => console.error(err))
        .finally(() => setLoadingEvent(false));
    } else {
      setExistingEvent(null);
    }
  }, [googleToken, request.id]);

  const handleSyncToCalendar = async () => {
    if (!googleToken) return;
    setIsSyncing(true);
    setSyncError('');
    try {
      const result = await syncToGoogleCalendar(googleToken, request);
      const event = await findExistingCalendarEvent(googleToken, request.id);
      setExistingEvent(event);
      // Save calendar and meet links back to firestore/localStorage
      if (result && (result.htmlLink || result.hangoutLink)) {
        await updateRequestLinks(request.id, result.htmlLink || '', result.hangoutLink || '');
      }
    } catch (err: any) {
      console.error(err);
      setSyncError(err.message || 'Failed to sync event to Google Calendar');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
      animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
      exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 bg-inverse-surface/30 z-50 flex items-center justify-center p-md"
    >
       <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-surface-container-lowest w-full max-w-2xl rounded-xl border border-outline-variant/30 shadow-[0_8px_24px_rgba(0,0,0,0.12)] flex flex-col max-h-[90vh] overflow-hidden"
       >
          {/* Header */}
          <div className="px-4 md:px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white w-full shrink-0">
             <div className="text-[#0B1F33] text-base md:text-lg font-bold tracking-tight">Request Details</div>
             <button onClick={onClose} className="text-gray-500 hover:text-gray-900 transition-colors flex items-center justify-center p-1 rounded-full hover:bg-gray-100 focus:outline-none">
                <X size={18} />
             </button>
          </div>

          <div className="p-4 md:p-6 overflow-y-auto flex-1 space-y-4 md:space-y-6 bg-white">
              {request.isUrgent && (
                  <div className="bg-red-50 p-3 rounded-lg border border-red-100 flex items-center gap-2">
                      <AlertTriangle size={16} className="text-red-500 shrink-0" />
                      <span className="text-red-700 text-xs font-semibold">Marked as Urgent Notification</span>
                  </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <h2 className="text-base md:text-lg font-bold text-[#0B1F33] tracking-tight">{String(request.responses?.fullName || '')}</h2>
                      <div className="text-xs text-gray-500 flex flex-col gap-1.5 mt-2">
                          <span className="flex items-center gap-2"><Building2 size={14} className="text-gray-400" /> {String(request.responses?.company || '') || 'Individual Request'}</span>
                          <span className="flex items-center gap-2"><Phone size={14} className="text-gray-400" /> {String(request.responses?.phoneNumber || '') || 'No Phone Number'}</span>
                          {request.responses?.email && (
                            <span className="flex items-center gap-2"><Mail size={14} className="text-gray-400" /> {String(request.responses.email)}</span>
                          )}
                      </div>
                  </div>
                  <div className="md:text-right mt-2 md:mt-0">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Update Status</label>
                      <div className="relative inline-block w-full md:w-auto mt-1">
                        <select 
                            className="w-full md:w-auto bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-8 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/10 appearance-none cursor-pointer"
                            value={request.status}
                            onChange={(e) => onUpdateStatus(e.target.value as RequestStatus)}
                        >
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approved</option>
                            <option value="Follow-up Needed">Follow-up Needed</option>
                            <option value="Declined">Declined</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="col-span-2 md:col-span-1">
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Category</p>
                     <p className="text-xs md:text-sm text-[#0B1F33] font-semibold">{String(request.responses?.category || '')}</p>
                  </div>
                  {request.responses?.source && (
                    <div className="col-span-2 md:col-span-1">
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Contact Source</p>
                       <p className="text-xs md:text-sm text-[#0B1F33] font-semibold">{String(request.responses.source)}</p>
                    </div>
                  )}
                  <div className="col-span-2 md:col-span-1 mt-2">
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Proposed Date</p>
                     <p className="text-xs md:text-sm text-[#0B1F33] font-semibold flex items-center gap-1.5">
                        <Calendar size={13} className="text-[#008FD5]" /> 
                        {String(request.responses?.preferredDate || '')}
                     </p>
                  </div>
                  <div className="col-span-2 md:col-span-1 mt-2">
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Proposed Time</p>
                     <p className="text-xs md:text-sm text-[#0B1F33] font-semibold flex items-center gap-1.5">
                        <Clock size={13} className="text-[#008FD5]" /> 
                        {String(request.responses?.preferredTime || '')} <span className="text-gray-400 font-normal">({String(request.responses?.expectedDuration || '')})</span>
                     </p>
                  </div>
              </div>

              <div>
                  <h3 className="text-[10px] font-bold text-[#6B7280] border-b border-gray-100 pb-1 mb-2 tracking-wide uppercase font-sans">Purpose of Meeting</h3>
                  <p className="text-xs md:text-sm text-gray-700 leading-relaxed font-sans">{String(request.responses?.purpose || '')}</p>
              </div>

              <div>
                  <h3 className="text-[10px] font-bold text-[#6B7280] border-b border-gray-100 pb-1 mb-2 tracking-wide uppercase font-sans">Context / Notes</h3>
                  <div className="bg-gray-50/50 p-3 rounded-lg border border-gray-100/60">
                     <p className="text-xs md:text-sm text-gray-600 whitespace-pre-wrap leading-relaxed font-sans">{String(request.responses?.context || '') || "No additional context provided."}</p>
                  </div>
              </div>

              {(() => {
                const standardIds = ['fullName', 'email', 'company', 'phoneNumber', 'category', 'source', 'preferredDate', 'preferredTime', 'expectedDuration', 'purpose', 'context'];
                const customFields = formTemplate?.fields.filter((f: any) => !standardIds.includes(f.id)) || [];
                const hasAnswers = customFields.some((f: any) => request.responses[f.id] !== undefined && request.responses[f.id] !== '');
                if (!hasAnswers) return null;
                return (
                  <div>
                      <h3 className="text-[10px] font-bold text-[#6B7280] border-b border-gray-100 pb-1 mb-2 tracking-wide uppercase font-sans">Additional Information</h3>
                      <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/50 grid grid-cols-1 md:grid-cols-2 gap-4 font-sans text-xs">
                         {customFields.map((field: any) => {
                           const val = request.responses[field.id];
                           if (val === undefined || val === '') return null;
                           return (
                             <div key={field.id} className="col-span-2 md:col-span-1">
                               <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-0.5">{field.label}</span>
                               <span className="text-[#0B1F33] font-semibold block">{String(val)}</span>
                             </div>
                           );
                         })}
                      </div>
                  </div>
                );
              })()}

              {/* Google Calendar Integration Panel */}
              {request.status === 'Approved' && (
                <div className="bg-sky-50/50 rounded-xl border border-sky-100 p-4 font-sans border-dashed">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1 px-1.5 bg-sky-100 rounded text-[#008FD5] text-[10px] font-bold uppercase tracking-wide">
                      Google Workspace
                    </div>
                    <h4 className="text-xs font-bold text-[#0B1F33]">Google Calendar Sync</h4>
                  </div>

                  {loadingEvent ? (
                    <div className="flex items-center gap-2 text-xs text-gray-400 py-1">
                      <Loader2 size={12} className="animate-spin text-[#008FD5]" />
                      <span>Checking sync status...</span>
                    </div>
                  ) : (existingEvent || request.calendarLink) ? (
                    <div className="space-y-3 mt-1.5">
                      <div className="flex items-center gap-2 text-xs text-green-700 font-semibold bg-green-50/70 p-2.5 rounded-lg border border-green-100">
                        <span className="w-2 h-2 rounded-full bg-green-600 shrink-0"></span>
                        <span>Successfully Synced to Google Calendar</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 pt-1">
                        {(existingEvent?.hangoutLink || request.meetLink) && (
                          <a 
                            href={existingEvent?.hangoutLink || request.meetLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="px-3.5 py-2 bg-[#008FD5] hover:bg-[#008FD5]/90 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                          >
                            <Video size={13} />
                            <span>Join Google Meet</span>
                          </a>
                        )}
                        {(existingEvent?.htmlLink || request.calendarLink) && (
                          <a 
                            href={existingEvent?.htmlLink || request.calendarLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="px-3.5 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                          >
                            <ExternalLink size={12} />
                            <span>View Calendar Event</span>
                          </a>
                        )}
                      </div>
                    </div>
                  ) : !googleToken ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-1">
                      <p className="text-xs text-gray-500 max-w-sm leading-relaxed">
                        Connect your Google Calendar to synchronize approved meetings and automatically generate Google Meet video conference coordinates.
                      </p>
                      <button 
                        onClick={onConnectGoogle}
                        className="shrink-0 flex items-center justify-center gap-2 px-3.5 py-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg text-xs font-semibold text-gray-700 shadow-xs transition-colors focus:outline-none cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                        <span>Connect Calendar</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-1.5">
                      <p className="text-xs text-gray-500 max-w-sm leading-relaxed">
                        Google Calendar is connected! Click "Sync" to schedule this meeting on your dashboard with Google Meet.
                      </p>
                      <div className="flex flex-col items-end shrink-0">
                        <button 
                          disabled={isSyncing}
                          onClick={handleSyncToCalendar}
                          className="w-full sm:w-auto px-4 py-2 bg-[#008FD5] text-white hover:bg-[#008FD5]/90 disabled:opacity-75 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer focus:outline-none"
                        >
                          {isSyncing ? <Loader2 size={13} className="animate-spin text-white" /> : <Calendar size={13} />}
                          <span>{isSyncing ? 'Syncing...' : 'Sync to Calendar'}</span>
                        </button>
                        {syncError && (
                          <p className="text-[10px] text-red-500 mt-1">{syncError}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
          </div>

          <div className="px-4 py-3 md:px-6 md:py-4 border-t border-gray-100 bg-gray-50/35 flex flex-row items-center justify-end gap-2 shrink-0">
             {onDelete && (
                <div className="mr-auto flex items-center gap-1 overflow-hidden min-h-[36px]">
                   <AnimatePresence mode="wait">
                      {isConfirming ? (
                         <motion.div 
                           key="confirm-group"
                           initial={{ opacity: 0, x: -15 }}
                           animate={{ opacity: 1, x: 0 }}
                           exit={{ opacity: 0, x: 15 }}
                           transition={{ type: "spring", stiffness: 420, damping: 19, mass: 0.7 }}
                           className="flex items-center gap-1"
                         >
                            <button 
                              onClick={() => {
                                 onDelete();
                                 onClose();
                              }} 
                              className="px-2.5 py-1.5 font-bold text-xs bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                            >
                               <Trash2 size={13} />
                               <span>Confirm Delete?</span>
                            </button>
                            <button 
                              onClick={() => setIsConfirming(false)} 
                              className="px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors cursor-pointer"
                            >
                               Cancel
                            </button>
                         </motion.div>
                      ) : (
                         <motion.button 
                           key="delete-btn"
                           initial={{ opacity: 0, x: -10 }}
                           animate={{ opacity: 1, x: 0 }}
                           exit={{ opacity: 0, x: 10 }}
                           transition={{ type: "spring", stiffness: 420, damping: 19, mass: 0.7 }}
                           onClick={() => setIsConfirming(true)} 
                           className="px-3 py-1.5 font-medium text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1 border border-transparent hover:border-red-100 cursor-pointer"
                           title="Permanently delete request"
                         >
                            <Trash2 size={13} />
                            <span className="hidden sm:inline">Delete</span>
                         </motion.button>
                      )}
                   </AnimatePresence>
                </div>
             )}
             <button onClick={onClose} className="px-4 py-1.5 font-medium text-xs text-gray-600 hover:text-gray-900 bg-transparent border border-gray-300 rounded-lg transition-colors">
                Close
             </button>
             {request.status === 'Pending' && (
                 <>
                    <button onClick={() => { onUpdateStatus('Declined'); onClose(); }} className="px-4 py-1.5 font-medium text-xs text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors">
                       Decline
                    </button>
                    <button onClick={() => { onUpdateStatus('Approved'); onClose(); }} className="px-4 py-1.5 font-medium text-xs bg-[#008FD5] text-white hover:bg-[#008FD5]/90 rounded-lg transition-colors shadow-sm">
                       Approve Request
                    </button>
                 </>
             )}
          </div>
       </motion.div>
    </motion.div>
  );
}
