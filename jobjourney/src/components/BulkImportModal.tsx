import React, { useState, useRef } from 'react';
import { X, Upload, FileJson, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { JobApplication, ApplicationStatus } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImport: (applications: Partial<JobApplication>[]) => Promise<{ imported: number }>;
}

interface ImportPreview {
  valid: Partial<JobApplication>[];
  errors: string[];
}

const BulkImportModal: React.FC<Props> = ({ isOpen, onClose, onImport }) => {
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setPreview(null);
    setImportResult(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Handle both array and object with applications property
      const applications = Array.isArray(data) ? data : data.applications;

      if (!Array.isArray(applications)) {
        setError('JSON must be an array of applications or an object with an "applications" array');
        return;
      }

      if (applications.length === 0) {
        setError('No applications found in the file');
        return;
      }

      if (applications.length > 100) {
        setError('Maximum 100 applications per import. Please split your file.');
        return;
      }

      // Validate and preview
      const valid: Partial<JobApplication>[] = [];
      const errors: string[] = [];

      applications.forEach((app: Record<string, unknown>, index: number) => {
        const rowErrors: string[] = [];

        if (!app.company || typeof app.company !== 'string') {
          rowErrors.push('missing company');
        }
        if (!app.role || typeof app.role !== 'string') {
          rowErrors.push('missing role');
        }
        if (app.status && !Object.values(ApplicationStatus).includes(app.status as ApplicationStatus)) {
          rowErrors.push(`invalid status "${app.status}"`);
        }

        if (rowErrors.length > 0) {
          errors.push(`Row ${index + 1}: ${rowErrors.join(', ')}`);
        } else {
          valid.push({
            company: app.company as string,
            role: app.role as string,
            status: (app.status as ApplicationStatus) || ApplicationStatus.INTERESTED,
            dateApplied: app.dateApplied as string || new Date().toISOString().split('T')[0],
            description: app.description as string || '',
            location: app.location as string || '',
            salary: app.salary as string,
            link: app.link as string,
            notes: app.notes as string,
            interviewDate: app.interviewDate as string,
          });
        }
      });

      setPreview({ valid, errors });
    } catch (err) {
      setError(err instanceof SyntaxError ? 'Invalid JSON format' : 'Failed to read file');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    if (!preview || preview.valid.length === 0) return;

    setIsImporting(true);
    setError(null);

    try {
      const result = await onImport(preview.valid);
      setImportResult(result);
      setPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setPreview(null);
    setError(null);
    setImportResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-950 rounded-2xl shadow-2xl border dark:border-slate-800 animate-in zoom-in-95 duration-300">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <FileJson className="text-emerald-600" size={24} />
            Bulk Import Applications
          </h2>
          <button onClick={handleClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-full text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Success Message */}
          {importResult && (
            <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
              <CheckCircle2 className="text-emerald-600 dark:text-emerald-400" size={20} />
              <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                Successfully imported {importResult.imported} application{importResult.imported !== 1 ? 's' : ''}!
              </span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={20} />
              <span className="text-red-700 dark:text-red-300 text-sm">{error}</span>
            </div>
          )}

          {/* File Upload */}
          {!importResult && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center hover:border-emerald-400 dark:hover:border-emerald-600 transition-colors cursor-pointer group"
              >
                <Upload className="mx-auto mb-3 text-slate-400 group-hover:text-emerald-500 transition-colors" size={32} />
                <p className="text-slate-600 dark:text-slate-400 mb-1">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  JSON file (max 100 applications)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* JSON Format Help */}
              <details className="group">
                <summary className="text-sm text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300">
                  View expected JSON format
                </summary>
                <pre className="mt-2 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs text-slate-600 dark:text-slate-400 overflow-x-auto">
{`[
  {
    "company": "Acme Corp",
    "role": "Software Engineer",
    "status": "APPLIED",
    "dateApplied": "2024-01-15",
    "location": "Remote",
    "salary": "$120k - $150k",
    "link": "https://...",
    "notes": "Referred by John",
    "interviewDate": "2024-01-20T10:00:00"
  },
  ...
]

Valid statuses: INTERESTED, APPLIED, INTERVIEWING, OFFER, REJECTED, GHOSTED`}
                </pre>
              </details>
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 dark:text-white">Preview</h3>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {preview.valid.length} valid, {preview.errors.length} errors
                </span>
              </div>

              {/* Validation Errors */}
              {preview.errors.length > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-2">
                    {preview.errors.length} row{preview.errors.length !== 1 ? 's' : ''} will be skipped:
                  </p>
                  <ul className="text-xs text-amber-600 dark:text-amber-500 space-y-1 max-h-24 overflow-y-auto">
                    {preview.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Valid Applications Preview */}
              {preview.valid.length > 0 && (
                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0">
                        <tr>
                          <th className="text-left p-3 font-medium text-slate-600 dark:text-slate-400">Company</th>
                          <th className="text-left p-3 font-medium text-slate-600 dark:text-slate-400">Role</th>
                          <th className="text-left p-3 font-medium text-slate-600 dark:text-slate-400">Status</th>
                          <th className="text-left p-3 font-medium text-slate-600 dark:text-slate-400">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {preview.valid.slice(0, 10).map((app, i) => (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                            <td className="p-3 text-slate-800 dark:text-slate-200">{app.company}</td>
                            <td className="p-3 text-slate-600 dark:text-slate-400">{app.role}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                {app.status}
                              </span>
                            </td>
                            <td className="p-3 text-slate-500 dark:text-slate-500">{app.dateApplied}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {preview.valid.length > 10 && (
                    <div className="p-2 bg-slate-50 dark:bg-slate-900 text-center text-xs text-slate-500">
                      ...and {preview.valid.length - 10} more
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-slate-100 dark:border-slate-800">
          {importResult ? (
            <button
              onClick={handleClose}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors"
            >
              Done
            </button>
          ) : (
            <>
              <button
                onClick={handleClose}
                className="px-6 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
              >
                Cancel
              </button>
              {preview && preview.valid.length > 0 && (
                <button
                  onClick={handleImport}
                  disabled={isImporting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
                >
                  {isImporting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      Import {preview.valid.length} Application{preview.valid.length !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkImportModal;
