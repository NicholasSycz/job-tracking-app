import React from 'react';
import { Save, X, RotateCcw } from 'lucide-react';

import SettingsSection from './SettingsSection';

export interface ListEditorItem {
  /** Stable identity, passed back to onRemove. */
  key: string;
  label: string;
  /** Shown in mono next to the label, for value-backed lists. */
  secondary?: string;
}

interface Props {
  icon: React.ReactNode;
  iconClass: string;
  title: string;
  description: string;
  items: ListEditorItem[];
  /** Shown in place of the list when it is empty. */
  emptyMessage?: string;
  onRemove: (key: string) => void;
  onReset?: () => void;
  isSaving: boolean;
  saveLabel: string;
  onSave: () => void;
  /** The section-specific "add an item" row. */
  children: React.ReactNode;
}

/** Shared shell for the job sources, recruiting services and interview type lists. */
const ListEditor: React.FC<Props> = ({
  icon,
  iconClass,
  title,
  description,
  items,
  emptyMessage,
  onRemove,
  onReset,
  isSaving,
  saveLabel,
  onSave,
  children,
}) => (
  <SettingsSection
    icon={icon}
    iconClass={iconClass}
    title={title}
    description={description}
    action={
      onReset && (
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          <RotateCcw size={13} /> Reset to defaults
        </button>
      )
    }
  >
    <div className="space-y-2 mb-4">
      {items.length === 0 && emptyMessage && (
        <p className="text-sm text-slate-400 dark:text-slate-600 italic">{emptyMessage}</p>
      )}
      {items.map(item => (
        <div key={item.key} className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-xl">
          <div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{item.label}</span>
            {item.secondary && (
              <span className="ml-2 text-xs text-slate-400 dark:text-slate-600 font-mono">{item.secondary}</span>
            )}
          </div>
          <button
            onClick={() => onRemove(item.key)}
            aria-label={`Remove ${item.label}`}
            className="p-1 text-slate-400 hover:text-rose-500 transition-colors rounded-lg"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>

    <div className="flex gap-2 mb-4">{children}</div>

    <button
      onClick={onSave}
      disabled={isSaving}
      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
    >
      <Save size={15} />
      {isSaving ? 'Saving…' : saveLabel}
    </button>
  </SettingsSection>
);

export default ListEditor;
