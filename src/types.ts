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
  communityWorker: string;
  workerContact: string;
  zoneInNansana: string;
  hasScholarship: boolean;
  
  // Computed fields (optional to send/receive, can be calculated on fly)
  currentAge?: number;
  ageAtEntry?: number;
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

export type TeacherRole = 'Headteacher' | 'DOS' | 'Subject Teacher';

export interface Teacher {
  username: string;
  name: string;
  email?: string;
  role?: TeacherRole;
  subjects: string[];
  classes: ClassName[];
  activeTerms?: (1 | 2 | 3)[];
  authToken?: string;
}

export interface Subject {
  id: string;
  name: string;
}

export interface GradeResult {
  grade: 'D1' | 'D2' | 'C3' | 'C4' | 'C5' | 'C6' | 'P7' | 'P8' | 'F9';
  remark: string;
}
