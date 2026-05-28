import React, { useState, useEffect } from 'react';
import { FormTemplate, FormField, FieldType } from '../types';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { Plus, Trash2, GripVertical, Settings, FileText, Check, X, AlertCircle, Eye, ChevronDown } from 'lucide-react';
import PublicForm from './PublicForm';
import { getForms, addForm, updateForm, deleteForm } from '../lib/db';

export default function FormManager() {
  const [forms, setForms] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFormId, setEditingFormId] = useState<string | null>(null);

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      const data = await getForms();
      setForms(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async (form: FormTemplate) => {
    const newId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
      ? crypto.randomUUID() 
      : `form-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    const newForm = { ...form, id: newId, title: form.title + ' (Copy)' };
    try {
      await addForm(newForm);
      setForms([...forms, newForm]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (forms.length === 1) {
      alert("Cannot delete the last remaining form.");
      return;
    }
    try {
      await deleteForm(id);
      setForms(forms.filter(f => f.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateNew = async () => {
    const newId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
      ? crypto.randomUUID() 
      : `form-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    const newForm: FormTemplate = {
      id: newId,
      title: 'New Executive Intake Form',
      description: 'Please provide the details below.',
      successMessage: 'Your request has been safely cataloged.',
      createdAt: Date.now(),
      fields: [
        { id: 'fullName', label: 'Full Name', type: 'text', required: true, isSystem: true },
        { id: 'company', label: 'Company / Organization', type: 'text', required: false, isSystem: true },
        { id: 'purpose', label: 'Purpose of Meeting', type: 'textarea', required: true, isSystem: true },
      ]
    };
    try {
      await addForm(newForm);
      setForms([...forms, newForm]);
      setEditingFormId(newForm.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (form: FormTemplate) => {
    try {
      await updateForm(form.id, form);
      setForms(forms.map(f => f.id === form.id ? form : f));
      setEditingFormId(null);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading Forms...</div>;
  }

  const editingForm = forms.find(f => f.id === editingFormId);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-0 flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#0B1F33]">Form Configuration</h2>
          <p className="text-sm text-gray-500 mt-1">Manage public intake templates and fields.</p>
        </div>
        <button 
          onClick={handleCreateNew}
          className="bg-[#0B1F33] text-white px-4 py-2.5 rounded-lg text-xs font-semibold hover:bg-opacity-90 flex items-center justify-center gap-2 w-full sm:w-auto min-h-[40px] no-tap-highlight"
        >
          <Plus size={14} /> New Template
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1 border-b md:border-b-0 md:border-r border-gray-200 pb-6 md:pb-0 pr-0 md:pr-6 space-y-3">
          {forms.map(form => (
            <div 
              key={form.id} 
              className={`p-4 rounded-xl border cursor-pointer transition-colors ${editingFormId === form.id ? 'bg-[#008FD5]/5 border-[#008FD5]/30' : 'bg-white border-gray-200 hover:border-gray-300'}`}
              onClick={() => setEditingFormId(form.id)}
            >
              <div className="flex items-center gap-2 mb-1">
                <FileText size={16} className={editingFormId === form.id ? 'text-[#008FD5]' : 'text-gray-400'} />
                <h3 className="text-sm font-bold text-[#0B1F33] truncate">{form.title}</h3>
              </div>
              <p className="text-[10px] text-gray-500 truncate">{form.description}</p>
              
              <div className="mt-3 flex gap-2 border-t border-gray-100 pt-2">
                <a href={`/?form=true&formId=${form.id}`} target="_blank" rel="noopener noreferrer" className="text-[10px] font-semibold text-[#008FD5] hover:underline" onClick={e => e.stopPropagation()}>Preview</a>
                <span className="text-gray-300">|</span>
                <button className="text-[10px] font-semibold text-gray-600 hover:text-[#008FD5]" onClick={(e) => { e.stopPropagation(); handleDuplicate(form); }}>Duplicate</button>
                <span className="text-gray-300">|</span>
                <button className="text-[10px] font-semibold text-red-500 hover:text-red-700 ml-auto" onClick={(e) => { e.stopPropagation(); handleDelete(form.id); }}>Delete</button>
              </div>
            </div>
          ))}
        </div>

        <div className="col-span-2">
          {editingForm ? (
            <FormEditor form={editingForm} onSave={handleSave} onCancel={() => setEditingFormId(null)} />
          ) : (
            <div className="h-full flex items-center justify-center border border-gray-100 rounded-2xl bg-white shadow-sm p-12 text-center min-h-[500px]">
              <div className="flex flex-col items-center max-w-[340px]">
                <div className="w-16 h-16 bg-blue-50 text-[#008FD5] rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-blue-100/50">
                  <Settings size={32} />
                </div>
                <h3 className="font-sans text-xl text-[#0B1F33] font-black tracking-tight">Select a Template</h3>
                <p className="text-sm text-[#6B7280] mt-3 leading-relaxed">
                  Choose a form template from the left panel to customize its fields, logic, and automated messaging.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FormEditor({ form, onSave, onCancel }: { form: FormTemplate, onSave: (f: FormTemplate) => void, onCancel: () => void }) {
  const [draft, setDraft] = useState<FormTemplate>({ ...form });
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  useEffect(() => {
    setDraft({ ...form });
  }, [form]);

  const handleFieldChange = (id: string, updates: Partial<FormField>) => {
    setDraft(prev => ({
      ...prev,
      fields: prev.fields.map(f => f.id === id ? { ...f, ...updates } : f)
    }));
  };

  const removeField = (id: string) => {
    setDraft(prev => ({
      ...prev,
      fields: prev.fields.filter(f => f.id !== id)
    }));
  };

  const addField = () => {
    const newField: FormField = {
      id: 'field_' + Math.random().toString(36).substr(2, 6),
      label: 'New Field',
      type: 'text',
      required: false,
      isSystem: false
    };
    setDraft(prev => ({
      ...prev,
      fields: [...prev.fields, newField]
    }));
  };

  const handleReorder = (newFields: FormField[]) => {
    setDraft(prev => ({ ...prev, fields: newFields }));
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative min-h-[600px]">
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-12">
          <div className="absolute inset-0 bg-[#0B1F33]/60 backdrop-blur-md" onClick={() => setIsPreviewModalOpen(false)}></div>
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-transparent z-10 flex flex-col items-center hide-scrollbar">
            <div className="w-full flex justify-end sticky top-0 z-20 mb-4">
               <button onClick={() => setIsPreviewModalOpen(false)} className="bg-white text-[#0B1F33] p-3 rounded-full shadow-xl hover:bg-gray-50 transition-all active:scale-95">
                  <X size={20} />
               </button>
            </div>
            <div className="w-full scale-[0.98] origin-top pb-24">
              <PublicForm template={draft} onSubmit={() => alert("Notice: This is a form preview submission. Your sample request has not been recorded.")} />
            </div>
          </div>
        </div>
      )}

      {/* Floating Preview Button */}
      <button 
        onClick={() => setIsPreviewModalOpen(true)}
        className="absolute bottom-8 right-8 z-10 bg-[#0B1F33] text-white px-6 py-3 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-[#008FD5] hover:scale-105 active:scale-95 transition-all shadow-lg shadow-blue-500/20 cursor-pointer"
      >
        <Eye size={16} /> Preview Draft
      </button>

      <div className="px-4 sm:px-8 py-5 border-b border-gray-50 flex justify-between items-center bg-[#F9FAFB]/50">
        <h3 className="font-black text-[#0B1F33] tracking-tight">Edit Form Template</h3>
        <div className="flex gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-[#0B1F33] transition-colors cursor-pointer">Cancel</button>
          <button onClick={() => onSave(draft)} className="px-5 py-2.5 text-xs font-black bg-[#008FD5] hover:bg-[#007AB8] text-white rounded-xl transition-all flex items-center gap-2 shadow-sm cursor-pointer active:scale-95">
            <Check size={16} /> Save Changes
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-8 space-y-8">
        <div className="space-y-5">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Form Title</label>
            <input 
              type="text" 
              className="w-full bg-[#F9FAFB] border border-[#F3F4F6] rounded-xl px-4 py-3 text-sm font-bold text-[#111827] focus:outline-none focus:border-[#008FD5] transition-all"
              value={draft.title}
              onChange={e => setDraft({ ...draft, title: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Description</label>
            <textarea 
              rows={2}
              className="w-full bg-[#F9FAFB] border border-[#F3F4F6] rounded-xl px-4 py-3 text-sm text-[#4B5563] focus:outline-none focus:border-[#008FD5] transition-all resize-none leading-relaxed"
              value={draft.description}
              onChange={e => setDraft({ ...draft, description: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Success Message</label>
            <input 
              type="text" 
              className="w-full bg-[#F9FAFB] border border-[#F3F4F6] rounded-xl px-4 py-3 text-sm text-[#4B5563] focus:outline-none focus:border-[#008FD5] transition-all"
              value={draft.successMessage}
              onChange={e => setDraft({ ...draft, successMessage: e.target.value })}
            />
          </div>
        </div>

        <div className="border-t border-gray-50 pt-8">
          <div className="flex justify-between items-center mb-6">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Build Form Architecture</label>
            <button onClick={addField} className="text-xs font-black text-[#008FD5] hover:text-[#007AB8] transition-colors flex items-center gap-1 cursor-pointer">
              <Plus size={16} /> Add Custom Field
            </button>
          </div>

          <div className="space-y-4">
            <Reorder.Group axis="y" values={draft.fields} onReorder={handleReorder} className="space-y-4">
              <AnimatePresence mode="popLayout">
                {draft.fields.map((field) => (
                  <Reorder.Item 
                    value={field}
                    initial={{ opacity: 0, y: -12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96, y: 12 }}
                    whileDrag={{ 
                      scale: 1.02, 
                      y: -2,
                      boxShadow: "0 20px 40px -5px rgba(0,143,213,0.15), 0 10px 20px -6px rgba(0,143,213,0.1)"
                    }}
                    whileHover={{ 
                      y: -1.5,
                      borderColor: "rgba(0,143,213,0.2)",
                      boxShadow: "0 8px 20px rgba(11,31,51,0.03)"
                    }}
                    transition={{ type: "spring", stiffness: 350, damping: 26 }}
                    key={field.id} 
                    className="bg-white border text-left border-gray-100 rounded-2xl p-4 flex gap-4 shadow-2xs cursor-grab active:cursor-grabbing transition-all select-none"
                  >
                    <motion.div 
                      whileHover={{ scale: 1.15, text: '#008FD5' }}
                      className="flex flex-col gap-1 items-center justify-center text-gray-400 pt-1 hover:text-[#008FD5] transition-colors cursor-grab"
                    >
                      <GripVertical size={14} className="opacity-70 shrink-0" />
                    </motion.div>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch md:items-center">
                    <div className="col-span-1 md:col-span-5 flex items-center gap-3">
                      <input 
                        type="text" 
                        value={field.label}
                        onChange={e => handleFieldChange(field.id, { label: e.target.value })}
                        readOnly={field.isSystem}
                        className={`w-full text-sm font-black text-[#111827] border-none bg-transparent px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008FD5]/10 ${field.isSystem ? 'cursor-default opacity-80' : 'hover:bg-gray-50'}`}
                        title={field.isSystem ? "Core system fields cannot be renamed to preserve internal logic" : ""}
                      />
                      {field.isSystem && <span className="shrink-0 text-[10px] bg-amber-50 text-amber-700 px-2 py-1 rounded-full font-black uppercase tracking-tighter border border-amber-100/50">Core</span>}
                    </div>
                    <div className="col-span-1 md:col-span-4 relative">
                      <select 
                        value={field.type}
                        onChange={e => handleFieldChange(field.id, { type: e.target.value as FieldType })}
                        className="w-full appearance-none text-[11px] font-bold text-[#4B5563] bg-[#F9FAFB] border border-[#F3F4F6] rounded-xl px-4 py-2.5 pr-10 focus:outline-none transition-all disabled:opacity-60 cursor-pointer no-tap-highlight"
                        disabled={field.isSystem}
                      >
                        <option value="text">Short Text</option>
                        <option value="textarea">Long Text</option>
                        <option value="dropdown">Selection Menu</option>
                        <option value="date">Calendar Date</option>
                        <option value="time">Availability Lock</option>
                        <option value="phone">Contact Number</option>
                      </select>
                      {!field.isSystem && <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />}
                      {field.type === 'dropdown' && (
                        <input 
                          type="text" 
                          placeholder="Options: Alpha, Beta, Gamma..." 
                          className="mt-2 w-full text-[10px] px-3 py-2 border border-[#F3F4F6] bg-[#F9FAFB] rounded-xl focus:outline-none focus:border-[#008FD5]"
                          value={(field.options || []).join(', ')}
                          onChange={e => handleFieldChange(field.id, { options: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) })}
                        />
                      )}
                    </div>
                    <div className="col-span-1 md:col-span-3 flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-gray-100">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          checked={field.required}
                          onChange={e => handleFieldChange(field.id, { required: e.target.checked })}
                          className="w-4 h-4 rounded-md text-[#008FD5] border-gray-300 focus:ring-[#008FD5] transition-all cursor-pointer"
                        />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-[#111827] transition-colors">Required</span>
                      </label>
                      {!field.isSystem && (
                        <button onPointerDown={(e) => e.stopPropagation()} onClick={() => removeField(field.id)} className="text-gray-400 hover:text-red-500 transition-all p-2 hover:bg-red-50 rounded-xl cursor-pointer no-tap-highlight">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </Reorder.Item>
              ))}
            </AnimatePresence>
            </Reorder.Group>
          </div>
        </div>
      </div>
    </div>
  );
}
