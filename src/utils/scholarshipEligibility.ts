import { Student, Mark } from '../types';

export type ScholarshipTier = 'Full Scholarship' | 'Partial Scholarship' | 'Academic Bursary' | 'Not Eligible';

export interface ScholarshipEligibilityResult {
  tier: ScholarshipTier;
  isEligible: boolean;
  averageScore: number;
  aggregate?: number;
  division?: string;
  evaluatedMarksCount: number;
  reason: string;
  badgeLabel: string;
  badgeColor: string;
  recommendedScholarshipDetails: string;
}

/**
 * Calculates subject grade point according to UNEB Primary Standard
 */
export function getUnebGradePoint(score: number): { grade: string; point: number } {
  if (score >= 80) return { grade: 'D1', point: 1 };
  if (score >= 75) return { grade: 'D2', point: 2 };
  if (score >= 70) return { grade: 'C3', point: 3 };
  if (score >= 65) return { grade: 'C4', point: 4 };
  if (score >= 60) return { grade: 'C5', point: 5 };
  if (score >= 55) return { grade: 'C6', point: 6 };
  if (score >= 50) return { grade: 'P7', point: 7 };
  if (score >= 45) return { grade: 'P8', point: 8 };
  return { grade: 'F9', point: 9 };
}

/**
 * Evaluates scholarship eligibility based on student's assessment marks
 */
export function evaluateScholarshipEligibility(
  student: Student,
  allMarks: Mark[]
): ScholarshipEligibilityResult {
  // Filter marks for this student
  const studentMarks = allMarks.filter((m) => m.studentId === student.id && typeof m.score === 'number' && !isNaN(m.score));

  if (studentMarks.length === 0) {
    return {
      tier: 'Not Eligible',
      isEligible: false,
      averageScore: 0,
      evaluatedMarksCount: 0,
      reason: 'No assessment marks recorded for this pupil yet.',
      badgeLabel: 'No Marks Recorded',
      badgeColor: 'bg-slate-100 text-slate-500 border-slate-200',
      recommendedScholarshipDetails: ''
    };
  }

  // Calculate average score percentage
  const totalScore = studentMarks.reduce((sum, m) => sum + m.score, 0);
  const averageScore = Number((totalScore / studentMarks.length).toFixed(1));

  // Compute aggregate if core subjects present
  const coreSubjects = ['Mathematics', 'English', 'Science', 'Social Studies'];
  const coreMarks = studentMarks.filter((m) =>
    coreSubjects.some((cs) => m.subject.toLowerCase().includes(cs.toLowerCase()))
  );

  let aggregate: number | undefined;
  let division: string | undefined;

  if (coreMarks.length >= 3) {
    aggregate = coreMarks.reduce((sum, m) => sum + getUnebGradePoint(m.score).point, 0);
    if (aggregate <= 12) division = 'Division I';
    else if (aggregate <= 24) division = 'Division II';
    else if (aggregate <= 28) division = 'Division III';
    else if (aggregate <= 32) division = 'Division IV';
    else division = 'Division U';
  }

  // Scholarship Tier evaluation thresholds
  // 1. Full Scholarship: Avg >= 80% or Aggregate <= 8
  // 2. Partial Scholarship: Avg >= 70% or Aggregate <= 12
  // 3. Academic Bursary: Avg >= 60% or Aggregate <= 16
  // 4. Not Eligible: Avg < 60%

  if (averageScore >= 80 || (aggregate !== undefined && aggregate <= 8)) {
    return {
      tier: 'Full Scholarship',
      isEligible: true,
      averageScore,
      aggregate,
      division,
      evaluatedMarksCount: studentMarks.length,
      reason: `Outstanding academic performance with ${averageScore}% average${aggregate ? ` (PLE Aggregate ${aggregate}, ${division})` : ''}. Qualifies for 100% Full Tuition & Scholastic Sponsorship.`,
      badgeLabel: '🎓 Full Scholar Eligible',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      recommendedScholarshipDetails: 'Full Merit Scholarship: 100% Tuition, Examination fees, uniform, and daily lunch covered.'
    };
  }

  if (averageScore >= 70 || (aggregate !== undefined && aggregate <= 12)) {
    return {
      tier: 'Partial Scholarship',
      isEligible: true,
      averageScore,
      aggregate,
      division,
      evaluatedMarksCount: studentMarks.length,
      reason: `Strong academic performance with ${averageScore}% average${aggregate ? ` (PLE Aggregate ${aggregate}, ${division})` : ''}. Qualifies for 50% Tuition Subsidy.`,
      badgeLabel: '🌤️ Partial Scholar Eligible',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
      recommendedScholarshipDetails: 'Partial Academic Grant: 50% Tuition support & textbook allocations.'
    };
  }

  if (averageScore >= 60 || (aggregate !== undefined && aggregate <= 16)) {
    return {
      tier: 'Academic Bursary',
      isEligible: true,
      averageScore,
      aggregate,
      division,
      evaluatedMarksCount: studentMarks.length,
      reason: `Good academic standard with ${averageScore}% average${aggregate ? ` (PLE Aggregate ${aggregate}, ${division})` : ''}. Qualifies for Scholastic Book & Exam Fee Support.`,
      badgeLabel: '📚 Academic Bursary Eligible',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      recommendedScholarshipDetails: 'Academic Bursary: Examination & scholastic book grant support.'
    };
  }

  return {
    tier: 'Not Eligible',
    isEligible: false,
    averageScore,
    aggregate,
    division,
    evaluatedMarksCount: studentMarks.length,
    reason: `Current average is ${averageScore}%${aggregate ? ` (Aggregate ${aggregate})` : ''}. Minimum 60% average (or Aggregate 16 or better) required to qualify for academic scholarship support.`,
    badgeLabel: 'Not Eligible (<60%)',
    badgeColor: 'bg-slate-100 text-slate-600 border-slate-200',
    recommendedScholarshipDetails: ''
  };
}
