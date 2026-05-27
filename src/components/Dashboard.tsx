import { useState } from 'react';
import { MeetingRequest, RequestStatus } from '../types';
import DetailModal from './DetailModal';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, ArrowRight, User, Briefcase, Calendar, Clock, AlertTriangle, AlertCircle, Check, ChevronDown, ArrowUpDown, QrCode } from 'lucide-react';

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
  onUpdateStatus: (id: string, status: RequestStatus) => void;
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
    // Default: Sort by newest receipt first (createdAt descending)
    return b.createdAt - a.createdAt;
  });

  const pendingCount = requests.filter(r => r.status === 'Pending').length;
  const urgentCount = requests.filter(r => r.isUrgent).length;

  return (
    <motion.div 
       initial={{ opacity: 0, y: 10 }}
       animate={{ opacity: 1, y: 0 }}
       className="max-w-container-max mx-auto space-y-md md:space-y-xl pb-32 md:pb-8"
     >
      {/* Upper Brand & Stats Header */}
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

      {/* Filter and Search Bar */}
      <section className="grid grid-cols-1 md:flex gap-4 items-center justify-between bg-white p-3 md:p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative w-full md:w-[380px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={18} />
            <input 
              type="text" 
              placeholder="Search by name, organization..."
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
      </section>

       <section className="bg-surface-container-lowest rounded-xl border border-[#E5E7EB] shadow-xs overflow-hidden">
        {/* Table Header (hidden on mobile) */}
        <div className="hidden md:grid grid-cols-12 gap-md p-lg border-b border-outline-variant/30 bg-surface-container-low font-label-md text-label-md text-on-surface-variant uppercase tracking-wider text-xs font-bold select-none">
            <div className="col-span-4 self-center text-[#6B7280]">Requester</div>
            <div className="col-span-3 self-center text-[#6B7280]">Purpose</div>
            
            {/* Date Sorting Header with Custom Dropdown */}
            <div className="col-span-2 relative self-center">
                <button 
                  onClick={() => {
                    setIsDateDropdownOpen(!isDateDropdownOpen);
                    setIsUrgencyDropdownOpen(false);
                  }}
                  className={`flex items-center gap-1 hover:text-[#008FD5] rounded px-1 -mx-1 py-0.5 hover:bg-gray-100 transition-all cursor-pointer focus:outline-none uppercase tracking-wider text-xs font-bold ${sortBy.startsWith('date') ? 'text-[#008FD5]' : 'text-[#6B7280]'}`}
                >
                  <span>Proposed Date & Time</span>
                  <ChevronDown size={13} className={`transform transition-transform duration-200 mt-0.5 shrink-0 ${isDateDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {isDateDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsDateDropdownOpen(false)} />
                    <div className="absolute top-full left-0 mt-2 w-52 bg-white border border-[#E5E7EB] rounded-xl shadow-lg py-1.5 z-40 text-left normal-case tracking-normal font-sans font-medium text-xs text-[#374151] animate-in fade-in slide-in-from-top-1 duration-150">
                      <button
                        onClick={() => {
                          setSortBy('date-asc');
                          setIsDateDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-2 flex items-center justify-between hover:bg-sky-50/50 transition-colors ${sortBy === 'date-asc' ? 'text-[#008FD5] font-semibold bg-sky-50/50' : ''}`}
                      >
                        <span>Date: Earliest First</span>
                        {sortBy === 'date-asc' && <Check size={12} className="text-[#008FD5]" />}
                      </button>
                      <button
                        onClick={() => {
                          setSortBy('date-desc');
                          setIsDateDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-2 flex items-center justify-between hover:bg-sky-50/50 transition-colors ${sortBy === 'date-desc' ? 'text-[#008FD5] font-semibold bg-sky-50/50' : ''}`}
                      >
                        <span>Date: Latest First</span>
                        {sortBy === 'date-desc' && <Check size={12} className="text-[#008FD5]" />}
                      </button>
                      <button
                        onClick={() => {
                          setSortBy('default');
                          setIsDateDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-2 flex items-center justify-between hover:bg-sky-50/50 transition-colors ${sortBy === 'default' ? 'text-[#008FD5] font-semibold bg-sky-50/50' : ''}`}
                      >
                        <span>Default Order</span>
                        {sortBy === 'default' && <Check size={12} className="text-[#008FD5]" />}
                      </button>
                    </div>
                  </>
                )}
            </div>

            {/* Urgency Sorting Header with Custom Dropdown */}
            <div className="col-span-3 text-right relative flex justify-end self-center">
                <button 
                  onClick={() => {
                    setIsUrgencyDropdownOpen(!isUrgencyDropdownOpen);
                    setIsDateDropdownOpen(false);
                  }}
                  className={`flex items-center gap-1 hover:text-[#008FD5] rounded px-1 -mx-1 py-0.5 hover:bg-gray-100 transition-all cursor-pointer focus:outline-none uppercase tracking-wider text-xs font-bold ${sortBy.startsWith('urgency') ? 'text-[#008FD5]' : 'text-[#6B7280]'}`}
                >
                  <span>Action State & Urgency</span>
                  <ChevronDown size={13} className={`transform transition-transform duration-200 mt-0.5 shrink-0 ${isUrgencyDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {isUrgencyDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsUrgencyDropdownOpen(false)} />
                    <div className="absolute top-full right-0 mt-2 w-52 bg-white border border-[#E5E7EB] rounded-xl shadow-lg py-1.5 z-40 text-left normal-case tracking-normal font-sans font-medium text-xs text-[#374151] animate-in fade-in slide-in-from-top-1 duration-150">
                      <button
                        onClick={() => {
                          setSortBy('urgency-high');
                          setIsUrgencyDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-2 flex items-center justify-between hover:bg-sky-50/50 transition-colors ${sortBy === 'urgency-high' ? 'text-[#008FD5] font-semibold bg-sky-50/50' : ''}`}
                      >
                        <span>Urgent Priority First</span>
                        {sortBy === 'urgency-high' && <Check size={12} className="text-[#008FD5]" />}
                      </button>
                      <button
                        onClick={() => {
                          setSortBy('urgency-low');
                          setIsUrgencyDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-2 flex items-center justify-between hover:bg-sky-50/50 transition-colors ${sortBy === 'urgency-low' ? 'text-[#008FD5] font-semibold bg-sky-50/50' : ''}`}
                      >
                        <span>Normal Priority First</span>
                        {sortBy === 'urgency-low' && <Check size={12} className="text-[#008FD5]" />}
                      </button>
                      <button
                        onClick={() => {
                          setSortBy('default');
                          setIsUrgencyDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-2 flex items-center justify-between hover:bg-sky-50/50 transition-colors ${sortBy === 'default' ? 'text-[#008FD5] font-semibold bg-sky-50/50' : ''}`}
                      >
                        <span>Default Order</span>
                        {sortBy === 'default' && <Check size={12} className="text-[#008FD5]" />}
                      </button>
                    </div>
                  </>
                )}
            </div>
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
                                 Populate 3 Test Requests
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
                   sortedAndFiltered.map((req) => (
                       <motion.div 
                           key={req.id} 
                           layout
                           initial={{ opacity: 0, y: 10 }}
                           animate={{ opacity: 1, y: 0 }}
                           exit={{ opacity: 0, scale: 0.95 }}
                           onClick={() => setSelectedReqId(req.id)} 
                           className={`group flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-md p-4 md:p-lg items-stretch md:items-center hover:bg-[#008FD5]/5 transition-colors duration-200 cursor-pointer ${req.status === 'Declined' ? 'opacity-70' : ''}`}
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
                               <p className={`font-sans text-xs md:text-body-md text-on-surface line-clamp-1 truncate ${req.status === 'Declined' ? 'line-through text-on-surface-variant' : ''}`}>
                                 {String(req.responses?.purpose || '')}
                               </p>
                               <span className="inline-block px-1.5 py-0.5 mt-1.5 bg-gray-100 text-gray-600 rounded border border-gray-200 text-[10px] font-bold uppercase tracking-wider">
                                 {String(req.responses?.category || '')}
                               </span>
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

                           {/* Status Badge (hidden/rendered appropriately) */}
                           <div className="col-span-1 md:col-span-3 flex justify-between md:justify-end items-center gap-sm mt-3 md:mt-0 pt-2.5 md:pt-0 border-t md:border-t-0 border-gray-50">
                               <div className="md:hidden text-[10px] text-[#6B7280] font-sans">
                                 Tap to review details <ArrowRight size={10} className="inline ml-1" />
                               </div>
                               {req.isUrgent && (
                                   <span className="hidden md:flex text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100 items-center gap-1 font-sans">
                                       <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span> Urgent
                                   </span>
                               )}
                               <StatusBadge status={req.status} />
                           </div>
                       </motion.div>
                   ))
               )}
           </AnimatePresence>
        </div>
      </section>

      {/* Manual Seeding Reset footer button when requests list exists to clear or re-populate easily */}
      {requests.length > 0 && onSeedDemoData && (
        <div className="flex justify-center pt-2">
           <button 
             onClick={onSeedDemoData} 
             className="text-xs font-semibold text-[#008FD5] hover:text-[#0B1F33] bg-[#008FD5]/5 hover:bg-[#008FD5]/10 px-4 py-2 rounded-lg transition-colors border border-dashed border-[#008FD5]/20"
           >
             Reset DB to 3 Premium Test Requests
           </button>
        </div>
      )}

      <AnimatePresence>
          {selectedReq && (
            <DetailModal 
              request={selectedReq} 
              onClose={() => setSelectedReqId(null)} 
              onUpdateStatus={(s) => {
                onUpdateStatus(selectedReq.id, s);
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
