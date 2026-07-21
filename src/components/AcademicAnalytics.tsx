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
  GraduationCap,
  FileText,
  Download,
  X,
  Check
} from 'lucide-react';
import { Student, Mark, ClassName } from '../types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { AnimatePresence, motion } from 'motion/react';
import AshinagaLogo from './AshinagaLogo';

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

  // School Management Report PDF Generator states
  const [showManagementReportModal, setShowManagementReportModal] = useState(false);
  const [isPrintingManagementReport, setIsPrintingManagementReport] = useState(false);
  const [reportTitle, setReportTitle] = useState('PRIMARY LEAVING EXAMINATION (PLE) FORECAST & REFORM PLAN');
  const [signatureName, setSignatureName] = useState('Florence Namatovu');
  const [signatureTitle, setSignatureTitle] = useState('Head Teacher / Studies Committee Chair');
  const [customCommentary, setCustomCommentary] = useState('');
  
  // Custom inclusions
  const [includeStats, setIncludeStats] = useState(true);
  const [includeGenderBreakdown, setIncludeGenderBreakdown] = useState(true);
  const [includeSubjectGaps, setIncludeSubjectGaps] = useState(true);
  const [includeAtRiskList, setIncludeAtRiskList] = useState(true);
  const [includeFullLedger, setIncludeFullLedger] = useState(false);

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
      genderBreakdown: { 
        Male: { div1Rate: 0, avgAgg: 0, total: 0 }, 
        Female: { div1Rate: 0, avgAgg: 0, total: 0 } 
      }
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

  const dynamicDefaultCommentary = useMemo(() => {
    const weakestSub = radarChartData.length > 0 
      ? radarChartData.reduce((prev, curr) => prev.average < curr.average ? prev : curr).subject
      : 'Mathematics';
    const weakestAvg = radarChartData.length > 0
      ? radarChartData.reduce((prev, curr) => prev.average < curr.average ? prev : curr).average
      : 0;

    return `Based on comprehensive assessment auditing for the ${selectedCohortClass} candidate cohort during Term ${selectedTerm} of the ${selectedYear} academic year, the predictive models indicate a projected Division I rate of ${stats.div1Rate}% and an overall pass rate of ${stats.overallPassRate}%, with an average aggregate performance score of ${stats.avgAggregate} (where lower aggregates denote higher academic standard).

Academic metrics pinpoint ${weakestSub} as the most pronounced educational bottleneck, demonstrating a low cohort average score of ${weakestAvg}%. To resolve this quantitative performance gap, we recommend immediate weekend remedial coaching sessions, increased frequency of topic-specific study tests, and specialized peer-to-peer mentoring.

Additionally, there are currently ${stats.atRiskCount} candidate(s) categorized under the At-Risk or Division U warning category. A dedicated studies directive has been established to support these individual pupils through targeted homework clubs and weekly studies counseling.`;
  }, [selectedCohortClass, selectedTerm, selectedYear, stats, radarChartData]);

  const handlePrintManagementReport = () => {
    setIsPrintingManagementReport(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        setIsPrintingManagementReport(false);
      }, 300);
    }, 150);
  };

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
        <div className="flex items-center gap-3">
          <AshinagaLogo size={50} className="shrink-0 bg-white p-1 rounded-xl shadow-xs border border-slate-100" />
          <div>
            <h1 className="font-display text-2xl font-black text-slate-800 flex items-center gap-2">
              Academic Analytics &amp; PLE Projections
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Predictive UNEB division modeling based on terminal assessments and gap diagnosis
            </p>
          </div>
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
            onClick={() => setShowManagementReportModal(true)}
            className="p-2.5 bg-[#0b2d59] hover:bg-[#123e75] text-white rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-md"
            title="Generate Formatted Management PDF Report"
          >
            <FileText className="h-4 w-4 text-amber-400" />
            <span>Management PDF Report</span>
          </button>

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
                                alert(`ACADEMIC ADVISORY NOTE DRAFT (Local Reference)\n\nGuardian Name: ${p.student.guardianName}\nContact Number: ${p.student.guardianContact}\nPupil Name: ${p.student.surname} ${p.student.otherNames}\n\nDraft Recommendation:\n"${text}"\n\nThis offline advisory note is designed to guide teachers during in-person guardian meetings or remedial support plan design.`);
                              }}
                              className="px-2 py-1.25 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                              title="Generate offline advisory note for the guardian"
                            >
                              <BookOpen className="h-3 w-3 text-amber-600" />
                              <span>Advisory Note</span>
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

      {/* -------------------- MANAGEMENT REPORT MODAL & PRINT CONFIG -------------------- */}
      
      {/* Dynamic Style block for printing ONLY the management report */}
      {isPrintingManagementReport && (
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body * {
              visibility: hidden !important;
            }
            #management-report-print-area, #management-report-print-area * {
              visibility: visible !important;
            }
            #management-report-print-area {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              display: block !important;
              background: white !important;
              color: black !important;
              padding: 0 !important;
              margin: 0 !important;
            }
          }
        ` }} />
      )}

      {/* Actual Hidden/Printable Management Report Canvas */}
      <div id="management-report-print-area" className="hidden print:block bg-white text-slate-900 p-10 min-h-screen font-sans">
        {/* Header Badge */}
        <div className="border-b-4 border-slate-900 pb-4 text-center">
          <div className="flex justify-between items-start">
            <div className="text-left">
              <h2 className="text-xl font-display font-black text-slate-900 uppercase">ASHINAGA UGANDA RAINBOW HOUSE</h2>
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Nansana Learning Center & Studies Directorate</p>
              <p className="text-[9px] text-slate-500 mt-0.5">PO Box 11202, Kampala Uganda | info@ashinaga-rainbow.org</p>
            </div>
            <div className="text-right text-[10px] font-bold font-mono text-slate-600">
              <p>DATE: {new Date().toLocaleDateString('en-GB')}</p>
              <p>REF NO: ASH-PLE-MGT-{selectedCohortClass.replace('.', '')}-{selectedTerm}</p>
            </div>
          </div>
        </div>

        {/* Report Title */}
        <div className="my-6 text-center">
          <h1 className="text-sm font-extrabold uppercase tracking-wide text-slate-950 font-display">
            {reportTitle}
          </h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">
            COHORT: {selectedCohortClass} Candidates | Term: Term {selectedTerm}, {selectedYear} | Audited: {stats.completeCount} Pupils
          </p>
        </div>

        {/* Section 1: Executive Summary */}
        <div className="space-y-2 mb-6">
          <h3 className="text-xs font-bold text-slate-900 uppercase border-b border-slate-200 pb-1">I. Executive Summary &amp; Directives</h3>
          <p className="text-[11px] text-slate-800 leading-relaxed whitespace-pre-wrap">
            {customCommentary || dynamicDefaultCommentary}
          </p>
        </div>

        {/* Section 2: Stats Grid */}
        {includeStats && (
          <div className="mb-6 space-y-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase border-b border-slate-200 pb-1">II. UNEB Division Performance Model</h3>
            <div className="grid grid-cols-5 gap-3 pt-1 text-center">
              <div className="border border-slate-200 p-2.5 rounded-lg">
                <span className="text-[8px] text-slate-400 font-extrabold uppercase">Expected Div I</span>
                <strong className="text-base font-black text-slate-800 block mt-0.5">{stats.div1Rate}%</strong>
                <span className="text-[8px] text-slate-400 block mt-0.5">({stats.div1} pupils)</span>
              </div>
              <div className="border border-slate-200 p-2.5 rounded-lg">
                <span className="text-[8px] text-slate-400 font-extrabold uppercase">Expected Div II</span>
                <strong className="text-base font-black text-slate-800 block mt-0.5">
                  {stats.completeCount > 0 ? Math.round((stats.div2 / stats.completeCount) * 100) : 0}%
                </strong>
                <span className="text-[8px] text-slate-400 block mt-0.5">({stats.div2} pupils)</span>
              </div>
              <div className="border border-slate-200 p-2.5 rounded-lg">
                <span className="text-[8px] text-slate-400 font-extrabold uppercase">Expected Div III</span>
                <strong className="text-base font-black text-slate-800 block mt-0.5">
                  {stats.completeCount > 0 ? Math.round((stats.div3 / stats.completeCount) * 100) : 0}%
                </strong>
                <span className="text-[8px] text-slate-400 block mt-0.5">({stats.div3} pupils)</span>
              </div>
              <div className="border border-slate-200 p-2.5 rounded-lg">
                <span className="text-[8px] text-slate-400 font-extrabold uppercase">Expected Div IV</span>
                <strong className="text-base font-black text-slate-800 block mt-0.5">
                  {stats.completeCount > 0 ? Math.round((stats.div4 / stats.completeCount) * 100) : 0}%
                </strong>
                <span className="text-[8px] text-slate-400 block mt-0.5">({stats.div4} pupils)</span>
              </div>
              <div className="border border-slate-200 p-2.5 rounded-lg">
                <span className="text-[8px] text-slate-400 font-extrabold uppercase">Expected Div U</span>
                <strong className="text-base font-black text-red-600 block mt-0.5">
                  {stats.completeCount > 0 ? Math.round((stats.divU / stats.completeCount) * 100) : 0}%
                </strong>
                <span className="text-[8px] text-slate-400 block mt-0.5">({stats.divU} pupils)</span>
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Subject Gaps */}
        {includeSubjectGaps && (
          <div className="mb-6 space-y-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase border-b border-slate-200 pb-1">III. Subject-by-Subject Gap Diagnosis</h3>
            <div className="grid grid-cols-2 gap-4 pt-1">
              <table className="w-full text-left text-[10px]">
                <thead>
                  <tr className="border-b border-slate-200 font-bold uppercase text-slate-500">
                    <th className="pb-1">Core Subject</th>
                    <th className="pb-1 text-center">Cohort Average</th>
                    <th className="pb-1 text-center">Failed Candidates</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {Object.keys(stats.subjectAverages).map((sub) => {
                    const data = (stats.subjectAverages as any)[sub];
                    if (!data || (sub === 'Religious Education' && useSstReAveraging)) return null;
                    return (
                      <tr key={sub}>
                        <td className="py-1">{sub}</td>
                        <td className="py-1 text-center font-bold text-slate-900">{data.avg}%</td>
                        <td className="py-1 text-center text-red-600">{data.failCount} failed</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[10px] text-slate-600 leading-relaxed self-center">
                <strong className="text-slate-850 font-bold uppercase block mb-1">Primary Academic Deficit</strong>
                {radarChartData.length > 0 ? (
                  <span>
                    Our studies register pinpoints <span className="font-bold text-indigo-700">{radarChartData.reduce((prev, curr) => prev.average < curr.average ? prev : curr).subject}</span> as the primary bottleneck with a cohort average of <span className="font-bold">{radarChartData.reduce((prev, curr) => prev.average < curr.average ? prev : curr).average}%</span>. Action directives should focus resources on boosting quantitative competency in this domain prior to official UNEB examinations.
                  </span>
                ) : (
                  'Insufficient subject average data.'
                )}
              </div>
            </div>
          </div>
        )}

        {/* Section 4: Gender breakdown */}
        {includeGenderBreakdown && (
          <div className="mb-6 space-y-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase border-b border-slate-200 pb-1">IV. Demographics &amp; Gender Performance Equity</h3>
            <div className="grid grid-cols-2 gap-4 text-[10px] pt-1">
              <div className="border border-slate-200 p-2 rounded-lg flex justify-between items-center">
                <div>
                  <span className="font-bold text-blue-600 block">Male Candidate Demographics</span>
                  <span className="text-slate-500">{stats.genderBreakdown.Male.total} Pupils | Avg Aggregate: {stats.genderBreakdown.Male.avgAgg || '--'}</span>
                </div>
                <span className="font-bold text-slate-850 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{stats.genderBreakdown.Male.div1Rate}% Div I</span>
              </div>
              <div className="border border-slate-200 p-2 rounded-lg flex justify-between items-center">
                <div>
                  <span className="font-bold text-pink-600 block">Female Candidate Demographics</span>
                  <span className="text-slate-500">{stats.genderBreakdown.Female.total} Pupils | Avg Aggregate: {stats.genderBreakdown.Female.avgAgg || '--'}</span>
                </div>
                <span className="font-bold text-slate-850 bg-pink-50 px-2 py-0.5 rounded border border-pink-100">{stats.genderBreakdown.Female.div1Rate}% Div I</span>
              </div>
            </div>
          </div>
        )}

        {/* Section 5: At-Risk */}
        {includeAtRiskList && (
          <div className="mb-6 space-y-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase border-b border-slate-200 pb-1">V. Priority Intervention Cohort (At-Risk / Borderline Candidates)</h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-[9px] border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-slate-500">
                    <th className="px-3 py-1.5">Pupil Profile</th>
                    <th className="px-3 py-1.5 text-center">Projected Div</th>
                    <th className="px-3 py-1.5 text-center">Aggregate</th>
                    <th className="px-3 py-1.5 text-center">Weakest Domain</th>
                    <th className="px-3 py-1.5 text-right">Guardian Emergency Contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {cohortProjections
                    .filter(p => p.isComplete && (p.readiness === 'At Risk' || p.readiness === 'Marginal'))
                    .map((p) => {
                      const weakest = getWeakestSubject(p.scores);
                      return (
                        <tr key={p.student.id}>
                          <td className="px-3 py-1 font-bold text-slate-800 uppercase">
                            {p.student.surname} {p.student.otherNames}
                          </td>
                          <td className="px-3 py-1 text-center font-bold text-amber-700">
                            {p.division}
                          </td>
                          <td className="px-3 py-1 text-center font-mono font-bold">
                            {p.aggregate}
                          </td>
                          <td className="px-3 py-1 text-center font-semibold text-slate-500">
                            {weakest}
                          </td>
                          <td className="px-3 py-1 text-right font-mono">
                            {p.student.guardianContact || '+256 702 445588'}
                          </td>
                        </tr>
                      );
                    })}
                  {cohortProjections.filter(p => p.isComplete && (p.readiness === 'At Risk' || p.readiness === 'Marginal')).length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center text-slate-400 italic">
                        Excellent! No borderline or at-risk pupils detected in this cohort projection.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Section 6: Full Ledger */}
        {includeFullLedger && (
          <div className="mb-6 space-y-2" style={{ pageBreakBefore: 'always' }}>
            <h3 className="text-xs font-bold text-slate-900 uppercase border-b border-slate-200 pb-1">VI. Detailed Candidate Ledger</h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-[9px] border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-slate-500">
                    <th className="px-3 py-1.5">Pupil Profile</th>
                    <th className="px-3 py-1.5 text-center">MATH</th>
                    <th className="px-3 py-1.5 text-center">ENG</th>
                    <th className="px-3 py-1.5 text-center">SCI</th>
                    <th className="px-3 py-1.5 text-center">SST</th>
                    <th className="px-3 py-1.5 text-center">Agg</th>
                    <th className="px-3 py-1.5 text-right">Projected Division</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {cohortProjections.map((p) => (
                    <tr key={p.student.id}>
                      <td className="px-3 py-1 font-bold text-slate-800 uppercase">
                        {p.student.surname} {p.student.otherNames}
                      </td>
                      <td className="px-3 py-1 text-center font-mono">{p.scores['Mathematics'] !== undefined ? `${p.scores['Mathematics']}%` : '--'}</td>
                      <td className="px-3 py-1 text-center font-mono">{p.scores['English'] !== undefined ? `${p.scores['English']}%` : '--'}</td>
                      <td className="px-3 py-1 text-center font-mono">{p.scores['Science'] !== undefined ? `${p.scores['Science']}%` : '--'}</td>
                      <td className="px-3 py-1 text-center font-mono">{p.scores['Social Studies'] !== undefined ? `${p.scores['Social Studies']}%` : '--'}</td>
                      <td className="px-3 py-1 text-center font-mono font-bold text-slate-800">{p.isComplete ? p.aggregate : '--'}</td>
                      <td className="px-3 py-1 text-right font-bold font-mono">
                        {p.isComplete ? p.division : 'Incomplete'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Signatures */}
        <div className="mt-12 pt-6 border-t border-slate-200 flex justify-between items-end">
          <div className="text-left">
            <p className="text-[8px] text-slate-400 font-mono uppercase font-black">Authenticated Management Review</p>
            <p className="text-[9px] text-slate-700 font-bold uppercase mt-1">EMIS Sync ID: ASH-PLE-REFORM-{selectedCohortClass.replace('.', '')}</p>
          </div>

          <div className="text-right">
            <p className="font-serif italic text-slate-500 pr-2 font-black" style={{ fontSize: '18px' }}>
              {signatureName.split(' ')[0]} {signatureName.split(' ')[1] || ''}
            </p>
            <div className="w-48 h-0.5 bg-slate-900 mt-1" />
            <p className="text-[10px] font-extrabold text-slate-900 uppercase mt-1 leading-none">{signatureName}</p>
            <p className="text-[8px] text-slate-500 font-medium leading-none mt-1">{signatureTitle}</p>
          </div>
        </div>
      </div>

      {/* Interactive WYSIWYG Management Report Modal Dialog */}
      <AnimatePresence>
        {showManagementReportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm no-print">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-6xl h-[92vh] bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-150 flex flex-col md:flex-row"
            >
              {/* Left Configurator Board (w-5/12) */}
              <div className="md:w-5/12 bg-slate-50 p-6 flex flex-col justify-between overflow-y-auto border-r border-slate-200">
                <div className="space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-[#0b2d59] text-white rounded-xl">
                        <FileText className="h-5 w-5 text-amber-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Report Architect</h3>
                        <p className="text-[10px] text-slate-400 font-medium">Custom Management PDF Report</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowManagementReportModal(false)}
                      className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-full transition-all cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Input Fields */}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Document Main Title</label>
                      <input
                        type="text"
                        value={reportTitle}
                        onChange={(e) => setReportTitle(e.target.value)}
                        placeholder="Report Main Title"
                        className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Signee Name</label>
                        <input
                          type="text"
                          value={signatureName}
                          onChange={(e) => setSignatureName(e.target.value)}
                          placeholder="Presenter name"
                          className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Signee Title</label>
                        <input
                          type="text"
                          value={signatureTitle}
                          onChange={(e) => setSignatureTitle(e.target.value)}
                          placeholder="Presenter title"
                          className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Management Directives &amp; Commentary</label>
                        <button
                          onClick={() => setCustomCommentary('')}
                          className="text-[9px] font-extrabold text-indigo-600 hover:underline uppercase cursor-pointer"
                        >
                          Reset Default
                        </button>
                      </div>
                      <textarea
                        rows={7}
                        value={customCommentary || dynamicDefaultCommentary}
                        onChange={(e) => setCustomCommentary(e.target.value)}
                        placeholder="Write custom school board remarks or management plans..."
                        className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 focus:outline-none resize-none font-sans"
                      />
                    </div>
                  </div>

                  {/* Section Toggles */}
                  <div className="space-y-2 pt-3 border-t border-slate-200">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inclusion Layout Controls</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex items-center gap-2 bg-white px-3 py-2 border border-slate-150 rounded-xl text-[11px] font-bold text-slate-700 cursor-pointer hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={includeStats}
                          onChange={(e) => setIncludeStats(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                        />
                        <span>Stats Panel</span>
                      </label>
                      <label className="flex items-center gap-2 bg-white px-3 py-2 border border-slate-150 rounded-xl text-[11px] font-bold text-slate-700 cursor-pointer hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={includeSubjectGaps}
                          onChange={(e) => setIncludeSubjectGaps(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                        />
                        <span>Gap Diagnosis</span>
                      </label>
                      <label className="flex items-center gap-2 bg-white px-3 py-2 border border-slate-150 rounded-xl text-[11px] font-bold text-slate-700 cursor-pointer hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={includeGenderBreakdown}
                          onChange={(e) => setIncludeGenderBreakdown(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                        />
                        <span>Gender Breakdown</span>
                      </label>
                      <label className="flex items-center gap-2 bg-white px-3 py-2 border border-slate-150 rounded-xl text-[11px] font-bold text-slate-700 cursor-pointer hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={includeAtRiskList}
                          onChange={(e) => setIncludeAtRiskList(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                        />
                        <span>Priority At-Risk</span>
                      </label>
                      <label className="col-span-2 flex items-center gap-2 bg-white px-3 py-2 border border-slate-150 rounded-xl text-[11px] font-bold text-slate-700 cursor-pointer hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={includeFullLedger}
                          onChange={(e) => setIncludeFullLedger(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                        />
                        <span>Detailed Candidate Ledger (A4 Appendices)</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Print Dispatch Buttons */}
                <div className="space-y-2 pt-4 border-t border-slate-200">
                  <button
                    onClick={handlePrintManagementReport}
                    className="w-full py-3 bg-[#0b2d59] hover:bg-[#153f75] text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                  >
                    <Download className="h-4 w-4 text-amber-400" />
                    <span>Export &amp; Print PDF</span>
                  </button>
                  <button
                    onClick={() => setShowManagementReportModal(false)}
                    className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-600 font-extrabold rounded-xl text-xs uppercase cursor-pointer"
                  >
                    Discard Changes
                  </button>
                </div>
              </div>

              {/* Right WYSIWYG A4 Preview Board (w-7/12) */}
              <div className="md:w-7/12 bg-slate-100 p-8 flex justify-center overflow-y-auto">
                <div className="w-[100%] max-w-[210mm] bg-white shadow-xl p-8 border border-slate-200 text-slate-900 rounded-sm font-sans flex flex-col justify-between" style={{ minHeight: '297mm' }}>
                  
                  {/* Preview Content Inside Sheet */}
                  <div>
                    {/* Header */}
                    <div className="border-b-2 border-slate-900 pb-3 text-center">
                      <div className="flex justify-between items-start">
                        <div className="text-left">
                          <h2 className="text-sm font-display font-black text-slate-900 uppercase">ASHINAGA UGANDA RAINBOW HOUSE</h2>
                          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Nansana Learning Center & Studies Directorate</p>
                          <p className="text-[7px] text-slate-400 mt-0.5">PO Box 11202, Kampala Uganda | info@ashinaga-rainbow.org</p>
                        </div>
                        <div className="text-right text-[8px] font-bold font-mono text-slate-500">
                          <p>DATE: {new Date().toLocaleDateString('en-GB')}</p>
                          <p>REF NO: ASH-PLE-MGT-{selectedCohortClass.replace('.', '')}-{selectedTerm}</p>
                        </div>
                      </div>
                    </div>

                    {/* Title */}
                    <div className="my-4 text-center">
                      <h1 className="text-xs font-black uppercase tracking-wide text-slate-950 font-display">
                        {reportTitle || 'PRIMARY LEAVING EXAMINATION (PLE) SUMMARY FORECAST'}
                      </h1>
                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                        COHORT: {selectedCohortClass} Candidates | Term: Term {selectedTerm}, {selectedYear} | Audited: {stats.completeCount} Pupils
                      </p>
                    </div>

                    {/* Executive Summary Section */}
                    <div className="space-y-1 mb-4">
                      <h3 className="text-[10px] font-black text-slate-900 uppercase border-b border-slate-150 pb-0.5">I. Executive Summary &amp; Directives</h3>
                      <p className="text-[9px] text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {customCommentary || dynamicDefaultCommentary}
                      </p>
                    </div>

                    {/* UNEB division stats */}
                    {includeStats && (
                      <div className="mb-4 space-y-1">
                        <h3 className="text-[10px] font-black text-slate-900 uppercase border-b border-slate-150 pb-0.5">II. UNEB Division Performance Model</h3>
                        <div className="grid grid-cols-5 gap-2 pt-0.5 text-center">
                          <div className="border border-slate-150 p-1.5 rounded-md">
                            <span className="text-[7px] text-slate-400 font-black uppercase block leading-none">Expected Div I</span>
                            <strong className="text-xs font-black text-slate-800 block mt-0.5">{stats.div1Rate}%</strong>
                            <span className="text-[7px] text-slate-400 block mt-0.5">({stats.div1} pupils)</span>
                          </div>
                          <div className="border border-slate-150 p-1.5 rounded-md">
                            <span className="text-[7px] text-slate-400 font-black uppercase block leading-none">Expected Div II</span>
                            <strong className="text-xs font-black text-slate-800 block mt-0.5">
                              {stats.completeCount > 0 ? Math.round((stats.div2 / stats.completeCount) * 100) : 0}%
                            </strong>
                            <span className="text-[7px] text-slate-400 block mt-0.5">({stats.div2} pupils)</span>
                          </div>
                          <div className="border border-slate-150 p-1.5 rounded-md">
                            <span className="text-[7px] text-slate-400 font-black uppercase block leading-none">Expected Div III</span>
                            <strong className="text-xs font-black text-slate-800 block mt-0.5">
                              {stats.completeCount > 0 ? Math.round((stats.div3 / stats.completeCount) * 100) : 0}%
                            </strong>
                            <span className="text-[7px] text-slate-400 block mt-0.5">({stats.div3} pupils)</span>
                          </div>
                          <div className="border border-slate-150 p-1.5 rounded-md">
                            <span className="text-[7px] text-slate-400 font-black uppercase block leading-none">Expected Div IV</span>
                            <strong className="text-xs font-black text-slate-800 block mt-0.5">
                              {stats.completeCount > 0 ? Math.round((stats.div4 / stats.completeCount) * 100) : 0}%
                            </strong>
                            <span className="text-[7px] text-slate-400 block mt-0.5">({stats.div4} pupils)</span>
                          </div>
                          <div className="border border-slate-150 p-1.5 rounded-md">
                            <span className="text-[7px] text-slate-400 font-black uppercase block leading-none">Expected Div U</span>
                            <strong className="text-xs font-black text-red-600 block mt-0.5">
                              {stats.completeCount > 0 ? Math.round((stats.divU / stats.completeCount) * 100) : 0}%
                            </strong>
                            <span className="text-[7px] text-slate-400 block mt-0.5">({stats.divU} pupils)</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Subject gap */}
                    {includeSubjectGaps && (
                      <div className="mb-4 space-y-1">
                        <h3 className="text-[10px] font-black text-slate-900 uppercase border-b border-slate-150 pb-0.5">III. Subject-by-Subject Gap Diagnosis</h3>
                        <div className="grid grid-cols-2 gap-3 pt-0.5">
                          <table className="w-full text-left text-[8px]">
                            <thead>
                              <tr className="border-b border-slate-200 font-bold uppercase text-slate-400">
                                <th className="pb-0.5">Subject</th>
                                <th className="pb-0.5 text-center">Avg Score</th>
                                <th className="pb-0.5 text-center">Failures</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                              {Object.keys(stats.subjectAverages).map((sub) => {
                                const data = (stats.subjectAverages as any)[sub];
                                if (!data || (sub === 'Religious Education' && useSstReAveraging)) return null;
                                return (
                                  <tr key={sub}>
                                    <td className="py-0.5">{sub}</td>
                                    <td className="py-0.5 text-center font-bold text-slate-800">{data.avg}%</td>
                                    <td className="py-0.5 text-center text-red-600">{data.failCount} fail(s)</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>

                          <div className="bg-slate-50 border border-slate-150 rounded-md p-2 text-[8px] text-slate-500 leading-normal">
                            <strong className="text-slate-880 font-bold uppercase block mb-0.5">Academic Deficit Memo</strong>
                            {radarChartData.length > 0 ? (
                              <span>
                                Key metrics highlight <span className="font-bold text-indigo-700">{radarChartData.reduce((prev, curr) => prev.average < curr.average ? prev : curr).subject}</span> as the primary bottleneck averaging <span className="font-bold">{radarChartData.reduce((prev, curr) => prev.average < curr.average ? prev : curr).average}%</span>. Interventions should prioritize quantitative competency prior to UNEB assessments.
                              </span>
                            ) : (
                              'No bottleneck detected.'
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Gender Equity */}
                    {includeGenderBreakdown && (
                      <div className="mb-4 space-y-1">
                        <h3 className="text-[10px] font-black text-slate-900 uppercase border-b border-slate-150 pb-0.5">IV. Demographics &amp; Gender Performance Equity</h3>
                        <div className="grid grid-cols-2 gap-2 text-[8px] pt-0.5">
                          <div className="border border-slate-150 p-1.5 rounded-md flex justify-between items-center">
                            <div>
                              <span className="font-bold text-blue-600 block">Boys ({stats.genderBreakdown.Male.total})</span>
                              <span className="text-slate-400">Avg Aggregate: {stats.genderBreakdown.Male.avgAgg || '--'}</span>
                            </div>
                            <span className="font-bold text-slate-700 bg-blue-50 px-1.5 py-0.25 rounded border border-blue-100">{stats.genderBreakdown.Male.div1Rate}% Div I</span>
                          </div>
                          <div className="border border-slate-150 p-1.5 rounded-md flex justify-between items-center">
                            <div>
                              <span className="font-bold text-pink-600 block">Girls ({stats.genderBreakdown.Female.total})</span>
                              <span className="text-slate-400">Avg Aggregate: {stats.genderBreakdown.Female.avgAgg || '--'}</span>
                            </div>
                            <span className="font-bold text-slate-700 bg-pink-50 px-1.5 py-0.25 rounded border border-pink-100">{stats.genderBreakdown.Female.div1Rate}% Div I</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* At Risk List */}
                    {includeAtRiskList && (
                      <div className="mb-4 space-y-1">
                        <h3 className="text-[10px] font-black text-slate-900 uppercase border-b border-slate-150 pb-0.5">V. Priority Intervention Cohort (At-Risk / Borderline Pupils)</h3>
                        <div className="border border-slate-150 rounded-md overflow-hidden">
                          <table className="w-full text-left text-[8px] border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-150 font-bold uppercase text-slate-400">
                                <th className="px-2 py-1">Pupil Name</th>
                                <th className="px-2 py-1 text-center">Projected Div</th>
                                <th className="px-2 py-1 text-center">Aggregate</th>
                                <th className="px-2 py-1 text-center">Weakest Domain</th>
                                <th className="px-2 py-1 text-right">Guardian Contact</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                              {cohortProjections
                                .filter(p => p.isComplete && (p.readiness === 'At Risk' || p.readiness === 'Marginal'))
                                .slice(0, 8)
                                .map((p) => {
                                  const weakest = getWeakestSubject(p.scores);
                                  return (
                                    <tr key={p.student.id}>
                                      <td className="px-2 py-0.5 font-bold text-slate-800 uppercase">{p.student.surname} {p.student.otherNames}</td>
                                      <td className="px-2 py-0.5 text-center font-bold text-amber-700">{p.division}</td>
                                      <td className="px-2 py-0.5 text-center font-mono font-bold">{p.aggregate}</td>
                                      <td className="px-2 py-0.5 text-center">{weakest}</td>
                                      <td className="px-2 py-0.5 text-right font-mono">{p.student.guardianContact || '+256 702 445588'}</td>
                                    </tr>
                                  );
                                })}
                              {cohortProjections.filter(p => p.isComplete && (p.readiness === 'At Risk' || p.readiness === 'Marginal')).length === 0 && (
                                <tr>
                                  <td colSpan={5} className="px-2 py-2 text-center text-slate-400 italic">No borderline or critical pupils found.</td>
                                </tr>
                              )}
                              {cohortProjections.filter(p => p.isComplete && (p.readiness === 'At Risk' || p.readiness === 'Marginal')).length > 8 && (
                                <tr>
                                  <td colSpan={5} className="px-2 py-1 text-center text-[7px] text-slate-400 italic bg-slate-50">
                                    * Showing first 8 records in active preview. All {cohortProjections.filter(p => p.isComplete && (p.readiness === 'At Risk' || p.readiness === 'Marginal')).length} records will print.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Detailed candidate ledger warning/info */}
                    {includeFullLedger && (
                      <div className="p-2 border border-dashed border-slate-300 rounded-md bg-indigo-50/50 flex items-center gap-1.5 text-[8px] text-slate-600">
                        <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                        <span><strong>Ledger Appendix Enabled:</strong> The complete candidate listing containing all {cohortProjections.length} student scores, aggregates, and division placements has been appended to the final printable document (will format automatically onto separate sheets).</span>
                      </div>
                    )}
                  </div>

                  {/* Signatures */}
                  <div className="pt-3 border-t border-slate-200 flex justify-between items-end mt-4">
                    <div className="text-left">
                      <p className="text-[6px] text-slate-400 font-mono uppercase font-black">Authorized Record Node</p>
                      <p className="text-[7px] text-slate-600 font-bold uppercase mt-0.5">REF: ASH-PLE-MGT-{selectedCohortClass.replace('.', '')}</p>
                    </div>

                    <div className="text-right">
                      <div className="w-36 h-0.25 bg-slate-800" />
                      <p className="text-[8px] font-extrabold text-slate-900 uppercase mt-1 leading-none">{signatureName}</p>
                      <p className="text-[7px] text-slate-400 font-medium leading-none mt-0.5">{signatureTitle}</p>
                    </div>
                  </div>

                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
