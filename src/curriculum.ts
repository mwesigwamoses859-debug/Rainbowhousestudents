import type { ClassName } from './types';

export const LOWER_PRIMARY_SUBJECTS = [
  'Mathematics',
  'English',
  'Literacy 1',
  'Literacy 2 (Reading and Writing)',
  'Religious Education',
  'Luganda',
  'Computer/ ICT',
  'KUMON',
] as const;

export const UPPER_PRIMARY_SUBJECTS = [
  'English',
  'Mathematics',
  'Social Studies',
  'Science',
  'Religious Education',
  'Computer/ ICT',
] as const;

export const ALL_SUBJECTS = [...new Set([
  ...LOWER_PRIMARY_SUBJECTS,
  ...UPPER_PRIMARY_SUBJECTS,
])];

export const isLowerPrimary = (className: ClassName) =>
  className === 'P.1' || className === 'P.2' || className === 'P.3';

export const getSubjectsForClass = (className: ClassName): readonly string[] => {
  if (isLowerPrimary(className)) return LOWER_PRIMARY_SUBJECTS;
  if (className === 'P.4' || className === 'P.5') {
    return [...UPPER_PRIMARY_SUBJECTS, 'KUMON'];
  }
  return UPPER_PRIMARY_SUBJECTS;
};

export const isSubjectForClass = (className: ClassName, subject: string) =>
  getSubjectsForClass(className).includes(subject as never);
