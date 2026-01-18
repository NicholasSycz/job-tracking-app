import React, { useState, useEffect } from 'react';
import { X, Save, Link2, MapPin, DollarSign, Calendar, Briefcase, Loader2 } from 'lucide-react';
import { JobApplication, ApplicationStatus } from '../types';
import StatusHistory from './StatusHistory';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (job: JobApplication | Omit<JobApplication, "id">) => Promise<void>;
  editingJob?: JobApplication;
  isSaving?: boolean;
}

const JobModal: React.FC<Props> = ({ isOpen, onClose, onSave, editingJob, isSaving = false }) => {
  const [formData, setFormData] = useState<Partial<JobApplication>>({
    company: '',
    role: '',
    status: ApplicationStatus.INTERESTED,
    dateApplied: new Date().toISOString().split('T')[0],
    description: '',
    location: '',
    salary: '',
    link: '',
    notes: ''
  });

  useEffect(() => {
    if (editingJob) {
      setFormData(editingJob);
    } else {
      setFormData({
        company: '',
        role: '',
        status: ApplicationStatus.INTERESTED,
        dateApplied: new Date().toISOString().split('T')[0],
        description: '',
        location: '',
        salary: '',
        link: '',
        notes: ''
      });
    }
  }, [editingJob, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!formData.company || !formData.role) return;

    try {
      if (editingJob) {
        // Editing existing job - include the id
        await onSave({
          ...formData,
          id: editingJob.id,
        } as JobApplication);
      } else {
        // Creating new job - let server generate id
        await onSave({
          company: formData.company!,
          role: formData.role!,
          status: formData.status || ApplicationStatus.INTERESTED,
          dateApplied: formData.dateApplied || new Date().toISOString().split('T')[0],
          description: formData.description || '',
          location: formData.location || '',
          salary: formData.salary,
          link: formData.link,
          notes: formData.notes,
        });
      }
      // Only close if save was successful
      onClose();
    } catch {
      // Error is already handled by parent - don't close modal on error
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        className="w-full max-w-2xl h-full bg-white dark:bg-slate-950 shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 overflow-y-auto border-l dark:border-slate-800"
      >
        <div className="sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 p-6 flex justify-between items-center z-10 transition-colors">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">
            {editingJob ? 'Refine Application' : 'Track New Opportunity'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-full text-slate-400 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 space-y-8 flex-1">
          {/* Main Info */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Company</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600" size={16} />
                <input 
                  type="text" 
                  value={formData.company}
                  onChange={e => setFormData(p => ({ ...p, company: e.target.value }))}
                  placeholder="Acme Corp" 
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/20 rounded-xl outline-none transition-all text-slate-800 dark:text-slate-200 text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Role</label>
              <input 
                type="text" 
                value={formData.role}
                onChange={e => setFormData(p => ({ ...p, role: e.target.value }))}
                placeholder="Senior Engineer" 
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/20 rounded-xl outline-none transition-all text-slate-800 dark:text-slate-200 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
             <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Status</label>
                <select 
                  value={formData.status}
                  onChange={e => setFormData(p => ({ ...p, status: e.target.value as ApplicationStatus }))}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 dark:focus:border-emerald-500 rounded-xl outline-none appearance-none text-slate-800 dark:text-slate-200 text-sm cursor-pointer"
                >
                  {Object.values(ApplicationStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Application Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600" size={16} />
                  <input 
                    type="date" 
                    value={formData.dateApplied}
                    onChange={e => setFormData(p => ({ ...p, dateApplied: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 dark:focus:border-emerald-500 rounded-xl outline-none transition-all text-slate-800 dark:text-slate-200 text-sm"
                  />
                </div>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
             <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600" size={16} />
                  <input 
                    type="text" 
                    value={formData.location}
                    onChange={e => setFormData(p => ({ ...p, location: e.target.value }))}
                    placeholder="Remote / Hybrid" 
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 dark:focus:border-emerald-500 rounded-xl outline-none transition-all text-slate-800 dark:text-slate-200 text-sm"
                  />
                </div>
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Compensation</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600" size={16} />
                  <input 
                    type="text" 
                    value={formData.salary}
                    onChange={e => setFormData(p => ({ ...p, salary: e.target.value }))}
                    placeholder="$140k - $180k" 
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 dark:focus:border-emerald-500 rounded-xl outline-none transition-all text-slate-800 dark:text-slate-200 text-sm"
                  />
                </div>
             </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Application Link</label>
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600" size={16} />
              <input 
                type="url" 
                value={formData.link}
                onChange={e => setFormData(p => ({ ...p, link: e.target.value }))}
                placeholder="URL to posting..." 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 dark:focus:border-emerald-500 rounded-xl outline-none transition-all text-slate-800 dark:text-slate-200 text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Job Description</label>
            <textarea 
              rows={5}
              value={formData.description}
              onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
              placeholder="Paste job description here..."
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 dark:focus:border-emerald-500 rounded-2xl outline-none transition-all resize-none text-slate-800 dark:text-slate-200 text-sm leading-relaxed"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Application Notes</label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
              placeholder="Contacts, referral info, timeline details..."
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 dark:focus:border-emerald-500 rounded-2xl outline-none transition-all resize-none text-slate-800 dark:text-slate-200 text-sm leading-relaxed"
            />
          </div>

          {/* Status History - only show when editing */}
          {editingJob && (
            <StatusHistory applicationId={editingJob.id} isOpen={isOpen} />
          )}

          <div className="pb-12" />
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 p-6 flex gap-4 transition-colors">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!formData.company || !formData.role || isSaving}
            className="flex-2 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-12 py-3 rounded-2xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-emerald-200 dark:shadow-none"
          >
            {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            {isSaving ? 'Saving...' : 'Save Details'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobModal;
