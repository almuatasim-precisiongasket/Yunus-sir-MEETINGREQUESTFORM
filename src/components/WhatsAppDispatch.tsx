import { useState, useEffect, useMemo } from 'react';
import { Copy, Plus, Trash2, Check, Smartphone, Edit3, ChevronDown, FileText, Send, User, MessageCircle, ExternalLink, ArrowRight, Video, Phone, MoreVertical, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FormTemplate, MeetingRequest } from '../types';
import { getForms, getRequests } from '../lib/db';

interface Template {
  id: string;
  title: string;
  body: string;
}

const DEFAULT_TEMPLATES: Template[] = [
  {
    id: 't1',
    title: 'Traveling for business meetings',
    body: 'Hello [NAME],\n\nI am currently traveling for business meetings and have limited availability.\n\nPlease submit your request via this link so my team can coordinate:\n[FORM LINK]\n\nThank you.'
  },
  {
    id: 't2',
    title: 'Busy with ongoing projects',
    body: 'Hi [NAME],\n\nI am currently heads-down on some critical projects.\n\nTo ensure we can review your inquiry properly, please submit the details here:\n[FORM LINK]\n\nBest regards.'
  },
  {
    id: 't3',
    title: 'Temporarily unavailable',
    body: 'Hello [NAME],\n\nI am temporarily unavailable.\n\nPlease route all requests and scheduling inquiries through my coordination portal here:\n[FORM LINK]\n\nThank you for your patience.'
  }
];

export default function WhatsAppDispatch() {
  const [templates, setTemplates] = useState<Template[]>(() => {
    const saved = localStorage.getItem('whatsapp_templates');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return DEFAULT_TEMPLATES;
  });

  const [forms, setForms] = useState<FormTemplate[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string>('');
  
  // Real-Time Contact Directory States
  const [requests, setRequests] = useState<MeetingRequest[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string>('');
  const [recipientPhone, setRecipientPhone] = useState<string>('');
  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientCompany, setRecipientCompany] = useState<string>('');

  const [selectedTemplate, setSelectedTemplate] = useState<Template>(templates[0] || DEFAULT_TEMPLATES[0]);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');

  // 1. Fetch available templates and database requests on mount
  useEffect(() => {
    getForms()
      .then(data => {
        setForms(data || []);
        if (data && data.length > 0) {
          setSelectedFormId(data[0].id);
        }
      })
      .catch(err => console.error("Could not load forms for dispatch", err));

    getRequests()
      .then(data => {
        setRequests(data || []);
      })
      .catch(err => console.error("Could not fetch requests for WhatsApp Dispatch", err));
  }, []);

  const getFormLink = () => {
    const base = `${window.location.origin}/?request=true`;
    return selectedFormId ? `${base}&formId=${selectedFormId}` : base;
  };

  const formLink = getFormLink();

  const saveTemplates = (newTemplates: Template[]) => {
    setTemplates(newTemplates);
    localStorage.setItem('whatsapp_templates', JSON.stringify(newTemplates));
  };

  // Helper to extract phone from request
  const getRequestPhone = (r: MeetingRequest): string => {
    if (r.responses?.phoneNumber) return String(r.responses.phoneNumber);
    for (const [key, val] of Object.entries(r.responses || {})) {
      const lower = key.toLowerCase();
      if (lower.includes('phone') || lower.includes('tel') || lower.includes('contact') || lower.includes('mobile')) {
        return String(val);
      }
    }
    return '';
  };

  // Helper to extract name from request
  const getRequestName = (r: MeetingRequest): string => {
    if (r.responses?.fullName) return String(r.responses.fullName);
    for (const [key, val] of Object.entries(r.responses || {})) {
      if (key.toLowerCase().includes('name')) return String(val);
    }
    return 'there';
  };

  // Helper to extract company from request
  const getRequestCompany = (r: MeetingRequest): string => {
    if (r.responses?.company) return String(r.responses.company);
    for (const [key, val] of Object.entries(r.responses || {})) {
      const lower = key.toLowerCase();
      if (lower.includes('company') || lower.includes('org') || lower.includes('business')) return String(val);
    }
    return '';
  };

  // 2. Automate placeholder replacements when a contact is selected
  useEffect(() => {
    if (selectedRequestId) {
      const req = requests.find(r => r.id === selectedRequestId);
      if (req) {
        const name = getRequestName(req);
        const phone = getRequestPhone(req);
        const company = getRequestCompany(req);
        
        setRecipientName(name);
        setRecipientCompany(company);
        
        // Clean phone number: remove spaces/special characters, leaving only digits
        const digits = phone.replace(/[^\d]/g, '');
        setRecipientPhone(digits);
      }
    } else {
      setRecipientName('');
      setRecipientCompany('');
      setRecipientPhone('');
    }
  }, [selectedRequestId, requests]);

  // Processes template body and injects actual name, company, and link values
  const getProcessedBody = (bodyText: string) => {
    let text = bodyText.replace(/\[FORM LINK\]/g, formLink);
    
    if (recipientName && recipientName !== 'there') {
      text = text.replace(/\[NAME\]/gi, recipientName);
    } else {
      text = text.replace(/\[NAME\]/gi, 'there');
    }
    
    if (recipientCompany) {
      text = text.replace(/\[COMPANY\]/gi, recipientCompany);
    } else {
      text = text.replace(/from\s+\[COMPANY\]/gi, '');
      text = text.replace(/\[COMPANY\]/gi, '');
    }
    return text;
  };

  const getPreviewText = () => {
    return getProcessedBody(selectedTemplate.body);
  };

  const handleCopy = async () => {
    const textToCopy = getPreviewText();
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  // Direct Outbound Dispatch using wa.me URI exchange
  const handleWhatsAppSend = () => {
    const text = getPreviewText();
    const phoneDigits = recipientPhone.replace(/[^\d]/g, '');
    
    if (!phoneDigits) {
      alert("Please provide a recipient phone number first.");
      return;
    }
    
    const encodedText = encodeURIComponent(text);
    const waUrl = `https://api.whatsapp.com/send?phone=${phoneDigits}&text=${encodedText}`;
    window.open(waUrl, '_blank');
  };

  const handleAddTemplate = () => {
    const newTemplate: Template = {
      id: Math.random().toString(36).substring(2, 9),
      title: 'New Template',
      body: 'Hello [NAME],\n\nPlease find my scheduling form here: [FORM LINK]'
    };
    const next = [...templates, newTemplate];
    saveTemplates(next);
    setSelectedTemplate(newTemplate);
    startEditing(newTemplate);
  };

  const startEditing = (t: Template) => {
    setEditTitle(t.title);
    setEditBody(t.body);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    const updated = templates.map(t => 
      t.id === selectedTemplate.id ? { ...t, title: editTitle, body: editBody } : t
    );
    saveTemplates(updated);
    setSelectedTemplate({ ...selectedTemplate, title: editTitle, body: editBody });
    setIsEditing(false);
  };

  const handleDelete = (id: string) => {
    if (templates.length <= 1) return;
    const filtered = templates.filter(t => t.id !== id);
    saveTemplates(filtered);
    if (selectedTemplate.id === id) {
      setSelectedTemplate(filtered[0]);
    }
  };

  // Filter requests that are unresolved or pending to show first in the directory
  const pendingRequests = useMemo(() => {
    return requests.filter(r => r.status === 'Pending' || r.status === 'Follow-up Needed');
  }, [requests]);

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      {/* Header (Aligned perfectly to fix vertical overlap bug) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-2xl font-bold font-sans text-[#0B1F33] tracking-tight">WhatsApp Dispatch Portal</h1>
          <p className="text-sm text-[#6B7280] mt-1">Configure personalized template dispatch logs and launch outbound coordination directly via WhatsApp.</p>
        </div>
        <button 
          onClick={handleAddTemplate}
          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-[#E5E7EB] text-[#0B1F33] hover:bg-gray-50 active:scale-95 rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer"
        >
          <Plus size={16} className="text-[#008FD5]" /> 
          <span>Add Message Template</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Templates list and Recipient Directory */}
        <div className="col-span-1 lg:col-span-4 space-y-6">
          {/* Card 1: Your Templates */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-5">
             <div className="text-[10px] uppercase tracking-wider text-[#6B7280] font-black mb-4 flex items-center gap-2">
               <FileText size={12} className="text-[#008FD5]" /> 
               <span>Select Template</span>
             </div>
             
             <div className="space-y-2">
               {templates.map(t => {
                 const isSelected = selectedTemplate.id === t.id;
                 return (
                   <button
                     key={t.id}
                     onClick={() => { setSelectedTemplate(t); setIsEditing(false); }}
                     className={`w-full text-left px-4 py-3 rounded-xl transition-all cursor-pointer border relative select-none ${
                       isSelected 
                         ? 'border-[#008FD5] text-[#008FD5] bg-sky-50/20 shadow-2xs' 
                         : 'bg-white border-slate-100 hover:border-slate-300 text-slate-700 hover:bg-slate-50'
                     }`}
                   >
                     {isSelected && (
                       <motion.div
                         layoutId="active-dispatch-template"
                         className="absolute inset-0 bg-[#008FD5]/5 border border-[#008FD5] rounded-xl -z-10"
                         transition={{ type: "spring", stiffness: 350, damping: 25 }}
                       />
                     )}
                     <div className="font-bold text-xs">{t.title}</div>
                     <div className={`text-[10px] mt-1.5 truncate ${isSelected ? 'text-[#008FD5]/80 font-medium' : 'text-gray-400 font-normal'}`}>
                       {t.body.replace(/\[FORM LINK\]/g, 'PEG-Link')}
                     </div>
                   </button>
                 );
               })}
             </div>
          </div>
          
          {/* Card 2: Interactive Recipient Directory (High ROI Integration) */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-5 space-y-4">
            <div className="text-[10px] uppercase tracking-wider text-[#6B7280] font-black flex items-center gap-2">
              <User size={12} className="text-[#008FD5]" /> 
              <span>Quick Recipient Directory</span>
            </div>

            {/* Requester quick-selector */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Auto-Import Requester</label>
              <div className="relative">
                <select
                  value={selectedRequestId}
                  onChange={(e) => setSelectedRequestId(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-semibold appearance-none cursor-pointer focus:outline-none focus:border-[#008FD5] pr-8"
                >
                  <option value="">-- Manual Outbound Input --</option>
                  {requests.map(r => (
                    <option key={r.id} value={r.id}>
                      {getRequestName(r)} ({getRequestCompany(r) || 'Individual'})
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="border-t border-slate-50 pt-3 space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Recipient Full Name</label>
                <input 
                  type="text"
                  placeholder="E.g., Jane Doe"
                  value={recipientName}
                  onChange={e => setRecipientName(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#008FD5]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">WhatsApp Phone Number</label>
                <input 
                  type="text"
                  placeholder="With country code, e.g. 966500000000"
                  value={recipientPhone}
                  onChange={e => setRecipientPhone(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#008FD5] font-mono"
                />
                <span className="text-[9px] text-slate-400 block mt-1">Digits only, including international dial prefix.</span>
              </div>
            </div>
          </div>

          {/* Card 3: Target Intake Form */}
          <div className="bg-[#008FD5]/5 rounded-2xl border border-[#008FD5]/15 p-5 flex flex-col gap-3">
            <div className="font-bold text-slate-800 flex items-center gap-2 text-xs uppercase tracking-wider">
              <Smartphone size={14} className="text-[#008FD5]" /> 
              <span>Target Secure Form</span>
            </div>
            
            {forms.length > 0 ? (
              <div className="relative">
                <select 
                  value={selectedFormId}
                  onChange={(e) => setSelectedFormId(e.target.value)}
                  className="w-full bg-white border border-[#008FD5]/20 text-[#008FD5] rounded-xl px-3.5 py-2.5 text-xs font-bold appearance-none cursor-pointer focus:outline-none pr-8 shadow-2xs"
                >
                  {forms.map(f => (
                    <option key={f.id} value={f.id}>{f.title}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#008FD5] pointer-events-none" />
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic">
                Loading database form options...
              </div>
            )}

            <div className="text-[10px] text-slate-500 break-all bg-white/70 px-3 py-2 rounded-xl border border-slate-100 select-all font-mono leading-tight font-medium">
              {formLink}
            </div>
          </div>
        </div>

        {/* Right Column: Preview & Action */}
        <div className="col-span-1 lg:col-span-8">
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-5 md:p-6 lg:p-7 flex flex-col min-h-[500px]">
             <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-6 border-b border-slate-50 pb-4">
                <div>
                  <h2 className="font-bold text-base text-[#0B1F33] flex items-center gap-1.5">
                    <span>{isEditing ? 'Modify Message Template' : 'Dispatch Action Center'}</span>
                  </h2>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 justify-end">
                  {!isEditing && (
                    <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200/60">
                      <button 
                       onClick={() => startEditing(selectedTemplate)}
                       className="p-2 text-slate-500 hover:text-[#008FD5] hover:bg-white rounded-lg transition-all cursor-pointer flex items-center justify-center"
                       title="Edit Message Template"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button 
                       onClick={() => handleDelete(selectedTemplate.id)}
                       className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all cursor-pointer flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none"
                       title="Delete Template"
                       disabled={templates.length <= 1}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                  
                  {!isEditing && (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button 
                       onClick={handleCopy}
                       className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-2xs cursor-pointer border ${
                         copied 
                           ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                           : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                       }`}
                      >
                        {copied ? <Check size={14} className="stroke-[2.5px]" /> : <Copy size={14} />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>

                      <motion.button 
                       whileHover={{ scale: 1.02 }}
                       whileTap={{ scale: 0.98 }}
                       onClick={handleWhatsAppSend}
                       className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-5 py-2.5 bg-[#008FD5] text-white hover:bg-[#007AB8] shadow-sm shadow-blue-500/10 rounded-xl font-black text-xs transition-all cursor-pointer"
                      >
                        <Send size={13} />
                        <span>Send WhatsApp</span>
                      </motion.button>
                    </div>
                  )}
                </div>
             </div>

             {isEditing ? (
               <div className="space-y-5">
                 <div>
                   <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Template Title</label>
                   <input 
                     type="text" 
                     value={editTitle}
                     onChange={e => setEditTitle(e.target.value)}
                     className="w-full bg-slate-50/50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:border-[#008FD5]"
                   />
                 </div>
                 <div>
                   <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 flex justify-between">
                     <span>Message Body</span>
                     <span className="text-[9px] text-[#008FD5] font-black lowercase normal-case tracking-normal">Placeholders: [NAME], [COMPANY], [FORM LINK]</span>
                   </label>
                   <textarea 
                     rows={8}
                     value={editBody}
                     onChange={e => setEditBody(e.target.value)}
                     className="w-full bg-slate-50/50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:border-[#008FD5] font-sans resize-none leading-relaxed"
                   />
                 </div>
                 <div className="flex gap-2.5 pt-2">
                   <button 
                     onClick={handleSaveEdit}
                     className="px-5 py-2.5 bg-[#008FD5] text-white rounded-xl font-bold text-xs shadow-sm hover:bg-[#007AB8] transition-all cursor-pointer"
                   >
                     Save Template
                   </button>
                   <button 
                     onClick={() => setIsEditing(false)}
                     className="px-5 py-2.5 bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs transition-all hover:bg-slate-100 cursor-pointer"
                   >
                     Cancel
                   </button>
                 </div>
               </div>
             ) : (
               <>
                 {/* WhatsApp High-Fidelity simulated Chat Phone Mockup */}
                 <div className="flex-1 bg-[#f0f2f5] border border-slate-200 rounded-2xl p-4 md:p-6 lg:p-8 flex items-center justify-center min-h-[360px]">
                   
                   <div className="w-full max-w-[500px] bg-[#efeae2] border border-slate-200/80 rounded-2xl shadow-md relative overflow-hidden flex flex-col min-h-[380px] max-h-[460px]">
                     {/* WhatsApp wallpaper doodle */}
                     <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/whatsapp-bg.png")' }}></div>
                     
                     {/* WhatsApp Chat Header */}
                     <div className="bg-[#075E54] text-white px-4 py-3 flex items-center justify-between shadow-sm relative z-10 select-none">
                       <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-teal-800 text-teal-100 flex items-center justify-center font-bold text-xs shadow-inner">
                           {recipientName ? recipientName.substring(0, 2).toUpperCase() : ' PEG '}
                         </div>
                         <div className="min-w-0">
                           <h4 className="text-xs font-bold font-sans tracking-tight truncate max-w-[160px] text-left">
                             {recipientName ? recipientName : 'PEG Scheduling Guest'}
                           </h4>
                           <span className="text-[9px] text-teal-200/90 font-medium block -mt-[1px] text-left">online</span>
                         </div>
                       </div>
                       <div className="flex items-center gap-4 text-teal-100">
                         <Video size={14} className="cursor-pointer hover:text-white transition-colors" />
                         <Phone size={14} className="cursor-pointer hover:text-white transition-colors" />
                         <MoreVertical size={14} className="cursor-pointer hover:text-white transition-colors" />
                       </div>
                     </div>

                     {/* Chat Messages area */}
                     <div className="flex-1 p-4 overflow-y-auto flex flex-col justify-end relative z-10">
                       <div className="flex flex-col gap-2 items-end">
                         {/* Chat Bubble with spring slide */}
                         <motion.div 
                           key={selectedTemplate.id + recipientName}
                           initial={{ opacity: 0, scale: 0.95, y: 10 }}
                           animate={{ opacity: 1, scale: 1, y: 0 }}
                           transition={{ type: "spring", stiffness: 220, damping: 22 }}
                           className="relative max-w-[85%] bg-[#d9fdd3] text-slate-800 p-3 rounded-xl rounded-tr-none shadow-[0_1.5px_2.5px_rgba(11,31,51,0.06)] border border-[#d1f4cb]/30 text-xs leading-relaxed select-text whitespace-pre-wrap text-left font-sans"
                         >
                           {getPreviewText()}
                           
                           {/* Bubble Pointer Tail */}
                           <div className="absolute right-0 top-0 w-2.5 h-2.5 bg-[#d9fdd3] rotate-45 transform translate-x-1/2 -translate-y-1/3 rounded-tr-xs shadow-[1.5px_-1.5px_1px_-0.5px_rgba(0,0,0,0.04)]"></div>
                           
                           <div className="flex items-center justify-end gap-1 mt-2 text-[9px] text-[#667781] font-semibold text-right">
                             <span>12:00 PM</span>
                             <CheckCheck size={13} className="text-[#53bdeb] ml-0.5" />
                           </div>
                         </motion.div>
                       </div>
                     </div>
                   </div>

                 </div>
                
                {/* Helpful guides block */}
                <div className="mt-5 text-xs text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-100 flex gap-3 leading-relaxed">
                   <div className="text-sm select-none">💡</div>
                   <div>
                     <strong className="text-slate-700 block mb-0.5 font-bold">Dynamic Dispatch Flow</strong>
                     Select any contact from the directory to automatically parse and inject their **Name** and **Company** context into your message templates. Clicking **Send WhatsApp** launches a click-to-dispatch portal instantly without requiring you to manually save contact details or paste any text.
                   </div>
                </div>
              </>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
