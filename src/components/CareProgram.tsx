import React, { useState, useEffect, useMemo } from 'react';
import { 
  HeartHandshake, 
  Calendar, 
  BookOpen, 
  Utensils, 
  Smile, 
  Sparkles, 
  Home, 
  Plus, 
  Check, 
  CheckCircle, 
  X, 
  Printer, 
  Download, 
  Search, 
  Filter, 
  Clock, 
  User, 
  MapPin, 
  Users, 
  FileText, 
  Award,
  Trash2,
  Edit3,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Heart,
  Shuffle,
  Info,
  CheckSquare
} from 'lucide-react';
import { Student, Teacher, CareSession, CareSessionAttendee, CareRoomGroup, CareMood, ClassName } from '../types';
import AshinagaLogo from './AshinagaLogo';

interface CareProgramProps {
  students: Student[];
  teacher: Teacher;
  isAdmin: boolean;
}

// Ashinaga 7 Golden Ground Rules
const ASHINAGA_GROUND_RULES = [
  { id: 1, title: 'Safe Conduct', text: 'Do not hurt yourself, friends, staff, or volunteers.', icon: '🛡️' },
  { id: 2, title: 'Name Tags', text: 'All students must keep your name tags on and visible at all times.', icon: '🏷️' },
  { id: 3, title: 'Respect Property', text: 'Respect Ashinaga property (strictly do not break, misuse, or steal).', icon: '🏫' },
  { id: 4, title: 'Zero Tolerance for Bad Behaviour', text: 'Fighting, aggressive behaviour, causing trouble, disrespect, and bullying are strictly prohibited.', icon: '🤝' },
  { id: 5, title: 'No Gadgets Policy', text: 'Phones and watches are not allowed during care program; if found, they are kept securely until departure.', icon: '📵' },
  { id: 6, title: 'Clean Sanctuary', text: 'DO NOT LITTER. Shared spaces, sitting rooms, and grounds must stay spotless.', icon: '🚯' },
  { id: 7, title: 'Closing Time Discipline', text: 'DO NOT LEAVE BEFORE CLOSING TIME (3:45 PM departure strictly observed).', icon: '⏱️' }
];

// Official 12-Slot Saturday Schedule (9:00 AM - 4:00 PM)
const SATURDAY_TIMETABLE = [
  { time: '9:00 AM – 9:30 AM', duration: '30 mins', title: 'Staff & Volunteer Briefing', type: 'staff', description: 'Program discussion, delegation of duty, review of session Goals & Objectives.' },
  { time: '9:30 AM – 10:00 AM', duration: '30 mins', title: 'Arrival & Registration Check-in', type: 'registration', description: 'Pupil arrivals, verification of visible name tags, and initial health/energy check.' },
  { time: '10:00 AM – 10:45 AM', duration: '45 mins', title: 'Morning Break Time', type: 'break', description: 'Unstructured socialization, hydration, and outdoor relaxation.' },
  { time: '10:45 AM – 11:00 AM', duration: '15 mins', title: 'Divide into Groups & Room Stations', type: 'groups', description: 'Group 1 (Sitting Room), Group 2 (Talking Room), Group 3 (Outside Terakoya).' },
  { time: '11:00 AM – 1:00 PM', duration: '2 hours', title: 'Psychosocial Learning: "Responsibility"', type: 'learning', description: 'Energizer, "Pass Responsibility Ball", Stop-Think-Choose, and "My Responsibility Shield".' },
  { time: '1:00 PM – 2:00 PM', duration: '1 hour', title: 'Nutritious Lunch Time', type: 'lunch', description: 'Communal hot meal (Posho, fresh beans, steamed greens, clean water, and fruit).' },
  { time: '2:00 PM – 3:00 PM', duration: '1 hour', title: 'Care Program Evaluation Survey', type: 'survey', description: 'Pupil feedback questionnaire on activities, feelings, and learning experience.' },
  { time: '3:00 PM – 3:15 PM', duration: '15 mins', title: 'Community Cleaning Time', type: 'cleaning', description: 'Tidying Sitting Room, Talking Room, Outside Terakoya, and compound litter sweep.' },
  { time: '3:15 PM – 3:30 PM', duration: '15 mins', title: 'Check Out & Psychosocial Reflection', type: 'checkout', description: 'Reflective circles: "How was your day? How are you feeling? What did you learn?"' },
  { time: '3:30 PM – 3:45 PM', duration: '15 mins', title: 'Closing Remarks & Announcements', type: 'closing', description: 'Group affirmation pledge ("I Can Be Counted On!") and upcoming Saturday notices.' },
  { time: '3:45 PM', duration: 'Moment', title: 'Orderly Student Departure', type: 'departure', description: 'Safe release to registered guardians and organized walking groups.' },
  { time: '3:45 PM – 4:00 PM', duration: '15 mins', title: 'Staff & Volunteer Evaluation Meeting', type: 'staff', description: 'Debrief on day’s achievements, feedback, challenges, and improvements for next Saturday.' }
];

export default function CareProgram({ students, teacher, isAdmin }: CareProgramProps) {
  const [sessions, setSessions] = useState<CareSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'roster' | 'timetable' | 'guide' | 'rules' | 'evaluation'>('roster');
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('All');
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<'All' | CareRoomGroup>('All');

  // Modals
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showThemeGuideModal, setShowThemeGuideModal] = useState(false);

  // Form state for creating / editing a session
  const [sessionForm, setSessionForm] = useState({
    id: '',
    date: new Date().toISOString().split('T')[0],
    title: 'Saturday Care Program',
    cohort: 'Upper primary',
    theme: 'Responsibility – I Can Be Counted On!',
    facilitator: teacher.name || 'Community Worker',
    staffDelegation: 'Leader: Florence N. | Room 1: David M. | Room 2: Sarah K. | Room 3: John B. | Kitchen: Nakato',
    learningNotes: 'Theme: Responsibility. Energizer "Captain Responsibility", Stop-Think-Choose framework, and drawing My Responsibility Shield.',
    lunchMenu: 'Hot Posho with slow-simmered beans, steamed Doodo greens, fresh ripe bananas, and treated drinking water.',
    playActivities: 'Pass the Responsibility Ball, outdoor football, team skipping rope, and psychosocial circle games.',
    cleaningDuties: 'Compound sweep, wiping desks in Sitting & Talking rooms, washing cups/plates, and zero-litter inspection.',
    evaluationNotes: 'Survey conducted with Upper Primary pupils. Strong engagement in Stop-Think-Choose discussion.',
    generalNotes: 'Smooth attendance. Volunteers and community workers collaborated effectively across all 3 stations.',
    status: 'in-progress' as 'planned' | 'in-progress' | 'completed'
  });

  // Fetch care sessions from API
  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/care-sessions');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setSessions(data);
          if (!selectedSessionId) {
            setSelectedSessionId(data[0].id);
          }
          return;
        }
      }
    } catch (e) {
      console.warn('Could not load remote care sessions:', e);
    } finally {
      setLoading(false);
    }

    // Default fallback initial session if none exist
    const defaultDate = new Date().toISOString().split('T')[0];
    const initialSession: CareSession = {
      id: `care-${Date.now()}`,
      date: defaultDate,
      title: 'Saturday Care Program – Upper primary',
      cohort: 'Upper primary',
      theme: 'Responsibility – I Can Be Counted On!',
      facilitator: teacher.name || 'Florence Namatovu',
      staffDelegation: 'Head: Florence Namatovu | Group 1 (Sitting Room): Moses | Group 2 (Talking Room): Grace | Group 3 (Terakoya): Dennis | Kitchen: Joy',
      learningNotes: 'Objectives: Explain responsibility; identify duties at home, school & community; Stop-Think-Choose; My Responsibility Shield.',
      lunchMenu: 'Hot Posho, rich bean stew, steamed greens, clean drinking water, and seasonal bananas.',
      playActivities: 'Captain Responsibility Says!, Pass the Responsibility Ball, dodgeball, and creative shield presentations.',
      cleaningDuties: 'Sitting room & Talking room swept, Terakoya veranda scrubbed, cups/plates washed, no litter left.',
      evaluationNotes: '3:45 PM Debrief: Children loved the Responsibility Shield. Group 2 recommended more soft balls for next Saturday.',
      generalNotes: 'Upper primary attended in high spirits with name tags prominently visible.',
      status: 'in-progress',
      attendees: students.map((s, idx) => {
        const rooms: CareRoomGroup[] = ['Sitting Room', 'Talking Room', 'Outside Terakoya'];
        return {
          studentId: s.id,
          studentName: `${s.surname} ${s.otherNames}`,
          className: s.className,
          attended: true,
          roomGroup: rooms[idx % 3],
          attendedLearning: true,
          receivedLunch: true,
          participatedPlay: true,
          participatedCleaning: true,
          surveyCompleted: true,
          checkoutMood: (['joyful', 'peaceful', 'neutral', 'joyful'][idx % 4] as CareMood),
          notes: ''
        };
      })
    };

    setSessions([initialSession]);
    setSelectedSessionId(initialSession.id);
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const activeSession = useMemo(() => {
    return sessions.find(s => s.id === selectedSessionId) || sessions[0] || null;
  }, [sessions, selectedSessionId]);

  // Persist session changes to backend
  const saveSessionToBackend = async (sessionToSave: CareSession) => {
    try {
      await fetch('/api/care-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionToSave)
      });
    } catch (e) {
      console.error('Error saving care session:', e);
    }
  };

  // Open modal to create new session
  const handleOpenNewSessionModal = () => {
    setSessionForm({
      id: '',
      date: new Date().toISOString().split('T')[0],
      title: 'Saturday Care Program – Upper primary',
      cohort: 'Upper primary',
      theme: 'Responsibility – I Can Be Counted On!',
      facilitator: teacher.name || 'Community Worker',
      staffDelegation: 'Leader: Florence | Room 1: Sitting Room | Room 2: Talking Room | Room 3: Outside Terakoya',
      learningNotes: 'Responsibility concept, Stop-Think-Choose steps, and My Responsibility Shield drawing.',
      lunchMenu: 'Hot Posho, bean stew, steamed greens, and fresh bananas.',
      playActivities: 'Captain Responsibility Says!, Pass the Ball, outdoor sports, and circle pledge.',
      cleaningDuties: 'Compound sweep, room tidying, washing plates/cups, and hygiene inspection.',
      evaluationNotes: 'Survey findings and staff debriefing notes.',
      generalNotes: '',
      status: 'in-progress'
    });
    setShowSessionModal(true);
  };

  // Open modal to edit existing session details
  const handleOpenEditSessionModal = (session: CareSession) => {
    setSessionForm({
      id: session.id,
      date: session.date,
      title: session.title,
      cohort: session.cohort || 'Upper primary',
      theme: session.theme || 'Responsibility – I Can Be Counted On!',
      facilitator: session.facilitator,
      staffDelegation: session.staffDelegation || '',
      learningNotes: session.learningNotes,
      lunchMenu: session.lunchMenu,
      playActivities: session.playActivities,
      cleaningDuties: session.cleaningDuties,
      evaluationNotes: session.evaluationNotes || '',
      generalNotes: session.generalNotes || '',
      status: session.status
    });
    setShowSessionModal(true);
  };

  // Save session form submit
  const handleSaveSessionForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionForm.title.trim()) return;

    if (sessionForm.id) {
      // Update existing
      const updated = sessions.map(s => {
        if (s.id === sessionForm.id) {
          const mod: CareSession = {
            ...s,
            date: sessionForm.date,
            title: sessionForm.title,
            cohort: sessionForm.cohort,
            theme: sessionForm.theme,
            facilitator: sessionForm.facilitator,
            staffDelegation: sessionForm.staffDelegation,
            learningNotes: sessionForm.learningNotes,
            lunchMenu: sessionForm.lunchMenu,
            playActivities: sessionForm.playActivities,
            cleaningDuties: sessionForm.cleaningDuties,
            evaluationNotes: sessionForm.evaluationNotes,
            generalNotes: sessionForm.generalNotes,
            status: sessionForm.status,
            updatedAt: Date.now()
          };
          saveSessionToBackend(mod);
          return mod;
        }
        return s;
      });
      setSessions(updated);
    } else {
      // Create new session initialized with current students
      const newSession: CareSession = {
        id: `care-${Date.now()}`,
        date: sessionForm.date,
        title: sessionForm.title,
        cohort: sessionForm.cohort,
        theme: sessionForm.theme,
        facilitator: sessionForm.facilitator,
        staffDelegation: sessionForm.staffDelegation,
        learningNotes: sessionForm.learningNotes,
        lunchMenu: sessionForm.lunchMenu,
        playActivities: sessionForm.playActivities,
        cleaningDuties: sessionForm.cleaningDuties,
        evaluationNotes: sessionForm.evaluationNotes,
        generalNotes: sessionForm.generalNotes,
        status: sessionForm.status,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        attendees: students.map((s, idx) => {
          const roomGroups: CareRoomGroup[] = ['Sitting Room', 'Talking Room', 'Outside Terakoya'];
          return {
            studentId: s.id,
            studentName: `${s.surname} ${s.otherNames}`,
            className: s.className,
            attended: false,
            roomGroup: roomGroups[idx % 3],
            attendedLearning: false,
            receivedLunch: false,
            participatedPlay: false,
            participatedCleaning: false,
            surveyCompleted: false,
            checkoutMood: '',
            notes: ''
          };
        })
      };
      const updated = [newSession, ...sessions];
      setSessions(updated);
      setSelectedSessionId(newSession.id);
      saveSessionToBackend(newSession);
    }
    setShowSessionModal(false);
  };

  // Delete a session
  const handleDeleteSession = async (id: string) => {
    if (!confirm('Are you sure you want to remove this Care Program session record?')) return;
    try {
      await fetch(`/api/care-sessions/${id}`, { method: 'DELETE' });
    } catch (e) {}
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    if (selectedSessionId === id && updated.length > 0) {
      setSelectedSessionId(updated[0].id);
    }
  };

  // Toggle or update an attendee status
  const handleUpdateAttendee = (
    studentId: string,
    field: keyof CareSessionAttendee,
    value: any
  ) => {
    if (!activeSession) return;

    const existingAttendeeIndex = (activeSession.attendees || []).findIndex(a => a.studentId === studentId);
    let updatedAttendees = [...(activeSession.attendees || [])];

    if (existingAttendeeIndex >= 0) {
      const current = updatedAttendees[existingAttendeeIndex];
      const updatedRecord = { ...current, [field]: value };
      
      // If marking attended true and other fields were off, default them or vice-versa
      if (field === 'attended' && value === false) {
        updatedRecord.attendedLearning = false;
        updatedRecord.receivedLunch = false;
        updatedRecord.participatedPlay = false;
        updatedRecord.participatedCleaning = false;
        updatedRecord.surveyCompleted = false;
        updatedRecord.checkoutMood = '';
      } else if (field !== 'attended' && value === true && !updatedRecord.attended) {
        updatedRecord.attended = true;
      }

      updatedAttendees[existingAttendeeIndex] = updatedRecord;
    } else {
      const student = students.find(s => s.id === studentId);
      const newRecord: CareSessionAttendee = {
        studentId,
        studentName: student ? `${student.surname} ${student.otherNames}` : 'Unknown',
        className: student?.className,
        attended: field === 'attended' ? value : true,
        roomGroup: field === 'roomGroup' ? value : 'Sitting Room',
        attendedLearning: field === 'attendedLearning' ? value : false,
        receivedLunch: field === 'receivedLunch' ? value : false,
        participatedPlay: field === 'participatedPlay' ? value : false,
        participatedCleaning: field === 'participatedCleaning' ? value : false,
        surveyCompleted: field === 'surveyCompleted' ? value : false,
        checkoutMood: field === 'checkoutMood' ? value : '',
        notes: field === 'notes' ? value : ''
      };
      updatedAttendees.push(newRecord);
    }

    const updatedSession: CareSession = {
      ...activeSession,
      attendees: updatedAttendees,
      updatedAt: Date.now()
    };

    setSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
    saveSessionToBackend(updatedSession);
  };

  // Auto-allocate students evenly into the 3 Ashinaga Room Groups
  const handleAutoAssignRooms = () => {
    if (!activeSession) return;
    const rooms: CareRoomGroup[] = ['Sitting Room', 'Talking Room', 'Outside Terakoya'];
    
    const updatedAttendees = students.map((s, idx) => {
      const existing = activeSession.attendees?.find(a => a.studentId === s.id);
      const assignedRoom = rooms[idx % 3];
      if (existing) {
        return { ...existing, roomGroup: assignedRoom };
      }
      return {
        studentId: s.id,
        studentName: `${s.surname} ${s.otherNames}`,
        className: s.className,
        attended: false,
        roomGroup: assignedRoom,
        attendedLearning: false,
        receivedLunch: false,
        participatedPlay: false,
        participatedCleaning: false,
        surveyCompleted: false,
        checkoutMood: '' as CareMood,
        notes: ''
      };
    });

    const updatedSession: CareSession = {
      ...activeSession,
      attendees: updatedAttendees,
      updatedAt: Date.now()
    };

    setSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
    saveSessionToBackend(updatedSession);
  };

  // Batch action for filtered students
  const handleBatchAction = (action: 'all-present' | 'all-lunch' | 'all-survey' | 'all-cleaning' | 'all-departed') => {
    if (!activeSession) return;
    const targetStudentIds = new Set(filteredStudents.map(s => s.id));

    const updatedAttendees = students.map(s => {
      const existing = activeSession.attendees?.find(a => a.studentId === s.id);
      const isTargeted = targetStudentIds.has(s.id);

      if (!isTargeted) {
        return existing || {
          studentId: s.id,
          studentName: `${s.surname} ${s.otherNames}`,
          className: s.className,
          attended: false,
          roomGroup: 'Unassigned' as CareRoomGroup,
          attendedLearning: false,
          receivedLunch: false,
          participatedPlay: false,
          participatedCleaning: false,
          surveyCompleted: false,
          checkoutMood: '' as CareMood,
          notes: ''
        };
      }

      const base: CareSessionAttendee = existing || {
        studentId: s.id,
        studentName: `${s.surname} ${s.otherNames}`,
        className: s.className,
        attended: true,
        roomGroup: 'Sitting Room' as CareRoomGroup,
        attendedLearning: false,
        receivedLunch: false,
        participatedPlay: false,
        participatedCleaning: false,
        surveyCompleted: false,
        checkoutMood: '' as CareMood,
        notes: ''
      };

      if (action === 'all-present') {
        return { ...base, attended: true };
      } else if (action === 'all-lunch') {
        return { ...base, attended: true, receivedLunch: true };
      } else if (action === 'all-survey') {
        return { ...base, attended: true, surveyCompleted: true };
      } else if (action === 'all-cleaning') {
        return { ...base, attended: true, participatedCleaning: true };
      } else if (action === 'all-departed') {
        return { ...base, attended: true, departureTime: '3:45 PM', checkoutMood: base.checkoutMood || 'peaceful' };
      }
      return base;
    });

    const updatedSession: CareSession = {
      ...activeSession,
      attendees: updatedAttendees,
      updatedAt: Date.now()
    };

    setSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
    saveSessionToBackend(updatedSession);
  };

  // Filter students based on query, class, and room station
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const fullName = `${student.surname} ${student.otherNames}`.toLowerCase();
      const matchesSearch = !searchQuery.trim() || 
        fullName.includes(searchQuery.toLowerCase()) || 
        (student.guardianName || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesClass = selectedClassFilter === 'All' || student.className === selectedClassFilter;

      const attendee = activeSession?.attendees?.find(a => a.studentId === student.id);
      const studentRoom = attendee?.roomGroup || 'Unassigned';
      const matchesRoom = selectedRoomFilter === 'All' || studentRoom === selectedRoomFilter;

      return matchesSearch && matchesClass && matchesRoom;
    });
  }, [students, searchQuery, selectedClassFilter, selectedRoomFilter, activeSession]);

  // Real-time metrics
  const stats = useMemo(() => {
    if (!activeSession) {
      return { 
        totalEnrolled: students.length, 
        present: 0, 
        room1: 0, 
        room2: 0, 
        room3: 0, 
        lunch: 0, 
        survey: 0, 
        cleaning: 0, 
        sadMood: 0,
        rate: 0 
      };
    }
    const attendees = activeSession.attendees || [];
    const present = attendees.filter(a => a.attended).length;
    const room1 = attendees.filter(a => a.attended && a.roomGroup === 'Sitting Room').length;
    const room2 = attendees.filter(a => a.attended && a.roomGroup === 'Talking Room').length;
    const room3 = attendees.filter(a => a.attended && a.roomGroup === 'Outside Terakoya').length;
    const lunch = attendees.filter(a => a.attended && a.receivedLunch).length;
    const survey = attendees.filter(a => a.attended && a.surveyCompleted).length;
    const cleaning = attendees.filter(a => a.attended && a.participatedCleaning).length;
    const sadMood = attendees.filter(a => a.attended && a.checkoutMood === 'sad').length;
    const totalEnrolled = students.length;
    const rate = totalEnrolled > 0 ? Math.round((present / totalEnrolled) * 100) : 0;

    return { totalEnrolled, present, room1, room2, room3, lunch, survey, cleaning, sadMood, rate };
  }, [activeSession, students]);

  return (
    <div id="care_program_container" className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#032b5e] via-[#094074] to-[#1d2d44] text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                Saturday Care Program
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-300/30 text-[10px] font-bold uppercase">
                {activeSession?.cohort || 'Upper primary'}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-sky-400/20 text-sky-200 border border-sky-300/30 text-[10px] font-bold">
                Ashinaga Uganda Rainbow House
              </span>
            </div>
            
            <h1 className="text-2xl md:text-3xl font-black font-display tracking-tight text-white flex items-center gap-3">
              <HeartHandshake className="h-8 w-8 text-[#FF5E4D]" />
              <span>Theme: {activeSession?.theme || 'Responsibility – I Can Be Counted On!'}</span>
            </h1>
            
            <p className="text-xs md:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Saturday routine: <strong>Briefing (9:00 AM)</strong> &bull; <strong>Arrival & Name Tags (9:30 AM)</strong> &bull; <strong>3 Rooms (10:45 AM)</strong> &bull; <strong>Psychosocial Activity (11:00 AM)</strong> &bull; <strong>Lunch (1:00 PM)</strong> &bull; <strong>Survey (2:00 PM)</strong> &bull; <strong>Clean (3:00 PM)</strong> &bull; <strong>Departure (3:45 PM)</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => setShowThemeGuideModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/20 active:scale-95 cursor-pointer shadow-sm"
              title="Open full activity steps for facilitators"
            >
              <BookOpen className="h-4 w-4 text-amber-300" />
              <span>Activity Guide</span>
            </button>
            <button
              onClick={() => setShowPrintModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/20 active:scale-95 cursor-pointer shadow-sm"
            >
              <Printer className="h-4 w-4" />
              <span>Print Saturday Sheet</span>
            </button>
            <button
              onClick={handleOpenNewSessionModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FF5E4D] hover:bg-[#ff432f] text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-[#FF5E4D]/30 active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>New Saturday Session</span>
            </button>
          </div>
        </div>

        {/* Decorative background watermark */}
        <div className="absolute right-0 bottom-0 translate-x-10 translate-y-10 opacity-10 pointer-events-none">
          <HeartHandshake className="w-80 h-80 text-white" />
        </div>
      </div>

      {/* 3 Room Stations Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div 
          onClick={() => setSelectedRoomFilter(selectedRoomFilter === 'Sitting Room' ? 'All' : 'Sitting Room')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
            selectedRoomFilter === 'Sitting Room' 
              ? 'bg-sky-50 border-sky-400 ring-2 ring-sky-400/20 shadow-sm' 
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-lg">
              🛋️
            </div>
            <div>
              <p className="text-xs font-black text-slate-900">Group 1 (Sitting Room)</p>
              <p className="text-[10px] text-slate-500">Indoor station & circles</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-lg font-black text-sky-700">{stats.room1}</span>
            <span className="text-[10px] text-slate-400 block font-medium">pupils</span>
          </div>
        </div>

        <div 
          onClick={() => setSelectedRoomFilter(selectedRoomFilter === 'Talking Room' ? 'All' : 'Talking Room')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
            selectedRoomFilter === 'Talking Room' 
              ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-400/20 shadow-sm' 
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg">
              🗣️
            </div>
            <div>
              <p className="text-xs font-black text-slate-900">Group 2 (Talking Room)</p>
              <p className="text-[10px] text-slate-500">Psychosocial reflection space</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-lg font-black text-indigo-700">{stats.room2}</span>
            <span className="text-[10px] text-slate-400 block font-medium">pupils</span>
          </div>
        </div>

        <div 
          onClick={() => setSelectedRoomFilter(selectedRoomFilter === 'Outside Terakoya' ? 'All' : 'Outside Terakoya')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
            selectedRoomFilter === 'Outside Terakoya' 
              ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400/20 shadow-sm' 
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg">
              🌳
            </div>
            <div>
              <p className="text-xs font-black text-slate-900">Group 3 (Outside Terakoya)</p>
              <p className="text-[10px] text-slate-500">Outdoor compound & gazebo</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-lg font-black text-emerald-700">{stats.room3}</span>
            <span className="text-[10px] text-slate-400 block font-medium">pupils</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('roster')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            activeTab === 'roster'
              ? 'bg-[#032b5e] text-white shadow-md'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Pupil Register & Stations</span>
          <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px] font-mono">{filteredStudents.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('timetable')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            activeTab === 'timetable'
              ? 'bg-[#032b5e] text-white shadow-md'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Saturday Timetable (9 AM – 4 PM)</span>
        </button>

        <button
          onClick={() => setActiveTab('guide')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            activeTab === 'guide'
              ? 'bg-[#032b5e] text-white shadow-md'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Psychosocial Theme Guide</span>
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            activeTab === 'rules'
              ? 'bg-[#032b5e] text-white shadow-md'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>7 Ground Rules</span>
        </button>

        <button
          onClick={() => setActiveTab('evaluation')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            activeTab === 'evaluation'
              ? 'bg-[#032b5e] text-white shadow-md'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Staff Debrief & Survey</span>
        </button>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column: Sessions History */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-indigo-600" />
                <span>Saturday Sessions</span>
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                {sessions.length}
              </span>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {sessions.map(s => {
                const isSelected = s.id === selectedSessionId;
                const attendeeCount = (s.attendees || []).filter(a => a.attended).length;
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSessionId(s.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/70 border-indigo-400 shadow-sm'
                        : 'bg-slate-50/50 hover:bg-slate-100/60 border-slate-200/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{s.title}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{s.date}</span>
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase shrink-0 ${
                        s.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {s.status}
                      </span>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-200/50 flex items-center justify-between text-[10px] text-slate-500">
                      <span>Cohort: <strong className="text-slate-700">{s.cohort || 'Upper primary'}</strong></span>
                      <span className="font-extrabold text-indigo-700">{attendeeCount} present</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Ground Rules Box on Sidebar */}
          <div className="bg-amber-50/50 border border-amber-200/70 rounded-2xl p-4 space-y-2">
            <h4 className="text-[11px] font-black uppercase text-amber-900 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-amber-600" />
              <span>Ashinaga Golden Rules</span>
            </h4>
            <ul className="text-[11px] text-amber-950/80 space-y-1.5 list-disc pl-4">
              <li>Keep name tags on & visible</li>
              <li>Respect Ashinaga property</li>
              <li>No gadgets (held till departure)</li>
              <li>DO NOT LITTER</li>
              <li>Do not leave before 3:45 PM</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Active Tab Content */}
        <div className="lg:col-span-3 space-y-6">
          {activeSession ? (
            <>
              {/* TAB 1: Roster & Room Stations */}
              {activeTab === 'roster' && (
                <>
                  {/* Session Overview Card */}
                  <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">
                            {activeSession.date}
                          </span>
                          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg">
                            {activeSession.cohort || 'Upper primary'}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">Led by: <strong className="text-slate-700">{activeSession.facilitator}</strong></span>
                        </div>
                        <h2 className="text-lg font-black text-slate-900 mt-1">{activeSession.title}</h2>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleOpenEditSessionModal(activeSession)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Edit Session</span>
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteSession(activeSession.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                            title="Delete Session"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 text-center text-xs">
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Enrolled</span>
                        <span className="text-base font-black text-slate-800">{stats.totalEnrolled}</span>
                      </div>
                      <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl">
                        <span className="text-[10px] text-indigo-600 font-bold uppercase block">Present</span>
                        <span className="text-base font-black text-indigo-900">{stats.present} ({stats.rate}%)</span>
                      </div>
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                        <span className="text-[10px] text-amber-600 font-bold uppercase block">Lunch Served</span>
                        <span className="text-base font-black text-amber-900">{stats.lunch}</span>
                      </div>
                      <div className="p-2.5 bg-sky-50 border border-sky-200 rounded-xl">
                        <span className="text-[10px] text-sky-600 font-bold uppercase block">Survey Done</span>
                        <span className="text-base font-black text-sky-900">{stats.survey}</span>
                      </div>
                      <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-xl">
                        <span className="text-[10px] text-purple-600 font-bold uppercase block">Cleaned</span>
                        <span className="text-base font-black text-purple-900">{stats.cleaning}</span>
                      </div>
                      <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl">
                        <span className="text-[10px] text-red-600 font-bold uppercase block">Needs Care</span>
                        <span className="text-base font-black text-red-700">{stats.sadMood} flag{stats.sadMood === 1 ? '' : 's'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Student Attendance & Station Table */}
                  <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden space-y-4">
                    <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                          <Users className="h-4 w-4 text-indigo-600" />
                          <span>Saturday Roll Call & Activity Checklist</span>
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Track name tags, room stations (Sitting/Talking/Terakoya), lunch, survey, and checkout mood.
                        </p>
                      </div>

                      {/* Fast Batch Actions */}
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <button
                          type="button"
                          onClick={() => handleBatchAction('all-present')}
                          className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-[10px] cursor-pointer transition-all"
                        >
                          ✓ All Present
                        </button>
                        <button
                          type="button"
                          onClick={handleAutoAssignRooms}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-bold text-[10px] cursor-pointer transition-all flex items-center gap-1"
                          title="Evenly distribute pupils across the 3 rooms"
                        >
                          <Shuffle className="h-3 w-3" />
                          <span>⚡ Auto-Split 3 Rooms</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBatchAction('all-lunch')}
                          className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg font-bold text-[10px] cursor-pointer transition-all"
                        >
                          🍲 All Lunch
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBatchAction('all-survey')}
                          className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg font-bold text-[10px] cursor-pointer transition-all"
                        >
                          📝 All Survey
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBatchAction('all-cleaning')}
                          className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-bold text-[10px] cursor-pointer transition-all"
                        >
                          🧹 All Cleaned
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBatchAction('all-departed')}
                          className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-[10px] cursor-pointer transition-all"
                        >
                          🚶 Depart @ 3:45
                        </button>
                      </div>
                    </div>

                    {/* Filters: Search, Class, Room */}
                    <div className="px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="relative flex-1 max-w-sm">
                        <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          placeholder="Search pupil or guardian name..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Room Station Filter */}
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                          {(['All', 'Sitting Room', 'Talking Room', 'Outside Terakoya'] as const).map(r => (
                            <button
                              key={r}
                              onClick={() => setSelectedRoomFilter(r as any)}
                              className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition-all cursor-pointer ${
                                selectedRoomFilter === r
                                  ? 'bg-white text-indigo-900 shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              {r === 'All' ? 'All Rooms' : r}
                            </button>
                          ))}
                        </div>

                        {/* Class Filter */}
                        <div className="flex items-center gap-1 overflow-x-auto pb-1">
                          {['All', 'P.1', 'P.2', 'P.3', 'P.4', 'P.5', 'P.6', 'P.7'].map(c => (
                            <button
                              key={c}
                              onClick={() => setSelectedClassFilter(c)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                selectedClassFilter === c
                                  ? 'bg-slate-900 text-white'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                            <th className="px-4 py-3">Pupil Name</th>
                            <th className="px-2 py-3 text-center">Class</th>
                            <th className="px-3 py-3">Room Station</th>
                            <th className="px-3 py-3 text-center">Present / Tag</th>
                            <th className="px-3 py-3 text-center">Lunch</th>
                            <th className="px-3 py-3 text-center">Survey</th>
                            <th className="px-3 py-3 text-center">Clean</th>
                            <th className="px-3 py-3 text-center">Check-out Mood</th>
                            <th className="px-4 py-3">Departure & Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {filteredStudents.map(student => {
                            const attendee = (activeSession.attendees || []).find(a => a.studentId === student.id);
                            const isPresent = Boolean(attendee?.attended);
                            const roomGroup = attendee?.roomGroup || 'Sitting Room';
                            const hasLunch = Boolean(attendee?.receivedLunch);
                            const hasSurvey = Boolean(attendee?.surveyCompleted);
                            const hasCleaned = Boolean(attendee?.participatedCleaning);
                            const checkoutMood = attendee?.checkoutMood || '';
                            const notes = attendee?.notes || '';

                            return (
                              <tr
                                key={student.id}
                                className={`transition-colors ${
                                  isPresent ? 'bg-white hover:bg-indigo-50/20' : 'bg-slate-50/40 opacity-70 hover:opacity-100'
                                }`}
                              >
                                {/* Name */}
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    {student.photo ? (
                                      <img src={student.photo} alt={student.surname} className="h-7 w-7 rounded-full object-cover border border-slate-200" />
                                    ) : (
                                      <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-[10px]">
                                        {student.surname[0]}
                                      </div>
                                    )}
                                    <div>
                                      <p className="font-extrabold text-slate-900">{student.surname} {student.otherNames}</p>
                                      <p className="text-[10px] text-slate-400 font-mono">Worker: {student.communityWorker || 'Ashinaga Team'}</p>
                                    </div>
                                  </div>
                                </td>

                                {/* Class */}
                                <td className="px-2 py-3 whitespace-nowrap text-center font-bold text-indigo-600">
                                  {student.className}
                                </td>

                                {/* Room Station Selector */}
                                <td className="px-3 py-3 whitespace-nowrap">
                                  <select
                                    value={roomGroup}
                                    onChange={(e) => handleUpdateAttendee(student.id, 'roomGroup', e.target.value)}
                                    className={`text-[10px] font-bold px-2 py-1 rounded-lg border cursor-pointer focus:outline-none ${
                                      roomGroup === 'Sitting Room'
                                        ? 'bg-sky-50 text-sky-800 border-sky-200'
                                        : roomGroup === 'Talking Room'
                                        ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    }`}
                                  >
                                    <option value="Sitting Room">🛋️ Group 1: Sitting Room</option>
                                    <option value="Talking Room">🗣️ Group 2: Talking Room</option>
                                    <option value="Outside Terakoya">🌳 Group 3: Outside Terakoya</option>
                                  </select>
                                </td>

                                {/* Present Toggle */}
                                <td className="px-3 py-3 text-center whitespace-nowrap">
                                  <input
                                    type="checkbox"
                                    checked={isPresent}
                                    onChange={(e) => handleUpdateAttendee(student.id, 'attended', e.target.checked)}
                                    className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                  />
                                </td>

                                {/* Lunch Check */}
                                <td className="px-3 py-3 text-center whitespace-nowrap">
                                  <input
                                    type="checkbox"
                                    checked={hasLunch}
                                    disabled={!isPresent}
                                    onChange={(e) => handleUpdateAttendee(student.id, 'receivedLunch', e.target.checked)}
                                    className="h-4 w-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer disabled:opacity-30"
                                  />
                                </td>

                                {/* Survey Check */}
                                <td className="px-3 py-3 text-center whitespace-nowrap">
                                  <input
                                    type="checkbox"
                                    checked={hasSurvey}
                                    disabled={!isPresent}
                                    onChange={(e) => handleUpdateAttendee(student.id, 'surveyCompleted', e.target.checked)}
                                    className="h-4 w-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer disabled:opacity-30"
                                  />
                                </td>

                                {/* Clean Check */}
                                <td className="px-3 py-3 text-center whitespace-nowrap">
                                  <input
                                    type="checkbox"
                                    checked={hasCleaned}
                                    disabled={!isPresent}
                                    onChange={(e) => handleUpdateAttendee(student.id, 'participatedCleaning', e.target.checked)}
                                    className="h-4 w-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer disabled:opacity-30"
                                  />
                                </td>

                                {/* Check-out Mood Reflection */}
                                <td className="px-3 py-3 whitespace-nowrap text-center">
                                  <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                                    <button
                                      type="button"
                                      disabled={!isPresent}
                                      onClick={() => handleUpdateAttendee(student.id, 'checkoutMood', 'joyful')}
                                      className={`px-1.5 py-0.5 rounded text-xs transition-all cursor-pointer ${
                                        checkoutMood === 'joyful' ? 'bg-emerald-400 text-white scale-110 shadow-xs' : 'opacity-40 hover:opacity-100'
                                      }`}
                                      title="Joyful / Inspired"
                                    >
                                      😊
                                    </button>
                                    <button
                                      type="button"
                                      disabled={!isPresent}
                                      onClick={() => handleUpdateAttendee(student.id, 'checkoutMood', 'peaceful')}
                                      className={`px-1.5 py-0.5 rounded text-xs transition-all cursor-pointer ${
                                        checkoutMood === 'peaceful' ? 'bg-sky-400 text-white scale-110 shadow-xs' : 'opacity-40 hover:opacity-100'
                                      }`}
                                      title="Peaceful / Calm"
                                    >
                                      😌
                                    </button>
                                    <button
                                      type="button"
                                      disabled={!isPresent}
                                      onClick={() => handleUpdateAttendee(student.id, 'checkoutMood', 'neutral')}
                                      className={`px-1.5 py-0.5 rounded text-xs transition-all cursor-pointer ${
                                        checkoutMood === 'neutral' ? 'bg-slate-400 text-white scale-110 shadow-xs' : 'opacity-40 hover:opacity-100'
                                      }`}
                                      title="Neutral / Quiet"
                                    >
                                      😐
                                    </button>
                                    <button
                                      type="button"
                                      disabled={!isPresent}
                                      onClick={() => handleUpdateAttendee(student.id, 'checkoutMood', 'sad')}
                                      className={`px-1.5 py-0.5 rounded text-xs transition-all cursor-pointer ${
                                        checkoutMood === 'sad' ? 'bg-red-500 text-white scale-110 shadow-xs' : 'opacity-40 hover:opacity-100'
                                      }`}
                                      title="Sad / Needs 1-on-1 Counselor Care"
                                    >
                                      😢
                                    </button>
                                  </div>
                                </td>

                                {/* Notes & Departure */}
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <input
                                    type="text"
                                    placeholder="Reflection, guardian pickup, or welfare note..."
                                    value={notes}
                                    onChange={(e) => handleUpdateAttendee(student.id, 'notes', e.target.value)}
                                    className="w-full min-w-[200px] px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {filteredStudents.length === 0 && (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        No students match your filter criteria.
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* TAB 2: Full Saturday Timetable (9 AM – 4 PM) */}
              {activeTab === 'timetable' && (
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-indigo-600" />
                        <span>Saturday Care Program Schedule • {activeSession.cohort || 'Upper primary'}</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Theme: <strong>{activeSession.theme}</strong> &bull; Location: Ashinaga Rainbow House Nansana
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold">
                      Full Day: 9:00 AM – 4:00 PM (7 Hours)
                    </span>
                  </div>

                  <div className="relative border-l-2 border-indigo-200 ml-4 pl-6 space-y-6">
                    {SATURDAY_TIMETABLE.map((item, index) => {
                      return (
                        <div key={index} className="relative group">
                          {/* Dot on line */}
                          <div className="absolute -left-[31px] top-1.5 h-4 w-4 rounded-full border-2 border-white bg-indigo-600 shadow-xs group-hover:scale-125 transition-all"></div>
                          
                          <div className="bg-slate-50/80 hover:bg-indigo-50/40 p-4 rounded-2xl border border-slate-200/80 transition-all">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-xs font-mono font-black text-indigo-700 bg-indigo-100/60 px-2 py-0.5 rounded-lg">
                                {item.time} ({item.duration})
                              </span>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Stage {index + 1}
                              </span>
                            </div>
                            
                            <h4 className="text-sm font-extrabold text-slate-900 mt-1.5">{item.title}</h4>
                            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: Psychosocial Theme & Facilitator Activity Guide */}
              {activeTab === 'guide' && (
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black uppercase tracking-wider">
                      Facilitator Field Guide
                    </span>
                    <h3 className="text-xl font-black text-slate-900 mt-2">
                      Theme: Responsibility – I Can Be Counted On!
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Designed for Upper Primary (P.5 – P.7) psychosocial enrichment at Rainbow House.
                    </p>
                  </div>

                  {/* Objectives */}
                  <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl space-y-2">
                    <h4 className="text-xs font-black uppercase text-indigo-950 flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4 text-indigo-600" />
                      <span>Session Objectives</span>
                    </h4>
                    <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-5">
                      <li>Explain responsibility in simple, everyday words.</li>
                      <li>Identify personal responsibilities at <strong>home</strong>, at <strong>school</strong>, and in the <strong>community</strong>.</li>
                      <li>Differentiate between responsible and irresponsible behaviour.</li>
                      <li>Practice making responsible choices using the <strong>Stop, Think, Choose</strong> framework.</li>
                      <li>Identify at least one personal responsibility to fulfil during the coming week.</li>
                    </ul>
                  </div>

                  {/* Procedure Modules */}
                  <div className="space-y-4 text-xs">
                    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                      <div className="flex items-center justify-between">
                        <strong className="text-sm font-black text-slate-900">1. Energizer: &ldquo;Captain Responsibility Says!&rdquo; (5 mins)</strong>
                        <span className="text-[10px] font-mono bg-slate-200 px-2 py-0.5 rounded text-slate-700">Warm-up</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed">
                        Play a game similar to <em>Simon Says</em>. Say: 
                        &ldquo;Captain Responsibility says tie your shoelaces!&rdquo;, 
                        &ldquo;Captain Responsibility says pick up imaginary litter!&rdquo;, 
                        &ldquo;Captain Responsibility says put your homework in your bag!&rdquo;. 
                        If a command is given without &ldquo;Captain Responsibility says,&rdquo; anyone who moves sits down.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                      <div className="flex items-center justify-between">
                        <strong className="text-sm font-black text-slate-900">2. Circle Ball: &ldquo;Pass the Responsibility Ball&rdquo; (5 mins)</strong>
                        <span className="text-[10px] font-mono bg-slate-200 px-2 py-0.5 rounded text-slate-700">Circle Activity</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed">
                        Stand in a circle with a soft ball. As the ball is passed from child to child, each completes the phrase:
                        <br /><span className="font-bold text-indigo-900">&ldquo;A responsible person ________________.&rdquo;</span>
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                      <strong className="text-sm font-black text-slate-900 block">3. Understanding Responsibility (Home, School, Community)</strong>
                      <p className="text-slate-600 leading-relaxed">
                        <em>&ldquo;Responsibility means doing what we are supposed to do, taking care of our things, making good choices, and being willing to admit when we make mistakes.&rdquo;</em>
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11px]">
                        <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                          <strong className="text-slate-900 block">At Home:</strong>
                          <p className="text-slate-500">Putting away belongings, helping with safe tasks, caring for family possessions.</p>
                        </div>
                        <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                          <strong className="text-slate-900 block">At School:</strong>
                          <p className="text-slate-500">Completing schoolwork, listening to teachers, caring for books, respecting classmates.</p>
                        </div>
                        <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                          <strong className="text-slate-900 block">In Community:</strong>
                          <p className="text-slate-500">Keeping shared spaces clean, following safety rules, treating neighbors with kindness.</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl border border-indigo-200 bg-indigo-50/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <strong className="text-sm font-black text-indigo-950">4. Decision Framework: &ldquo;Stop, Think, Choose&rdquo;</strong>
                        <span className="text-[10px] font-mono bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">Core Model</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center pt-1 font-bold">
                        <div className="p-2.5 bg-red-100/70 border border-red-200 rounded-xl text-red-900">
                          <span className="text-base block">🛑 STOP</span>
                          <span className="text-[10px] font-normal block mt-0.5">Pause before acting</span>
                        </div>
                        <div className="p-2.5 bg-amber-100/70 border border-amber-200 rounded-xl text-amber-900">
                          <span className="text-base block">💡 THINK</span>
                          <span className="text-[10px] font-normal block mt-0.5">Consider consequences</span>
                        </div>
                        <div className="p-2.5 bg-emerald-100/70 border border-emerald-200 rounded-xl text-emerald-900">
                          <span className="text-base block">✅ CHOOSE</span>
                          <span className="text-[10px] font-normal block mt-0.5">Pick safest responsible act</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 pt-1">
                        Being responsible does not mean never making mistakes. It means thinking first, telling the truth if something goes wrong, and taking reasonable steps to correct it.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                      <strong className="text-sm font-black text-slate-900 block">5. Reflection Craft: &ldquo;My Responsibility Shield&rdquo; (10 mins)</strong>
                      <p className="text-slate-600 leading-relaxed">
                        Give each learner a paper shield divided into 3 sections:
                        <br />1. <strong>At home:</strong> One responsibility I can fulfil.
                        <br />2. <strong>At school:</strong> One responsibility I can fulfil.
                        <br />3. <strong>For my community:</strong> One way I can contribute positively.
                        <br />At the bottom: <span className="font-bold text-slate-900">&ldquo;People can count on me to ________________.&rdquo;</span>
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/40 space-y-2">
                      <strong className="text-sm font-black text-amber-950 block">6. Closing Circle Affirmation: &ldquo;I Can Be Counted On!&rdquo;</strong>
                      <div className="space-y-1.5 text-slate-700 pl-2 border-l-2 border-amber-400">
                        <p>&bull; <em>&ldquo;I can make good choices!&rdquo;</em> &mdash; 👍 Thumbs up</p>
                        <p>&bull; <em>&ldquo;I can take care of my things!&rdquo;</em> &mdash; 🤲 Pretend to put away</p>
                        <p>&bull; <em>&ldquo;I can tell the truth!&rdquo;</em> &mdash; ❤️ Hand over heart</p>
                        <p>&bull; <em>&ldquo;I can do my part!&rdquo;</em> &mdash; 👈 Point to self</p>
                        <p>&bull; <em>&ldquo;I can help my community!&rdquo;</em> &mdash; 👐 Open arms to the circle</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: Ashinaga 7 Golden Ground Rules */}
              {activeTab === 'rules' && (
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-900 text-[10px] font-black uppercase tracking-wider">
                      Rainbow House Regulations
                    </span>
                    <h3 className="text-xl font-black text-slate-900 mt-2">
                      Ashinaga Uganda 7 Golden Rules
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Read aloud during morning registration (9:30 AM) and enforced throughout the day.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ASHINAGA_GROUND_RULES.map((rule) => (
                      <div 
                        key={rule.id}
                        className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 flex items-start gap-3.5 hover:bg-slate-50 transition-all"
                      >
                        <div className="text-2xl shrink-0 p-2 bg-white rounded-xl shadow-xs border border-slate-100">
                          {rule.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                              Rule #{rule.id}
                            </span>
                            <h4 className="text-xs font-black text-slate-900">{rule.title}</h4>
                          </div>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed font-medium">
                            {rule.text}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-center gap-3">
                    <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0" />
                    <p>
                      <strong>Volunteer Briefing Note:</strong> If any student displays emotional distress, withdrawn behavior, or aggression, please escort them calmly to the <strong>Talking Room (Group 2)</strong> for support from a certified counselor.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 5: Staff Debrief & Evaluation */}
              {activeTab === 'evaluation' && (
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 text-[10px] font-black uppercase tracking-wider">
                      Evaluation & Continuous Improvement
                    </span>
                    <h3 className="text-xl font-black text-slate-900 mt-2">
                      Saturday Evaluation Meeting (3:45 PM – 4:00 PM)
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Staff discussion, duty delegation notes, survey results, and improvements for next Saturday.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Duty Delegation Log (9:00 AM Meeting)</label>
                        <textarea
                          rows={4}
                          value={activeSession.staffDelegation || ''}
                          onChange={(e) => {
                            const mod = { ...activeSession, staffDelegation: e.target.value };
                            setSessions(prev => prev.map(s => s.id === mod.id ? mod : s));
                            saveSessionToBackend(mod);
                          }}
                          placeholder="e.g. Leader: Florence | Room 1: Sitting Room (David) | Room 2: Talking Room (Sarah) | Kitchen: Joy"
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1">3:45 PM Staff Evaluation Notes & Feedback</label>
                        <textarea
                          rows={6}
                          value={activeSession.evaluationNotes || ''}
                          onChange={(e) => {
                            const mod = { ...activeSession, evaluationNotes: e.target.value };
                            setSessions(prev => prev.map(s => s.id === mod.id ? mod : s));
                            saveSessionToBackend(mod);
                          }}
                          placeholder="Discussion and feedback about the day, challenges faced, improvements and acknowledgements..."
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                        <h4 className="font-extrabold text-slate-900">Saturday Survey & Reflection Summary</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-600">Evaluation Surveys Completed:</span>
                            <strong className="text-indigo-900">{stats.survey} of {stats.present} pupils</strong>
                          </div>
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-indigo-600 h-full rounded-full" 
                              style={{ width: `${stats.present > 0 ? (stats.survey / stats.present) * 100 : 0}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-200/60 space-y-2">
                          <span className="text-[11px] font-bold text-slate-700 block">Check-out Mood Breakdown:</span>
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div className="p-2 bg-emerald-50 text-emerald-800 rounded-lg flex items-center justify-between">
                              <span>😊 Joyful:</span>
                              <strong>{activeSession.attendees?.filter(a => a.checkoutMood === 'joyful').length || 0}</strong>
                            </div>
                            <div className="p-2 bg-sky-50 text-sky-800 rounded-lg flex items-center justify-between">
                              <span>😌 Peaceful:</span>
                              <strong>{activeSession.attendees?.filter(a => a.checkoutMood === 'peaceful').length || 0}</strong>
                            </div>
                            <div className="p-2 bg-slate-100 text-slate-800 rounded-lg flex items-center justify-between">
                              <span>😐 Neutral:</span>
                              <strong>{activeSession.attendees?.filter(a => a.checkoutMood === 'neutral').length || 0}</strong>
                            </div>
                            <div className="p-2 bg-red-50 text-red-800 rounded-lg flex items-center justify-between">
                              <span>😢 Needs Care:</span>
                              <strong>{stats.sadMood}</strong>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-2xl text-xs text-indigo-950 space-y-1">
                        <strong className="block text-indigo-900">Check-out Questions Asked to Pupils:</strong>
                        <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                          <li>&ldquo;How was your day at Rainbow House?&rdquo;</li>
                          <li>&ldquo;How are you feeling, and what did you love doing?&rdquo;</li>
                          <li>&ldquo;What did you learn today about Responsibility?&rdquo;</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 space-y-3">
              <HeartHandshake className="h-12 w-12 text-slate-300 mx-auto" />
              <p className="font-bold text-sm">No Care Program session selected.</p>
              <button
                onClick={handleOpenNewSessionModal}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
              >
                Create New Session
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create or Edit Session */}
      {showSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <HeartHandshake className="h-5 w-5 text-[#FF5E4D]" />
                <span>{sessionForm.id ? 'Edit Saturday Session' : 'Plan Saturday Care Program'}</span>
              </h3>
              <button
                onClick={() => setShowSessionModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSessionForm} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={sessionForm.date}
                    onChange={(e) => setSessionForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Target Cohort *</label>
                  <select
                    value={sessionForm.cohort}
                    onChange={(e) => setSessionForm(prev => ({ ...prev, cohort: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                  >
                    <option value="Upper primary">Upper primary (P.5 – P.7)</option>
                    <option value="Lower primary">Lower primary (P.1 – P.4)</option>
                    <option value="All primary">All primary (P.1 – P.7)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Lead Facilitator *</label>
                  <input
                    type="text"
                    required
                    value={sessionForm.facilitator}
                    onChange={(e) => setSessionForm(prev => ({ ...prev, facilitator: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Session Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 7 – 14th November Saturday Care Program – Upper primary"
                  value={sessionForm.title}
                  onChange={(e) => setSessionForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Psychosocial Theme *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Responsibility – I Can Be Counted On!"
                  value={sessionForm.theme}
                  onChange={(e) => setSessionForm(prev => ({ ...prev, theme: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-indigo-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Duty Delegation (9:00 AM Meeting)</label>
                <input
                  type="text"
                  placeholder="Leader: Florence | Room 1: Sitting Room | Room 2: Talking Room | Room 3: Outside Terakoya"
                  value={sessionForm.staffDelegation}
                  onChange={(e) => setSessionForm(prev => ({ ...prev, staffDelegation: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">1. Learning Focus & Procedure</label>
                  <textarea
                    rows={2}
                    value={sessionForm.learningNotes}
                    onChange={(e) => setSessionForm(prev => ({ ...prev, learningNotes: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">2. Lunch Menu (1:00 PM)</label>
                  <textarea
                    rows={2}
                    value={sessionForm.lunchMenu}
                    onChange={(e) => setSessionForm(prev => ({ ...prev, lunchMenu: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">3. Play & Psychosocial Energizers</label>
                  <textarea
                    rows={2}
                    value={sessionForm.playActivities}
                    onChange={(e) => setSessionForm(prev => ({ ...prev, playActivities: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">4. Cleaning Duties (3:00 PM)</label>
                  <textarea
                    rows={2}
                    value={sessionForm.cleaningDuties}
                    onChange={(e) => setSessionForm(prev => ({ ...prev, cleaningDuties: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSessionModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md"
                >
                  Save Saturday Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Printable Saturday Program Sheet */}
      {showPrintModal && activeSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-8 shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 no-print">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Printer className="h-5 w-5 text-indigo-600" />
                <span>Print Saturday Care Program Roster & Schedule</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print Document</span>
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Printable Body */}
            <div className="p-6 border border-slate-300 rounded-2xl space-y-6 text-slate-800 font-sans print:border-none print:p-0">
              {/* Letterhead */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                <div className="flex items-center gap-3">
                  <AshinagaLogo size={55} />
                  <div>
                    <h2 className="text-lg font-black uppercase tracking-tight text-slate-900">
                      Ashinaga Uganda Rainbow House
                    </h2>
                    <p className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">
                      Saturday Care Program • Nansana Node
                    </p>
                    <p className="text-[10px] text-slate-500">
                      P.O. Box 7524, Kampala, Uganda • Psychosocial Sanctuary for Orphaned & Vulnerable Children
                    </p>
                  </div>
                </div>
                <div className="text-right text-xs">
                  <span className="font-mono font-bold block">{activeSession.date}</span>
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">{activeSession.cohort || 'Upper primary'}</span>
                </div>
              </div>

              {/* Theme & Meta */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <p><strong>Session:</strong> {activeSession.title}</p>
                <p><strong>Theme:</strong> {activeSession.theme}</p>
                <p><strong>Staff & Facilitators:</strong> {activeSession.facilitator} &bull; {activeSession.staffDelegation}</p>
                <p><strong>Attendance:</strong> {stats.present} of {stats.totalEnrolled} present &bull; {stats.lunch} meals served &bull; {stats.survey} surveys completed</p>
              </div>

              {/* 7 Rules Brief */}
              <div className="border border-amber-300 bg-amber-50/50 p-2.5 rounded-lg text-[10px] space-y-1">
                <strong className="block text-amber-900 uppercase font-black">Ashinaga 7 Ground Rules:</strong>
                <p className="text-slate-700">
                  1. Do not hurt yourself or others &bull; 2. Keep name tags visible &bull; 3. Respect property &bull; 4. Zero tolerance for bad behaviour &bull; 5. No gadgets &bull; 6. DO NOT LITTER &bull; 7. Do not leave before 3:45 PM departure.
                </p>
              </div>

              {/* Roster Table */}
              <table className="w-full text-left text-[10px] border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 font-bold uppercase">
                    <th className="p-1.5 border-r border-slate-300 text-center">#</th>
                    <th className="p-1.5 border-r border-slate-300">Pupil Name</th>
                    <th className="p-1.5 border-r border-slate-300 text-center">Class</th>
                    <th className="p-1.5 border-r border-slate-300">Room Station</th>
                    <th className="p-1.5 border-r border-slate-300 text-center">Tag / In</th>
                    <th className="p-1.5 border-r border-slate-300 text-center">Lunch</th>
                    <th className="p-1.5 border-r border-slate-300 text-center">Survey</th>
                    <th className="p-1.5 border-r border-slate-300 text-center">Clean</th>
                    <th className="p-1.5 border-r border-slate-300 text-center">Mood</th>
                    <th className="p-1.5">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {students.slice(0, 50).map((s, idx) => {
                    const attendee = activeSession.attendees?.find(a => a.studentId === s.id);
                    return (
                      <tr key={s.id}>
                        <td className="p-1 border-r border-slate-200 text-center font-mono">{idx + 1}</td>
                        <td className="p-1 border-r border-slate-200 font-bold">{s.surname} {s.otherNames}</td>
                        <td className="p-1 border-r border-slate-200 font-mono text-center">{s.className}</td>
                        <td className="p-1 border-r border-slate-200">{attendee?.roomGroup || 'Sitting Room'}</td>
                        <td className="p-1 border-r border-slate-200 text-center font-bold">{attendee?.attended ? '✓' : '—'}</td>
                        <td className="p-1 border-r border-slate-200 text-center">{attendee?.receivedLunch ? '✓' : '—'}</td>
                        <td className="p-1 border-r border-slate-200 text-center">{attendee?.surveyCompleted ? '✓' : '—'}</td>
                        <td className="p-1 border-r border-slate-200 text-center">{attendee?.participatedCleaning ? '✓' : '—'}</td>
                        <td className="p-1 border-r border-slate-200 text-center">{attendee?.checkoutMood || '—'}</td>
                        <td className="p-1 text-[9px] text-slate-600">{attendee?.notes || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Signatures */}
              <div className="pt-6 grid grid-cols-2 gap-8 text-xs border-t border-slate-300">
                <div>
                  <p className="font-bold text-slate-700">Lead Facilitator / Community Worker Signature:</p>
                  <div className="h-10 border-b border-slate-400 mt-2"></div>
                  <p className="text-[10px] text-slate-400 mt-1">{activeSession.facilitator}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-700">Rainbow House Administrator Verification:</p>
                  <div className="h-10 border-b border-slate-400 mt-2"></div>
                  <p className="text-[10px] text-slate-400 mt-1">Official Stamp & Date</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Activity Guide Quick View */}
      {showThemeGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-600" />
                <span>Facilitator Field Guide • Responsibility</span>
              </h3>
              <button
                onClick={() => setShowThemeGuideModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-3 text-xs max-h-[70vh] overflow-y-auto pr-1">
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl space-y-1">
                <strong className="text-indigo-950 font-bold block">Energizer: &ldquo;Captain Responsibility Says!&rdquo;</strong>
                <p className="text-slate-600">&ldquo;Captain Responsibility says tie your shoelaces!&rdquo;, &ldquo;Captain Responsibility says pick up litter!&rdquo;</p>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl space-y-1">
                <strong className="text-amber-950 font-bold block">Core Model: Stop &bull; Think &bull; Choose</strong>
                <p className="text-slate-600">🛑 STOP (pause) &bull; 💡 THINK (consequences) &bull; ✅ CHOOSE (safest responsible act).</p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <strong className="text-slate-900 font-bold block">Craft: &ldquo;My Responsibility Shield&rdquo;</strong>
                <p className="text-slate-600">3 sections: 1. At home 2. At school 3. In my community &bull; &ldquo;People can count on me to...&rdquo;</p>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl space-y-1">
                <strong className="text-emerald-950 font-bold block">Closing Affirmation (Circle with gestures)</strong>
                <p className="text-slate-700 font-medium">
                  &ldquo;I can make good choices!&rdquo; (👍), &ldquo;I can take care of my things!&rdquo; (🤲), &ldquo;I can tell the truth!&rdquo; (❤️), &ldquo;I can do my part!&rdquo; (👈), &ldquo;I can help my community!&rdquo; (👐).
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowThemeGuideModal(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
