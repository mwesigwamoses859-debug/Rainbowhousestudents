import { GeneralStudent, RegisterSettings, ageOn, addDays } from "./model";
export function validateGeneralStudent(s: GeneralStudent) {
  if (!s.surname.trim() || !s.otherNames.trim())
    return "Enter the learner’s surname and other names.";
  if (!["Male", "Female", "Other", "Not recorded"].includes(s.gender))
    return "Select the learner’s sex.";
  const validDate = (v: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    !Number.isNaN(Date.parse(v)) &&
    new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v;
  if (!validDate(s.dateOfBirth) || s.dateOfBirth > s.intakeDate)
    return "Enter a valid birth date before the registration date.";
  if (
    !validDate(s.intakeDate) ||
    s.intakeDate >
      new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Kampala" })
  )
    return "Enter a valid registration date that is not in the future.";
  if (!s.guardianName.trim() || !s.guardianRelationship.trim())
    return "Enter the current guardian’s name and relationship.";
  for (const key of [
    "guardianContact",
    "guardianContact2",
    "nextOfKinContact",
    "workerContact",
  ] as const)
    if (
      (key === "guardianContact" || s[key]) &&
      s[key].replace(/\D/g, "").length < 9
    )
      return "Enter valid guardian, next-of-kin and community-worker phone numbers (at least 9 digits).";
  if (!s.zone.trim()) return "Enter the learner’s residence / zone.";
  if (!["New intake", "Continuing learner"].includes(s.intakeType))
    return "Select a registration type.";
  const age = ageOn(s.dateOfBirth, s.intakeDate);
  if (s.intakeType === "New intake" && (age === null || age < 6 || age > 14))
    return "New intake is for ages 6–14 on the registration date. Use Continuing learner with a reason for an existing older learner.";
  if (s.intakeType === "Continuing learner" && !s.intakeReason.trim())
    return "Record why this continuing learner is being added.";
  if (
    ![
      "Primary",
      "Secondary",
      "University",
      "Vocational",
      "Out of school",
      "Completed",
    ].includes(s.educationLevel)
  )
    return "Select a valid education level.";
  if (s.inSchool === "Yes" && !s.school.trim())
    return "Enter the current school or institution.";
  if (s.educationLevel === "Primary" && !/^P\.[1-7]$/.test(s.grade))
    return "Select a primary class from P.1 to P.7.";
  if (s.educationLevel === "Secondary" && !/^S\.[1-6]$/.test(s.grade))
    return "Select a secondary class from S.1 to S.6.";
  if (s.educationLevel === "University" && !/^Year [1-9]$/.test(s.grade))
    return "Select a university study year.";
  const year = new Date().getUTCFullYear();
  if (
    !Number.isInteger(s.academicYear) ||
    s.academicYear < 2000 ||
    s.academicYear > year + 1
  )
    return "Choose a valid academic year.";
  if (
    !Number.isInteger(s.universityDuration) ||
    s.universityDuration < 0 ||
    s.universityDuration > 9
  )
    return "Course duration must be 0 (unknown) or 1–9 years.";
  for (const key of ["numberInHousehold", "numberOfSiblings"] as const)
    if (s[key] && (!/^\d+$/.test(s[key]) || Number(s[key]) > 100))
      return "Household and sibling counts must be whole numbers between 0 and 100.";
  return null;
}
export function nextEducation(s: GeneralStudent) {
  let level = s.educationLevel,
    grade = s.grade,
    review = false;
  if (level === "Primary" && /^P\.[1-7]$/.test(grade)) {
    const n = Number(grade.slice(2));
    if (n === 7) {
      level = "Secondary";
      grade = "S.1";
      review = true;
    } else grade = `P.${n + 1}`;
  } else if (level === "Secondary" && /^S\.[1-6]$/.test(grade)) {
    const n = Number(grade.slice(2));
    if (n === 6) {
      level = "University";
      grade = "Year 1";
      review = true;
    } else {
      grade = `S.${n + 1}`;
      review = n === 4;
    }
  } else if (level === "University" && /^Year [1-9]$/.test(grade)) {
    const n = Number(grade.slice(5));
    if (s.universityDuration && n >= s.universityDuration) {
      level = "Completed";
      grade = "Completed";
      review = true;
    } else if (n < 9) grade = `Year ${n + 1}`;
    else review = true;
  } else review = true;
  return { educationLevel: level, grade, transitionReview: review };
}
export function careEligibility(
  s: Pick<GeneralStudent, "careEnrolled" | "active" | "zone">,
  date: string,
  lastAttended: string | null,
  settings: RegisterSettings,
  zones: string[],
  invited: boolean,
) {
  if (!s.active) return { eligible: false, reason: "Inactive learner" };
  if (!s.careEnrolled)
    return { eligible: false, reason: "Not enrolled in Care Program" };
  if (settings.carePolicy === "invitation" && !invited)
    return { eligible: false, reason: "Not invited for this Saturday" };
  if (
    settings.carePolicy === "zones" &&
    (!zones.length ||
      !zones.some(
        (z) => z.trim().toLowerCase() === s.zone.trim().toLowerCase(),
      ))
  )
    return {
      eligible: false,
      reason: zones.length
        ? "Zone is not scheduled"
        : "Choose this Saturday’s zones",
    };
  if (
    settings.carePolicy === "alternate" &&
    lastAttended &&
    lastAttended > addDays(date, -14)
  )
    return {
      eligible: false,
      reason: `Not due · attended ${lastAttended}; next eligible ${addDays(lastAttended, 14)}`,
    };
  return { eligible: true, reason: "Due to attend" };
}
