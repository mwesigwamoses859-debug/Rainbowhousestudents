import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Users, 
  FileSpreadsheet, 
  Calendar, 
  Download, 
  CheckCircle2, 
  Lock, 
  Unlock,
  Building2, 
  Search,
  Award,
  BarChart3,
  BookmarkPlus,
  Upload,
  Trash2,
  AlertCircle,
  X,
  FileCheck,
  ChevronRight,
  TrendingUp,
  RefreshCw,
  Eye,
  Info
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Student, Mark, ClassName } from '../types';
import AshinagaLogo from './AshinagaLogo';

interface HistoricalCensusArchiveProps {
  students: Student[];
  marks: Mark[];
  isAdmin: boolean;
}

export interface ArchivedStudent {
  id: string;
  name: string;
  surname?: string;
  otherNames?: string;
  gender: 'Male' | 'Female';
  className: ClassName;
  dateOfBirth?: string;
  yearOfEntry?: number;
  guardianName?: string;
  guardianContact?: string;
  zone?: string;
  hasScholarship: boolean;
  communityWorker?: string;
}

export interface CensusSnapshot {
  year: number;
  savedAt: string;
  fileName?: string;
  totalStudents: number;
  classCounts: Record<ClassName, number>;
  genderCounts: { Male: number; Female: number };
  scholarshipCount: number;
  students: ArchivedStudent[];
  isLocked?: boolean;
}

const ALL_CLASSES: ClassName[] = ['P.1', 'P.2', 'P.3', 'P.4', 'P.5', 'P.6', 'P.7'];
const CURRENT_YEAR = new Date().getFullYear();

export default function HistoricalCensusArchive({ students, marks, isAdmin }: HistoricalCensusArchiveProps) {
  // Load custom saved snapshots from localStorage and remote database
  const [savedSnapshots, setSavedSnapshots] = useState<Record<number, CensusSnapshot>>(() => {
    try {
      const stored = localStorage.getItem('ashinaga_census_snapshots');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Fetch archives from server database / Cloudflare D1
  useEffect(() => {
    fetch('/api/census-archives')
      .then(res => res.ok ? res.json() : [])
      .then(archives => {
        if (Array.isArray(archives) && archives.length > 0) {
          const loaded: Record<number, CensusSnapshot> = {};
          archives.forEach((a: any) => {
            try {
              const payload = typeof a.snapshot_payload === 'string'
                ? JSON.parse(a.snapshot_payload)
                : (a.snapshot_payload || a.snapshotPayload);
              if (payload && payload.year) {
                loaded[payload.year] = payload;
              }
            } catch {}
          });
          setSavedSnapshots(prev => {
            const merged = { ...prev, ...loaded };
            try {
              localStorage.setItem('ashinaga_census_snapshots', JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      })
      .catch(err => console.error('Failed to load remote census archives', err));
  }, []);

  const availableYears = useMemo(() => {
    return Object.keys(savedSnapshots)
      .map(Number)
      .sort((a, b) => b - a);
  }, [savedSnapshots]);

  // Selected year state (defaults to latest available year or current year if none)
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const years = Object.keys(savedSnapshots).map(Number).sort((a, b) => b - a);
    return years.length > 0 ? years[0] : CURRENT_YEAR;
  });

  // Table filtering and search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('All');
  const [selectedGenderFilter, setSelectedGenderFilter] = useState<string>('All');
  const [selectedScholarshipFilter, setSelectedScholarshipFilter] = useState<string>('All');

  // Feedback notifications
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadTargetYear, setUploadTargetYear] = useState<number>(CURRENT_YEAR - 1);
  const [dragActive, setDragActive] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<{
    fileName: string;
    total: number;
    boys: number;
    girls: number;
    scholars: number;
    classCounts: Record<ClassName, number>;
    students: ArchivedStudent[];
  } | null>(null);
  const [parseError, setParseError] = useState<string>('');
  const [deleteConfirmYear, setDeleteConfirmYear] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4500);
  };

  const persistSnapshots = async (updated: Record<number, CensusSnapshot>) => {
    setSavedSnapshots(updated);
    try {
      localStorage.setItem('ashinaga_census_snapshots', JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to save snapshots to localStorage', err);
    }

    try {
      let token = '';
      const stored = localStorage.getItem('school_sms_teacher');
      if (stored) token = JSON.parse(stored).authToken || '';

      for (const [yr, snap] of Object.entries(updated)) {
        await fetch('/api/census-archives', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            year: Number(yr),
            totalStudents: snap.totalStudents,
            snapshotPayload: snap
          })
        });
      }
    } catch (e) {
      console.error('Failed to sync census archives to database', e);
    }
  };

  // Helper to normalize class names to P.1 - P.7
  const normalizeClassName = (raw: any): ClassName => {
    if (!raw) return 'P.1';
    const str = String(raw).trim().toUpperCase();
    if (str.includes('1') || str.includes('ONE')) return 'P.1';
    if (str.includes('2') || str.includes('TWO')) return 'P.2';
    if (str.includes('3') || str.includes('THREE')) return 'P.3';
    if (str.includes('4') || str.includes('FOUR')) return 'P.4';
    if (str.includes('5') || str.includes('FIVE')) return 'P.5';
    if (str.includes('6') || str.includes('SIX')) return 'P.6';
    if (str.includes('7') || str.includes('SEVEN')) return 'P.7';
    return 'P.1';
  };

  // Helper to normalize gender
  const normalizeGender = (raw: any): 'Male' | 'Female' => {
    if (!raw) return 'Female';
    const val = String(raw).trim().toUpperCase();
    if (val.startsWith('M') || val === 'BOY') return 'Male';
    return 'Female';
  };

  // Helper to check scholarship
  const normalizeScholarship = (raw: any): boolean => {
    if (!raw) return false;
    const str = String(raw).trim().toLowerCase();
    return str === 'yes' || str === 'y' || str === 'true' || str === '1' || str.includes('scholar') || str.includes('beneficiary');
  };

  // Parse Excel file for a specific year
  const handleProcessExcel = (file: File) => {
    setParseError('');
    setParsedPreview(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          setParseError('The selected Excel file has no readable sheets.');
          return;
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (rawJson.length === 0) {
          setParseError('The uploaded sheet is empty. Please check the file contents.');
          return;
        }

        // Detect columns flexibly
        const firstRow = rawJson[0];
        const keys = Object.keys(firstRow);

        const findKey = (candidates: string[]) => {
          return keys.find(k => {
            const clean = k.toLowerCase().replace(/[^a-z0-9]/g, '');
            return candidates.some(c => clean.includes(c));
          });
        };

        const surnameKey = findKey(['surname', 'lastname', 'familyname']);
        const otherNamesKey = findKey(['othernames', 'firstname', 'middlename', 'givenname']);
        const fullNameKey = findKey(['fullname', 'pupilname', 'studentname', 'name', 'pupil', 'student']);
        const genderKey = findKey(['gender', 'sex']);
        const classKey = findKey(['classname', 'class', 'grade', 'level']);
        const dobKey = findKey(['dob', 'dateofbirth', 'birthdate', 'birth']);
        const entryKey = findKey(['yearofentry', 'entryyear', 'admissionyear']);
        const guardianKey = findKey(['guardianname', 'guardian', 'parentname', 'parent', 'nextofkin']);
        const contactKey = findKey(['contact', 'phone', 'telephone', 'mobile', 'tel']);
        const zoneKey = findKey(['zone', 'village', 'address', 'residence', 'location']);
        const scholarshipKey = findKey(['scholarship', 'beneficiary', 'sponsor', 'sponsored']);
        const idKey = findKey(['id', 'pupilid', 'studentid', 'admissionno', 'regno', 'number']);

        const classCounts: Record<ClassName, number> = {
          'P.1': 0, 'P.2': 0, 'P.3': 0, 'P.4': 0, 'P.5': 0, 'P.6': 0, 'P.7': 0
        };
        let boys = 0;
        let girls = 0;
        let scholars = 0;

        const studentsList: ArchivedStudent[] = rawJson.map((row, idx) => {
          let name = '';
          if (surnameKey && row[surnameKey]) {
            const sName = String(row[surnameKey]).trim();
            const oName = otherNamesKey && row[otherNamesKey] ? String(row[otherNamesKey]).trim() : '';
            name = `${sName} ${oName}`.trim();
          } else if (fullNameKey && row[fullNameKey]) {
            name = String(row[fullNameKey]).trim();
          } else {
            name = `Student ${idx + 1}`;
          }

          const gender = normalizeGender(genderKey ? row[genderKey] : 'Female');
          if (gender === 'Male') boys += 1;
          else girls += 1;

          const className = normalizeClassName(classKey ? row[classKey] : 'P.1');
          classCounts[className] += 1;

          const hasScholarship = normalizeScholarship(scholarshipKey ? row[scholarshipKey] : false);
          if (hasScholarship) scholars += 1;

          const id = idKey && row[idKey] 
            ? String(row[idKey]).trim() 
            : `RH-${uploadTargetYear}-${String(idx + 1).padStart(3, '0')}`;

          return {
            id,
            name,
            surname: surnameKey && row[surnameKey] ? String(row[surnameKey]).trim() : name.split(' ')[0],
            otherNames: otherNamesKey && row[otherNamesKey] ? String(row[otherNamesKey]).trim() : name.split(' ').slice(1).join(' '),
            gender,
            className,
            dateOfBirth: dobKey && row[dobKey] ? String(row[dobKey]).trim() : '',
            yearOfEntry: entryKey && Number(row[entryKey]) ? Number(row[entryKey]) : uploadTargetYear,
            guardianName: guardianKey && row[guardianKey] ? String(row[guardianKey]).trim() : 'On Record',
            guardianContact: contactKey && row[contactKey] ? String(row[contactKey]).trim() : 'N/A',
            zone: zoneKey && row[zoneKey] ? String(row[zoneKey]).trim() : 'Nansana',
            hasScholarship,
            communityWorker: 'Ashinaga Staff'
          };
        });

        setParsedPreview({
          fileName: file.name,
          total: studentsList.length,
          boys,
          girls,
          scholars,
          classCounts,
          students: studentsList
        });
      } catch (err: any) {
        console.error('Error parsing Excel file:', err);
        setParseError(`Failed to parse Excel file: ${err.message || 'Check spreadsheet format'}`);
      }
    };

    reader.onerror = () => setParseError('Failed to read the selected file.');
    reader.readAsArrayBuffer(file);
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessExcel(e.dataTransfer.files[0]);
    }
  };

  // Confirm and Save parsed archive for target year
  const handleSaveArchiveSnapshot = () => {
    if (!parsedPreview) return;

    const snapshot: CensusSnapshot = {
      year: uploadTargetYear,
      savedAt: new Date().toISOString(),
      fileName: parsedPreview.fileName,
      totalStudents: parsedPreview.total,
      classCounts: parsedPreview.classCounts,
      genderCounts: { Male: parsedPreview.boys, Female: parsedPreview.girls },
      scholarshipCount: parsedPreview.scholars,
      students: parsedPreview.students,
      isLocked: false
    };

    const updated = { ...savedSnapshots, [uploadTargetYear]: snapshot };
    persistSnapshots(updated);
    setSelectedYear(uploadTargetYear);
    setIsUploadModalOpen(false);
    setParsedPreview(null);
    showNotification(`Academic Year ${uploadTargetYear} Archive successfully saved (${snapshot.totalStudents} pupils)!`, 'success');
  };

  // Delete a specific year's archive
  const handleDeleteYear = (yearToDelete: number) => {
    const updated = { ...savedSnapshots };
    delete updated[yearToDelete];
    persistSnapshots(updated);
    setDeleteConfirmYear(null);

    const remainingYears = Object.keys(updated).map(Number).sort((a, b) => b - a);
    if (remainingYears.length > 0) {
      setSelectedYear(remainingYears[0]);
    } else {
      setSelectedYear(CURRENT_YEAR);
    }
    showNotification(`Year ${yearToDelete} archive has been removed.`, 'info');
  };

  // Toggle Lock/Freeze Status
  const handleToggleLock = (yearToToggle: number) => {
    const existing = savedSnapshots[yearToToggle];
    if (!existing) return;

    const updated = {
      ...savedSnapshots,
      [yearToToggle]: {
        ...existing,
        isLocked: !existing.isLocked
      }
    };
    persistSnapshots(updated);
    showNotification(
      `Academic Year ${yearToToggle} archive is now ${!existing.isLocked ? 'Locked & Protected' : 'Unlocked'}!`,
      'info'
    );
  };

  // Download official sample Excel template
  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const templateHeaders = [
      'Pupil ID',
      'Surname',
      'Other Names',
      'Gender',
      'Class Name',
      'Date of Birth',
      'Year of Entry',
      "Guardian's Name",
      'Guardian Contact Phone',
      'Zone in Nansana',
      'Scholarship Status (Yes/No)'
    ];

    const sampleRows = [
      [
        'RH-2023-001',
        'Mukasa',
        'John Baptist',
        'Male',
        'P.5',
        '2014-05-12',
        2021,
        'Namatovu Florence',
        '+256 702 112233',
        'Nabweru',
        'Yes'
      ],
      [
        'RH-2023-002',
        'Nalweyiso',
        'Sarah Peace',
        'Female',
        'P.6',
        '2013-09-24',
        2020,
        'Kato Joseph',
        '+256 772 445566',
        'Gganda',
        'No'
      ],
      [
        'RH-2023-003',
        'Atwine',
        'Patience',
        'Female',
        'P.7',
        '2012-11-03',
        2019,
        'Babirye Harriet',
        '+256 752 998877',
        'Wamala',
        'Yes'
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet([templateHeaders, ...sampleRows]);
    XLSX.utils.book_append_sheet(wb, ws, 'Student Archive Template');
    XLSX.writeFile(wb, 'Ashinaga_Historical_Student_Archive_Template.xlsx');
  };

  // Export Selected Year Archive to Excel (.xlsx)
  const handleExportSelectedYearExcel = (yearToExport: number) => {
    const census = savedSnapshots[yearToExport];
    if (!census) return;

    const wb = XLSX.utils.book_new();

    // Summary Sheet
    const summaryRows = [
      ['ASHINAGA UGANDA RAINBOW HOUSE - HISTORICAL STUDENT ARCHIVE'],
      ['Academic Year:', String(yearToExport)],
      ['Total Enrollment:', String(census.totalStudents)],
      ['Male Pupils:', String(census.genderCounts.Male)],
      ['Female Pupils:', String(census.genderCounts.Female)],
      ['Scholarship Beneficiaries:', String(census.scholarshipCount)],
      ['Archived Date:', new Date(census.savedAt).toLocaleDateString('en-GB')],
      ['Status:', census.isLocked ? 'LOCKED / AUDITED' : 'ACTIVE ARCHIVE'],
      [''],
      ['CLASS BREAKDOWN'],
      ['Class', 'Enrolled Count', 'Percentage'],
      ...ALL_CLASSES.map(cls => [
        cls,
        String(census.classCounts[cls] || 0),
        `${census.totalStudents ? Math.round(((census.classCounts[cls] || 0) / census.totalStudents) * 100) : 0}%`
      ])
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, `Summary ${yearToExport}`);

    // Roster Sheet
    const rosterHeaders = [
      'No.',
      'Pupil ID',
      'Full Name',
      'Gender',
      'Class',
      'Date of Birth',
      'Year of Entry',
      'Guardian Name',
      'Guardian Contact Phone',
      'Zone in Nansana',
      'Scholarship Beneficiary'
    ];

    const rosterRows = census.students.map((s, idx) => [
      idx + 1,
      s.id,
      s.name,
      s.gender,
      s.className,
      s.dateOfBirth || 'N/A',
      s.yearOfEntry || yearToExport,
      s.guardianName || 'N/A',
      s.guardianContact || 'N/A',
      s.zone || 'Nansana',
      s.hasScholarship ? 'Yes' : 'No'
    ]);

    const wsRoster = XLSX.utils.aoa_to_sheet([rosterHeaders, ...rosterRows]);
    XLSX.utils.book_append_sheet(wb, wsRoster, `Roster ${yearToExport}`);

    XLSX.writeFile(wb, `Rainbow_House_Student_Archive_${yearToExport}.xlsx`);
  };

  // Export Multi-Year Comparative Census Summary
  const handleExportAllYearsExcel = () => {
    if (availableYears.length === 0) return;
    const wb = XLSX.utils.book_new();

    const summaryHeaders = [
      'Academic Year',
      'P.1', 'P.2', 'P.3', 'P.4', 'P.5', 'P.6', 'P.7',
      'Male Pupils',
      'Female Pupils',
      'Scholarship Beneficiaries',
      'Total Enrolled'
    ];

    const rows = availableYears.map(yr => {
      const snap = savedSnapshots[yr];
      return [
        String(yr),
        String(snap.classCounts['P.1'] || 0),
        String(snap.classCounts['P.2'] || 0),
        String(snap.classCounts['P.3'] || 0),
        String(snap.classCounts['P.4'] || 0),
        String(snap.classCounts['P.5'] || 0),
        String(snap.classCounts['P.6'] || 0),
        String(snap.classCounts['P.7'] || 0),
        String(snap.genderCounts.Male || 0),
        String(snap.genderCounts.Female || 0),
        String(snap.scholarshipCount || 0),
        String(snap.totalStudents || 0)
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([
      ['ASHINAGA UGANDA - MULTI-YEAR HISTORICAL ENROLLMENT LEDGER'],
      ['Generated On:', new Date().toLocaleDateString('en-GB')],
      ['Authority:', 'Director of Studies & Headteacher Office'],
      [''],
      summaryHeaders,
      ...rows
    ]);

    XLSX.utils.book_append_sheet(wb, ws, 'Multi-Year Census Summary');
    XLSX.writeFile(wb, 'Ashinaga_MultiYear_Historical_Census_Ledger.xlsx');
  };

  // Currently selected year snapshot
  const currentSnapshot = savedSnapshots[selectedYear] || null;

  // Filtered roster for table display
  const displayRoster = useMemo(() => {
    if (!currentSnapshot) return [];
    return currentSnapshot.students.filter(student => {
      const matchesSearch = 
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (student.zone && student.zone.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (student.guardianContact && student.guardianContact.includes(searchQuery));

      const matchesClass = selectedClassFilter === 'All' || student.className === selectedClassFilter;
      const matchesGender = selectedGenderFilter === 'All' || student.gender === selectedGenderFilter;
      const matchesScholarship = 
        selectedScholarshipFilter === 'All' ||
        (selectedScholarshipFilter === 'Beneficiary' && student.hasScholarship) ||
        (selectedScholarshipFilter === 'Standard' && !student.hasScholarship);

      return matchesSearch && matchesClass && matchesGender && matchesScholarship;
    });
  }, [currentSnapshot, searchQuery, selectedClassFilter, selectedGenderFilter, selectedScholarshipFilter]);

  return (
    <div id="historical_census_archive_view" className="p-6 md:p-8 space-y-6 font-sans max-w-7xl mx-auto">
      
      {/* Header Banner */}
      <header className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white shadow-xl relative overflow-hidden border border-indigo-900/40">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none p-6">
          <Building2 className="h-64 w-64 text-indigo-400" />
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <AshinagaLogo size={56} className="bg-white p-1 rounded-2xl shadow-md shrink-0" />
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-full text-[10px] font-black uppercase tracking-widest mb-1.5">
                <BookmarkPlus className="h-3 w-3 text-amber-400" /> Multi-Year Historical Archive
              </div>
              <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
                Historical Student Archive & Annual Census
              </h1>
              <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                Dedicated vault for past academic cohorts. Upload an Excel spreadsheet (.xlsx / .xls) for each academic year to preserve verified records and generate official executive ledgers.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => {
                setParsedPreview(null);
                setParseError('');
                setIsUploadModalOpen(true);
              }}
              className="px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2 active:scale-95 border border-indigo-400"
            >
              <Upload className="h-4 w-4" />
              <span>Upload Year Excel</span>
            </button>

            <button
              onClick={handleDownloadTemplate}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 border border-slate-700"
              title="Download official sample Excel template"
            >
              <Download className="h-3.5 w-3.5 text-slate-400" />
              <span>Get Excel Template</span>
            </button>

            {availableYears.length > 0 && (
              <button
                onClick={handleExportAllYearsExcel}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer flex items-center gap-2 border border-emerald-500"
                title="Export all uploaded years into an executive multi-year ledger"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-200" />
                <span>Export Multi-Year Summary</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Notifications */}
      {notification && (
        <div className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm animate-fade-in ${
          notification.type === 'success' 
            ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' 
            : notification.type === 'error'
            ? 'bg-rose-50 text-rose-900 border border-rose-200'
            : 'bg-indigo-50 text-indigo-900 border border-indigo-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className={`h-5 w-5 shrink-0 ${notification.type === 'success' ? 'text-emerald-600' : 'text-indigo-600'}`} />
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {availableYears.length === 0 ? (
        /* Empty State: Prompt user to upload the first year's Excel */
        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center shadow-sm space-y-6">
          <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
            <FileSpreadsheet className="h-10 w-10 text-indigo-500" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-xl font-black text-slate-800">
              Historical Student Archive is Empty
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              No historical student cohorts have been uploaded yet. Upload an Excel spreadsheet (.xlsx / .xls) for any past academic year (e.g. 2021, 2022, 2023, 2024) to establish your permanent multi-year student register.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                setParsedPreview(null);
                setParseError('');
                setIsUploadModalOpen(true);
              }}
              className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center gap-2 active:scale-95"
            >
              <Upload className="h-4 w-4" />
              <span>Upload Your First Year Archive (.xlsx)</span>
            </button>

            <button
              onClick={handleDownloadTemplate}
              className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition-all cursor-pointer flex items-center gap-2"
            >
              <Download className="h-4 w-4 text-slate-500" />
              <span>Download Excel Template</span>
            </button>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 max-w-3xl mx-auto text-left">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">Per-Year Isolation</span>
              <h4 className="text-xs font-bold text-slate-800">1 File Per Academic Year</h4>
              <p className="text-[11px] text-slate-500">Each uploaded spreadsheet is cleanly isolated under its designated academic year.</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">Flexible Ingestion</span>
              <h4 className="text-xs font-bold text-slate-800">Smart Column Detection</h4>
              <p className="text-[11px] text-slate-500">Auto-detects Pupil Name, Gender, Class, Guardian, Contact, Zone, and Scholarships.</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">Executive Reports</span>
              <h4 className="text-xs font-bold text-slate-800">Instant Excel Exports</h4>
              <p className="text-[11px] text-slate-500">Generate Ministry-ready and Board-ready Excel summaries with one click.</p>
            </div>
          </div>
        </div>
      ) : (
        /* Populated Dashboard: When at least one year exists */
        <div className="space-y-6">
          
          {/* Year Switcher Bar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider mr-2 shrink-0 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-indigo-600" /> Academic Years:
              </span>
              {availableYears.map(yr => {
                const snap = savedSnapshots[yr];
                const isSelected = selectedYear === yr;
                return (
                  <button
                    key={yr}
                    onClick={() => setSelectedYear(yr)}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10 ring-2 ring-indigo-500/20'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80'
                    }`}
                  >
                    <span>{yr}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {snap?.totalStudents || 0}
                    </span>
                    {snap?.isLocked && <Lock className="h-3 w-3 text-amber-400" />}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setParsedPreview(null);
                  setParseError('');
                  setIsUploadModalOpen(true);
                }}
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border border-indigo-200"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>+ Upload Another Year</span>
              </button>
            </div>
          </div>

          {currentSnapshot && (
            <>
              {/* Year Overview Controls & Status */}
              <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-800 font-black text-xs rounded-xl">
                    Year {selectedYear}
                  </span>
                  <div className="text-xs text-slate-500">
                    <span>Archived on <strong>{new Date(currentSnapshot.savedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></span>
                    {currentSnapshot.fileName && <span className="ml-2 font-mono text-[10px] text-slate-400">({currentSnapshot.fileName})</span>}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleToggleLock(selectedYear)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border ${
                      currentSnapshot.isLocked
                        ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                    title={currentSnapshot.isLocked ? 'Archive is locked from accidental changes' : 'Click to lock this archive'}
                  >
                    {currentSnapshot.isLocked ? <Lock className="h-3.5 w-3.5 text-amber-600" /> : <Unlock className="h-3.5 w-3.5 text-slate-400" />}
                    <span>{currentSnapshot.isLocked ? 'Locked / Audited' : 'Lock Year'}</span>
                  </button>

                  <button
                    onClick={() => handleExportSelectedYearExcel(selectedYear)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download {selectedYear} Excel</span>
                  </button>

                  <button
                    onClick={() => {
                      setUploadTargetYear(selectedYear);
                      setParsedPreview(null);
                      setParseError('');
                      setIsUploadModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
                    <span>Re-upload / Replace</span>
                  </button>

                  <button
                    onClick={() => setDeleteConfirmYear(selectedYear)}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition-all cursor-pointer flex items-center gap-1.5"
                    title="Delete this year's archive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>

              {/* KPI Stat Cards for Selected Year */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Total Enrollment */}
                <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Enrollment</span>
                    <Users className="h-5 w-5 text-indigo-500" />
                  </div>
                  <h3 className="text-3xl font-black text-slate-800">
                    {currentSnapshot.totalStudents} <span className="text-xs font-medium text-slate-400">Pupils</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Official cohort count for Academic Year {selectedYear}.
                  </p>
                </div>

                {/* Gender Balance */}
                <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Gender Ratio</span>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold">
                      <span className="text-blue-600">{currentSnapshot.genderCounts.Male} Boys</span>
                      <span className="text-slate-300">/</span>
                      <span className="text-pink-600">{currentSnapshot.genderCounts.Female} Girls</span>
                    </div>
                  </div>
                  
                  {/* Visual ratio bar */}
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex mt-3">
                    <div 
                      className="bg-blue-500 h-full transition-all" 
                      style={{ width: `${currentSnapshot.totalStudents ? (currentSnapshot.genderCounts.Male / currentSnapshot.totalStudents) * 100 : 50}%` }}
                      title={`Boys: ${currentSnapshot.genderCounts.Male}`}
                    />
                    <div 
                      className="bg-pink-500 h-full transition-all" 
                      style={{ width: `${currentSnapshot.totalStudents ? (currentSnapshot.genderCounts.Female / currentSnapshot.totalStudents) * 100 : 50}%` }}
                      title={`Girls: ${currentSnapshot.genderCounts.Female}`}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 mt-2">
                    <span>
                      {currentSnapshot.totalStudents ? Math.round((currentSnapshot.genderCounts.Male / currentSnapshot.totalStudents) * 100) : 0}% Boys
                    </span>
                    <span>
                      {currentSnapshot.totalStudents ? Math.round((currentSnapshot.genderCounts.Female / currentSnapshot.totalStudents) * 100) : 0}% Girls
                    </span>
                  </div>
                </div>

                {/* Scholarship Beneficiaries */}
                <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-600">Scholarship Support</span>
                    <Award className="h-5 w-5 text-amber-500" />
                  </div>
                  <h3 className="text-3xl font-black text-amber-900">
                    {currentSnapshot.scholarshipCount} <span className="text-xs font-medium text-amber-600">Scholars</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-2">
                    {currentSnapshot.totalStudents 
                      ? `${Math.round((currentSnapshot.scholarshipCount / currentSnapshot.totalStudents) * 100)}% of cohort supported by Ashinaga` 
                      : '0%'}
                  </p>
                </div>

                {/* Classes Active */}
                <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-900 to-slate-900 text-white border border-indigo-900 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300">Grade Coverage</span>
                      <BarChart3 className="h-5 w-5 text-indigo-300" />
                    </div>
                    <h3 className="text-3xl font-black">
                      {ALL_CLASSES.filter(c => (currentSnapshot.classCounts[c] || 0) > 0).length} / 7
                      <span className="text-xs font-normal text-indigo-200 ml-1">Classes</span>
                    </h3>
                  </div>
                  <p className="text-[10px] text-indigo-200 mt-2">
                    Primary 1 through Primary 7 active representation.
                  </p>
                </div>

              </div>

              {/* Class-by-Class Breakdown Grid with 1-Click Filter */}
              <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-indigo-600" />
                      Class Distribution in {selectedYear}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Click any class card to instantly filter the student table below.
                    </p>
                  </div>

                  {selectedClassFilter !== 'All' && (
                    <button
                      onClick={() => setSelectedClassFilter('All')}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer flex items-center gap-1"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Clear class filter (Showing {selectedClassFilter})</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                  {ALL_CLASSES.map(cls => {
                    const count = currentSnapshot.classCounts[cls] || 0;
                    const percentage = currentSnapshot.totalStudents ? Math.round((count / currentSnapshot.totalStudents) * 100) : 0;
                    const isActive = selectedClassFilter === cls;

                    return (
                      <div 
                        key={cls}
                        onClick={() => setSelectedClassFilter(isActive ? 'All' : cls)}
                        className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer text-center ${
                          isActive 
                            ? 'bg-indigo-50 border-indigo-600 shadow-sm scale-105' 
                            : 'bg-slate-50 border-slate-100 hover:border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-[10px] font-black uppercase text-slate-400 block font-mono">Class</span>
                        <strong className="text-base font-black text-slate-800 block">{cls}</strong>
                        <span className="text-xl font-black text-indigo-600 block mt-1">{count}</span>
                        <span className="text-[9px] font-bold text-slate-400 block mt-0.5">{percentage}% of total</span>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Detailed Student Roster Table for Selected Year */}
              <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
                
                {/* Table Header & Search/Filters */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                      <Users className="h-5 w-5 text-indigo-600" />
                      Detailed Student Roster ({selectedYear})
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Showing {displayRoster.length} of {currentSnapshot.totalStudents} student profiles enrolled for academic year {selectedYear}.
                    </p>
                  </div>

                  {/* Filters Bar */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Search */}
                    <div className="relative">
                      <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                      <input 
                        type="text"
                        placeholder="Search pupil name, zone, ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 w-52"
                      />
                    </div>

                    {/* Class filter */}
                    <select
                      value={selectedClassFilter}
                      onChange={(e) => setSelectedClassFilter(e.target.value)}
                      className="px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                      <option value="All">All Classes (P.1 - P.7)</option>
                      {ALL_CLASSES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>

                    {/* Gender filter */}
                    <select
                      value={selectedGenderFilter}
                      onChange={(e) => setSelectedGenderFilter(e.target.value)}
                      className="px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                      <option value="All">All Genders</option>
                      <option value="Male">Male Pupils</option>
                      <option value="Female">Female Pupils</option>
                    </select>

                    {/* Scholarship filter */}
                    <select
                      value={selectedScholarshipFilter}
                      onChange={(e) => setSelectedScholarshipFilter(e.target.value)}
                      className="px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                      <option value="All">All Scholarship Statuses</option>
                      <option value="Beneficiary">★ Beneficiaries Only</option>
                      <option value="Standard">Standard Students</option>
                    </select>
                  </div>
                </div>

                {/* Table */}
                {displayRoster.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-xs font-bold space-y-2">
                    <p>No student records match the selected filters for academic year {selectedYear}.</p>
                    {(searchQuery || selectedClassFilter !== 'All' || selectedGenderFilter !== 'All' || selectedScholarshipFilter !== 'All') && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedClassFilter('All');
                          setSelectedGenderFilter('All');
                          setSelectedScholarshipFilter('All');
                        }}
                        className="text-indigo-600 hover:underline cursor-pointer"
                      >
                        Reset all search and filters
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 uppercase font-black tracking-wider border-b border-slate-100">
                          <th className="px-4 py-3">No.</th>
                          <th className="px-4 py-3">Pupil Name</th>
                          <th className="px-4 py-3">Gender</th>
                          <th className="px-4 py-3">Class in {selectedYear}</th>
                          <th className="px-4 py-3">Guardian Name & Phone</th>
                          <th className="px-4 py-3">Zone in Nansana</th>
                          <th className="px-4 py-3">Scholarship</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {displayRoster.map((student, idx) => (
                          <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-3 font-mono text-slate-400">{idx + 1}</td>
                            <td className="px-4 py-3">
                              <strong className="text-slate-900 uppercase block font-black">{student.name}</strong>
                              <span className="text-[10px] text-slate-400 font-mono block">ID: {student.id}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                student.gender === 'Female' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {student.gender}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-black text-xs">
                                {student.className}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="block font-medium text-slate-800">{student.guardianName || 'On Record'}</span>
                              <span className="font-mono text-slate-500 text-[10px] block">{student.guardianContact || 'N/A'}</span>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{student.zone || 'Nansana'}</td>
                            <td className="px-4 py-3">
                              {student.hasScholarship ? (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black rounded uppercase">
                                  ★ Beneficiary
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-bold">Standard</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}

        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmYear !== null && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-rose-100 animate-scale-up">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 className="h-6 w-6" />
            </div>
            
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">
                Delete Academic Year {deleteConfirmYear} Archive?
              </h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to remove the archived student records for academic year {deleteConfirmYear}? This will empty this year until you re-upload an Excel file.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmYear(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteYear(deleteConfirmYear)}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Year Excel Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8 border border-slate-100 animate-scale-up max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Upload Annual Student Archive
                  </h3>
                  <p className="text-xs text-slate-400">
                    Select the target academic year and upload your Excel spreadsheet.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsUploadModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Target Year Selector */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-slate-600 tracking-wider flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-indigo-600" /> Target Academic Year
              </label>
              <div className="flex items-center gap-3">
                <select
                  value={uploadTargetYear}
                  onChange={(e) => setUploadTargetYear(Number(e.target.value))}
                  className="flex-1 px-4 py-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  {[2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016].map(y => (
                    <option key={y} value={y}>
                      Academic Year {y} {savedSnapshots[y] ? '(Overwrites Existing)' : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                  title="Download standard template to check headers"
                >
                  <Download className="h-3.5 w-3.5 text-slate-500" />
                  <span>Template</span>
                </button>
              </div>
            </div>

            {/* Drag & Drop Upload Dropzone */}
            {!parsedPreview ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
                  dragActive 
                    ? 'border-indigo-600 bg-indigo-50/50' 
                    : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/20'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept=".xlsx, .xls" 
                  onChange={(e) => e.target.files?.[0] && handleProcessExcel(e.target.files[0])} 
                  className="hidden" 
                />
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm text-indigo-600 flex items-center justify-center mx-auto mb-3">
                  <FileSpreadsheet className="h-8 w-8 text-indigo-500" />
                </div>
                <h4 className="text-sm font-black text-slate-800">
                  Click to browse or drag & drop Excel file
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Supports Microsoft Excel (.xlsx, .xls). Automatic column mapping for Names, Classes, Genders, and Guardians.
                </p>
              </div>
            ) : (
              /* Preview of parsed data */
              <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-5 w-5 text-emerald-600" />
                    <div>
                      <h4 className="text-xs font-black text-slate-800">
                        Spreadsheet Ready: {parsedPreview.fileName}
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        Targeting Academic Year <strong>{uploadTargetYear}</strong>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setParsedPreview(null)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Change File
                  </button>
                </div>

                {/* Detected Stats Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Total Pupils</span>
                    <strong className="text-base font-black text-slate-800">{parsedPreview.total}</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-blue-500 block uppercase">Boys</span>
                    <strong className="text-base font-black text-blue-700">{parsedPreview.boys}</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-pink-500 block uppercase">Girls</span>
                    <strong className="text-base font-black text-pink-700">{parsedPreview.girls}</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-amber-500 block uppercase">Scholars</span>
                    <strong className="text-base font-black text-amber-700">{parsedPreview.scholars}</strong>
                  </div>
                </div>

                {/* Sample Rows Preview */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    First 4 Student Rows Preview:
                  </span>
                  <div className="space-y-1">
                    {parsedPreview.students.slice(0, 4).map((s, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] bg-white p-2 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-400">{idx + 1}.</span>
                          <span className="font-bold text-slate-800">{s.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded font-bold">{s.className}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className={s.gender === 'Female' ? 'text-pink-600' : 'text-blue-600'}>{s.gender}</span>
                          {s.hasScholarship && <span className="text-amber-600 font-bold">★ Scholar</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {parseError && (
              <div className="p-3.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{parseError}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!parsedPreview}
                onClick={handleSaveArchiveSnapshot}
                className={`px-6 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 shadow-md ${
                  parsedPreview
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer active:scale-95'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Save Year {uploadTargetYear} Archive</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
