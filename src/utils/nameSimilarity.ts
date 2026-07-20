// src/utils/nameSimilarity.ts

/**
 * Calculates Levenshtein distance between two strings
 */
export function getLevenshteinDistance(a: string, b: string): number {
  const tmp: number[][] = [];
  let i, j;
  for (i = 0; i <= a.length; i++) {
    tmp[i] = [i];
  }
  for (j = 0; j <= b.length; j++) {
    tmp[0][j] = j;
  }
  for (i = 1; i <= a.length; i++) {
    for (j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1, // deletion
        tmp[i][j - 1] + 1, // insertion
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1) // substitution
      );
    }
  }
  return tmp[a.length][b.length];
}

export interface SimilarityResult {
  isExactInClass: boolean; // Exact full match in same class
  isExactSchool: boolean; // Exact full match in different class
  resembles: boolean; // Similar name detected
  resemblanceType: 'exact' | 'partial' | 'typo' | 'none';
  matchStudent?: {
    id: string;
    surname: string;
    otherNames: string;
    className: string;
  };
}

/**
 * Checks if a given student name (surname & otherNames) matches or resembles any student in the list.
 */
export function checkNameSimilarity(
  surname: string,
  otherNames: string,
  className: string,
  existingStudents: Array<{ id: string; surname: string; otherNames: string; className: string }>,
  excludeId?: string
): SimilarityResult {
  const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  
  const targetSurname = norm(surname);
  const targetOther = norm(otherNames);
  const targetFull = targetSurname + targetOther;
  
  const cleanTokens = (str: string) => 
    str.toLowerCase()
       .replace(/[^a-z0-9\s]/g, '')
       .split(/\s+/)
       .filter(t => t.length > 1);

  const targetTokens = cleanTokens(surname + ' ' + otherNames);

  if (!targetFull) {
    return { isExactInClass: false, isExactSchool: false, resembles: false, resemblanceType: 'none' };
  }

  for (const student of existingStudents) {
    if (excludeId && student.id === excludeId) continue;

    const sSurname = norm(student.surname);
    const sOther = norm(student.otherNames);
    const sFull = sSurname + sOther;
    
    // 1. Exact full name match (case-insensitive and whitespace normalized)
    if (targetFull === sFull) {
      const isSameClass = className.trim().toUpperCase() === student.className.trim().toUpperCase();
      return {
        isExactInClass: isSameClass,
        isExactSchool: !isSameClass,
        resembles: true,
        resemblanceType: 'exact',
        matchStudent: student
      };
    }

    // 2. Typo match (very close Levenshtein distance on raw combined name)
    const rawTargetFullStr = `${surname.trim()} ${otherNames.trim()}`.toLowerCase().replace(/\s+/g, ' ');
    const rawStudentFullStr = `${student.surname.trim()} ${student.otherNames.trim()}`.toLowerCase().replace(/\s+/g, ' ');
    
    if (rawTargetFullStr.length > 4 && rawStudentFullStr.length > 4) {
      const distance = getLevenshteinDistance(rawTargetFullStr, rawStudentFullStr);
      if (distance <= 2) {
        return {
          isExactInClass: false,
          isExactSchool: false,
          resembles: true,
          resemblanceType: 'typo',
          matchStudent: student
        };
      }
    }

    // 3. Partial Token Match (sharing at least 2 tokens if name is multi-word, or high ratio of shared tokens)
    const sTokens = cleanTokens(student.surname + ' ' + student.otherNames);
    const sharedTokens = targetTokens.filter(t => sTokens.includes(t));
    
    const minTokens = Math.min(targetTokens.length, sTokens.length);
    const maxTokens = Math.max(targetTokens.length, sTokens.length);
    const shareRatio = sharedTokens.length / maxTokens;

    if (
      (sharedTokens.length >= 2 && minTokens >= 2) || 
      (shareRatio >= 0.66 && minTokens >= 2) ||
      (targetSurname === sSurname && targetTokens.length === 1 && sTokens.includes(targetSurname))
    ) {
      return {
        isExactInClass: false,
        isExactSchool: false,
        resembles: true,
        resemblanceType: 'partial',
        matchStudent: student
      };
    }
  }

  return { isExactInClass: false, isExactSchool: false, resembles: false, resemblanceType: 'none' };
}
