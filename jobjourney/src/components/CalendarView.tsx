import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Clock, Briefcase } from 'lucide-react';
import { JobApplication, CalendarEvent, EventType, ApplicationStatus } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import EventModal from './EventModal';
import JobModal from './JobModal';

interface Props {
  applications: JobApplication[];
  calendarEvents: CalendarEvent[];
  onEditJob: (job: JobApplication) => void;
  onCreateEvent: (data: { title: string; description?: string; startAt: string; endAt?: string; type: EventType; jobId?: string }) => Promise<void>;
  onUpdateEvent: (id: string, updates: Partial<{ title: string; description: string; startAt: string; endAt: string; type: EventType; jobId: string }>) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
}

// Unified event type for rendering
interface DayEvent {
  id: string;
  label: string;
  time?: string;
  color: string;
  bgColor: string;
  source: 'job-interview' | 'job-followup' | 'calendar';
  job?: JobApplication;
  calendarEvent?: CalendarEvent;
}

const EVENT_COLORS: Record<string, { color: string; bgColor: string }> = {
  interview:     { color: 'text-blue-700 dark:text-blue-300',   bgColor: 'bg-blue-100 dark:bg-blue-900/40' },
  followup:      { color: 'text-amber-700 dark:text-amber-300', bgColor: 'bg-amber-100 dark:bg-amber-900/40' },
  [EventType.INTERVIEW]:      { color: 'text-blue-700 dark:text-blue-300',   bgColor: 'bg-blue-100 dark:bg-blue-900/40' },
  [EventType.RECRUITER_CALL]: { color: 'text-violet-700 dark:text-violet-300', bgColor: 'bg-violet-100 dark:bg-violet-900/40' },
  [EventType.NETWORKING]:     { color: 'text-teal-700 dark:text-teal-300',   bgColor: 'bg-teal-100 dark:bg-teal-900/40' },
  [EventType.OTHER]:          { color: 'text-slate-700 dark:text-slate-300', bgColor: 'bg-slate-100 dark:bg-slate-800' },
};

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  [EventType.INTERVIEW]: 'Interview',
  [EventType.RECRUITER_CALL]: 'Recruiter Call',
  [EventType.NETWORKING]: 'Networking',
  [EventType.OTHER]: 'Other',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const CalendarView: React.FC<Props> = ({ applications, calendarEvents, onEditJob, onCreateEvent, onUpdateEvent, onDeleteEvent }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | undefined>();
  const [defaultEventDate, setDefaultEventDate] = useState<string | undefined>();
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobApplication | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };
  const goToday = () => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); };

  // Build the grid of days
  const gridDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (Date | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewYear, viewMonth]);

  // Build a map of date-string → DayEvent[]
  const eventsByDate = useMemo(() => {
    const map: Record<string, DayEvent[]> = {};

    const addEvent = (dateKey: string, event: DayEvent) => {
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(event);
    };

    // Job interviews
    applications.forEach(app => {
      if (app.interviewDate) {
        const d = new Date(app.interviewDate);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        addEvent(key, {
          id: `interview-${app.id}`,
          label: `${app.company} — Interview`,
          time: formatTime(app.interviewDate),
          ...EVENT_COLORS.interview,
          source: 'job-interview',
          job: app,
        });
      }
      if (app.followUpDate) {
        const d = new Date(app.followUpDate);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        addEvent(key, {
          id: `followup-${app.id}`,
          label: `${app.company} — Follow-up`,
          ...EVENT_COLORS.followup,
          source: 'job-followup',
          job: app,
        });
      }
    });

    // Calendar events
    calendarEvents.forEach(evt => {
      const d = new Date(evt.startAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      addEvent(key, {
        id: evt.id,
        label: evt.title,
        time: formatTime(evt.startAt),
        ...EVENT_COLORS[evt.type],
        source: 'calendar',
        calendarEvent: evt,
      });
    });

    // Sort each day's events by time
    Object.values(map).forEach(events =>
      events.sort((a, b) => {
        if (!a.time && !b.time) return 0;
        if (!a.time) return 1;
        if (!b.time) return -1;
        return a.time.localeCompare(b.time);
      })
    );

    return map;
  }, [applications, calendarEvents]);

  const getEventsForDate = (date: Date): DayEvent[] => {
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return eventsByDate[key] ?? [];
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  const openNewEvent = (date?: Date) => {
    setEditingEvent(undefined);
    setDefaultEventDate(date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : undefined);
    setIsEventModalOpen(true);
  };

  const openEditEvent = (evt: CalendarEvent) => {
    setEditingEvent(evt);
    setDefaultEventDate(undefined);
    setIsEventModalOpen(true);
  };

  const handleEventClick = (dayEvent: DayEvent) => {
    if (dayEvent.source === 'calendar' && dayEvent.calendarEvent) {
      openEditEvent(dayEvent.calendarEvent);
    } else if (dayEvent.job) {
      setEditingJob(dayEvent.job);
      setIsJobModalOpen(true);
    }
  };

  const handleSaveEvent = async (data: Parameters<typeof onCreateEvent>[0]) => {
    setIsSaving(true);
    try {
      if (editingEvent) {
        await onUpdateEvent(editingEvent.id, data);
      } else {
        await onCreateEvent(data);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!editingEvent) return;
    await onDeleteEvent(editingEvent.id);
    setIsEventModalOpen(false);
  };

  const cellBase = `min-h-[100px] p-1.5 border-b border-r border-slate-100 dark:border-slate-800 relative group cursor-pointer transition-colors`;

  return (
    <div className="flex gap-6 h-full animate-in fade-in duration-500">
      {/* Main Calendar */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
              {MONTHS[viewMonth]} {viewYear}
            </h2>
            <button onClick={goToday} className="px-3 py-1 text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg transition-colors">
              Today
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 transition-colors">
              <ChevronLeft size={20} />
            </button>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 transition-colors">
              <ChevronRight size={20} />
            </button>
            <button
              onClick={() => openNewEvent(selectedDate ?? undefined)}
              className="flex items-center gap-1.5 ml-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
            >
              <Plus size={16} /> Add Event
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800">
            {DAYS.map(d => (
              <div key={d} className="py-3 text-center text-[11px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Cells */}
          <div className="grid grid-cols-7">
            {gridDays.map((date, i) => {
              if (!date) return (
                <div key={`empty-${i}`} className="min-h-[100px] border-b border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20" />
              );

              const events = getEventsForDate(date);
              const isToday = isSameDay(date, today);
              const isSelected = selectedDate && isSameDay(date, selectedDate);
              const MAX_CHIPS = 3;

              return (
                <div
                  key={date.toISOString()}
                  onClick={() => setSelectedDate(isSelected ? null : date)}
                  className={`${cellBase} hover:bg-slate-50 dark:hover:bg-slate-900/50 ${isSelected ? 'bg-emerald-50/60 dark:bg-emerald-900/10' : ''}`}
                >
                  {/* Day number */}
                  <div className="flex items-start justify-between mb-1">
                    <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
                      isToday ? 'bg-emerald-600 text-white' : 'text-slate-700 dark:text-slate-300'
                    }`}>
                      {date.getDate()}
                    </span>
                    {/* Quick add button */}
                    <button
                      onClick={e => { e.stopPropagation(); openNewEvent(date); }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-all"
                    >
                      <Plus size={12} className="text-slate-400" />
                    </button>
                  </div>

                  {/* Event chips */}
                  <div className="space-y-0.5">
                    {events.slice(0, MAX_CHIPS).map(evt => (
                      <button
                        key={evt.id}
                        onClick={e => { e.stopPropagation(); handleEventClick(evt); }}
                        className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] font-semibold truncate ${evt.bgColor} ${evt.color} hover:opacity-80 transition-opacity`}
                      >
                        {evt.time && <span className="opacity-70 mr-1">{evt.time}</span>}
                        {evt.label}
                      </button>
                    ))}
                    {events.length > MAX_CHIPS && (
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-600 px-1.5">
                        +{events.length - MAX_CHIPS} more
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Day Detail Panel */}
      {selectedDate && (
        <div className="w-72 shrink-0 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 flex flex-col gap-4 h-fit sticky top-0 animate-in slide-in-from-right duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {DAYS[selectedDate.getDay()]}
              </p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white leading-tight">
                {selectedDate.getDate()}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {MONTHS[selectedDate.getMonth()]} {selectedDate.getFullYear()}
              </p>
            </div>
            <div className="flex flex-col gap-1.5 items-end">
              <button
                onClick={() => openNewEvent(selectedDate)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors"
              >
                <Plus size={12} /> Add
              </button>
              <button onClick={() => setSelectedDate(null)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {selectedDateEvents.length === 0 && (
              <p className="text-xs text-slate-400 dark:text-slate-600 italic text-center py-4">No events — add one!</p>
            )}
            {selectedDateEvents.map(evt => (
              <button
                key={evt.id}
                onClick={() => handleEventClick(evt)}
                className={`w-full text-left p-3 rounded-xl ${evt.bgColor} transition-opacity hover:opacity-80`}
              >
                <div className="flex items-start gap-2">
                  {evt.source === 'job-interview' || evt.source === 'job-followup'
                    ? <Briefcase size={13} className={`${evt.color} mt-0.5 shrink-0`} />
                    : <Clock size={13} className={`${evt.color} mt-0.5 shrink-0`} />
                  }
                  <div className="min-w-0">
                    <p className={`text-xs font-bold truncate ${evt.color}`}>{evt.label}</p>
                    {evt.time && <p className={`text-[10px] ${evt.color} opacity-70`}>{evt.time}</p>}
                    {evt.calendarEvent?.description && (
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{evt.calendarEvent.description}</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Event Modal */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onSave={handleSaveEvent}
        onDelete={editingEvent ? handleDeleteEvent : undefined}
        editingEvent={editingEvent}
        defaultDate={defaultEventDate}
        applications={applications}
        isSaving={isSaving}
      />

      {/* Job Modal (for editing interview/followup job records) */}
      {editingJob && (
        <JobModal
          isOpen={isJobModalOpen}
          onClose={() => { setIsJobModalOpen(false); setEditingJob(undefined); }}
          onSave={async (job) => { onEditJob(job as JobApplication); setIsJobModalOpen(false); }}
          editingJob={editingJob}
        />
      )}
    </div>
  );
};

export default CalendarView;
