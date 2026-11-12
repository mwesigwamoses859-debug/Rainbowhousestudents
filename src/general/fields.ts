import { GeneralStudent } from "./model";
export type Field = {
  key: keyof GeneralStudent;
  label: string;
  type?: "text" | "date" | "tel" | "number" | "textarea" | "select";
  options?: string[];
  required?: boolean;
};
const yes = ["", "Yes", "No", "Unknown"];
export const FORM_SECTIONS: {
  title: string;
  intro: string;
  fields: Field[];
}[] = [
  {
    title: "Learner details",
    intro:
      "Ashinaga Uganda Rainbow House · General registration. New intake is for ages 6–14; continuing records stay with the learner through university.",
    fields: [
      { key: "surname", label: "Surname / last name", required: true },
      { key: "otherNames", label: "First and other names", required: true },
      {
        key: "gender",
        label: "Sex",
        type: "select",
        options: ["", "Male", "Female", "Other", "Not recorded"],
        required: true,
      },
      {
        key: "dateOfBirth",
        label: "Date of birth",
        type: "date",
        required: true,
      },
      { key: "tribe", label: "Tribe (optional)" },
      { key: "parish", label: "Parish" },
      { key: "zone", label: "Residence / zone", required: true },
      { key: "communityWorker", label: "Community worker’s full name" },
      { key: "workerContact", label: "Community worker phone", type: "tel" },
      {
        key: "intakeType",
        label: "Registration type",
        type: "select",
        options: ["New intake", "Continuing learner"],
      },
      {
        key: "intakeDate",
        label: "Registration date",
        type: "date",
        required: true,
      },
      {
        key: "intakeReason",
        label: "Continuing-record reason / source",
        type: "textarea",
      },
    ],
  },
  {
    title: "Guardian & household",
    intro:
      "Keep the current guardian and next-of-kin details here. Previous contacts are retained whenever the guardian changes.",
    fields: [
      { key: "guardianName", label: "Guardian’s full name", required: true },
      {
        key: "guardianRelationship",
        label: "Guardian’s relationship to learner",
        required: true,
      },
      {
        key: "guardianContact",
        label: "Guardian contact one",
        type: "tel",
        required: true,
      },
      { key: "guardianContact2", label: "Guardian contact two", type: "tel" },
      { key: "nextOfKin", label: "Next of kin’s full name" },
      {
        key: "nextOfKinRelationship",
        label: "Next of kin’s relationship to learner",
      },
      { key: "nextOfKinContact", label: "Next of kin’s contact", type: "tel" },
      {
        key: "numberInHousehold",
        label: "Number of family / household members",
        type: "number",
      },
      {
        key: "householdHead",
        label: "Who heads the household?",
        type: "select",
        options: [
          "",
          "Adult headed",
          "Child headed",
          "Institution",
          "Other",
          "Unknown",
        ],
      },
      {
        key: "householdHeadRelationship",
        label: "Household head’s relationship to learner",
        type: "select",
        options: [
          "",
          "Mother",
          "Father",
          "Aunt",
          "Uncle",
          "Sister",
          "Brother",
          "Grandparent",
          "Other",
          "Unknown",
        ],
      },
      {
        key: "incomeSource",
        label: "Source of household income",
        type: "textarea",
      },
      {
        key: "hasSiblings",
        label: "Does the learner have siblings?",
        type: "select",
        options: yes,
      },
      { key: "numberOfSiblings", label: "Number of siblings", type: "number" },
      {
        key: "livesWithSiblings",
        label: "Does the learner live with their siblings?",
        type: "select",
        options: yes,
      },
      {
        key: "siblingsLocation",
        label: "If not, where and with whom do the siblings live?",
        type: "textarea",
      },
    ],
  },
  {
    title: "Education & support",
    intro:
      "One master record follows the learner across schools and study levels. Care Program participation is independent of school enrolment.",
    fields: [
      {
        key: "inSchool",
        label: "Is the learner in school?",
        type: "select",
        options: yes,
      },
      { key: "school", label: "School / institution name" },
      {
        key: "educationLevel",
        label: "Education level",
        type: "select",
        options: [
          "Primary",
          "Secondary",
          "University",
          "Vocational",
          "Out of school",
          "Completed",
        ],
        required: true,
      },
      { key: "grade", label: "Current class / study year", required: true },
      {
        key: "academicYear",
        label: "Academic year for this level",
        type: "number",
        required: true,
      },
      { key: "lastClassAttended", label: "Last class attended" },
      {
        key: "outOfSchoolReason",
        label: "If not in school, explain why",
        type: "textarea",
      },
      {
        key: "studentConcerns",
        label: "Any special problems or support needs for this learner?",
        type: "textarea",
      },
      {
        key: "otherConditions",
        label: "Other conditions to record",
        type: "textarea",
      },
      {
        key: "universityDuration",
        label: "University course duration in years (0 = not known)",
        type: "number",
      },
    ],
  },
  {
    title: "Family information",
    intro:
      "Confidential family and health information. Record only known information needed for support; leave unknown details blank.",
    fields: [
      {
        key: "motherDeceased",
        label: "Is the learner’s mother deceased?",
        type: "select",
        options: yes,
      },
      {
        key: "motherCauseOfDeath",
        label: "Mother’s cause of death, if known",
        type: "textarea",
      },
      {
        key: "fatherDeceased",
        label: "Is the learner’s father deceased?",
        type: "select",
        options: yes,
      },
      {
        key: "fatherCauseOfDeath",
        label: "Father’s cause of death, if known",
        type: "textarea",
      },
      {
        key: "hivStatusKnown",
        label: "Is the learner’s HIV status known?",
        type: "select",
        options: yes,
      },
      {
        key: "hivDetails",
        label: "HIV details, if known and needed for care",
        type: "textarea",
      },
      {
        key: "survivingParentHivStatus",
        label: "HIV status of surviving parent, if recorded",
        type: "select",
        options: ["", "Positive", "Negative", "Unknown", "Not applicable"],
      },
      {
        key: "survivingParentHealth",
        label: "Overall health of surviving parent",
        type: "select",
        options: [
          "",
          "Very poor",
          "Poor",
          "Fair",
          "Good",
          "Very good",
          "Unknown",
          "Not applicable",
        ],
      },
      {
        key: "familyConcerns",
        label: "Other family problems staff should know about",
        type: "textarea",
      },
    ],
  },
  {
    title: "Interview & verification",
    intro:
      "Staff verification does not prevent registration while documents are missing. Keep follow-up notes for outstanding items.",
    fields: [
      { key: "interviewDate", label: "Date of interview", type: "date" },
      { key: "interviewer", label: "Name of interviewer" },
      {
        key: "orphanVerified",
        label: "Has the orphan status been verified?",
        type: "select",
        options: yes,
      },
      { key: "verifiedBy", label: "Name of staff who verified the learner" },
      { key: "officialComments", label: "Official comments", type: "textarea" },
    ],
  },
  {
    title: "Documents & review",
    intro:
      "Add documents now or later. PDF, JPEG and PNG files are supported. Missing documents remain visible on the learner’s checklist.",
    fields: [],
  },
];
