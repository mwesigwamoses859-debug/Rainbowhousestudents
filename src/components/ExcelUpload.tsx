import React, { useState, useRef, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  CheckCircle, 
  AlertTriangle, 
  PlayCircle,
  X,
  FileCheck,
  RefreshCw,
  Database,
  Unplug,
  ExternalLink
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Student } from '../types';
import { googleSignIn, logout as googleLogout, initAuth } from '../lib/firebase';
import { 
  listSpreadsheets, 
  getSpreadsheetSheets, 
  fetchSheetValues, 
  mapSheetRowsToStudents,
  listSharedFolderFiles
} from '../lib/googleSheets';

interface ExcelUploadProps {
  onBulkAddStudents: (students: any[]) => Promise<void>;
  onSuccessRedirect: () => void;
}

export default function ExcelUpload({ onBulkAddStudents, onSuccessRedirect }: ExcelUploadProps) {
  // Tabs
  const [importSource, setImportSource] = useState<'excel' | 'google-sheets'>('excel');

  // Excel Upload States
  const [dragActive, setDragActive] = useState(false);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Google Sheets Integration States
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [googleToken, setGoogleToken] = useState<string>('');
  const [spreadsheets, setSpreadsheets] = useState<any[]>([]);
  const [selectedSpreadsheetId, setSelectedSpreadsheetId] = useState<string>('');
  const [customSpreadsheetUrl, setCustomSpreadsheetUrl] = useState<string>('');
  const [sheetsList, setSheetsList] = useState<string[]>([]);
  const [selectedSheetName, setSelectedSheetName] = useState<string>('');
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [loadingSpreadsheets, setLoadingSpreadsheets] = useState(false);
  
  // Shared Google Drive Folder States
  const [sharedFolderFiles, setSharedFolderFiles] = useState<any[]>([]);
  const [loadingSharedFolder, setLoadingSharedFolder] = useState(false);

  // Subscribe to Firebase Google OAuth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
        fetchSpreadsheets(token);
        fetchSharedFolderFiles(token);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken('');
        setSharedFolderFiles([]);
      }
    );
    return () => unsubscribe();
  }, []);

  // Download Sample Excel Template
  const handleDownloadTemplate = () => {
    const templateHeaders = [
      'Surname',
      'Other Names',
      'Gender',
      'Date of Birth',
      'Class Name',
      'Year of Entry',
      'Zone in Nansana',
      'Guardian Name',
      'Guardian Contact',
      'Community Worker',
      'Community Worker Contact',
      'Scholarship Status'
    ];

    const sampleRows = [
      {
        'Surname': 'Nsubuga',
        'Other Names': 'Joseph',
        'Gender': 'Male',
        'Date of Birth': '2016-04-10',
        'Class Name': 'P.5',
        'Year of Entry': 2022,
        'Zone in Nansana': 'Nabweru',
        'Guardian Name': 'Mukasa William',
        'Guardian Contact': '+256 702 445588',
        'Community Worker': 'Namatovu Florence',
        'Community Worker Contact': '+256 772 112233',
        'Scholarship Status': 'Yes'
      },
      {
        'Surname': 'Nalweyiso',
        'Other Names': 'Angel',
        'Gender': 'Female',
        'Date of Birth': '2015-11-22',
        'Class Name': 'P.6',
        'Year of Entry': 2021,
        'Zone in Nansana': 'Gganda',
        'Guardian Name': 'Nassolo Harriet',
        'Guardian Contact': '+256 752 998877',
        'Community Worker': 'Kibirige Sula',
        'Community Worker Contact': '+256 701 445522',
        'Scholarship Status': 'No'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleRows, { header: templateHeaders });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students Template');
    XLSX.writeFile(wb, 'nansana_students_import_template.xlsx');
  };

  // Excel Drag and Drop Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    setStatusMessage({ type: '', text: '' });
    
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'xlsx' && fileExtension !== 'xls' && fileExtension !== 'csv') {
      setStatusMessage({ 
        type: 'error', 
        text: 'Unsupported file type! Please upload a valid Microsoft Excel (.xlsx, .xls) or CSV file.' 
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (rawJson.length === 0) {
          setStatusMessage({ type: 'warning', text: 'The uploaded file appears to be empty.' });
          return;
        }

        const sheetHeaders = Object.keys(rawJson[0]);
        setHeaders(sheetHeaders);

        const mappedStudents = rawJson.map(row => {
          let dobStr = '2015-01-01';
          if (row['Date of Birth']) {
            if (row['Date of Birth'] instanceof Date) {
              dobStr = row['Date of Birth'].toISOString().split('T')[0];
            } else {
              const dateVal = new Date(row['Date of Birth']);
              if (!isNaN(dateVal.getTime())) {
                dobStr = dateVal.toISOString().split('T')[0];
              }
            }
          }

          let clName = String(row['Class Name'] || row['Class'] || 'P.1').trim().toUpperCase();
          if (clName.length === 2 && clName.startsWith('P')) {
            clName = `P.${clName[1]}`;
          }

          return {
            surname: row['Surname'] || row['SurName'] || row['Last Name'] || 'Unknown',
            otherNames: row['Other Names'] || row['OtherNames'] || row['First Name'] || '',
            gender: String(row['Gender'] || 'Male').trim(),
            dateOfBirth: dobStr,
            className: clName,
            yearOfEntry: Number(row['Year of Entry'] || row['Entry Year'] || new Date().getFullYear()),
            photo: '',
            guardianName: row['Guardian Name'] || row['Guardian'] || 'Unknown',
            guardianContact: String(row['Guardian Contact'] || row['Contact'] || ''),
            communityWorker: row['Community Worker'] || row['Worker'] || '',
            workerContact: String(row['Community Worker Contact'] || row['Worker Contact'] || ''),
            zoneInNansana: row['Zone in Nansana'] || row['Zone'] || 'Nansana',
            hasScholarship: String(row['Scholarship Status'] || row['Scholarship'] || '').toLowerCase().includes('yes') || row['Scholarship Status'] === true
          };
        });

        setParsedData(mappedStudents);
        setStatusMessage({ 
          type: 'success', 
          text: `Successfully parsed spreadsheet. Detected ${mappedStudents.length} student records ready for import!` 
        });
      } catch (err) {
        setStatusMessage({ type: 'error', text: 'An error occurred while parsing the file. Please ensure it follows the template.' });
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleClear = () => {
    setParsedData([]);
    setHeaders([]);
    setStatusMessage({ type: '', text: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Google Sheets Fetch & Integration Helpers
  const fetchSpreadsheets = async (token: string) => {
    setLoadingSpreadsheets(true);
    try {
      const list = await listSpreadsheets(token);
      setSpreadsheets(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSpreadsheets(false);
    }
  };

  const fetchSharedFolderFiles = async (token: string) => {
    setLoadingSharedFolder(true);
    try {
      const list = await listSharedFolderFiles('1QZX59uwgZRuaXQz64RtHQMKyAn0TlNja', token);
      setSharedFolderFiles(list);
    } catch (err) {
      console.error("Failed to load shared folder files:", err);
    } finally {
      setLoadingSharedFolder(false);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      setStatusMessage({ type: '', text: '' });
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setGoogleToken(result.accessToken);
        fetchSpreadsheets(result.accessToken);
        fetchSharedFolderFiles(result.accessToken);
        setStatusMessage({ type: 'success', text: 'Successfully authenticated with Google Workspace!' });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Google authentication failed. Please check popup permissions and try again.' });
    }
  };

  const handleDisconnectGoogle = async () => {
    await googleLogout();
    setGoogleUser(null);
    setGoogleToken('');
    setSpreadsheets([]);
    setSelectedSpreadsheetId('');
    setSheetsList([]);
    setSelectedSheetName('');
    handleClear();
  };

  const extractSpreadsheetId = (input: string): string => {
    const match = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : input.trim();
  };

  const handleSpreadsheetSelect = async (spreadsheetId: string) => {
    setSelectedSpreadsheetId(spreadsheetId);
    setSheetsList([]);
    setSelectedSheetName('');
    if (!spreadsheetId) return;

    setLoadingSheets(true);
    try {
      const sheets = await getSpreadsheetSheets(spreadsheetId, googleToken);
      setSheetsList(sheets);
      if (sheets.length > 0) {
        setSelectedSheetName(sheets[0]);
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Failed to access Google Spreadsheet metadata. Verify file is shared.' });
    } finally {
      setLoadingSheets(false);
    }
  };

  const handleFetchGoogleSheet = async () => {
    let sheetId = selectedSpreadsheetId;
    if (!sheetId && customSpreadsheetUrl) {
      sheetId = extractSpreadsheetId(customSpreadsheetUrl);
    }

    if (!sheetId) {
      setStatusMessage({ type: 'warning', text: 'Please select a spreadsheet from your Drive or paste a URL.' });
      return;
    }

    if (!selectedSheetName) {
      setStatusMessage({ type: 'warning', text: 'Please select a specific sheet tab.' });
      return;
    }

    setImporting(true);
    setStatusMessage({ type: '', text: '' });
    try {
      const rows = await fetchSheetValues(sheetId, selectedSheetName, googleToken);
      const students = mapSheetRowsToStudents(rows);
      if (students.length === 0) {
        setStatusMessage({ type: 'warning', text: 'No pupil rows could be parsed. Check headers or empty sheet.' });
      } else {
        setParsedData(students);
        setStatusMessage({ 
          type: 'success', 
          text: `Successfully synced! Parsed ${students.length} pupil rows from your Google Sheet.` 
        });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Failed to pull Google Sheet values. Verify permission settings.' });
    } finally {
      setImporting(false);
    }
  };

  // Commit database bulk addition
  const handleCommitImport = async () => {
    setImporting(true);
    try {
      await onBulkAddStudents(parsedData);
      setStatusMessage({ 
        type: 'success', 
        text: `Successfully imported ${parsedData.length} students into the school system!` 
      });
      
      setTimeout(() => {
        onSuccessRedirect();
      }, 1500);
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Failed to import students. Please try again.' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div id="excel_upload_view" className="p-8 space-y-6 font-sans max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-sky-150 pb-5">
        <div>
          <h1 className="font-display text-2xl font-black text-slate-800">Student Roster Importer</h1>
          <p className="text-xs text-slate-400 mt-1">Upload and register bulk student records via Excel files or direct Google Sheets connection</p>
        </div>

        <button
          onClick={handleDownloadTemplate}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all border-2 border-slate-200 active:scale-95 cursor-pointer"
        >
          <Download className="h-4 w-4" />
          <span>Download Excel Template</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => { setImportSource('excel'); handleClear(); }}
          className={`px-6 py-3 text-xs font-bold transition-all border-b-2 ${
            importSource === 'excel'
              ? 'border-indigo-600 text-indigo-600 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          📂 Excel / CSV File Upload
        </button>
        <button
          onClick={() => { setImportSource('google-sheets'); handleClear(); }}
          className={`px-6 py-3 text-xs font-bold transition-all border-b-2 ${
            importSource === 'google-sheets'
              ? 'border-indigo-600 text-indigo-600 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          🟢 Google Sheets Sync
        </button>
      </div>

      {/* Message alerts */}
      {statusMessage.text && (
        <div className={`p-4 rounded-xl border-2 flex items-start justify-between gap-3 text-xs font-semibold ${
          statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
          statusMessage.type === 'warning' ? 'bg-amber-50 text-amber-800 border-amber-200' :
          'bg-red-50 text-red-800 border-red-200'
        }`}>
          <div className="flex items-start gap-3.5">
            {statusMessage.type === 'success' ? (
              <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          {parsedData.length > 0 && (
            <button onClick={handleClear} className="text-slate-400 hover:text-slate-700 p-0.5">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Roster Sources */}
      {parsedData.length === 0 ? (
        importSource === 'excel' ? (
          // File Upload Box
          <div 
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all ${
              dragActive 
                ? 'border-indigo-500 bg-indigo-50/40 text-indigo-700 font-bold shadow-md' 
                : 'border-slate-200 bg-slate-50 hover:bg-slate-100/50 hover:border-indigo-400 hover:bg-indigo-50/20'
            }`}
          >
            <FileSpreadsheet className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-slate-700 font-bold text-sm">Upload Student Spreadsheet</h3>
            <p className="text-slate-400 text-xs mt-1.5 mb-6 max-w-md mx-auto">
              Drag and drop your Microsoft Excel (.xlsx) file or CSV sheet here, or click to browse local folders.
            </p>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx, .xls, .csv"
              className="hidden"
              id="excel_file_input"
            />
            <label
              htmlFor="excel_file_input"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold tracking-wide shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Upload className="h-4 w-4" />
              <span>Select Excel File</span>
            </label>
          </div>
        ) : (
          // Google Sheets Integration
          <div className="bg-white border-2 border-slate-150 rounded-3xl p-8 shadow-sm space-y-6">
            {!googleUser ? (
              <div className="text-center py-8 space-y-4">
                <Database className="h-12 w-12 text-indigo-600 mx-auto animate-pulse" />
                <h3 className="text-slate-800 font-bold text-sm">Synchronize with Google Sheets</h3>
                <p className="text-slate-400 text-xs max-w-md mx-auto leading-relaxed">
                  Authorize direct connection to Google Workspace to fetch spreadsheet rosters dynamically from your Google Drive folder.
                </p>
                <button
                  onClick={handleConnectGoogle}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  🔌 Connect Google Sheets & Drive
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Active Connection Banner */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-extrabold text-sm uppercase">
                      {googleUser.displayName?.[0] || googleUser.email?.[0]}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Connected to Google Account</h4>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">{googleUser.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleDisconnectGoogle}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                  >
                    <Unplug className="h-3.5 w-3.5" />
                    <span>Disconnect</span>
                  </button>
                </div>

                {/* Spreadsheet Selection controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700">Select Google Spreadsheet</label>
                    <div className="flex gap-2">
                      <select
                        value={selectedSpreadsheetId}
                        onChange={(e) => handleSpreadsheetSelect(e.target.value)}
                        className="flex-1 appearance-none px-3 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="">-- Choose from your Google Drive --</option>
                        {spreadsheets.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => fetchSpreadsheets(googleToken)}
                        disabled={loadingSpreadsheets}
                        className="px-3 border-2 border-slate-200 hover:bg-slate-50 rounded-xl text-slate-500 transition-all cursor-pointer"
                        title="Reload Spreadsheets list"
                      >
                        <RefreshCw className={`h-4 w-4 ${loadingSpreadsheets ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">Select a student registry spreadsheet directly from your linked Drive.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700">Or Paste Google Spreadsheet Link</label>
                    <input
                      type="text"
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      value={customSpreadsheetUrl}
                      onChange={(e) => {
                        setCustomSpreadsheetUrl(e.target.value);
                        setSelectedSpreadsheetId('');
                        setSheetsList([]);
                      }}
                      onBlur={() => {
                        if (customSpreadsheetUrl) {
                          const id = extractSpreadsheetId(customSpreadsheetUrl);
                          if (id) {
                            handleSpreadsheetSelect(id);
                          }
                        }
                      }}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <p className="text-[10px] text-slate-400 font-medium">Enter spreadsheet link directly; make sure your organization account can access it.</p>
                  </div>
                </div>

                {/* Ashinaga Uganda Shared Folder Files */}
                <div className="border-t border-slate-100 pt-6 space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Ashinaga Uganda Shared Student Registries Folder</span>
                    </h4>
                    <p className="text-[10px] text-slate-400">These spreadsheets are directly extracted from your shared folder link.</p>
                  </div>

                  {loadingSharedFolder ? (
                    <div className="flex items-center gap-2 py-4 justify-center text-xs text-slate-400">
                      <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" />
                      <span>Extracting shared folder contents...</span>
                    </div>
                  ) : sharedFolderFiles.length === 0 ? (
                    <div className="p-4 bg-slate-50 rounded-xl border border-dashed text-center text-xs text-slate-400">
                      No spreadsheets found in the shared folder or access pending.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1">
                      {sharedFolderFiles.map(file => {
                        const isSpreadsheet = file.mimeType === 'application/vnd.google-apps.spreadsheet';
                        return (
                          <div 
                            key={file.id} 
                            onClick={() => {
                              if (isSpreadsheet) {
                                handleSpreadsheetSelect(file.id);
                                setCustomSpreadsheetUrl('');
                              }
                            }}
                            className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer text-left ${
                              selectedSpreadsheetId === file.id
                                ? 'bg-indigo-50/55 border-indigo-400 shadow-sm'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-150'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <FileSpreadsheet className={`h-5 w-5 shrink-0 ${isSpreadsheet ? 'text-emerald-600' : 'text-slate-400'}`} />
                              <div className="truncate col-span-2">
                                <span className="text-xs font-bold text-slate-700 block truncate">{file.name}</span>
                                <span className="text-[9px] text-slate-400 font-mono block">Modified: {new Date(file.modifiedTime).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              className={`px-2 py-1 rounded text-[9px] font-extrabold ${
                                selectedSpreadsheetId === file.id
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {selectedSpreadsheetId === file.id ? 'Selected' : 'Load'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Sheet Tabs */}
                {sheetsList.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-50 pt-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700">Select Sheet Tab</label>
                      <select
                        value={selectedSheetName}
                        onChange={(e) => setSelectedSheetName(e.target.value)}
                        className="w-full appearance-none px-3 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        {sheetsList.map(tabName => (
                          <option key={tabName} value={tabName}>{tabName}</option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-400 font-medium">Choose which sheet or tab to load student rows from.</p>
                    </div>

                    <div className="flex items-end">
                      <button
                        onClick={handleFetchGoogleSheet}
                        disabled={importing || loadingSheets}
                        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-55"
                      >
                        <RefreshCw className={`h-4 w-4 ${importing ? 'animate-spin' : ''}`} />
                        <span>{importing ? 'Fetching...' : 'Fetch & Preview Google Sheet'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      ) : (
        // Preview parsed spreadsheet rows
        <div className="bg-white border-2 border-indigo-400 rounded-3xl shadow-sm overflow-hidden space-y-4 transition-all">
          <div className="p-5 border-b border-slate-50 flex items-center justify-between gap-4 bg-slate-50/50">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-indigo-600" /> Imported Spreadsheet Preview
              </h3>
              <p className="text-slate-400 text-[10px] mt-0.5">Please review the parsed rows from your file before committing to the database</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleClear}
                className="px-4 py-2 border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-600 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
              >
                Clear File
              </button>
              <button
                onClick={handleCommitImport}
                disabled={importing}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <PlayCircle className="h-4 w-4" />
                <span>{importing ? 'Importing...' : 'Commit Import'}</span>
              </button>
            </div>
          </div>

          {/* Grid Preview Table */}
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono sticky top-0">
                  <th className="px-5 py-3">Surname</th>
                  <th className="px-5 py-3">Other Names</th>
                  <th className="px-5 py-3">Gender</th>
                  <th className="px-5 py-3">DOB</th>
                  <th className="px-5 py-3">Class</th>
                  <th className="px-5 py-3">Entry Year</th>
                  <th className="px-5 py-3">Residence Zone</th>
                  <th className="px-5 py-3">Scholarship</th>
                  <th className="px-5 py-3">Guardian Name</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-600 font-sans">
                {parsedData.slice(0, 50).map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-850 uppercase">{row.surname}</td>
                    <td className="px-5 py-3.5">{row.otherNames}</td>
                    <td className="px-5 py-3.5 text-slate-500">{row.gender}</td>
                    <td className="px-5 py-3.5 text-slate-500 font-mono">{row.dateOfBirth}</td>
                    <td className="px-5 py-3.5 font-bold text-indigo-600">{row.className}</td>
                    <td className="px-5 py-3.5 text-slate-500 font-mono">{row.yearOfEntry}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-700">{row.zoneInNansana}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono ${
                        row.hasScholarship ? 'bg-amber-50 text-amber-800 border border-amber-200 font-bold' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {row.hasScholarship ? 'YES' : 'NO'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 truncate max-w-xs">{row.guardianName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {parsedData.length > 50 && (
            <div className="p-4 text-center border-t border-slate-50 text-slate-400 text-[10px] font-medium bg-slate-50/50">
              * Showing the first 50 rows of {parsedData.length} records.
            </div>
          )}
        </div>
      )}

      {/* Guide/Instructions section */}
      <div className="bg-white p-6 border-2 border-transparent hover:border-indigo-400 rounded-3xl shadow-sm space-y-4 transition-all">
        <h3 className="font-display font-black text-slate-800 text-sm">Import Guide & Specifications</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-600">
          <ul className="space-y-2 list-disc pl-5">
            <li>
              <strong>Required Columns:</strong> Your spreadsheet must have headers matching the template precisely, such as <code>Surname</code>, <code>Other Names</code>, <code>Gender</code>, and <code>Class Name</code>.
            </li>
            <li>
              <strong>Class Levels:</strong> Values must range from <code>P.1</code> to <code>P.7</code>. Values like "P1" or "P.1" are handled and normalized automatically.
            </li>
            <li>
              <strong>Date of Birth Format:</strong> Dates should ideally be in <code>YYYY-MM-DD</code> format (e.g. 2015-08-20) to ensure accurate age metrics calculation.
            </li>
          </ul>
          <ul className="space-y-2 list-disc pl-5">
            <li>
              <strong>Scholarship Tagging:</strong> The scholarship column matches cells containing "Yes", "YES", "true", or a ticked value to configure sponsorship.
            </li>
            <li>
              <strong>Residence Zones:</strong> To maintain community metrics, provide standard Nansana parish zones (such as Nabweru, Gganda, Kabulengwa, Masito, Kazi, etc.).
            </li>
            <li>
              <strong>Instant Processing:</strong> Parsed lists are compiled into memory instantly and previewed above. Review columns carefully before pressing "Commit Import".
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
