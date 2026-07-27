import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  BookOpen, 
  User, 
  MapPin, 
  Plus, 
  X, 
  Check, 
  Sparkles, 
  AlertCircle,
  Copy,
  Printer
} from 'lucide-react';
import { Student, ClassName } from '../types';
import { getSubjectsForClass } from '../curriculum';
import AshinagaLogo from './AshinagaLogo';

interface TimetableSlot {
  id: string;
  className: ClassName;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
  timeSlot: string; // e.g., '08:30 - 09:30'
  subject: string;
  teacherName: string;
  roomName: string;
}

interface SchoolTimetableProps {
  teacherClasses: ClassName[];
  isAdmin: boolean;
}

export default function SchoolTimetable({ teacherClasses, isAdmin }: SchoolTimetableProps) {
  const [selectedClass, setSelectedClass] = useState<ClassName>('P.1');
  const [selectedDay, setSelectedDay] = useState<'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday'>('Monday');
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // New slot form state
  const [formDay, setFormDay] = useState<'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday'>('Monday');
  const [formTimeSlot, setFormTimeSlot] = useState('08:30 - 09:30');
  const [formSubject, setFormSubject] = useState('Mathematics');
  const [formTeacher, setFormTeacher] = useState('Madam Namutebi Proscovia');
  const [formRoom, setFormRoom] = useState('Stream A Room');
  const classSubjects = getSubjectsForClass(selectedClass);

  useEffect(() => {
    if (!classSubjects.includes(formSubject as never)) {
      setFormSubject(classSubjects[0]);
    }
  }, [selectedClass]);

  const classesList: ClassName[] = ['P.1', 'P.2', 'P.3', 'P.4', 'P.5', 'P.6', 'P.7'];
  const daysList: ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday')[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const timeSlotsList = [
    '08:30 - 09:30',
    '09:30 - 10:30',
    '10:30 - 11:00', // break
    '11:00 - 12:00',
    '12:00 - 13:00',
    '13:00 - 14:00', // lunch
    '14:00 - 15:30'
  ];

  // Fetch timetable on mount
  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        const res = await fetch('/api/timetable');
        if (res.ok) {
          const data = await res.json();
          setTimetable(data);
        }
      } catch (err) {
        console.log('Error loading timetable');
      }
    };
    fetchTimetable();
  }, []);

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      className: selectedClass,
      day: formDay,
      timeSlot: formTimeSlot,
      subject: formSubject,
      teacherName: formTeacher,
      roomName: formRoom
    };

    try {
      const res = await fetch('/api/timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const saved = await res.json();
        setTimetable(prev => [...prev, saved]);
        setShowAddModal(false);
      }
    } catch (err) {
      alert('Error saving timetable slot.');
    }
  };

  const handleDeleteSlot = async (id: string) => {
    if (!confirm('Are you sure you want to remove this subject slot from the timetable?')) return;
    try {
      const res = await fetch(`/api/timetable/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTimetable(prev => prev.filter(t => t.id !== id));
      }
    } catch (err) {
      alert('Error deleting timetable slot.');
    }
  };

  const getSlot = (day: string, timeSlot: string) => {
    return timetable.find(t => t.className === selectedClass && t.day === day && t.timeSlot === timeSlot);
  };

  const hasAccessToClass = (c: ClassName) => {
    if (isAdmin) return true;
    return teacherClasses.includes(c);
  };

  return (
    <div id="school_timetable_view" className="p-8 space-y-6 font-sans max-w-7xl mx-auto print:p-0">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-sky-150 pb-5 print:hidden">
        <div className="flex items-center gap-3">
          <AshinagaLogo size={50} className="shrink-0 bg-white p-1 rounded-xl shadow-xs border border-slate-100" />
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-50 text-sky-700 rounded-full text-[10px] font-black uppercase tracking-wider mb-2">
              <Sparkles className="h-3 w-3 text-sky-500 animate-spin" /> School Schedule Engine
            </div>
            <h1 className="font-display text-2xl font-black text-slate-800">Class Timetable & Term Scheduler</h1>
            <p className="text-xs text-slate-400 mt-1">Design stream schedules, assign teachers to subjects, and print weekly timetables for Class stream streams.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-4 py-2.5 border-2 border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer flex items-center gap-1.5"
          >
            <Printer className="h-4 w-4" />
            <span>Print Weekly Grid</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer text-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Add Class Lesson Slot</span>
          </button>
        </div>
      </div>

      {/* Class Selector Bar */}
      <div className="flex flex-wrap bg-slate-50 p-1.5 rounded-2xl gap-1 border border-slate-150 print:hidden">
        {classesList.map((c) => {
          const isSelected = selectedClass === c;
          const hasAccess = hasAccessToClass(c);
          return (
            <button
              key={c}
              onClick={() => {
                if (hasAccess) setSelectedClass(c);
              }}
              disabled={!hasAccess}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              } disabled:opacity-30 disabled:cursor-not-allowed`}
            >
              Class {c} {!hasAccess && '🔒'}
            </button>
          );
        })}
      </div>

      {/* Visual Scheduler Grid Stage */}
      <div className="bg-white rounded-3xl border border-slate-150 shadow-sm overflow-hidden p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">
            Weekly Lesson Schedule - Class {selectedClass}
          </h3>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-slate-100 px-3 py-1 rounded-full">
            Wakiso District Standard Calendar
          </span>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[850px] border-collapse text-xs">
            {/* Header row */}
            <div className="grid grid-cols-8 gap-3 bg-slate-55 p-3 rounded-2xl text-slate-400 font-black uppercase tracking-wider text-center border border-slate-100">
              <div className="text-left pl-2">Time Slot</div>
              {daysList.map(d => (
                <div key={d} className={selectedDay === d ? 'text-indigo-600 font-black bg-indigo-50/50 py-1 rounded-lg' : ''}>
                  {d}
                </div>
              ))}
              <div className="col-span-2">Notes & Room</div>
            </div>

            {/* Time Slot Rows */}
            <div className="divide-y divide-slate-100 mt-2">
              {timeSlotsList.map(timeSlot => {
                const isBreak = timeSlot === '10:30 - 11:00';
                const isLunch = timeSlot === '13:00 - 14:00';

                return (
                  <div key={timeSlot} className="grid grid-cols-8 gap-3 py-4 items-center text-center hover:bg-slate-50/40 transition-all rounded-xl px-2">
                    {/* Time field */}
                    <div className="flex items-center gap-1.5 text-left font-mono font-bold text-slate-500">
                      <Clock className="h-4 w-4 text-slate-400" />
                      <span>{timeSlot}</span>
                    </div>

                    {/* Check if special breaks */}
                    {isBreak ? (
                      <div className="col-span-7 bg-amber-50 text-amber-700 font-black uppercase tracking-widest text-[10px] py-2 rounded-2xl text-center border border-amber-100">
                        ☕ Morning Porridge / Recess Break
                      </div>
                    ) : isLunch ? (
                      <div className="col-span-7 bg-orange-50/80 text-orange-700 font-black uppercase tracking-widest text-[10px] py-2 rounded-2xl text-center border border-orange-100">
                        🍛 School Lunch Program Break
                      </div>
                    ) : (
                      <>
                        {daysList.map(day => {
                          const slot = getSlot(day, timeSlot);
                          return (
                            <div key={day} className="h-full flex flex-col justify-center min-h-[50px] transition-all">
                              {slot ? (
                                <div className="p-2 bg-indigo-50/70 hover:bg-indigo-50 border border-indigo-150 rounded-xl space-y-1 relative group text-left">
                                  <h4 className="font-extrabold text-indigo-800 uppercase text-[10px] truncate leading-none" title={slot.subject}>
                                    {slot.subject}
                                  </h4>
                                  <p className="text-[8px] text-slate-500 font-semibold truncate leading-none flex items-center gap-0.5">
                                    <User className="h-2 w-2 text-indigo-400" /> {slot.teacherName}
                                  </p>
                                  <p className="text-[8px] text-slate-400 font-mono leading-none truncate flex items-center gap-0.5">
                                    <MapPin className="h-2 w-2 text-indigo-400" /> {slot.roomName}
                                  </p>

                                  <button
                                    onClick={() => handleDeleteSlot(slot.id)}
                                    className="absolute -top-1.5 -right-1.5 bg-red-100 hover:bg-red-500 hover:text-white p-0.5 rounded-full text-red-700 opacity-0 group-hover:opacity-100 transition-all cursor-pointer border border-red-200 print:hidden"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setFormDay(day);
                                    setFormTimeSlot(timeSlot);
                                    setShowAddModal(true);
                                  }}
                                  className="h-full w-full border border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/20 rounded-xl transition-all flex items-center justify-center py-2 text-slate-300 hover:text-indigo-600 cursor-pointer print:hidden"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          );
                        })}

                        {/* Room notes column */}
                        <div className="col-span-2 text-[10px] text-slate-400 font-semibold text-left pl-3 truncate">
                          {getSlot(daysList[0], timeSlot)?.roomName || 'Assigned Streaming'}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Add Slot Modal Dialog Form */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative border border-slate-100">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <form onSubmit={handleAddSlot} className="p-6 space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-display font-extrabold text-lg text-slate-800">Add Class Lesson Lesson</h3>
                <p className="text-slate-400 text-xs mt-1">Assign subject, room, and teacher for Class {selectedClass}.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Target Day *</label>
                  <select
                    value={formDay}
                    onChange={(e) => setFormDay(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-800 focus:outline-none"
                    required
                  >
                    {daysList.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Time Slot Hour *</label>
                  <select
                    value={formTimeSlot}
                    onChange={(e) => setFormTimeSlot(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-800 focus:outline-none font-bold"
                    required
                  >
                    {timeSlotsList.filter(t => t !== '10:30 - 11:00' && t !== '13:00 - 14:00').map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Subject Title *</label>
                <select
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-850 focus:outline-none font-bold"
                  required
                >
                  {classSubjects.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Assigned Teacher *</label>
                <input
                  type="text"
                  placeholder="e.g. Teacher Nabakooza Rose"
                  value={formTeacher}
                  onChange={(e) => setFormTeacher(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-800 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Classroom Stream / Location *</label>
                <input
                  type="text"
                  placeholder="e.g. Stream A Building"
                  value={formRoom}
                  onChange={(e) => setFormRoom(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-800 focus:outline-none"
                  required
                />
              </div>

              <div className="pt-4 border-t border-slate-150 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-md cursor-pointer"
                >
                  Add Subject Lesson
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
