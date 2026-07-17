import { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Award, 
  Users, 
  Target, 
  BookOpen, 
  Sparkles, 
  MessageSquare, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Flame, 
  ChevronRight, 
  Printer, 
  ArrowUpRight, 
  HelpCircle,
  Percent,
  TrendingDown,
  GraduationCap
} from 'lucide-react';
import { Student, Mark, ClassName } from '../types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface AcademicAnalyticsProps {
  students: Student[];
  marks: Mark[];
  isAdmin: boolean;
}

// Ugandan UNEB standard grading converter
const getSubjectPoints = (score: number) => {
  if (score >= 90) return 1; // D1
  if (score >= 80) return 2; // D2
  if (score >= 70) return 3; // C3
  if (score >= 60) return 4; // C4
  if (score >= 55) return 5; // C5
  if (score >= 50) return 6; // C6
  if (score >= 45) return 7; // P7
  if (score >= 40) return 8; // P8
  return 9; // F9
};

const getGradeName = (points: number) => {
  switch (points) {
    case 1: return 'D1';
    case 2: return 'D2';
    case 3: return 'C3';
    case 4: return 'C4';
    case 5: return 'C5';
    case 6: return 'C6';
    case 7: return 'P7';
    case 8: return 'P8';
    default: return 'F9';
  }
};

const getGradeColor = (points: number) => {
  if (points <= 2) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
  if (points <= 6) return 'text-indigo-600 bg-indigo-50 border-indigo-100';
  if (points <= 8) return 'text-amber-600 bg-amber-50 border-amber-100';
  return 'text-red-600 bg-red-50 border-red-100';
};

// Strict UNEB PLE Division placement
const calculatePleDivision = (subjectGrades: Record<string, number>): { division: string; aggregate: number; details: string } => {
  const coreSubjects = ['Mathematics', 'English', 'Science', 'Social Studies'];
  
  // Verify if we have marks for all 4 core subjects
  const presentSubjects = coreSubjects.filter(sub => subjectGrades[sub] !== undefined);
  if (presentSubjects.length < 4) {
    return { division: 'Incomplete', aggregate: 0, details: 'Missing core terminal marks' };
  }

  const grades = coreSubjects.map(sub => subjectGrades[sub]);
  const aggregate = grades.reduce((sum, g) => sum + g, 0);

  // Count F9s and passes
  const f9Count = grades.filter(g => g === 9).length;
  const passesCount = grades.filter(g => g <= 8).length;
  const creditsCount = grades.filter(g => g <= 6).length;

  // UNEB Rules:
  // Division I: Aggregate 4 to 12. Must pass all core subjects with at least a Credit 6 (D1 to C6).
  if (aggregate <= 12 && creditsCount === 4) {
    return { division: 'Division I', aggregate, details: 'All credits or better' };
  }
  
  // Division II: Aggregate 13 to 24. Or if aggregate <= 12 but has a pass (7 or 8). No F9s.
  if (aggregate <= 24 && f9Count === 0) {
    return { division: 'Division II', aggregate, details: 'All papers passed' };
  }

  // Division III: Aggregate 25 to 28. Or if aggregate is lower but has at most 1 F9 in a core subject.
  if (aggregate <= 28 && f9Count <= 1) {
    return { division: 'Division III', aggregate, details: 'At most 1 paper failed' };
  }

  // Division IV: Aggregate 29 to 32. Or if aggregate is lower but has at most 2 F9s.
  if (aggregate <= 32 && f9Count <= 2) {
    return { division: 'Division IV', aggregate, details: 'At most 2 papers failed' };
  }

  // Division U: Aggregate 33 to 36, or 3 or more failed papers.
  return { division: 'Division U', aggregate, details: 'Ungraded (3+ failures or poor aggregate)' };
};

export default function AcademicAnalytics({ students, marks, isAdmin }: AcademicAnalyticsProps) {
  const [selectedCohortClass, setSelectedCohortClass] = useState<ClassName>('P.7');
  const [selectedTerm, setSelectedTerm] = useState<1 | 2 | 3>(1);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSimStudentId, setSelectedSimStudentId] = useState<string | null>(null);
  const [useSstReAveraging, setUseSstReAveraging] = useState(false);

  // Custom simulation scores (for What-If)
  const [simScores, setSimScores] = useState<Record<string, number>>({
    'Mathematics': 65,
    'English': 72,
    'Science': 60,
    'Social Studies': 68
  });

  // Filter students in selected cohort
  const cohortStudents = useMemo(() => {
    return students.filter(s => s.className === selectedCohortClass);
  }, [students, selectedCohortClass]);

  // Extract marks for cohort
  const cohortProjections = useMemo(() => {
    return cohortStudents.map(student => {
      const studentMarks = marks.filter(
        m => m.studentId === student.id && 
             m.term === selectedTerm && 
             m.year === selectedYear
      );

      // Map subject names to scores and UNEB points
      const subjectScores: Record<string, number> = {};
      const subjectGrades: Record<string, number> = {};

      studentMarks.forEach(m => {
        let score = m.score;
        subjectScores[m.subject] = score;
        subjectGrades[m.subject] = getSubjectPoints(score);
      });

      // Special SST / RE Averaging logic
      if (useSstReAveraging && subjectScores['Social Studies'] !== undefined && subjectScores['Religious Education'] !== undefined) {
        const averagedSst = Math.round((subjectScores['Social Studies'] + subjectScores['Religious Education']) / 2);
        subjectScores['Social Studies'] = averagedSst;
        subjectGrades['Social Studies'] = getSubjectPoints(averagedSst);
      }

      const { division, aggregate, details } = calculatePleDivision(subjectGrades);

      // Preparedness categorization
      let readiness: 'Elite' | 'On Track' | 'Marginal' | 'At Risk' = 'At Risk';
      let readinessColor = 'text-red-700 bg-red-50 border-red-200';
      
      if (division === 'Division I') {
        readiness = aggregate <= 8 ? 'Elite' : 'On Track';
      } else if (division === 'Division II') {
        readiness = 'On Track';
      } else if (division === 'Division III') {
        readiness = 'Marginal';
      } else if (division === 'Division IV') {
        readiness = 'Marginal';
      } else {
        readiness = 'At Risk';
      }

      switch (readiness) {
        case 'Elite': readinessColor = 'text-emerald-700 bg-emerald-50 border-emerald-200'; break;
        case 'On Track': readinessColor = 'text-indigo-700 bg-indigo-50 border-indigo-200'; break;
        case 'Marginal': readinessColor = 'text-amber-700 bg-amber-50 border-amber-200'; break;
        case 'At Risk': readinessColor = 'text-rose-700 bg-rose-50 border-rose-200'; break;
      }

      return {
        student,
        scores: subjectScores,
        grades: subjectGrades,
        aggregate,
        division,
        details,
        readiness,
        readinessColor,
        isComplete: division !== 'Incomplete'
      };
    });
  }, [cohortStudents, marks, selectedTerm, selectedYear, useSstReAveraging]);

  // Statistics
  const stats = useMemo(() => {
    const completeProjections = cohortProjections.filter(p => p.isComplete);
    const total = completeProjections.length;

    if (total === 0) return {
      totalCandidates: cohortStudents.length,
      completeCount: 0,
      div1: 0, div2: 0, div3: 0, div4: 0, divU: 0,
      div1Rate: 0,
      overallPassRate: 0,
      avgAggregate: 0,
      atRiskCount: 0,
      subjectAverages: {},
      genderBreakdown: { Male: { div1Rate: 0, avgAgg: 0 }, Female: { div1Rate: 0, avgAgg: 0 } }
    };

    const div1 = completeProjections.filter(p => p.division === 'Division I').length;
    const div2 = completeProjections.filter(p => p.division === 'Division II').length;
    const div3 = completeProjections.filter(p => p.division === 'Division III').length;
    const div4 = completeProjections.filter(p => p.division === 'Division IV').length;
    const divU = completeProjections.filter(p => p.division === 'Division U').length;

    const div1Rate = Math.round((div1 / total) * 100);
    const overallPassRate = Math.round(((div1 + div2 + div3 + div4) / total) * 100);
    
    const sumAgg = completeProjections.reduce((sum, p) => sum + p.aggregate, 0);
    const avgAggregate = Number((sumAgg / total).toFixed(1));

    const atRiskCount = cohortProjections.filter(p => p.readiness === 'At Risk' || p.division === 'Division U').length;

    // Subject stats
    const subjectList = ['Mathematics', 'English', 'Science', 'Social Studies', 'Religious Education'];
    const subjectAverages: Record<string, { sum: number; count: number; avg: number; failCount: number }> = {};
    
    subjectList.forEach(sub => {
      subjectAverages[sub] = { sum: 0, count: 0, avg: 0, failCount: 0 };
    });

    cohortProjections.forEach(p => {
      Object.keys(p.scores).forEach(sub => {
        if (subjectAverages[sub]) {
          subjectAverages[sub].sum += p.scores[sub];
          subjectAverages[sub].count += 1;
          if (p.scores[sub] < 40) {
            subjectAverages[sub].failCount += 1;
          }
        }
      });
    });

    Object.keys(subjectAverages).forEach(sub => {
      const s = subjectAverages[sub];
      s.avg = s.count > 0 ? Math.round(s.sum / s.count) : 0;
    });

    // Gender breakdown
    const maleProj = completeProjections.filter(p => p.student.gender === 'Male');
    const femaleProj = completeProjections.filter(p => p.student.gender === 'Female');

    const mDiv1 = maleProj.filter(p => p.division === 'Division I').length;
    const fDiv1 = femaleProj.filter(p => p.division === 'Division I').length;

    const mSumAgg = maleProj.reduce((sum, p) => sum + p.aggregate, 0);
    const fSumAgg = femaleProj.reduce((sum, p) => sum + p.aggregate, 0);

    const genderBreakdown = {
      Male: {
        div1Rate: maleProj.length > 0 ? Math.round((mDiv1 / maleProj.length) * 100) : 0,
        avgAgg: maleProj.length > 0 ? Number((mSumAgg / maleProj.length).toFixed(1)) : 0,
        total: maleProj.length
      },
      Female: {
        div1Rate: femaleProj.length > 0 ? Math.round((fDiv1 / femaleProj.length) * 100) : 0,
        avgAgg: femaleProj.length > 0 ? Number((fSumAgg / femaleProj.length).toFixed(1)) : 0,
        total: femaleProj.length
      }
    };

    return {
      totalCandidates: cohortStudents.length,
      completeCount: total,
      div1, div2, div3, div4, divU,
      div1Rate,
      overallPassRate,
      avgAggregate,
      atRiskCount,
      subjectAverages,
      genderBreakdown
    };
  }, [cohortProjections, cohortStudents, useSstReAveraging]);

  // Handle active search
  const filteredProjections = useMemo(() => {
    return cohortProjections.filter(p => {
      const fullName = `${p.student.surname} ${p.student.otherNames}`.toLowerCase();
      const matchSearch = fullName.includes(searchQuery.toLowerCase()) || p.student.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    });
  }, [cohortProjections, searchQuery]);

  // Set up What-If simulation for a student
  const handleSelectSimStudent = (studentId: string) => {
    setSelectedSimStudentId(studentId);
    const proj = cohortProjections.find(p => p.student.id === studentId);
    if (proj) {
      setSimScores({
        'Mathematics': proj.scores['Mathematics'] || 45,
        'English': proj.scores['English'] || 50,
        'Science': proj.scores['Science'] || 45,
        'Social Studies': proj.scores['Social Studies'] || 50
      });
    }
  };

  // Simulated PLE division calculation
  const simulatedProjection = useMemo(() => {
    const grades: Record<string, number> = {};
    Object.keys(simScores).forEach(sub => {
      grades[sub] = getSubjectPoints(simScores[sub]);
    });
    return calculatePleDivision(grades);
  }, [simScores]);

  // Recommended remedial SMS text
  const getRemedialSMSText = (studentName: string, division: string, weakestSubject: string) => {
    return `Dear Parent, academic projections show ${studentName} is on the borderline for PLE (${division}). We recommend intensive remedial coaching in ${weakestSubject}. Nansana EO.`;
  };

  // Find weakest subject for a student to recommend coaching
  const getWeakestSubject = (scores: Record<string, number>) => {
    let minScore = 101;
    let weakest = 'Mathematics';
    Object.keys(scores).forEach(sub => {
      if (scores[sub] < minScore) {
        minScore = scores[sub];
        weakest = sub;
      }
    });
    return weakest;
  };

  const selectedSimStudentName = useMemo(() => {
    if (!selectedSimStudentId) return null;
    const std = students.find(s => s.id === selectedSimStudentId);
    return std ? `${std.surname} ${std.otherNames}` : null;
  }, [selectedSimStudentId, students]);

  // Format data for radar subject chart
  const radarChartData = useMemo(() => {
    return Object.keys(stats.subjectAverages).map(sub => ({
      subject: sub === 'Social Studies' ? 'SST' : sub === 'Religious Education' ? 'RE' : sub,
      average: (stats.subjectAverages as any)[sub]?.avg || 0,
      fullMark: 100
    })).filter(d => d.subject !== 'RE' || !useSstReAveraging);
  }, [stats.subjectAverages, useSstReAveraging]);

  // Format data for Division Distribution chart
  const distributionChartData = useMemo(() => {
    return [
      { name: 'Div I', count: stats.div1, fill: '#10b981' },
      { name: 'Div II', count: stats.div2, fill: '#6366f1' },
      { name: 'Div III', count: stats.div3, fill: '#f59e0b' },
      { name: 'Div IV', count: stats.div4, fill: '#ec4899' },
      { name: 'Div U', count: stats.divU, fill: '#ef4444' }
    ];
  }, [stats]);

  return (
    <div id="academic_analytics_view" className="space-y-6 font-sans">
      
      {/* Upper Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm no-print">
        <div>
          <h1 className="font-display text-2xl font-black text-slate-800 flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-indigo-600" />
            Academic Analytics &amp; PLE Projections
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Predictive UNEB division modeling based on terminal assessments and gap diagnosis
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-2">Cohort:</span>
            <select
              value={selectedCohortClass}
              onChange={(e) => {
                setSelectedCohortClass(e.target.value as ClassName);
                setSelectedSimStudentId(null);
              }}
              className="bg-transparent text-xs font-bold text-slate-800 border-none outline-none focus:ring-0 cursor-pointer"
            >
              <option value="P.7">P.7 Candidates</option>
              <option value="P.6">P.6 Sub-candidates</option>
              <option value="P.5">P.5 Cohort</option>
            </select>
          </div>

          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-2">Term:</span>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(Number(e.target.value) as 1 | 2 | 3)}
              className="bg-transparent text-xs font-bold text-slate-800 border-none outline-none focus:ring-0 cursor-pointer"
            >
              <option value={1}>Term 1</option>
              <option value={2}>Term 2</option>
              <option value={3}>Term 3</option>
            </select>
          </div>

          <button
            onClick={() => window.print()}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            title="Print Analytical Forecast"
          >
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Print Projections</span>
          </button>
        </div>
      </div>

      {/* Stats Bento Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 no-print">
        {/* Expected Div 1 */}
        <div className="bg-gradient-to-br from-white to-emerald-50/20 p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="space-y-1 z-10 relative">
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider block">Expected Division I</span>
            <strong className="text-3xl font-black text-slate-800 tracking-tight block">{stats.div1Rate}%</strong>
            <p className="text-[10px] text-slate-400 mt-1">
              {stats.div1} of {stats.completeCount} fully assessed pupils
            </p>
          </div>
          <div className="absolute right-4 bottom-4 p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform">
            <Award className="h-6 w-6" />
          </div>
        </div>

        {/* Expected Pass Rate */}
        <div className="bg-gradient-to-br from-white to-indigo-50/20 p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="space-y-1 z-10 relative">
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider block">PLE Overall Pass Rate</span>
            <strong className="text-3xl font-black text-slate-800 tracking-tight block">{stats.overallPassRate}%</strong>
            <p className="text-[10px] text-slate-400 mt-1">
              Projected Divisions I - IV graduates
            </p>
          </div>
          <div className="absolute right-4 bottom-4 p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-110 transition-transform">
            <Percent className="h-6 w-6" />
          </div>
        </div>

        {/* Average aggregate */}
        <div className="bg-gradient-to-br from-white to-amber-50/20 p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="space-y-1 z-10 relative">
            <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider block">Average PLE Aggregate</span>
            <strong className="text-3xl font-black text-slate-800 tracking-tight block">
              {stats.avgAggregate > 0 ? stats.avgAggregate : '--'}
            </strong>
            <p className="text-[10px] text-slate-400 mt-1">
              Lower is superior (UNEB scale: 4-36)
            </p>
          </div>
          <div className="absolute right-4 bottom-4 p-3 bg-amber-50 text-amber-600 rounded-2xl group-hover:scale-110 transition-transform">
            <Target className="h-6 w-6" />
          </div>
        </div>

        {/* At-Risk candidates */}
        <div className="bg-gradient-to-br from-white to-rose-50/20 p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="space-y-1 z-10 relative">
            <span className="text-[10px] font-black text-rose-600 uppercase tracking-wider block">At-Risk Candidates</span>
            <strong className="text-3xl font-black text-red-600 tracking-tight block">{stats.atRiskCount}</strong>
            <p className="text-[10px] text-slate-400 mt-1">
              Division U or incomplete assessments
            </p>
          </div>
          <div className="absolute right-4 bottom-4 p-3 bg-rose-50 text-rose-600 rounded-2xl group-hover:scale-110 transition-transform">
            <AlertTriangle className="h-6 w-6 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Incomplete assessment warning */}
      {stats.completeCount < stats.totalCandidates && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-800 text-xs font-medium no-print">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
          <div>
            <strong>Assessments Incomplete:</strong> {stats.totalCandidates - stats.completeCount} out of {stats.totalCandidates} pupils in this cohort are missing one or more core terminal exam marks. Projections are only generated for pupils with fully populated core marks.
          </div>
        </div>
      )}

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
        {/* Division Distribution Column */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm lg:col-span-2 space-y-4">
          <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-slate-500" />
            Division Distribution Model
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 pt-2">
            {distributionChartData.map((d, idx) => {
              const pct = stats.completeCount > 0 ? Math.round((d.count / stats.completeCount) * 100) : 0;
              return (
                <div key={idx} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col justify-between h-28 relative group overflow-hidden">
                  <div className="text-[10px] font-black text-slate-400 tracking-wider uppercase">{d.name}</div>
                  <div>
                    <strong className="text-2xl font-black text-slate-800 tracking-tight block leading-none">{d.count}</strong>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">{pct}% of cohort</span>
                  </div>
                  {/* Subtle progress bar at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-200">
                    <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: d.fill }}></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span>National Grading Comparison (Grade Distribution Curve)</span>
              <span className="text-indigo-600 font-bold flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Uganda National Examinations Board (UNEB) Benchmarked
              </span>
            </div>
            
            {/* Custom visual progress aggregate chart */}
            <div className="flex h-6 rounded-lg overflow-hidden border border-slate-200 text-[10px] font-bold text-white text-center">
              {distributionChartData.map((d, idx) => {
                const pct = stats.completeCount > 0 ? (d.count / stats.completeCount) * 100 : 0;
                if (pct === 0) return null;
                return (
                  <div 
                    key={idx} 
                    style={{ width: `${pct}%`, backgroundColor: d.fill }}
                    className="flex items-center justify-center transition-all duration-300"
                    title={`${d.name}: ${d.count} pupils (${Math.round(pct)}%)`}
                  >
                    {pct > 5 ? `${d.name}` : ''}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Subject Gap Radar / Bar */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              Subject Performance Gaps
            </h2>
            <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400">
              <input 
                type="checkbox" 
                id="avgSst"
                checked={useSstReAveraging}
                onChange={(e) => setUseSstReAveraging(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
              />
              <label htmlFor="avgSst" className="cursor-pointer">SST+RE Average</label>
            </div>
          </div>

          <div className="space-y-3.5 pt-2">
            {Object.keys(stats.subjectAverages).map((sub) => {
              const data = (stats.subjectAverages as any)[sub];
              if (!data || (sub === 'Religious Education' && useSstReAveraging)) return null;

              let performanceColor = 'bg-indigo-600';
              if (data.avg >= 75) performanceColor = 'bg-emerald-500';
              else if (data.avg < 50) performanceColor = 'bg-rose-500';
              else if (data.avg < 60) performanceColor = 'bg-amber-500';

              return (
                <div key={sub} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700">{sub}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[10px]">{data.failCount} fail(s)</span>
                      <strong className="text-slate-800 font-black">{data.avg}% avg</strong>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${performanceColor}`} style={{ width: `${data.avg}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-[10px] text-slate-500 space-y-1">
            <strong>Subject Diagnostic Summary:</strong>
            <p>
              {radarChartData.length > 0 ? (
                <span>
                  The primary bottleneck for Division I candidates is{' '}
                  <strong className="text-indigo-600 font-bold">
                    {radarChartData.reduce((prev, curr) => prev.average < curr.average ? prev : curr).subject}
                  </strong>{' '}
                  (lowest average of{' '}
                  {radarChartData.reduce((prev, curr) => prev.average < curr.average ? prev : curr).average}
                  %). Targeted interventions should prioritize this area.
                </span>
              ) : (
                'Insufficient data to identify bottlenecks.'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Interactive What-If Simulator & Gender Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
        
        {/* Dynamic What-If Slider Simulator */}
        <div className="bg-gradient-to-br from-[#0c1e35] to-[#061224] p-6 rounded-3xl shadow-xl text-white lg:col-span-2 space-y-4 relative overflow-hidden border border-slate-800">
          <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-12 -translate-y-6">
            <GraduationCap className="h-64 w-64 text-indigo-400" />
          </div>

          <div className="flex items-start justify-between z-10 relative border-b border-slate-800 pb-4">
            <div>
              <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest block">Interactive Sandbox</span>
              <h2 className="text-lg font-black text-white flex items-center gap-1.5 mt-0.5">
                <Target className="h-5 w-5 text-indigo-400" />
                "What-If" Candidate Target Simulator
              </h2>
              <p className="text-[11px] text-slate-400 mt-1">
                {selectedSimStudentId 
                  ? `Simulating targets for pupil: ${selectedSimStudentName}` 
                  : 'Select a candidate from the list below or adjust slider presets to forecast grades'}
              </p>
            </div>
            {selectedSimStudentId && (
              <button 
                onClick={() => setSelectedSimStudentId(null)}
                className="px-2.5 py-1 text-[10px] font-black bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg uppercase cursor-pointer"
              >
                Clear Selector
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 z-10 relative">
            {/* Sliders */}
            <div className="space-y-4">
              {['Mathematics', 'English', 'Science', 'Social Studies'].map((sub) => (
                <div key={sub} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-300">
                    <label>{sub}</label>
                    <div className="flex items-center gap-2">
                      <span className="text-indigo-400 font-mono text-[10px] uppercase">
                        Grade {getGradeName(getSubjectPoints(simScores[sub]))}
                      </span>
                      <span className="text-white font-black bg-slate-800 px-2 py-0.5 rounded-md font-mono">{simScores[sub]}%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={simScores[sub]}
                    onChange={(e) => setSimScores(prev => ({ ...prev, [sub]: Number(e.target.value) }))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
              ))}
            </div>

            {/* Simulated Output Card */}
            <div className="bg-[#091729] p-6 rounded-2xl border border-slate-800 flex flex-col justify-between gap-4">
              <div className="space-y-4 text-center">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block leading-none">Simulated Forecast</span>
                
                <div>
                  <div className="text-[10px] text-slate-400 font-mono">PROJECTED DIVISION</div>
                  <strong className={`text-4xl font-black block tracking-tight mt-1 ${
                    simulatedProjection.division === 'Division I' ? 'text-emerald-400' :
                    simulatedProjection.division === 'Division II' ? 'text-indigo-400' :
                    simulatedProjection.division === 'Division III' ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    {simulatedProjection.division}
                  </strong>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center border-t border-b border-slate-800 py-3">
                  <div>
                    <span className="text-[9px] text-slate-500 font-bold block uppercase leading-none">Aggregate Score</span>
                    <strong className="text-xl font-black text-white block mt-1.5">{simulatedProjection.aggregate}</strong>
                    <span className="text-[8px] text-slate-400">Lower is better</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 font-bold block uppercase leading-none">UNEB Criteria Status</span>
                    <strong className="text-[11px] font-bold text-slate-300 block mt-2 leading-none">{simulatedProjection.details}</strong>
                  </div>
                </div>
              </div>

              {/* Action Hook */}
              {selectedSimStudentId ? (
                <div className="text-[10px] text-slate-400 leading-relaxed text-center">
                  💡 Parent intervention text pre-configured! You can drafts SMS alerts for{' '}
                  <strong className="text-white">{selectedSimStudentName}</strong> below based on this simulation.
                </div>
              ) : (
                <div className="text-[10px] text-slate-500 italic text-center">
                  *Tip: Select a pupil from the candidate list below to load their actual live grades into this sandbox.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Gender Gap Analysis */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-600" />
            Gender Equity &amp; Demographics
          </h2>

          <div className="space-y-4 pt-2">
            {/* Male */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-wider block">Male Candidates</span>
                <strong className="text-xl font-black text-slate-800 block mt-1">{stats.genderBreakdown.Male.total} Pupils</strong>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Avg Agg: {stats.genderBreakdown.Male.avgAgg > 0 ? stats.genderBreakdown.Male.avgAgg : '--'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-extrabold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-150 uppercase font-mono">
                  {stats.genderBreakdown.Male.div1Rate}% Div 1
                </span>
              </div>
            </div>

            {/* Female */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-pink-500 uppercase tracking-wider block">Female Candidates</span>
                <strong className="text-xl font-black text-slate-800 block mt-1">{stats.genderBreakdown.Female.total} Pupils</strong>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Avg Agg: {stats.genderBreakdown.Female.avgAgg > 0 ? stats.genderBreakdown.Female.avgAgg : '--'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-extrabold bg-pink-50 text-pink-700 px-2 py-0.5 rounded border border-pink-150 uppercase font-mono">
                  {stats.genderBreakdown.Female.div1Rate}% Div 1
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <h3 className="text-xs font-bold text-slate-700 mb-1">Scholarship Impact Assessment</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                <span className="text-[8px] font-bold text-emerald-600 block uppercase">SCHOLARSHIP AVG SCORE</span>
                <strong className="text-base font-black text-slate-800 block mt-0.5">
                  {cohortProjections.filter(p => p.student.hasScholarship && p.isComplete).length > 0
                    ? `${Math.round(cohortProjections.filter(p => p.student.hasScholarship && p.isComplete).reduce((sum, p) => sum + p.aggregate, 0) / cohortProjections.filter(p => p.student.hasScholarship && p.isComplete).length)} Agg`
                    : '--'
                  }
                </strong>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[8px] font-bold text-slate-500 block uppercase">FEE PAYING AVG SCORE</span>
                <strong className="text-base font-black text-slate-800 block mt-0.5">
                  {cohortProjections.filter(p => !p.student.hasScholarship && p.isComplete).length > 0
                    ? `${Math.round(cohortProjections.filter(p => !p.student.hasScholarship && p.isComplete).reduce((sum, p) => sum + p.aggregate, 0) / cohortProjections.filter(p => !p.student.hasScholarship && p.isComplete).length)} Agg`
                    : '--'
                  }
                </strong>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Candidate Preparedness Ledger */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        
        {/* Printable Header Section */}
        <div className="hidden print:block text-center space-y-2 border-b-2 border-slate-900 pb-5 mb-6 p-6">
          <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase font-mono">OFFICIAL ACADEMIC ANALYSIS REPORT</div>
          <h2 className="font-display font-extrabold text-2xl text-slate-900 uppercase">NANSANA EDUCATION ORGANISATION</h2>
          <h3 className="text-sm text-slate-700 font-bold uppercase tracking-wider font-mono">
            {selectedCohortClass} PRIMARY LEAVING EXAMINATION (PLE) PROJECTION FORECAST
          </h3>
          <p className="text-xs text-slate-500 font-light font-mono">
            YEAR: {selectedYear} | TERM: TERM {selectedTerm} | TOTAL COHORT AUDITED: {stats.completeCount} PUPILS
          </p>
        </div>

        {/* Ledger Header - Hidden in Print */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
          <div>
            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-500" />
              Candidate Preparedness Ledger
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Filter cohort pupils to run what-if simulation, identify risks, and draft guardian interventions</p>
          </div>

          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 w-full md:w-80">
            <input
              type="text"
              placeholder="Search candidate by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs text-slate-700 border-none outline-none focus:ring-0 w-full"
            />
          </div>
        </div>

        {/* Ledger Table */}
        {filteredProjections.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs italic">
            No pupils in class {selectedCohortClass} match your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-slate-600 border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 border-b border-slate-150 uppercase tracking-wider font-mono print:bg-slate-100">
                  <th className="px-6 py-4">Pupil Profile</th>
                  <th className="px-6 py-4 text-center">Mathematics</th>
                  <th className="px-6 py-4 text-center">English</th>
                  <th className="px-6 py-4 text-center">Science</th>
                  <th className="px-6 py-4 text-center">SST</th>
                  <th className="px-6 py-4 text-center">Projected PLE Aggregate</th>
                  <th className="px-6 py-4 text-center">Projected Division</th>
                  <th className="px-6 py-4 text-center">Preparedness Status</th>
                  <th className="px-6 py-4 text-right no-print">Teacher Interventions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-xs">
                {filteredProjections.map((p) => {
                  const MathScore = p.scores['Mathematics'];
                  const EngScore = p.scores['English'];
                  const SciScore = p.scores['Science'];
                  const SstScore = p.scores['Social Studies'];

                  return (
                    <tr 
                      key={p.student.id} 
                      className={`transition-colors hover:bg-slate-50/40 ${
                        selectedSimStudentId === p.student.id ? 'bg-indigo-50/30' : ''
                      }`}
                    >
                      {/* Student Profile */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 bg-slate-100 rounded-lg shrink-0 overflow-hidden border border-slate-100 print:hidden">
                            {p.student.photo ? (
                              <img src={p.student.photo} alt="Pupil" className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center bg-indigo-50 text-indigo-600 text-[11px] font-bold">
                                {p.student.surname[0]}{p.student.otherNames[0]}
                              </div>
                            )}
                          </div>
                          <div>
                            <strong className="text-slate-800 block uppercase font-bold">
                              {p.student.surname} {p.student.otherNames}
                            </strong>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              ID: {p.student.id} | {p.student.gender} {p.student.hasScholarship ? '• Scholarship' : ''}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Math */}
                      <td className="px-6 py-4 text-center">
                        {MathScore !== undefined ? (
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-800">{MathScore}%</span>
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.25 rounded border block w-fit mx-auto ${getGradeColor(p.grades['Mathematics'])}`}>
                              {getGradeName(p.grades['Mathematics'])}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300">--</span>
                        )}
                      </td>

                      {/* English */}
                      <td className="px-6 py-4 text-center">
                        {EngScore !== undefined ? (
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-800">{EngScore}%</span>
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.25 rounded border block w-fit mx-auto ${getGradeColor(p.grades['English'])}`}>
                              {getGradeName(p.grades['English'])}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300">--</span>
                        )}
                      </td>

                      {/* Science */}
                      <td className="px-6 py-4 text-center">
                        {SciScore !== undefined ? (
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-800">{SciScore}%</span>
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.25 rounded border block w-fit mx-auto ${getGradeColor(p.grades['Science'])}`}>
                              {getGradeName(p.grades['Science'])}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300">--</span>
                        )}
                      </td>

                      {/* SST */}
                      <td className="px-6 py-4 text-center">
                        {SstScore !== undefined ? (
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-800">{SstScore}%</span>
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.25 rounded border block w-fit mx-auto ${getGradeColor(p.grades['Social Studies'])}`}>
                              {getGradeName(p.grades['Social Studies'])}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300">--</span>
                        )}
                      </td>

                      {/* Projected PLE Aggregate */}
                      <td className="px-6 py-4 text-center font-bold text-slate-800 font-mono text-sm">
                        {p.isComplete ? `${p.aggregate}` : '--'}
                      </td>

                      {/* Projected Division */}
                      <td className="px-6 py-4 text-center">
                        {p.isComplete ? (
                          <span className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-extrabold border ${
                            p.division === 'Division I' ? 'bg-emerald-50 text-emerald-700 border-emerald-500/20' : 
                            p.division === 'Division II' ? 'bg-indigo-50 text-indigo-700 border-indigo-500/20' : 
                            p.division === 'Division III' ? 'bg-amber-50 text-amber-700 border-amber-500/20' : 'bg-red-50 text-red-700 border-red-500/20'
                          }`}>
                            {p.division}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-medium italic">Pending Marks</span>
                        )}
                      </td>

                      {/* Preparedness Level */}
                      <td className="px-6 py-4 text-center">
                        {p.isComplete ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px] border ${p.readinessColor}`}>
                            {p.readiness === 'Elite' && '🌟 Elite'}
                            {p.readiness === 'On Track' && '✅ On Track'}
                            {p.readiness === 'Marginal' && '⚠️ Borderline'}
                            {p.readiness === 'At Risk' && '🚨 Critical At-Risk'}
                          </span>
                        ) : (
                          <span className="text-slate-300">--</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right no-print">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleSelectSimStudent(p.student.id)}
                            className="px-2 py-1.25 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                            title="Load into sandbox simulator"
                          >
                            <Target className="h-3 w-3 text-indigo-600" />
                            <span>Simulator</span>
                          </button>
                          
                          {p.isComplete && (p.readiness === 'At Risk' || p.readiness === 'Marginal') && (
                            <button
                              onClick={() => {
                                const weakest = getWeakestSubject(p.scores);
                                const text = getRemedialSMSText(`${p.student.surname} ${p.student.otherNames}`, p.division, weakest);
                                const encodedText = encodeURIComponent(text);
                                const parentPhone = p.student.guardianContact;
                                const studentId = p.student.id;
                                const guardianName = p.student.guardianName;
                                
                                if (window.confirm(`Draft SMS Intervention text to guardian ${p.student.guardianName} (${p.student.guardianContact})?\n\n"${text}"`)) {
                                  // Open outbox to compose SMS with prefilled content or send directly
                                  fetch('/api/sms', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      studentId,
                                      guardianName,
                                      phoneNumber: parentPhone,
                                      messageBody: text
                                    })
                                  }).then(res => {
                                    if (res.ok) {
                                      alert('Guardian alert sent & logged successfully in Outbox!');
                                    } else {
                                      alert('Failed to send SMS to gateway.');
                                    }
                                  }).catch(() => {
                                    alert('Network error sending SMS.');
                                  });
                                }
                              }}
                              className="px-2 py-1.25 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                              title="Send warning alert SMS to parent"
                            >
                              <MessageSquare className="h-3 w-3" />
                              <span>SMS Parent</span>
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Signature Box for printed analysis */}
        <div className="hidden print:block mt-16 p-6">
          <div className="flex justify-between items-center text-xs">
            <div className="w-48 text-center">
              <div className="border-b border-slate-800 h-8"></div>
              <div className="text-[9px] font-bold text-slate-500 uppercase mt-1 font-mono">Academic Counselor</div>
            </div>
            <div className="border border-dashed border-slate-400 rounded p-4 h-16 w-32 flex items-center justify-center text-[10px] font-bold font-mono text-slate-300">
              OFFICIAL SEAL
            </div>
            <div className="w-48 text-center">
              <div className="border-b border-slate-800 h-8"></div>
              <div className="text-[9px] font-bold text-slate-500 uppercase mt-1 font-mono">Director of Examinations</div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
