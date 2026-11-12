export type Answer = "" | "Yes" | "No" | "Unknown";
export type EducationLevel =
  | "Primary"
  | "Secondary"
  | "University"
  | "Vocational"
  | "Out of school"
  | "Completed";
export interface GeneralStudent {
  id: string;
  registrationNumber: string;
  revision: number;
  schoolStudentId?: string;
  surname: string;
  otherNames: string;
  gender: string;
  dateOfBirth: string;
  tribe: string;
  parish: string;
  zone: string;
  communityWorker: string;
  workerContact: string;
  guardianName: string;
  guardianRelationship: string;
  guardianContact: string;
  guardianContact2: string;
  nextOfKin: string;
  nextOfKinRelationship: string;
  nextOfKinContact: string;
  numberInHousehold: string;
  inSchool: Answer;
  school: string;
  educationLevel: EducationLevel;
  grade: string;
  lastClassAttended: string;
  outOfSchoolReason: string;
  studentConcerns: string;
  motherDeceased: Answer;
  motherCauseOfDeath: string;
  fatherDeceased: Answer;
  fatherCauseOfDeath: string;
  hivStatusKnown: Answer;
  hivDetails: string;
  survivingParentHivStatus: string;
  survivingParentHealth: string;
  householdHead: string;
  householdHeadRelationship: string;
  incomeSource: string;
  otherConditions: string;
  hasSiblings: Answer;
  numberOfSiblings: string;
  livesWithSiblings: Answer;
  siblingsLocation: string;
  familyConcerns: string;
  interviewDate: string;
  interviewer: string;
  orphanVerified: Answer;
  verifiedBy: string;
  officialComments: string;
  intakeType: "New intake" | "Continuing learner";
  intakeReason: string;
  intakeDate: string;
  careEnrolled: boolean;
  active: boolean;
  academicYear: number;
  autoPromote: boolean;
  universityDuration: number;
  transitionReview: boolean;
  progressionHistory?: { year: number; from: string; to: string; at: string }[];
  documentStatus: Record<string, string>;
  photo: string;
  guardianChangeReason?: string;
  updatedAt?: number;
}
export interface GeneralDocument {
  id: string;
  student_id: string;
  category: string;
  name: string;
  mime: string;
  size: number;
  created_at: string;
  uploaded_by: string;
}
export type CarePolicy = "alternate" | "zones" | "invitation" | "weekly";
export interface RegisterSettings {
  carePolicy: CarePolicy;
  autoPromotion: boolean;
  promotionMonth: number;
  promotionDay: number;
}
export interface CareDay {
  id: string;
  date: string;
  title: string;
  zones: string[];
  invitedIds: string[];
  revision: number;
  status: "planned" | "completed";
}
export interface CareAttendance {
  student_id: string;
  date: string;
  status: "Present" | "Absent" | "Excused";
  override_reason: string;
  recorded_by: string;
  updated_at: string;
}
export interface CareRosterRow {
  student: Pick<
    GeneralStudent,
    | "id"
    | "registrationNumber"
    | "surname"
    | "otherNames"
    | "dateOfBirth"
    | "zone"
    | "grade"
    | "educationLevel"
    | "guardianName"
    | "guardianContact"
  >;
  eligible: boolean;
  reason: string;
  invited: boolean;
  attendedDays: number;
  lastAttended: string | null;
  attendance: CareAttendance | null;
}
export interface CareRoster {
  day: CareDay;
  rows: CareRosterRow[];
  policy: CarePolicy;
  nextDate: string;
}
export const DOCUMENT_CATEGORIES = [
  "Birth certificate",
  "Mother’s death certificate",
  "Father’s death certificate",
  "National ID",
  "Community worker form",
  "Student photo",
  "Results",
  "Other document",
] as const;
export const todayInUganda = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Kampala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export function ageOn(birth: string, date = todayInUganda()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birth)) return null;
  const [y, m, d] = birth.split("-").map(Number),
    [yy, mm, dd] = date.split("-").map(Number);
  return yy - y - (mm < m || (mm === m && dd < d) ? 1 : 0);
}
export const fullName = (s: { surname: string; otherNames: string }) =>
  `${s.surname} ${s.otherNames}`.trim();
export const DEFAULT_SETTINGS: RegisterSettings = {
  carePolicy: "alternate",
  autoPromotion: true,
  promotionMonth: 1,
  promotionDay: 1,
};
export const blankStudent = (): GeneralStudent => ({
  id: "",
  registrationNumber: "",
  revision: 0,
  surname: "",
  otherNames: "",
  gender: "",
  dateOfBirth: "",
  tribe: "",
  parish: "",
  zone: "",
  communityWorker: "",
  workerContact: "",
  guardianName: "",
  guardianRelationship: "",
  guardianContact: "",
  guardianContact2: "",
  nextOfKin: "",
  nextOfKinRelationship: "",
  nextOfKinContact: "",
  numberInHousehold: "",
  inSchool: "",
  school: "",
  educationLevel: "Primary",
  grade: "",
  lastClassAttended: "",
  outOfSchoolReason: "",
  studentConcerns: "",
  motherDeceased: "",
  motherCauseOfDeath: "",
  fatherDeceased: "",
  fatherCauseOfDeath: "",
  hivStatusKnown: "",
  hivDetails: "",
  survivingParentHivStatus: "",
  survivingParentHealth: "",
  householdHead: "",
  householdHeadRelationship: "",
  incomeSource: "",
  otherConditions: "",
  hasSiblings: "",
  numberOfSiblings: "",
  livesWithSiblings: "",
  siblingsLocation: "",
  familyConcerns: "",
  interviewDate: "",
  interviewer: "",
  orphanVerified: "",
  verifiedBy: "",
  officialComments: "",
  intakeType: "New intake",
  intakeReason: "",
  intakeDate: todayInUganda(),
  careEnrolled: true,
  active: true,
  academicYear: Number(todayInUganda().slice(0, 4)),
  autoPromote: true,
  universityDuration: 0,
  transitionReview: false,
  documentStatus: {},
  photo: "",
});
export function nextSaturday(date = todayInUganda()) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + ((6 - d.getUTCDay() + 7) % 7));
  return d.toISOString().slice(0, 10);
}
export function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export type RegisterNavigationRequest =
  | {
      key: string;
      kind: "school-record";
      schoolStudentId: string;
      tab?: "Overview" | "Documents";
    }
  | {
      key: string;
      kind: "registration";
      terakoya: boolean;
      className?: string;
    };
