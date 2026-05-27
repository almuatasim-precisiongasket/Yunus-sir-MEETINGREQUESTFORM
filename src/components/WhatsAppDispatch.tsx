import { useState, useEffect } from 'react';
import { Copy, Plus, Trash2, Check, Smartphone, Edit3, ChevronDown, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import { FormTemplate } from '../types';
import { getForms } from '../lib/db';

interface Template {
  id: string;
  title: string;
  body: string;
}

const DEFAULT_TEMPLATES: Template[] = [
  {
    id: 't1',
    title: 'Traveling for business meetings',
    body: 'Hello,\n\nI am currently traveling for business meetings and have limited availability.\n\nPlease submit your request via this link so my team can coordinate:\n[FORM LINK]\n\nThank you.'
  },
  {
    id: 't2',
    title: 'Busy with ongoing projects',
    body: 'Hi there,\n\nI am currently heads-down on some critical projects. \n\nTo ensure we can review your inquiry properly, please submit the details here:\n[FORM LINK]\n\nBest regards.'
  },
  {
    id: 't3',
    title: 'Temporarily unavailable',
    body: 'Hello,\n\nI am temporarily unavailable. \n\nPlease route all requests and scheduling inquiries through my coordination portal here:\n[FORM LINK]\n\nThank you for your patience.'
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

  useEffect(() => {
    getForms()
      .then(data => {
        setForms(data || []);
        if (data && data.length > 0) {
          setSelectedFormId(data[0].id);
        }
      })
      .catch(err => console.error("Could not load forms for dispatch", err));
  }, []);

  const [selectedTemplate, setSelectedTemplate] = useState<Template>(templates[0] || DEFAULT_TEMPLATES[0]);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');

  const getFormLink = () => {
    const base = `${window.location.origin}/?request=true`;
    return selectedFormId ? `${base}&formId=${selectedFormId}` : base;
  };

  const formLink = getFormLink();

  const saveTemplates = (newTemplates: Template[]) => {
    setTemplates(newTemplates);
    localStorage.setItem('whatsapp_templates', JSON.stringify(newTemplates));
  };

  const handleCopy = async () => {
    const textToCopy = selectedTemplate.body.replace('[FORM LINK]', formLink);
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const handleAddTemplate = () => {
    const newTemplate: Template = {
      id: Math.random().toString(36).substr(2, 9),
      title: 'New Template',
      body: 'Hello,\n\nPlease find my intake form here: [FORM LINK]'
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

  const getPreviewText = () => {
    return selectedTemplate.body.replace('[FORM LINK]', formLink);
  };

  return (
    <div className="flex-1 w-full bg-[#F3F4F6] relative font-sans overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 py-8 md:px-lg md:py-10">
        
        {/* Header */}
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="font-display text-heading-lg text-[#0B1F33] mb-2 font-bold tracking-tight">WhatsApp Dispatch</h1>
            <p className="font-body-md text-[#6B7280]">Manage message templates and dispatch them via WhatsApp with one click.</p>
          </div>
          <button 
            onClick={handleAddTemplate}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E5E7EB] text-[#0B1F33] hover:bg-gray-50 rounded-xl font-bold text-sm shadow-sm transition-all"
          >
            <Plus size={18} /> Add New Template
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column: Templates List */}
          <div className="lg:w-1/3 flex flex-col gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-4">
               <div className="font-label-sm uppercase tracking-wider text-[#6B7280] font-semibold mb-4 px-2">Your Templates</div>
               <div className="space-y-2">
                 {templates.map(t => (
                   <button
                     key={t.id}
                     onClick={() => { setSelectedTemplate(t); setIsEditing(false); }}
                     className={`w-full text-left px-4 py-3 rounded-xl transition-all cursor-pointer border ${selectedTemplate.id === t.id ? 'bg-[#008FD5]/10 border-[#008FD5]/30 text-[#008FD5]' : 'bg-transparent border-transparent hover:bg-gray-50 text-[#111827]'}`}
                   >
                     <div className="font-semibold text-sm">{t.title}</div>
                     <div className={`text-xs mt-1 truncate ${selectedTemplate.id === t.id ? 'text-[#008FD5]/80' : 'text-gray-500'}`}>
                       {t.body.substring(0, 40)}...
                     </div>
                   </button>
                 ))}
               </div>
            </div>
            
            <div className="bg-blue-50 rounded-2xl border border-blue-100 p-5 flex flex-col gap-3 shadow-sm">
              <div className="font-semibold text-blue-900 flex items-center gap-2 text-sm">
                <Smartphone size={16} className="text-[#008FD5]" /> 
                Target Intake Form
              </div>
              
              {forms.length > 0 ? (
                <div className="relative">
                  <select 
                    value={selectedFormId}
                    onChange={(e) => setSelectedFormId(e.target.value)}
                    className="w-full bg-white border border-blue-200 text-blue-900 rounded-xl px-3 py-2 text-xs font-bold appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 pr-8"
                  >
                    {forms.map(f => (
                      <option key={f.id} value={f.id}>{f.title}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />
                </div>
              ) : (
                <div className="text-[10px] text-blue-600 bg-white/50 p-2 rounded border border-blue-100 italic">
                  Loading available forms...
                </div>
              )}

              <div className="text-xs text-blue-800 break-all bg-white/80 p-2 rounded border border-blue-100 select-all font-mono leading-tight opacity-80 mt-1">
                {formLink}
              </div>
            </div>
          </div>

          {/* Right Column: Preview & Action */}
          <div className="lg:w-2/3">
            <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-6 lg:p-8 flex flex-col h-full min-h-[500px]">
               <div className="flex justify-between items-center mb-6">
                 <div>
                   <h2 className="font-semibold text-lg text-[#0B1F33]">
                     {isEditing ? 'Editing Template' : 'Message Preview'}
                   </h2>
                 </div>
                  <div className="flex items-center gap-2">
                    {!isEditing && (
                      <div className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-xl border border-gray-100 mr-2">
                        <button 
                         onClick={() => startEditing(selectedTemplate)}
                         className="p-2 text-gray-500 hover:text-[#008FD5] hover:bg-white rounded-lg transition-all"
                         title="Edit Template"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button 
                         onClick={() => handleDelete(selectedTemplate.id)}
                         className="p-2 text-gray-500 hover:text-red-600 hover:bg-white rounded-lg transition-all"
                         title="Delete Template"
                         disabled={templates.length <= 1}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                    {!isEditing && (
                      <button 
                       onClick={handleCopy}
                       className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${copied ? 'bg-green-600 text-white shadow-green-600/20' : 'bg-[#008FD5] text-white hover:bg-[#007AB8] shadow-[#008FD5]/20'}`}
                      >
                        {copied ? <Check size={18} /> : <Copy size={18} />}
                        {copied ? 'Copied to Clipboard' : 'Copy Message'}
                      </button>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2">Template Title</label>
                      <input 
                        type="text" 
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        className="w-full bg-[#F8FAFC] border border-[#E5E7EB] text-[#111827] rounded-xl px-4 py-3 focus:outline-none focus:border-[#008FD5]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2">Message Body</label>
                      <div className="text-[10px] text-blue-600 mb-1 font-semibold italic">Use [FORM LINK] to dynamically insert your public intake URL</div>
                      <textarea 
                        rows={10}
                        value={editBody}
                        onChange={e => setEditBody(e.target.value)}
                        className="w-full bg-[#F8FAFC] border border-[#E5E7EB] text-[#111827] rounded-xl px-4 py-3 focus:outline-none focus:border-[#008FD5] font-sans resize-none"
                      />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button 
                        onClick={handleSaveEdit}
                        className="px-6 py-2.5 bg-[#008FD5] text-white rounded-xl font-bold shadow-sm hover:bg-[#007AB8] transition-all"
                      >
                        Save Template
                      </button>
                      <button 
                        onClick={() => setIsEditing(false)}
                        className="px-6 py-2.5 bg-gray-50 text-gray-700 border border-gray-200 rounded-xl font-bold transition-all hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 bg-[#f0f2f5] border border-[#DEE3D9] rounded-2xl p-6 md:p-10 relative overflow-hidden flex items-center justify-center min-h-[350px]">
                      {/* WhatsApp-like background pattern */}
                      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/whatsapp-bg.png")' }}></div>
                      
                      <div className="relative z-10 w-[95%] md:w-auto md:max-w-[550px] bg-white rounded-xl rounded-tl-none shadow-[0_2px_6px_rgba(0,0,0,0.08)] p-5 md:p-7 text-[#111827] whitespace-pre-wrap font-sans text-[16px] leading-relaxed border border-gray-100 select-text">
                         {getPreviewText()}
                         <div className="text-right mt-3 text-[10px] text-gray-400 font-medium">
                           12:00 PM <Check size={14} className="inline ml-1 text-[#34B7F1]" />
                         </div>
                      </div>
                    </div>
                   
                   <div className="mt-6 text-sm text-gray-500 bg-gray-50 p-4 rounded-xl border border-gray-100 flex gap-3">
                      <div className="mt-0.5">ℹ️</div>
                      <div>
                        <strong className="text-gray-700 block mb-1">Operational Flow</strong>
                        Click the "Copy Message" button. The <strong>[FORM LINK]</strong> is automatically replaced with your secure intake URL. You can then paste this directly into WhatsApp or any executive channel.
                      </div>
                   </div>
                 </>
               )}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
