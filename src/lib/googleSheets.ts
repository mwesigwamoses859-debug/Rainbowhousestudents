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
  if (rows.length < 2) return [];

  const headers = rows[0].map(h => String(h).trim().toLowerCase());
  const dataRows = rows.slice(1);

  return dataRows.map((row, index) => {
    // Helper to find cell value by matching header variations
    const getVal = (possibleHeaders: string[]): string => {
      const colIdx = headers.findIndex(h => possibleHeaders.includes(h));
      if (colIdx !== -1 && row[colIdx] !== undefined) {
        return String(row[colIdx]).trim();
      }
      return "";
    };

    const surname = getVal(["surname", "last name", "sirname", "family name"]) || "Unknown";
    const otherNames = getVal(["other names", "first name", "given name", "othernames"]) || "";
    const genderRaw = getVal(["gender", "sex", "sex/gender"]) || "Male";
    const gender: Gender = genderRaw.toLowerCase().startsWith("f") ? "Female" : "Male";

    let dobStr = getVal(["date of birth", "dob", "birthdate", "dateofbirth"]) || "2015-01-01";
    // Sanitize DOB (ensure YYYY-MM-DD or standard parseable string)
    const dobDate = new Date(dobStr);
    if (!isNaN(dobDate.getTime())) {
      dobStr = dobDate.toISOString().split("T")[0];
    } else {
      dobStr = "2015-01-01";
    }

    let classNameRaw = getVal(["class name", "class", "classname"]) || "P.1";
    classNameRaw = classNameRaw.trim().toUpperCase();
    if (classNameRaw.length === 2 && classNameRaw.startsWith("P")) {
      classNameRaw = `P.${classNameRaw[1]}`;
    }
    const className: ClassName = ["P.1", "P.2", "P.3", "P.4", "P.5", "P.6", "P.7"].includes(classNameRaw)
      ? (classNameRaw as ClassName)
      : "P.1";

    const yearOfEntryStr = getVal(["year of entry", "entry year", "yearofentry", "joined"]);
    const yearOfEntry = Number(yearOfEntryStr) || new Date().getFullYear();

    const zoneInNansana = getVal(["zone in nansana", "zone", "address", "area", "village", "where staying"]) || "Nansana";
    const guardianName = getVal(["guardian name", "guardian", "parent", "parent/guardian"]) || "Unknown";
    const guardianContact = getVal(["guardian contact", "guardian phone", "contact", "phone"]) || "";
    const communityWorker = getVal(["community worker", "worker", "social worker"]) || "";
    const workerContact = getVal(["community worker contact", "worker contact", "worker phone"]) || "";

    const scholarshipRaw = getVal(["scholarship status", "scholarship", "sponsored", "has scholarship", "has_scholarship"]);
    const hasScholarship =
      scholarshipRaw.toLowerCase() === "yes" ||
      scholarshipRaw.toLowerCase() === "true" ||
      scholarshipRaw === "1";

    return {
      id: `st-sheet-${Date.now()}-${index}`,
      surname,
      otherNames,
      gender,
      dateOfBirth: dobStr,
      className,
      yearOfEntry,
      photo: "",
      guardianName,
      guardianContact,
      communityWorker,
      workerContact,
      zoneInNansana,
      hasScholarship,
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
      "Zone in Nansana",
      "Guardian Name",
      "Guardian Contact",
      "Community Worker",
      "Community Worker Contact",
      "Scholarship Status",
    ];

    const rows = students.map(s => [
      s.surname,
      s.otherNames,
      s.gender,
      s.dateOfBirth,
      s.className,
      s.yearOfEntry,
      s.zoneInNansana,
      s.guardianName,
      s.guardianContact,
      s.communityWorker,
      s.workerContact,
      s.hasScholarship ? "Yes" : "No",
    ]);

    const values = [headers, ...rows];

    // 3. Write values to spreadsheet
    const writeResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:L${values.length}?valueInputOption=USER_ENTERED`,
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
