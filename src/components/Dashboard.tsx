import { useState, useEffect } from 'react';
import { MeetingRequest, RequestStatus } from '../types';
import DetailModal from './DetailModal';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Filter, 
  ArrowRight, 
  Briefcase, 
  Calendar, 
  Clock, 
  Check, 
  X, 
  ChevronDown, 
  ArrowUpDown, 
  QrCode, 
  Video, 
  ExternalLink, 
  Loader2, 
  ShieldCheck, 
  Sparkles,
  AlertCircle
} from 'lucide-react';

function getRequestName(r: MeetingRequest): string {
  if (r.responses?.fullName) return String(r.responses.fullName);
  for (const [key, val] of Object.entries(r.responses || {})) {
    if (key.toLowerCase().includes('name')) return String(val);
  }
  return 'Unknown Sender';
}

function getRequestDateTime(r: MeetingRequest): { date: string, time: string } {
  let date = String(r.responses?.preferredDate || '');
  let time = String(r.responses?.preferredTime || '');
  
  if (!date || !time) {
    const vals = Object.values(r.responses || {}).map(String);
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const timeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
    
    if (!date) date = vals.find(v => dateRegex.test(v)) || '';
    if (!time) time = vals.find(v => timeRegex.test(v)) || '';
  }
  
  return { date, time };
}

interface DashboardProps {
  requests: MeetingRequest[];
  onUpdateStatus: (id: string, status: RequestStatus) => Promise<void> | void;
  onSeedDemoData?: () => void;
  onDeleteRequest?: (id: string) => void;
  googleToken?: string | null;
  onConnectGoogle?: () => void;
  onShareLink?: () => void;
}

export type SortKey = 'default' | 'date-asc' | 'date-desc' | 'urgency-high' | 'urgency-low';

export default function Dashboard({ requests, onUpdateStatus, onSeedDemoData, onDeleteRequest, googleToken, onConnectGoogle, onShareLink }: DashboardProps) {
  const [filter, setFilter] = useState<RequestStatus | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);
  const selectedReq = requests.find(r => r.id === selectedReqId) || null;
  
  // Sorting State
  const [sortBy, setSortBy] = useState<SortKey>('default');
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [isUrgencyDropdownOpen, setIsUrgencyDropdownOpen] = useState(false);

  // Daily Agenda State
  const [eventsState, setEventsState] = useState<any[]>([]);
  const [syncedAgendaKey, setSyncedAgendaKey] = useState("");
  const isLoadingEvents = googleToken && syncedAgendaKey !== `${googleToken}-${requests.length}`;
  const upcomingEvents = googleToken ? eventsState : [];

  // Progressive list loading state (Priority 0 DOM virtualizer)
  const [visibleCount, setVisibleCount] = useState(20);
  const [lastParams, setLastParams] = useState({ filter, searchQuery, sortBy });

  // Stably reset progressive count when search parameters or filters change
  if (lastParams.filter !== filter || lastParams.searchQuery !== searchQuery || lastParams.sortBy !== sortBy) {
    setLastParams({ filter, searchQuery, sortBy });
    setVisibleCount(20);
  }

  // Fetch upcoming agenda events in real time
  useEffect(() => {
    if (googleToken) {
      import('../lib/googleCalendar').then(({ fetchUpcomingEvents }) => {
        fetchUpcomingEvents(googleToken)
          .then((events) => {
            setEventsState(events);
            setSyncedAgendaKey(`${googleToken}-${requests.length}`);
          })
          .catch((err) => {
            console.error('Failed to load upcoming events:', err);
            setSyncedAgendaKey(`${googleToken}-${requests.length}`);
          });
      });
    }
  }, [googleToken, requests]); // Re-fetch agenda when requests update (e.g. on approval)

  const filtered = requests.filter(r => {
    const allValues = Object.values(r.responses || {}).map(String).join(' ').toLowerCase();
    return (filter === 'All' || r.status === filter) &&
           allValues.includes(searchQuery.toLowerCase());
  });

  // Apply Sorting Logic
  const sortedAndFiltered = [...filtered].sort((a, b) => {
    if (sortBy === 'date-asc') {
      const aDT = getRequestDateTime(a);
      const bDT = getRequestDateTime(b);
      return aDT.date.localeCompare(bDT.date) || aDT.time.localeCompare(bDT.time);
    }
    if (sortBy === 'date-desc') {
      const aDT = getRequestDateTime(a);
      const bDT = getRequestDateTime(b);
      return bDT.date.localeCompare(aDT.date) || bDT.time.localeCompare(aDT.time);
    }
    if (sortBy === 'urgency-high') {
      if (a.isUrgent && !b.isUrgent) return -1;
      if (!a.isUrgent && b.isUrgent) return 1;
      return b.createdAt - a.createdAt;
    }
    if (sortBy === 'urgency-low') {
      if (!a.isUrgent && b.isUrgent) return -1;
      if (a.isUrgent && !b.isUrgent) return 1;
      return b.createdAt - a.createdAt;
    }
    return b.createdAt - a.createdAt;
  });

  const pendingCount = requests.filter(r => r.status === 'Pending').length;

  const formatEventTime = (dateTimeStr: string) => {
    if (!dateTimeStr) return '';
    try {
      const date = new Date(dateTimeStr);
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch (e) {
      return '';
    }
  };

  return (
    <motion.div 
       initial={{ opacity: 0, y: 10 }}
       animate={{ opacity: 1, y: 0 }}
       className="max-w-container-max mx-auto px-4 sm:px-6 md:px-0 space-y-md md:space-y-xl pb-32 md:pb-8"
     >
      {/* Brand & Stats Header */}
      <section className="flex flex-col lg:flex-row gap-4 lg:gap-lg justify-between items-start lg:items-end">
        <div>
            <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface tracking-tight mb-1 font-bold">Meeting Requests</h2>
            <p className="font-body-sm md:font-body-md text-xs md:text-body-md text-on-surface-variant">Manage and review form submission requests</p>
        </div>
        <div className="grid grid-cols-3 gap-3 w-full lg:flex lg:w-auto lg:gap-lg items-center">
            <div className="flex-1 lg:w-32 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center flex flex-col justify-center min-h-[85px]">
                <p className="text-[10px] md:text-[11px] text-[#6B7280] mb-1 font-bold uppercase tracking-wider">Total</p>
                <p className="text-3xl font-sans font-black text-[#008FD5] leading-none">{requests.length}</p>
            </div>
            <div className="flex-1 lg:w-32 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center flex flex-col justify-center min-h-[85px]">
                <p className="text-[10px] md:text-[11px] text-[#6B7280] mb-1 font-bold uppercase tracking-wider">Pending</p>
                <p className="text-3xl font-sans font-black text-[#111827] leading-none">{pendingCount}</p>
            </div>
            {onShareLink && (
              <button 
                onClick={onShareLink}
                className="flex-1 lg:w-44 bg-[#008FD5] text-white p-4 rounded-2xl shadow-[0_8px_20px_rgba(0,143,213,0.25)] hover:bg-[#007AB8] transition-all flex flex-col md:flex-row items-center justify-center gap-2 font-black cursor-pointer group min-h-[85px]"
              >
                <QrCode size={20} className="group-hover:scale-110 transition-transform" />
                <span className="text-[11px] md:text-sm whitespace-nowrap uppercase tracking-wider">Share Form</span>
              </button>
            )}
        </div>
      </section>

      {/* Main Two-Column Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Filters and Requests Feed List */}
        <div className="col-span-1 lg:col-span-8 space-y-6">
          
          {/* Filter and Search Bar */}
          <div className="grid grid-cols-1 md:flex gap-4 items-center justify-between bg-white p-3 md:p-4 rounded-2xl border border-gray-100 shadow-sm">
            <div className="relative w-full md:w-[320px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={18} />
                <input 
                  type="text" 
                  placeholder="Search requests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-[#F9FAFB] border border-[#F3F4F6] rounded-xl font-body-md text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#008FD5]/10 placeholder:text-[#9CA3AF]"
                />
            </div>
            <div className="flex flex-wrap md:flex-nowrap items-center gap-6 border-t md:border-t-0 pt-4 md:pt-0 border-gray-50 px-2 md:px-0 justify-between md:justify-end">
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-xs text-[#6B7280] font-bold uppercase tracking-widest whitespace-nowrap">
                        <Filter size={14} className="text-on-surface-variant" /> Filter:
                    </span>
                    <div className="relative">
                      <select 
                        className="appearance-none bg-[#F9FAFB] border border-[#F3F4F6] rounded-full px-5 py-2 pr-10 font-bold text-xs text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#008FD5]/10 cursor-pointer transition-all hover:bg-gray-50"
                        value={filter} onChange={(e) => setFilter(e.target.value as any)}
                      >
                          <option value="All">All Statuses</option>
                          <option value="Pending">Pending</option>
                          <option value="Approved">Approved</option>
                          <option value="Follow-up Needed">Follow-up</option>
                          <option value="Declined">Declined</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-xs text-[#6B7280] font-bold uppercase tracking-widest whitespace-nowrap">
                        <ArrowUpDown size={14} className="text-on-surface-variant" /> Sort:
                    </span>
                    <div className="relative">
                      <select 
                        className="appearance-none bg-[#F9FAFB] border border-[#F3F4F6] rounded-full px-5 py-2 pr-10 font-bold text-xs text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#008FD5]/10 cursor-pointer transition-all hover:bg-gray-50"
                        value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}
                      >
                          <option value="default">Default Order</option>
                          <option value="date-asc">Date: Earliest First</option>
                          <option value="date-desc">Date: Latest First</option>
                          <option value="urgency-high">Urgency: High to Low</option>
                          <option value="urgency-low">Urgency: Low to High</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
                    </div>
                </div>
            </div>
          </div>

          {/* Requests Feed Container */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-xs overflow-hidden">
            {/* Table Header (hidden on mobile) */}
            <div className="hidden md:grid grid-cols-12 gap-md p-lg border-b border-outline-variant/30 bg-surface-container-low font-label-md text-label-md text-on-surface-variant uppercase tracking-wider text-xs font-bold select-none">
                <div className="col-span-4 self-center text-[#6B7280]">Requester</div>
                <div className="col-span-3 self-center text-[#6B7280]">Purpose</div>
                <div className="col-span-2 self-center text-[#6B7280]">Proposed Date</div>
                <div className="col-span-3 self-center text-right text-[#6B7280]">Action State & Urgency</div>
            </div>
            
            <div className="flex flex-col divide-y divide-gray-100 relative min-h-[300px]">
               <AnimatePresence mode="popLayout">
                   {requests.length === 0 ? (
                       <motion.div 
                         initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                         className="py-20 px-6 text-center flex flex-col items-center justify-center gap-5 w-full"
                       >
                           <div className="w-16 h-16 bg-blue-50 text-[#008FD5] rounded-3xl flex items-center justify-center mb-1 shadow-sm border border-blue-100/50">
                               <Briefcase size={32} />
                           </div>
                           <div className="max-w-[480px] w-full flex flex-col items-center text-center px-4">
                               <h3 className="font-sans text-xl text-[#0B1F33] font-black tracking-tight">Inbox is Clear</h3>
                               <p className="text-sm text-[#6B7280] mt-3 mb-8 leading-relaxed max-w-sm">No incoming meeting requests have been received. Restoring them takes just a tap!</p>
                               
                               {onSeedDemoData && (
                                   <button 
                                     onClick={onSeedDemoData}
                                     className="px-8 py-3 bg-[#008FD5] text-white hover:bg-[#007AB8] transition-all font-black text-sm rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] cursor-pointer"
                                   >
                                     Populate 2 Test Requests
                                   </button>
                               )}
                           </div>
                       </motion.div>
                   ) : sortedAndFiltered.length === 0 ? (
                       <motion.div 
                         initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                         className="py-16 text-center text-on-surface-variant flex flex-col items-center justify-center gap-4"
                       >
                           <Search size={40} className="opacity-20" />
                           <div>
                               <p className="font-body-md text-body-md font-bold text-[#0B1F33]">No queries matched</p>
                               <p className="text-xs text-[#6B7280] mt-1">Adjust status filters or spelling rules and try again.</p>
                           </div>
                       </motion.div>
                   ) : (
                       sortedAndFiltered.slice(0, visibleCount).map((req) => (
                           <motion.div 
                               key={req.id} 
                               layout
                               initial={{ opacity: 0, y: 10 }}
                               animate={{ opacity: 1, y: 0 }}
                               exit={{ opacity: 0, scale: 0.95 }}
                               whileHover={{ y: -1.5, boxShadow: "0 6px 20px rgba(11,31,51,0.03)" }}
                               onClick={() => setSelectedReqId(req.id)} 
                               className={`group flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-md p-4 md:p-lg items-stretch md:items-center hover:bg-[#008FD5]/5 hover:border-gray-200 transition-all duration-200 cursor-pointer border-y border-transparent no-tap-highlight ${req.status === 'Declined' ? 'opacity-70' : ''}`}
                           >
                               {/* Mobile Accent Header */}
                               <div className="md:hidden flex justify-between items-center w-full pb-2 border-b border-gray-100 mb-1">
                                   <StatusBadge status={req.status} mobile />
                                   {req.isUrgent && (
                                       <span className="text-[11px] font-bold px-2 py-0.5 bg-red-50 text-red-600 rounded border border-red-100 flex items-center gap-1">
                                           <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span> Urgent
                                       </span>
                                   )}
                               </div>
                               
                               {/* Requester Profile column */}
                               <div className="col-span-1 md:col-span-4 flex items-center gap-3">
                                   <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-sky-50 text-[#008FD5] border border-sky-100 flex items-center justify-center font-bold shrink-0 text-sm md:text-base">
                                       {getRequestName(req).substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-sans text-sm md:text-body-md text-on-surface font-bold truncate group-hover:text-primary transition-colors">{getRequestName(req)}</p>
                                        <p className="text-xs text-on-surface-variant flex items-center gap-1 truncate mt-0.5">
                                            <Briefcase size={12} className="text-gray-400 shrink-0" /> {String(req.responses?.company || '') || 'Individual Request'}
                                        </p>
                                    </div>
                               </div>

                               {/* Purpose Column */}
                               <div className="col-span-1 md:col-span-3">
                                   <p className={`font-sans text-xs md:text-body-md text-on-surface line-clamp-1 truncate ${req.status === 'Declined' ? 'line-through text-on-surface-variant' : ''}`} title={String(req.responses?.purpose || '')}>
                                     {String(req.responses?.purpose || '')}
                                   </p>
                                   <div className="flex items-center gap-2 mt-1">
                                     <span className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded border border-gray-200 text-[10px] font-bold uppercase tracking-wider">
                                       {String(req.responses?.category || '')}
                                     </span>
                                     {req.status === 'Approved' && req.calendarLink && (
                                       <a 
                                         href={req.calendarLink} 
                                         target="_blank" 
                                         rel="noopener noreferrer" 
                                         onClick={(e) => e.stopPropagation()} 
                                         title="Open in Google Calendar"
                                         className="text-[10px] font-bold text-sky-600 hover:text-sky-800 flex items-center gap-0.5 hover:underline"
                                       >
                                         <ExternalLink size={10} />
                                         <span>Calendar</span>
                                       </a>
                                     )}
                                   </div>
                               </div>

                               {/* Proposed date column */}
                               <div className="col-span-1 md:col-span-2">
                                   <p className="text-xs md:text-body-md text-on-surface flex items-center gap-1.5">
                                     <Calendar size={13} className="text-gray-400 shrink-0" /> {getRequestDateTime(req).date || 'No Date'}
                                   </p>
                                   <p className="text-[11px] text-[#6B7280] flex items-center gap-1.5 mt-0.5 ml-0.5">
                                     <Clock size={12} className="text-gray-400 shrink-0" /> {getRequestDateTime(req).time || 'No Time'}
                                   </p>
                               </div>

                               {/* Status Badge & Productivity Quick Actions */}
                               <div className="col-span-1 md:col-span-3 flex justify-between md:justify-end items-center gap-3 mt-3 md:mt-0 pt-2.5 md:pt-0 border-t md:border-t-0 border-gray-50">
                                   <div className="md:hidden text-[10px] text-[#6B7280] font-sans">
                                     Tap to review details <ArrowRight size={10} className="inline ml-1" />
                                   </div>
                                   {req.isUrgent && (
                                       <span className="hidden md:flex text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100 items-center gap-1 font-sans">
                                           <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span> Urgent
                                       </span>
                                   )}

                                   {req.status === 'Pending' ? (
                                     <div className="flex items-center gap-2 z-10">
                                       <button 
                                         onClick={(e) => { e.stopPropagation(); onUpdateStatus(req.id, 'Approved'); }}
                                         title="Quick Approve & Sync"
                                         className="w-11 h-11 md:w-8 md:h-8 bg-emerald-50 hover:bg-emerald-500 hover:text-white text-emerald-700 rounded-xl border border-emerald-100 shadow-3xs transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center no-tap-highlight"
                                       >
                                         <Check size={16} className="stroke-[3.5px]" />
                                       </button>
                                       <button 
                                         onClick={(e) => { e.stopPropagation(); onUpdateStatus(req.id, 'Declined'); }}
                                         title="Quick Decline"
                                         className="w-11 h-11 md:w-8 md:h-8 bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-700 rounded-xl border border-rose-100 shadow-3xs transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center no-tap-highlight"
                                       >
                                         <X size={16} className="stroke-[3.5px]" />
                                       </button>
                                     </div>
                                   ) : (
                                     <StatusBadge status={req.status} />
                                   )}
                               </div>
                           </motion.div>
                       ))
                   )}
               </AnimatePresence>
               {sortedAndFiltered.length > visibleCount && (
                  <div className="p-4 flex justify-center bg-gray-50/50">
                    <button
                      onClick={() => setVisibleCount((prev) => prev + 30)}
                      className="px-6 py-2.5 bg-white hover:bg-[#008FD5] text-[#008FD5] hover:text-white rounded-xl border border-[#008FD5]/20 hover:border-[#008FD5] transition-all font-bold text-xs shadow-3xs cursor-pointer flex items-center gap-2 select-none group active:scale-[0.98]"
                    >
                      <span>Load More Requests</span>
                      <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                )}
            </div>
          </div>
          
        </div>

        {/* Right Column: Daily Agenda Sidebar Widget (Double-Screen Eliminator) */}
        <div className="col-span-1 lg:col-span-4 space-y-6">
          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-xs overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[#008FD5]" />
                <h3 className="font-bold text-xs text-[#0B1F33] uppercase tracking-wide">Today's Agenda</h3>
              </div>
              <div>
                {googleToken ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    <ShieldCheck size={10} /> Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                    <AlertCircle size={10} /> Offline
                  </span>
                )}
              </div>
            </div>

            {isLoadingEvents ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-xs text-gray-400">
                <Loader2 className="animate-spin text-[#008FD5]" size={24} />
                <span>Syncing calendar timeline...</span>
              </div>
            ) : !googleToken ? (
              <div className="text-center py-6 px-2 space-y-4 flex flex-col items-center">
                <p className="text-xs text-gray-500 leading-relaxed">
                  Connect your Google account in Settings to preview Mr. Yunus's live schedule timeline and prevent booking conflicts.
                </p>
                {onConnectGoogle && (
                  <button 
                    onClick={onConnectGoogle}
                    className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-[#0B1F33] rounded-xl border border-gray-200 text-xs font-bold transition-all shadow-3xs cursor-pointer flex items-center justify-center gap-2"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Connect Google</span>
                  </button>
                )}
              </div>
            ) : upcomingEvents.length === 0 ? (
              <div className="text-center py-10 px-2 space-y-2 flex flex-col items-center">
                <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-1">
                  <Check size={20} />
                </div>
                <h4 className="text-xs font-bold text-[#0B1F33]">Schedule is Clear</h4>
                <p className="text-[10px] text-gray-400">No events are scheduled on Google Calendar for the next 24 hours.</p>
              </div>
            ) : (
              <motion.div 
                initial="hidden"
                animate="show"
                variants={{
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.08
                    }
                  }
                }}
                className="relative border-l border-gray-100 pl-4 ml-2 space-y-5 py-2"
              >
                {upcomingEvents.map((event) => {
                  const startTime = event.start?.dateTime || event.start?.date || '';
                  const endTime = event.end?.dateTime || event.end?.date || '';
                  const isMeet = !!event.hangoutLink;
                  
                  return (
                    <motion.div 
                      key={event.id} 
                      variants={{
                        hidden: { opacity: 0, x: -10 },
                        show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
                      }}
                      whileHover={{ x: 3 }}
                      className="relative group/item space-y-1 cursor-default"
                    >
                      {/* Timeline dot element */}
                      <motion.span 
                        whileHover={{ scale: 1.3 }}
                        className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#008FD5] border-2 border-white ring-4 ring-sky-50 group-hover/item:bg-emerald-500 transition-colors duration-200"
                      ></motion.span>
                      
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-gray-400 font-bold tracking-wider">
                          {formatEventTime(startTime)} - {formatEventTime(endTime) || 'All Day'}
                        </span>
                        {isMeet && (
                          <a 
                            href={event.hangoutLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-[#008FD5] hover:text-[#007AB8] hover:underline"
                          >
                            <Video size={10} /> Meet Link
                          </a>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-[#0B1F33] line-clamp-1 leading-snug group-hover/item:text-[#008FD5] transition-colors">{event.summary || 'Untitled Event'}</h4>
                      {event.description && (
                        <p className="text-[10px] text-gray-400 line-clamp-1">{event.description}</p>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </div>
        </div>

      </div>

      {/* Manual Seeding Reset footer */}
      {requests.length > 0 && onSeedDemoData && (
        <div className="flex justify-center pt-2">
           <button 
             onClick={onSeedDemoData} 
             className="text-xs font-semibold text-[#008FD5] hover:text-[#0B1F33] bg-[#008FD5]/5 hover:bg-[#008FD5]/10 px-4 py-2 rounded-lg transition-colors border border-dashed border-[#008FD5]/20"
           >
             Reset DB to 2 Premium Test Requests
           </button>
        </div>
      )}

      {/* Detail View Modal */}
      <AnimatePresence>
          {selectedReq && (
            <DetailModal 
              request={selectedReq} 
              onClose={() => setSelectedReqId(null)} 
              onUpdateStatus={(s) => {
                return onUpdateStatus(selectedReq.id, s);
              }}
              onDelete={() => {
                if (onDeleteRequest) {
                  onDeleteRequest(selectedReq.id);
                }
              }}
              googleToken={googleToken}
              onConnectGoogle={onConnectGoogle}
            />
          )}
      </AnimatePresence>
    </motion.div>
  );
}

function StatusBadge({ status, mobile = false }: { status: RequestStatus, mobile?: boolean }) {
  let classes = "px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 select-none font-sans";
  
  if (status === 'Pending') classes += " bg-gray-50 text-[#0B1F33] border-gray-200";
  else if (status === 'Approved') classes += " bg-[#bcf0ca]/20 text-[#146c2e] border-[#146c2e]/10";
  else if (status === 'Follow-up Needed') classes += " bg-[#ffebd6]/40 text-[#b56b18] border-[#b56b18]/10";
  else if (status === 'Declined') classes += " bg-gray-100 text-gray-500 border-gray-200";

  return (
    <span className={`${classes} ${mobile ? '' : 'hidden md:inline-flex'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === 'Approved' ? 'bg-[#146c2e]' : status === 'Follow-up Needed' ? 'bg-[#b56b18]' : status === 'Pending' ? 'bg-[#008FD5]' : 'bg-gray-400'}`}></span>
      {status}
    </span>
  );
}
