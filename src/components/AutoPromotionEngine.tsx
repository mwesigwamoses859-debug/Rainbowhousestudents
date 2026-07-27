import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Award, 
  ShieldAlert, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  ArrowRight, 
  GraduationCap, 
  HelpCircle,
  Sparkles,
  Sliders
} from 'lucide-react';
import { Student, Mark, ClassName } from '../types';
import { getSubjectsForClass } from '../curriculum';
import AshinagaLogo from './AshinagaLogo';

interface AutoPromotionEngineProps {
  students: Student[];
  marks: Mark[];
  onPromoteStudents: (promotions: { studentId: string; nextClassName: any; hasScholarship?: boolean; reason?: string }[], academicYear?: number) => Promise<void>;
  isAdmin: boolean;
}

const CLASSES_LIST: ClassName[] = ['P.1', 'P.2', 'P.3', 'P.4', 'P.5', 'P.6', 'P.7'];

export default function AutoPromotionEngine({
  students,
  marks,
  onPromoteStudents,
  isAdmin
}: AutoPromotionEngineProps) {
  // Promotion settings
  const [selectedClass, setSelectedClass] = useState<ClassName>('P.1');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [passThreshold, setPassThreshold] = useState<number>(50);
  const [requireAllSubjects, setRequireAllSubjects] = useState<boolean>(true);
  
  // Scholarship Nomination settings
  const [scholarshipThreshold, setScholarshipThreshold] = useState<number>(75);
  const [scholarshipAwards, setScholarshipAwards] = useState<Record<string, boolean>>({});

  // Status/Action State
  const [executing, setExecuting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Get next class level mapping
  const getNextClass = (current: ClassName): string => {
    switch (current) {
      case 'P.1': return 'P.2';
      case 'P.2': return 'P.3';
      case 'P.3': return 'P.4';
      case 'P.4': return 'P.5';
      case 'P.5': return 'P.6';
      case 'P.6': return 'P.7';
      case 'P.7': return 'Graduated';
      default: return 'Graduated';
    }
  };

  // Filter class list students
  const classStudents = students.filter(s => s.className === selectedClass);

  // Prepopulate and track scholarship status changes based on average score or manual overrides
  useEffect(() => {
    const updatedAwards: Record<string, boolean> = {};
    classStudents.forEach(student => {
      const studentMarks = marks.filter(
        m => m.studentId === student.id && m.year === selectedYear
      );
      const totalScore = studentMarks.reduce((sum, m) => sum + m.score, 0);
      const averageScore = studentMarks.length > 0 ? Math.round(totalScore / studentMarks.length) : 0;
      const isEligible = averageScore >= scholarshipThreshold;
      
      // Keep existing manual choice if we have one, otherwise fall back to student's database status OR isEligible
      if (scholarshipAwards[student.id] !== undefined) {
        updatedAwards[student.id] = scholarshipAwards[student.id];
      } else {
        updatedAwards[student.id] = student.hasScholarship || isEligible;
      }
    });
    setScholarshipAwards(updatedAwards);
  }, [selectedClass, selectedYear, scholarshipThreshold, students, marks]);

  // Calculate promotion stats for current class
  const compiledStudents = classStudents.map(student => {
    // Retrieve marks for student
    const studentMarks = marks.filter(
      m => m.studentId === student.id && m.year === selectedYear
    );

    // Subject coverage
    const assessedSubjects = studentMarks.map(m => m.subject);
    const requiredSubjects = getSubjectsForClass(selectedClass);
    const missingSubjects = requiredSubjects.filter(s => !assessedSubjects.includes(s));
    const isFullyAssessed = missingSubjects.length === 0;

    // Average score
    const totalScore = studentMarks.reduce((sum, m) => sum + m.score, 0);
    const averageScore = studentMarks.length > 0 ? Math.round(totalScore / studentMarks.length) : 0;

    // Scholarship Nomination Logic
    const isScholarshipEligible = averageScore >= scholarshipThreshold;
    const hasActiveScholarship = scholarshipAwards[student.id] !== undefined 
      ? scholarshipAwards[student.id] 
      : (student.hasScholarship || isScholarshipEligible);

    // Promotion eligibility rules
    let eligibility: 'Eligible' | 'Repeats' | 'Incomplete' = 'Incomplete';
    let reason = '';

    if (studentMarks.length === 0) {
      eligibility = 'Incomplete';
      reason = 'No assessment marks entered for this academic year.';
    } else if (requireAllSubjects && !isFullyAssessed) {
      eligibility = 'Incomplete';
      reason = `Incomplete annual records. Missing: ${missingSubjects.join(', ')}`;
    } else if (averageScore < passThreshold) {
      eligibility = 'Repeats';
      reason = `Average mark (${averageScore}%) is below pass threshold (${passThreshold}%).`;
    } else {
      eligibility = 'Eligible';
      reason = `Annual average is ${averageScore}%; promotion to ${getNextClass(student.className)} is recommended.`;
    }

    return {
      student,
      averageScore,
      studentMarksCount: studentMarks.length,
      missingSubjects,
      isFullyAssessed,
      eligibility,
      reason,
      isScholarshipEligible,
      hasActiveScholarship,
      nextClass: getNextClass(student.className)
    };
  });

  const eligibleList = compiledStudents.filter(item => item.eligibility === 'Eligible');
  const repeatsList = compiledStudents.filter(item => item.eligibility === 'Repeats');
  const incompleteList = compiledStudents.filter(item => item.eligibility === 'Incomplete');

  const handlePromoteAllEligible = async () => {
    if (eligibleList.length === 0) {
      alert('There are no eligible students to promote in this class.');
      return;
    }

    const confirmMsg = `Are you absolutely sure you want to promote ${eligibleList.length} eligible students of Class ${selectedClass} to their next class levels?\nThis will update their official grade records and align any modified scholarship designations.`;
    if (!window.confirm(confirmMsg)) {
      return;
    }

    setExecuting(true);
    setSuccessMessage('');
    try {
      const promotions = eligibleList.map(item => ({
        studentId: item.student.id,
        nextClassName: item.nextClass,
        hasScholarship: scholarshipAwards[item.student.id] !== undefined ? scholarshipAwards[item.student.id] : item.student.hasScholarship,
        reason: item.reason
      }));

      await onPromoteStudents(promotions, selectedYear);
      setSuccessMessage(`Success! Automatically promoted ${promotions.length} students of Class ${selectedClass} to ${getNextClass(selectedClass)}.`);
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    } catch (err) {
      alert('Promotion execution failed. Please verify connection and try again.');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div id="promotion_engine_container" className="p-8 space-y-6 font-sans max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-sky-100 pb-5">
        <div className="flex items-center gap-3">
          <AshinagaLogo size={50} className="shrink-0 bg-white p-1 rounded-xl shadow-xs border border-slate-100" />
          <div>
            <h1 className="font-display text-2xl font-black text-slate-800 flex items-center gap-2">
              <span>Automated Student Promotion Engine</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">Audit class-wide academic grades and transition qualifying pupils to higher grade levels</p>
          </div>
        </div>
      </div>

      {/* Grid control panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Panel 1: Class Selection & Assessment parameters */}
        <div className="bg-slate-50 border border-slate-200/60 rounded-3xl p-6 space-y-5 shadow-sm lg:col-span-1">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-200 pb-2.5">
            <Sliders className="h-4.5 w-4.5 text-indigo-500" />
            <span>Audit Parameters</span>
          </h3>

          {/* Class selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">Class Level to Audit</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value as ClassName)}
              className="w-full px-3.5 py-2.5 border-2 border-slate-200 hover:border-slate-300 rounded-xl text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer font-bold"
            >
              {CLASSES_LIST.map(c => (
                <option key={c} value={c}>Class {c}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {/* Year selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">Academic Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 border-2 border-slate-200 hover:border-slate-300 rounded-xl text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer font-semibold"
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
              </select>
            </div>
          </div>

          {/* Promotion Criteria: Passing Threshold */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between items-center text-xs">
              <label className="font-black text-slate-500 uppercase tracking-wider">Pass Mark Threshold</label>
              <span className="font-extrabold text-[#FF5E4D] bg-red-50 px-2 py-0.5 rounded-lg border border-red-500/10 font-mono">{passThreshold}%</span>
            </div>
            <input
              type="range"
              min={30}
              max={80}
              value={passThreshold}
              onChange={(e) => setPassThreshold(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#FF5E4D]"
            />
            <p className="text-[10px] text-slate-400 leading-snug">Average score across all marks entered during the selected academic year.</p>
          </div>

          {/* Promotion Criteria: Scholarship Nominee Threshold */}
          <div className="space-y-1.5 pt-3 border-t border-slate-200/50">
            <div className="flex justify-between items-center text-xs">
              <label className="font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <GraduationCap className="h-3.5 w-3.5 text-indigo-500" />
                <span>Scholarship Threshold</span>
              </label>
              <span className="font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-500/10 font-mono">{scholarshipThreshold}%</span>
            </div>
            <input
              type="range"
              min={50}
              max={95}
              value={scholarshipThreshold}
              onChange={(e) => setScholarshipThreshold(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <p className="text-[10px] text-slate-400 leading-snug">Average mark needed to qualify for or maintain NGO scholarship funding support.</p>
          </div>

          {/* Require all subjects check */}
          <button
            type="button"
            onClick={() => setRequireAllSubjects(!requireAllSubjects)}
            className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all text-xs font-bold cursor-pointer ${
              requireAllSubjects 
                ? 'bg-blue-50/40 border-blue-200 text-blue-900' 
                : 'border-slate-200 bg-white text-slate-500'
            }`}
          >
            <span>Strict Subject Coverage (5 Subjects)</span>
            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-extrabold ${
              requireAllSubjects ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
            }`}>
              {requireAllSubjects ? 'Enabled' : 'Disabled'}
            </span>
          </button>
        </div>

        {/* Panel 2 & 3: Statistics and Promotion Ledger */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Stats banner cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Eligible to Promote</span>
                <span className="text-xl font-extrabold text-emerald-600 block">{eligibleList.length} Pupils</span>
              </div>
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Repeat Grade Suggestion</span>
                <span className="text-xl font-extrabold text-red-500 block">{repeatsList.length} Pupils</span>
              </div>
              <div className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center shrink-0">
                <XCircle className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Pending Assessments</span>
                <span className="text-xl font-extrabold text-amber-500 block">{incompleteList.length} Pupils</span>
              </div>
              <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
            </div>

          </div>

          {/* Save / Promote trigger button */}
          {isAdmin && (
            <div className="bg-slate-100/60 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-0.5 text-center sm:text-left">
                <h4 className="font-bold text-slate-800 text-xs">Execute Bulk Class Transitions</h4>
                <p className="text-[10px] text-slate-500">Commit and promote the {eligibleList.length} qualifying students of Class {selectedClass} instantly.</p>
              </div>
              <button
                onClick={handlePromoteAllEligible}
                disabled={executing || eligibleList.length === 0}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold tracking-wide shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="h-4 w-4" />
                <span>{executing ? 'Promoting...' : `Promote (${eligibleList.length}) Eligible`}</span>
              </button>
            </div>
          )}

          {successMessage && (
            <div className="p-4 bg-emerald-50 border-2 border-emerald-500/20 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2.5">
              <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Audit Ledger List */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-md overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-800">Class {selectedClass} Pupil Audits</h3>
              <span className="text-[10px] text-slate-400 font-mono">Count: {classStudents.length}</span>
            </div>

            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {classStudents.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <HelpCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No registered students in Class {selectedClass}.</p>
                </div>
              ) : (
                compiledStudents.map(({ student, averageScore, isFullyAssessed, eligibility, reason, isScholarshipEligible, hasActiveScholarship, nextClass }) => (
                  <div key={student.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/30 transition-all">
                    
                    {/* Student details */}
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-slate-100">
                        {student.photo ? (
                          <img src={student.photo} alt="Student" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-indigo-50 text-indigo-600 text-[11px] font-bold">
                            {student.surname[0]}{student.otherNames[0]}
                          </div>
                        )}
                      </div>
                      <div>
                        <strong className="text-slate-800 text-xs block uppercase">{student.surname} {student.otherNames}</strong>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                          <span className="text-[10px] text-slate-400 font-mono">ID: {student.id} | Avg: {averageScore}%</span>
                          <span className="text-slate-200">|</span>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={hasActiveScholarship}
                              onChange={(e) => {
                                setScholarshipAwards(prev => ({
                                  ...prev,
                                  [student.id]: e.target.checked
                                }));
                              }}
                              className="h-3.5 w-3.5 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
                            />
                            <span className="text-[10px] font-extrabold text-slate-500 hover:text-slate-800 select-none">NGO Scholar</span>
                          </label>
                          {isScholarshipEligible && (
                            <span className="text-[8px] font-black uppercase text-amber-700 bg-amber-400/20 border border-amber-400/30 px-1 py-0.2 rounded-md flex items-center gap-0.5 shadow-sm">
                              ⭐ Nominee
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Transition mapping */}
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 self-start sm:self-auto">
                      <span className="text-[10px] font-extrabold text-slate-500 font-mono">Class {student.className}</span>
                      <ArrowRight className="h-3 w-3 text-slate-400" />
                      {eligibility === 'Eligible' ? (
                        <span className="text-[10px] font-extrabold text-emerald-600 font-mono bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-500/15">
                          {nextClass === 'Graduated' ? '🎓 Graduate' : `Class ${nextClass}`}
                        </span>
                      ) : (
                        <span className="text-[10px] font-extrabold text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded-md">
                          Class {student.className}
                        </span>
                      )}
                    </div>

                    {/* Status & Reason */}
                    <div className="text-right sm:max-w-xs space-y-1">
                      {eligibility === 'Eligible' && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          Promotable
                        </span>
                      )}
                      {eligibility === 'Repeats' && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-red-600 bg-red-50 border border-red-500/20 px-2 py-0.5 rounded-full">
                          Repeat Level
                        </span>
                      )}
                      {eligibility === 'Incomplete' && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-amber-600 bg-amber-50 border border-amber-500/20 px-2 py-0.5 rounded-full">
                          Pending Audit
                        </span>
                      )}
                      <p className="text-[9px] text-slate-400 leading-snug font-medium">{reason}</p>
                    </div>

                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
