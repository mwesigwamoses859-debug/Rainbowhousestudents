/**
 * Types for the Student Management System (SMS)
 */

export type ClassName = 'P.1' | 'P.2' | 'P.3' | 'P.4' | 'P.5' | 'P.6' | 'P.7';

export type Gender = 'Male' | 'Female';

export interface Student {
  id: string;
  surname: string;
  otherNames: string;
  gender: Gender;
  dateOfBirth: string; // YYYY-MM-DD
  className: ClassName;
  yearOfEntry: number;
  photo: string; // Base64 data URI or placeholder URL
  guardianName: string;
  guardianContact: string;
  guardianRelationship?: string;
  guardianContact2?: string;
  communityWorker: string;
  workerContact: string;
  zoneInNansana: string;
  nextOfKin?: string;
  nextOfKinContact?: string;
  numberInHousehold?: number;
  deceased?: string;
  causeOfDeath?: string;
  school?: string;
  hasScholarship: boolean;
  scholarshipDetails?: string;
  
  // Computed fields (optional to send/receive, can be calculated on fly)
  currentAge?: number;
  ageAtEntry?: number;

  // Historical class attendance tracker across academic years
  classHistory?: Record<number, ClassName>;
}

export type CareRoomGroup = 'Sitting Room' | 'Talking Room' | 'Outside Terakoya' | 'Unassigned';
export type CareMood = 'joyful' | 'peaceful' | 'neutral' | 'sad' | '';

export interface CareSessionAttendee {
  studentId: string;
  studentName?: string;
  className?: string;
  attended: boolean;
  attendedLearning: boolean;
  receivedLunch: boolean;
  participatedPlay: boolean;
  participatedCleaning: boolean;
  roomGroup?: CareRoomGroup;
  surveyCompleted?: boolean;
  checkoutMood?: CareMood;
  departureTime?: string;
  notes?: string;
}

export interface CareSession {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  cohort?: string; // e.g. "Upper primary", "Lower primary", "All primary"
  theme?: string; // e.g. "Responsibility – I Can Be Counted On!"
  facilitator: string; // Community Worker / Teacher in charge
  staffDelegation?: string; // Duty delegation
  learningNotes: string; // What was taught / studied
  lunchMenu: string; // What lunch was served
  playActivities: string; // Games, sports, psychosocial activities
  cleaningDuties: string; // Chores, tidying, hygiene
  evaluationNotes?: string; // 3:45-4:00 PM evaluation meeting feedback & survey observations
  generalNotes?: string;
  status: 'planned' | 'in-progress' | 'completed';
  attendees: CareSessionAttendee[];
  createdAt?: number;
  updatedAt?: number;
}

export interface AcademicYear {
  year: number;
  status: 'planned' | 'active' | 'closed';
  starts_on?: string | null;
  ends_on?: string | null;
  closed_at?: number | null;
  closed_by?: string | null;
  created_at?: number;
  startsOn?: string | null;
  endsOn?: string | null;
}

export interface HistoricalSubjectMark {
  subject: string;
  botScore?: number;
  motScore?: number;
  eotScore?: number;
  finalScore: number;
  gradeCode: string;
  remark: string;
  teacherName?: string;
}

export interface HistoricalReportCard {
  id: string;
  studentId: string;
  academicYear: number;
  term: 1 | 2 | 3;
  className: ClassName;
  totalScore: number;
  averageScore: number;
  division: string;
  aggregates: number;
  rankPosition: number;
  totalPupils: number;
  headTeacherComment?: string;
  classTeacherComment?: string;
  marksSummary: string; // Serialized HistoricalSubjectMark[] JSON string
  finalizedAt: number;
  finalizedBy: string;
  createdAt?: number;
}

export interface AcademicYearArchive {
  id: string;
  year: number;
  status: 'closed';
  closedAt: number;
  closedBy: string;
  totalStudents: number;
  totalReportCards: number;
  snapshotPayload: string; // JSON snapshot
  createdAt: number;
}

export interface Mark {
  id: string;
  studentId: string;
  subject: string;
  botScore?: number; // Beginning of Term mark (0 - 100)
  motScore?: number; // Middle of Term mark (0 - 100)
  eotScore?: number; // End of Term mark (0 - 100)
  score: number;     // Final score / weighted score (0 - 100)
  term: 1 | 2 | 3;
  year: number;
  teacherName: string;
}

export type TeacherRole = 'Headteacher' | 'DOS' | 'Class Teacher' | 'Subject Teacher';

export interface Teacher {
  username: string;
  name: string;
  email?: string;
  role?: TeacherRole;
  responsibility?: string;
  subjects: string[];
  classes: ClassName[];
  activeTerms?: (1 | 2 | 3)[];
  assignments?: TeacherAssignment[];
  mustChangePassword?: boolean;
  authToken?: string;
}

export interface TeacherAssignment {
  className: ClassName;
  subject: string;
  activeTerms: (1 | 2 | 3)[];
}

export interface Subject {
  id: string;
  name: string;
}

export interface GradeResult {
  grade: 'D1' | 'D2' | 'C3' | 'C4' | 'C5' | 'C6' | 'P7' | 'P8' | 'F9';
  remark: string;
}
