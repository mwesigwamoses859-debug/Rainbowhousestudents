import { Student, Gender, ClassName } from '../types';

/**
 * List spreadsheets from user's Google Drive
 */
export async function listSpreadsheets(accessToken: string): Promise<any[]> {
  try {
    const response = await fetch(
      "https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.spreadsheet'&fields=files(id,name,webViewLink,modifiedTime)&orderBy=modifiedTime desc&pageSize=20",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to list spreadsheets: ${response.statusText}`);
    }

    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error("Error listing spreadsheets:", error);
    throw error;
  }
}

/**
 * Fetch sheet names (tabs) for a spreadsheet
 */
export async function getSpreadsheetSheets(spreadsheetId: string, accessToken: string): Promise<string[]> {
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get spreadsheet metadata: ${response.statusText}`);
    }

    const data = await response.json();
    return data.sheets?.map((sheet: any) => sheet.properties.title) || ["Sheet1"];
  } catch (error) {
    console.error("Error getting sheets:", error);
    throw error;
  }
}

/**
 * Fetch rows from a specific spreadsheet and sheet/range
 */
export async function fetchSheetValues(
  spreadsheetId: string,
  sheetName: string,
  accessToken: string
): Promise<any[][]> {
  try {
    const range = `${encodeURIComponent(sheetName)}!A1:Z500`;
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch sheet values: ${response.statusText}`);
    }

    const data = await response.json();
    return data.values || [];
  } catch (error) {
    console.error("Error fetching sheet values:", error);
    throw error;
  }
}

/**
 * Map raw Google Sheets rows (with headers) to Student objects
 */
export function mapSheetRowsToStudents(rows: any[][]): Student[] {
  if (rows.length === 0) return [];

  const cleanHeader = (val: any): string => {
    return String(val || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  };

  // Find the index of the header row
  let headerRowIndex = -1;
  let sheetHeaders: string[] = [];

  // We check row-by-row to see if it looks like a header row
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i];
    if (!Array.isArray(row) || row.length === 0) continue;

    const cleanRow = row.map(cell => cleanHeader(cell));
    
    const expectedKeywords = [
      'surname', 'lastname', 'familyname', 'sirname',
      'othernames', 'firstname', 'givenname', 'givennames',
      'gender', 'sex', 'sexgender',
      'dateofbirth', 'dob', 'birthdate',
      'class', 'classname', 'classlevel', 'grade', 'level',
      'yearofentry', 'entryyear', 'admissionyear',
      'zone', 'address', 'village', 'residence',
      'guardian', 'parent', 'guardianname', 'guardiansname', 'relationship', 'contact1',
      'contact2', 'communityworker', 'nextofkin', 'noinhousehold', 'deceased', 'causeofdeath', 'school',
      'scholarship', 'sponsored'
    ];

    const matchedCount = cleanRow.filter(cell => expectedKeywords.includes(cell)).length;

    if (matchedCount >= 2) {
      headerRowIndex = i;
      sheetHeaders = row.map(cell => String(cell || '').trim());
      break;
    }
  }

  // Fallback if no robust header row was found
  if (headerRowIndex === -1) {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (Array.isArray(row) && row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== '')) {
        headerRowIndex = i;
        sheetHeaders = row.map(cell => String(cell || '').trim());
        break;
      }
    }
  }

  if (headerRowIndex === -1) return [];

  const dataRows = rows.slice(headerRowIndex + 1).filter(row => {
    return Array.isArray(row) && row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== '');
  });

  // Map column indices for each field
  const colIndices = {
    surname: -1,
    otherNames: -1,
    gender: -1,
    dateOfBirth: -1,
    className: -1,
    yearOfEntry: -1,
    guardianName: -1,
    guardianContact: -1,
    guardianRelationship: -1,
    guardianContact2: -1,
    communityWorker: -1,
    workerContact: -1,
    zoneInNansana: -1,
    nextOfKin: -1,
    nextOfKinContact: -1,
    numberInHousehold: -1,
    deceased: -1,
    causeOfDeath: -1,
    school: -1,
    hasScholarship: -1,
    combinedName: -1
  };

  const sheetHeadersClean = sheetHeaders.map(h => cleanHeader(h));

  const findColIdx = (possibleKeys: string[]): number => {
    const cleanPossibles = possibleKeys.map(k => cleanHeader(k));
    return sheetHeadersClean.findIndex(h => cleanPossibles.includes(h));
  };

  colIndices.surname = findColIdx(['surname', 'lastname', 'familyname', 'sirname', 'family', 'last', 'sur', 'sname']);
  colIndices.otherNames = findColIdx(['othernames', 'firstname', 'givenname', 'givennames', 'othername', 'first', 'given', 'other', 'onames']);
  colIndices.combinedName = findColIdx(['name', 'names', 'studentname', 'pupilname', 'fullname', 'pupilsname', 'studentsname', 'nameofpupil', 'nameofstudent', 'pupil', 'student', 'child', 'childname', 'childsname', 'pupilsnames', 'studentsnames', 'studentnames']);
  colIndices.gender = findColIdx(['gender', 'sex', 'genderstatus', 'sexgender']);
  colIndices.dateOfBirth = findColIdx(['dateofbirth', 'dob', 'birthdate', 'birthday', 'birth']);
  colIndices.className = findColIdx(['classname', 'class', 'grade', 'level', 'classid']);
  colIndices.yearOfEntry = findColIdx(['yearofentry', 'entryyear', 'year', 'joined', 'entry_year', 'admissionyear', 'admission_year']);
  colIndices.zoneInNansana = findColIdx(['zoneinnansana', 'zone', 'address', 'area', 'village', 'wherestaying', 'residencezone', 'residence', 'homezone', 'location', 'residencezoneinnansana']);
  colIndices.guardianName = findColIdx(["guardian'sname", 'guardiansname', 'guardianname', 'guardian', 'parent', 'parentguardian', 'parentname', 'guardiannameorparentname']);
  colIndices.guardianRelationship = findColIdx(['relationship', 'guardianrelationship', 'relationshiptochild', 'relationshiptopupil']);
  colIndices.guardianContact = findColIdx(['contact-1', 'contact1', 'guardiancontact1', 'guardiancontact', 'guardianphone', 'parentcontact', 'parentphone', 'phone_number', 'phonenumber', 'guardiancontactphone']);
  colIndices.guardianContact2 = findColIdx(['contact-2', 'contact2', 'guardiancontact2', 'guardianphone2', 'alternatecontact', 'alternativecontact']);
  colIndices.communityWorker = findColIdx(['communityworker', 'worker', 'socialworker', 'communityworkername']);
  colIndices.workerContact = findColIdx(['communityworkercontact', 'workercontact', 'workerphone', 'socialworkerphone', 'communityworkercontactphone']);
  colIndices.nextOfKin = findColIdx(['nextofkin', 'nextkin', 'kinname', 'nextofkinname']);
  colIndices.nextOfKinContact = findColIdx(['nextofkincontact', 'kincontact', 'nextkincontact']);
  if (colIndices.nextOfKinContact === -1 && colIndices.nextOfKin !== -1) {
    colIndices.nextOfKinContact = sheetHeadersClean.findIndex((header, index) => header === 'contact' && index > colIndices.nextOfKin);
  }
  colIndices.numberInHousehold = findColIdx(['no.inhousehold', 'noinhousehold', 'numberinhousehold', 'householdsize', 'householdmembers']);
  colIndices.deceased = findColIdx(['deceased', 'isdeceased', 'parentdeceased', 'guardian-deceased']);
  colIndices.causeOfDeath = findColIdx(['causeofdeath', 'deathcause', 'cause']);
  colIndices.school = findColIdx(['school', 'schoolname', 'previousschool', 'currentschool']);
  colIndices.hasScholarship = findColIdx(['scholarshipstatus', 'scholarship', 'sponsored', 'hasscholarship']);

  // Auto-detect columns by inspecting cell values if index is still -1
  const numRowsToCheck = Math.min(dataRows.length, 5);
  if (numRowsToCheck > 0) {
    for (let colIdx = 0; colIdx < sheetHeaders.length; colIdx++) {
      const values: string[] = [];
      for (let r = 0; r < numRowsToCheck; r++) {
        const val = String(dataRows[r][colIdx] || '').trim();
        if (val) values.push(val);
      }
      if (values.length === 0) continue;

      // Gender auto-detect
      if (colIndices.gender === -1) {
        const isGenderCol = values.every(v => {
          const lv = v.toLowerCase();
          return lv === 'm' || lv === 'f' || lv === 'male' || lv === 'female';
        });
        if (isGenderCol) {
          colIndices.gender = colIdx;
          continue;
        }
      }

      // Class auto-detect
      if (colIndices.className === -1) {
        const isClassCol = values.every(v => {
          const normV = v.toUpperCase().replace(/[\s._-]/g, '');
          return normV.startsWith('P') || normV.startsWith('PRIMARY') || /^[1-7]$/.test(normV);
        });
        if (isClassCol) {
          colIndices.className = colIdx;
          continue;
        }
      }

      // Year of Entry auto-detect
      if (colIndices.yearOfEntry === -1) {
        const isYearCol = values.every(v => {
          const num = Number(v);
          return !isNaN(num) && num >= 2000 && num <= 2100;
        });
        if (isYearCol) {
          colIndices.yearOfEntry = colIdx;
          continue;
        }
      }

      // DOB auto-detect
      if (colIndices.dateOfBirth === -1) {
        const isDobCol = values.every(v => {
          const date = new Date(v);
          return !isNaN(date.getTime()) && date.getFullYear() >= 2000 && date.getFullYear() <= new Date().getFullYear();
        });
        if (isDobCol) {
          colIndices.dateOfBirth = colIdx;
          continue;
        }
      }

      // Scholarship auto-detect
      if (colIndices.hasScholarship === -1) {
        const isScholarshipCol = values.every(v => {
          const lv = v.toLowerCase();
          return lv === 'yes' || lv === 'no' || lv === 'true' || lv === 'false';
        });
        if (isScholarshipCol) {
          colIndices.hasScholarship = colIdx;
          continue;
        }
      }
    }
  }

  // Fallback: If surname is not found, find first unmapped text column and use it as combined name
  if (colIndices.surname === -1 && colIndices.combinedName === -1) {
    let nameFallbackIdx = -1;
    for (let colIdx = 0; colIdx < sheetHeaders.length; colIdx++) {
      if (
        colIdx === colIndices.gender ||
        colIdx === colIndices.className ||
        colIdx === colIndices.yearOfEntry ||
        colIdx === colIndices.dateOfBirth ||
        colIdx === colIndices.hasScholarship
      ) {
        continue;
      }
      const hasLetters = dataRows.some(row => /[a-zA-Z]/.test(String(row[colIdx] || '')));
      if (hasLetters) {
        nameFallbackIdx = colIdx;
        break;
      }
    }
    if (nameFallbackIdx !== -1) {
      colIndices.combinedName = nameFallbackIdx;
    }
  }

  return dataRows.map((row, index) => {
    const getRowVal = (idx: number): string => {
      if (idx === -1 || idx >= row.length) return '';
      const cell = row[idx];
      if (cell === undefined || cell === null) return '';
      if (cell instanceof Date) {
        return cell.toISOString().split('T')[0];
      }
      return String(cell).trim();
    };

    let surname = getRowVal(colIndices.surname);
    let otherNames = getRowVal(colIndices.otherNames);
    const combinedName = getRowVal(colIndices.combinedName);

    // If surname was not found, try combined name
    if (!surname && combinedName) {
      const parts = combinedName.split(/\s+/).filter(Boolean);
      if (parts.length > 1) {
        surname = parts[0];
        otherNames = parts.slice(1).join(' ');
      } else if (parts.length === 1) {
        surname = parts[0];
        otherNames = '';
      }
    }

    // If surname is found but otherNames is empty, and surname has spaces, split it
    if (surname && !otherNames) {
      const parts = surname.split(/\s+/).filter(Boolean);
      if (parts.length > 1) {
        surname = parts[0];
        otherNames = parts.slice(1).join(' ');
      }
    }

    if (!surname) {
      surname = 'Unknown';
    }

    // Gender extraction
    let genderRaw = getRowVal(colIndices.gender);
    let gender: Gender = 'Male';
    if (genderRaw) {
      const gLower = genderRaw.toLowerCase();
      if (gLower.startsWith('f') || gLower.includes('female')) {
        gender = 'Female';
      }
    }

    // DOB extraction
    let dobStr = '2015-01-01';
    const dobRaw = getRowVal(colIndices.dateOfBirth);
    if (dobRaw) {
      const dateVal = new Date(dobRaw);
      if (!isNaN(dateVal.getTime())) {
        dobStr = dateVal.toISOString().split('T')[0];
      } else {
        // Try regex format parse
        const parts = dobRaw.split(/[-/.\s]+/);
        if (parts.length === 3) {
          // Check if YYYY-MM-DD or DD-MM-YYYY or MM-DD-YYYY
          let d = Number(parts[0]);
          let m = Number(parts[1]);
          let y = Number(parts[2]);
          if (parts[0].length === 4) {
            y = Number(parts[0]);
            d = Number(parts[2]);
          }
          if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
            if (m > 12 && d <= 12) {
              // swap
              const temp = m;
              m = d;
              d = temp;
            }
            const pad = (n: number) => String(n).padStart(2, '0');
            dobStr = `${y}-${pad(m)}-${pad(d)}`;
          }
        }
      }
    }

    // Class Name extraction
    let clNameRaw = getRowVal(colIndices.className) || 'P.1';
    clNameRaw = clNameRaw.toUpperCase().replace(/[\s._-]/g, '');
    if (clNameRaw.startsWith('PRIMARY')) {
      clNameRaw = clNameRaw.replace('PRIMARY', 'P');
    }
    if (clNameRaw.length === 2 && clNameRaw.startsWith('P')) {
      clNameRaw = `P.${clNameRaw[1]}`;
    }
    const className: ClassName = ['P.1', 'P.2', 'P.3', 'P.4', 'P.5', 'P.6', 'P.7'].includes(clNameRaw)
      ? (clNameRaw as ClassName)
      : 'P.1';

    // Entry Year extraction
    const yearRaw = getRowVal(colIndices.yearOfEntry);
    const yearOfEntry = Number(yearRaw) || new Date().getFullYear();

    // Scholarship extraction
    const scholarshipRaw = getRowVal(colIndices.hasScholarship);
    const scholarshipValue = scholarshipRaw.trim().toLowerCase();
    const hasScholarship = scholarshipValue !== ''
      && !['no', 'none', 'false', '0', 'self', 'self-sponsored'].includes(scholarshipValue);

    // Residence Zone extraction
    const zoneInNansana = getRowVal(colIndices.zoneInNansana) || 'Nansana';

    // Guardian Name extraction
    const guardianName = getRowVal(colIndices.guardianName) || 'Unknown';
    const guardianContact = getRowVal(colIndices.guardianContact);
    const guardianRelationship = getRowVal(colIndices.guardianRelationship);
    const guardianContact2 = getRowVal(colIndices.guardianContact2);
    const communityWorker = getRowVal(colIndices.communityWorker);
    const workerContact = getRowVal(colIndices.workerContact);
    const nextOfKin = getRowVal(colIndices.nextOfKin);
    const nextOfKinContact = getRowVal(colIndices.nextOfKinContact);
    const numberInHouseholdRaw = getRowVal(colIndices.numberInHousehold);
    const numberInHousehold = numberInHouseholdRaw ? Number(numberInHouseholdRaw) || undefined : undefined;
    const deceased = getRowVal(colIndices.deceased);
    const causeOfDeath = getRowVal(colIndices.causeOfDeath);
    const school = getRowVal(colIndices.school);

    return {
      id: `st-sheet-${Date.now()}-${index}`,
      surname,
      otherNames,
      gender,
      dateOfBirth: dobStr,
      className,
      yearOfEntry,
      photo: '',
      guardianName,
      guardianContact,
      guardianRelationship,
      guardianContact2,
      communityWorker,
      workerContact,
      zoneInNansana,
      nextOfKin,
      nextOfKinContact,
      numberInHousehold,
      deceased,
      causeOfDeath,
      school,
      hasScholarship,
      scholarshipDetails: scholarshipRaw
    };
  });
}

/**
 * Create a new spreadsheet and export students roster
 */
export async function createAndExportStudentsSheet(
  title: string,
  students: Student[],
  accessToken: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  try {
    // 1. Create Spreadsheet
    const createResponse = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          title: title,
        },
      }),
    });

    if (!createResponse.ok) {
      throw new Error(`Failed to create spreadsheet: ${createResponse.statusText}`);
    }

    const sheetData = await createResponse.json();
    const spreadsheetId = sheetData.spreadsheetId;
    const spreadsheetUrl = sheetData.spreadsheetUrl;

    // 2. Prepare spreadsheet values
    const headers = [
      "Surname",
      "Other Names",
      "Gender",
      "Date of Birth",
      "Class Name",
      "Year of Entry",
      "Guardian's Name",
      "Relationship",
      "Contact-1",
      "Contact-2",
      "Community Worker",
      "Zone",
      "Next of Kin",
      "Contact",
      "No. in Household",
      "Deceased",
      "Cause of death",
      "School",
      "Scholarship",
    ];

    const rows = students.map(s => [
      s.surname,
      s.otherNames,
      s.gender,
      s.dateOfBirth,
      s.className,
      s.yearOfEntry,
      s.guardianName,
      s.guardianRelationship || '',
      s.guardianContact,
      s.guardianContact2 || '',
      s.communityWorker,
      s.zoneInNansana,
      s.nextOfKin || '',
      s.nextOfKinContact || '',
      s.numberInHousehold || '',
      s.deceased || '',
      s.causeOfDeath || '',
      s.school || '',
      s.scholarshipDetails || (s.hasScholarship ? "Yes" : "No"),
    ]);

    const values = [headers, ...rows];

    // 3. Write values to spreadsheet
    const writeResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:S${values.length}?valueInputOption=USER_ENTERED`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          values: values,
        }),
      }
    );

    if (!writeResponse.ok) {
      throw new Error(`Failed to write values: ${writeResponse.statusText}`);
    }

    return {
      spreadsheetId,
      spreadsheetUrl,
    };
  } catch (error) {
    console.error("Error creating and exporting sheet:", error);
    throw error;
  }
}

/**
 * List files inside the specific shared Google Drive folder
 */
export async function listSharedFolderFiles(folderId: string, accessToken: string): Promise<any[]> {
  try {
    const q = `'${folderId}' in parents and trashed = false`;
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,webViewLink,modifiedTime)&orderBy=name&pageSize=100`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to list folder files: ${response.statusText}`);
    }

    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error("Error listing folder files:", error);
    throw error;
  }
}
