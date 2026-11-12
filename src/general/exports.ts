import {
  GeneralStudent,
  GeneralDocument,
  CareRoster,
  fullName,
  DOCUMENT_CATEGORIES,
} from "./model";
import { FORM_SECTIONS } from "./fields";
import { Teacher } from "../types";
import { downloadBlob } from "./api";
export async function combinedLearnerPdf(
  student: GeneralStudent,
  documents: GeneralDocument[],
  teacher: Teacher,
) {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${student.registrationNumber} · Registration and documents`);
  const font = await pdf.embedFont(StandardFonts.Helvetica),
    bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595.28, 841.89]),
    y = 790;
  const safe = (s: string) =>
    String(s)
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[–—]/g, "-")
      .replace(/[^\x20-\x7E\n]/g, "?");
  const line = (text: string, size = 10, heavy = false) => {
    const f = heavy ? bold : font;
    const words = safe(text).split(/\s+/);
    let row = "";
    for (const word of words) {
      const next = row ? `${row} ${word}` : word;
      if (f.widthOfTextAtSize(next, size) > 490 && row) {
        if (y < 55) {
          page = pdf.addPage([595.28, 841.89]);
          y = 790;
        }
        page.drawText(row, {
          x: 50,
          y,
          size,
          font: f,
          color: rgb(0.08, 0.16, 0.25),
        });
        y -= size + 6;
        row = word;
      } else row = next;
    }
    if (y < 55) {
      page = pdf.addPage([595.28, 841.89]);
      y = 790;
    }
    page.drawText(row, {
      x: 50,
      y,
      size,
      font: f,
      color: rgb(0.08, 0.16, 0.25),
    });
    y -= size + 7;
  };
  line("ASHINAGA UGANDA RAINBOW HOUSE", 17, true);
  line("General Registration Form", 14, true);
  line(`Registration number: ${student.registrationNumber}`, 11, true);
  line(`Learner: ${fullName(student)}`, 11);
  line("Confidential - authorised staff use only", 9);
  y -= 8;
  for (const section of FORM_SECTIONS.filter((s) => s.fields.length)) {
    line(section.title, 12, true);
    for (const field of section.fields) {
      const value = student[field.key];
      line(
        `${field.label}: ${value === undefined || value === "" ? "Not recorded" : String(value)}`,
      );
    }
    y -= 8;
  }
  line("Document checklist", 12, true);
  for (const category of DOCUMENT_CATEGORIES) {
    const files = documents.filter((d) => d.category === category);
    line(
      `${category}: ${files.length ? `${files.length} attached` : student.documentStatus[category] || "Missing / follow up"}`,
    );
  }
  line(
    `Care Program: ${student.careEnrolled ? "Enrolled" : "Not enrolled"} | Status: ${student.active ? "Active" : "Inactive"}`,
  );
  if (student.progressionHistory?.length) {
    line("Study progression history", 12, true);
    student.progressionHistory.forEach((h) =>
      line(`${h.year}: ${h.from} -> ${h.to}`),
    );
  }
  // Fetch each authenticated attachment without putting a session token in a URL.
  // Any unreadable PDF stops the bundle; the UI reports the affected file.
  for (const doc of documents) {
    const response = await fetch(
      `/api/general/students/${encodeURIComponent(student.id)}/documents/${encodeURIComponent(doc.id)}`,
      { headers: { Authorization: `Bearer ${teacher.authToken || ""}` } },
    );
    if (!response.ok)
      throw new Error(
        `Could not read ${doc.name}. Download the document separately and retry.`,
      );
    const bytes = await response.arrayBuffer();
    try {
      if (doc.mime === "application/pdf") {
        const source = await PDFDocument.load(bytes);
        const pages = await pdf.copyPages(source, source.getPageIndices());
        pages.forEach((p) => pdf.addPage(p));
      } else {
        const image =
          doc.mime === "image/png"
            ? await pdf.embedPng(bytes)
            : await pdf.embedJpg(bytes);
        const p = pdf.addPage([595.28, 841.89]);
        p.drawText(safe(`${doc.category} - ${doc.name}`).slice(0, 85), {
          x: 40,
          y: 800,
          size: 10,
          font: bold,
        });
        const ratio = Math.min(515 / image.width, 730 / image.height);
        p.drawImage(image, {
          x: (595.28 - image.width * ratio) / 2,
          y: 55,
          width: image.width * ratio,
          height: image.height * ratio,
        });
      }
    } catch {
      throw new Error(
        `${doc.name} could not be included. It may be encrypted or damaged. No incomplete combined PDF was downloaded.`,
      );
    }
  }
  const pages = pdf.getPages();
  pages.forEach((p, i) =>
    p.drawText(
      `Ashinaga Uganda | ${student.registrationNumber} | ${i + 1}/${pages.length}`,
      { x: 40, y: 25, size: 8, font, color: rgb(0.4, 0.45, 0.5) },
    ),
  );
  downloadBlob(
    new Blob([(await pdf.save()) as BlobPart], { type: "application/pdf" }),
    `${student.registrationNumber}-registration-and-documents.pdf`,
  );
}
export async function exportCareExcel(roster: CareRoster) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Ashinaga Uganda";
  const sheet = workbook.addWorksheet("Saturday register");
  sheet.columns = [
    { header: "Registration number", key: "number", width: 24 },
    { header: "Learner", key: "name", width: 30 },
    { header: "Zone", key: "zone", width: 22 },
    { header: "Level", key: "level", width: 24 },
    { header: "Saturday", key: "date", width: 15 },
    { header: "Eligibility", key: "eligibility", width: 16 },
    { header: "Reason", key: "reason", width: 65 },
    { header: "Attendance", key: "attendance", width: 16 },
    { header: "Attended days (to date)", key: "days", width: 23 },
    { header: "Last earlier attendance", key: "last", width: 24 },
    { header: "Guardian", key: "guardian", width: 28 },
    { header: "Guardian phone", key: "phone", width: 21 },
  ];
  for (const row of roster.rows) {
    const r = sheet.addRow({
      number: row.student.registrationNumber,
      name: fullName(row.student),
      zone: row.student.zone,
      level: `${row.student.educationLevel} ${row.student.grade}`,
      date: roster.day.date,
      eligibility: row.eligible ? "Due" : "Not due",
      reason: row.reason,
      attendance: row.attendance?.status || "Unmarked",
      days: row.attendedDays,
      last: row.lastAttended || "",
      guardian: row.student.guardianName,
      phone: row.student.guardianContact,
    });
    if (!row.eligible)
      r.eachCell((c) => {
        c.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFE2E2" },
        };
        c.font = { color: { argb: "FF991B1B" } };
      });
  }
  sheet.getRow(1).eachCell((c) => {
    c.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0B2D59" },
    };
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
  });
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: "A1", to: `L${Math.max(1, sheet.rowCount)}` };
  if (sheet.rowCount > 1)
    sheet.addConditionalFormatting({
      ref: `A2:L${sheet.rowCount}`,
      rules: [
        {
          type: "expression",
          priority: 1,
          formulae: ['$F2="Not due"'],
          style: {
            fill: {
              type: "pattern",
              pattern: "solid",
              bgColor: { argb: "FFFFE2E2" },
              fgColor: { argb: "FFFFE2E2" },
            },
            font: { color: { argb: "FF991B1B" } },
          },
        },
      ],
    });
  const guide = workbook.addWorksheet("Read me");
  guide.addRows([
    ["Ashinaga Uganda - Saturday Care Program"],
    ["Date", roster.day.date],
    ["Rule", roster.policy],
    [
      "Red rows",
      "Not due under the saved rule. Staff must record an override reason before checking in.",
    ],
    [
      "Attendance totals",
      "Distinct saved Saturday dates through the selected date. Unmarked never counts as present.",
    ],
    [
      "Snapshot",
      "This export is a snapshot. Edit and save attendance in the online system.",
    ],
    [
      "Privacy",
      "Guardian details are included for authorised staff follow-up. Family health details are excluded.",
    ],
  ]);
  guide.getColumn(1).width = 25;
  guide.getColumn(2).width = 110;
  downloadBlob(
    new Blob([(await workbook.xlsx.writeBuffer()) as BlobPart], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `Ashinaga-Saturday-${roster.day.date}.xlsx`,
  );
}
