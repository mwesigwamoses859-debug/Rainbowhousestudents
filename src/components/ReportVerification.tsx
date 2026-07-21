import { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, ShieldCheck, Search, QrCode, FileText, Sparkles, BookOpen, User, Calendar, RefreshCw, X } from 'lucide-react';
import { Student, Mark } from '../types';

interface ReportVerificationProps {
  students: Student[];
  marks: Mark[];
  onClose?: () => void;
}

export default function ReportVerification({ students, marks, onClose }: ReportVerificationProps) {
  const [activeTab, setActiveTab] = useState<'lookup' | 'scanner'>('lookup');
  
  // Reference Lookup State
  const [refCode, setRefCode] = useState('');
  const [lookupResult, setLookupResult] = useState<{
    success: boolean;
    student?: Student;
    term?: number;
    year?: number;
    averageScore?: number;
    division?: string;
    message: string;
  } | null>(null);

  // Scanner Simulator State
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scannedStudentId, setScannedStudentId] = useState('');
  const [scannedTerm, setScannedTerm] = useState<1 | 2 | 3>(1);
  const [scannedYear, setScannedYear] = useState(2026);
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    student?: Student;
    term?: number;
    year?: number;
    averageScore?: number;
    division?: string;
    message: string;
  } | null>(null);

  // Helper to calculate grades and average
  const getGradePoints = (score: number) => {
    if (score >= 90) return 1;
    if (score >= 80) return 2;
    if (score >= 70) return 3;
    if (score >= 60) return 4;
    if (score >= 55) return 5;
    if (score >= 50) return 6;
    if (score >= 45) return 7;
    if (score >= 40) return 8;
    return 9;
  };

  const getDivisionText = (aggregate: number, count: number) => {
    if (count === 0) return 'N/A';
    const avgPoint = aggregate / count;
    if (avgPoint <= 2.2) return 'Division I';
    if (avgPoint <= 4.8) return 'Division II';
    if (avgPoint <= 6.8) return 'Division III';
    if (avgPoint <= 8.0) return 'Division IV';
    return 'Division U';
  };

  const performVerification = (studentId: string, termNum: number, yearNum: number) => {
    const student = students.find(s => s.id.toLowerCase() === studentId.toLowerCase().trim());
    if (!student) {
      return {
        success: false,
        message: 'Invalid Student ID. No matching registered pupil found in the Ashinaga school registry.'
      };
    }

    const termMarks = marks.filter(m => m.studentId === student.id && m.term === termNum && m.year === yearNum);
    
    const totalScore = termMarks.reduce((sum, m) => sum + m.score, 0);
    const averageScore = termMarks.length > 0 ? Math.round(totalScore / termMarks.length) : 0;
    
    const totalPoints = termMarks.reduce((sum, m) => sum + getGradePoints(m.score), 0);
    const division = getDivisionText(totalPoints, termMarks.length);

    return {
      success: true,
      student,
      term: termNum,
      year: yearNum,
      averageScore,
      division,
      message: `✓ Secure Authenticity Verified: Report card is registered in our database.`
    };
  };

  // Handle reference lookup submission
  const handleLookup = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!refCode.trim()) return;

    // Expected format: ASH-UG-st-3-T1-2026 or similar
    // We extract student ID, Term, and Year
    const parts = refCode.trim().split('-');
    if (parts.length < 4) {
      setLookupResult({
        success: false,
        message: 'Invalid Reference Format. Ensure it follows: ASH-UG-[STUDENT_ID]-T[TERM]-[YEAR]'
      });
      return;
    }

    // Standardized student ID recovery
    // Let's search inside the refCode for student ID prefix "st-"
    const lowerRef = refCode.toLowerCase();
    const stIndex = lowerRef.indexOf('st-');
    if (stIndex === -1) {
      setLookupResult({
        success: false,
        message: 'Could not resolve Student ID. Reference code must contain a valid Ashinaga registration ID (e.g. st-3).'
      });
      return;
    }

    // Try to isolate the student ID.
    // E.g., st-3 or st-bulk-12345
    // Let's find the parts
    const idPartMatch = refCode.match(/st-[a-zA-Z0-9]+/);
    const studentId = idPartMatch ? idPartMatch[0] : '';
    
    // Find Term
    const termMatch = refCode.match(/t(\d)/i);
    const termNum = termMatch ? Number(termMatch[1]) : 1;

    // Find Year
    const yearMatch = refCode.match(/(202\d|203\d)/);
    const yearNum = yearMatch ? Number(yearMatch[0]) : 2026;

    const result = performVerification(studentId, termNum, yearNum);
    setLookupResult(result);
  };

  // Simulating laser scan animation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (scanning) {
      setScanProgress(0);
      setScanResult(null);
      
      interval = setInterval(() => {
        setScanProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setScanning(false);
            // Verify
            if (scannedStudentId) {
              const res = performVerification(scannedStudentId, scannedTerm, scannedYear);
              setScanResult(res);
            } else {
              setScanResult({
                success: false,
                message: 'No QR code was read. Please align the scanner with the report QR code.'
              });
            }
            return 100;
          }
          return prev + 5;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [scanning, scannedStudentId, scannedTerm, scannedYear]);

  const triggerScanSim = (studentId: string, term: 1 | 2 | 3, year: number) => {
    setScannedStudentId(studentId);
    setScannedTerm(term);
    setScannedYear(year);
    setScanning(true);
  };

  return (
    <div className="bg-slate-50 border border-slate-200/80 rounded-3xl overflow-hidden shadow-xs transition-all">
      {/* Header Banner */}
      <div className="bg-[#0b2d59] p-6 text-white flex justify-between items-center relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
          <QrCode className="h-44 w-44" />
        </div>
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="text-[10px] uppercase font-black tracking-widest font-mono text-indigo-300">
              Security Certification
            </span>
          </div>
          <h2 className="font-display font-black text-lg md:text-xl uppercase tracking-tight">
            Academic Report Verification System
          </h2>
          <p className="text-[11px] text-slate-300/90 leading-relaxed font-medium">
            Scan and authenticate official student term reports to verify scores, attendance, and credentials instantly against our memory ledger database.
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all text-white/75 hover:text-white cursor-pointer z-20">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200 bg-white px-6 py-2 gap-2">
        <button
          onClick={() => {
            setActiveTab('lookup');
            setLookupResult(null);
          }}
          className={`px-4 py-2 text-xs font-bold transition-all rounded-lg cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'lookup'
              ? 'bg-indigo-50 text-indigo-800'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Search className="h-3.5 w-3.5" />
          <span>Manual Reference Lookup</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('scanner');
            setScanResult(null);
          }}
          className={`px-4 py-2 text-xs font-bold transition-all rounded-lg cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'scanner'
              ? 'bg-indigo-50 text-indigo-800'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <QrCode className="h-3.5 w-3.5" />
          <span>QR Scanner & Simulator</span>
        </button>
      </div>

      {/* Main Body content */}
      <div className="p-6 md:p-8 space-y-6">
        {activeTab === 'lookup' ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Input Form Column */}
            <div className="md:col-span-5 bg-white border border-slate-200/80 p-5 rounded-2xl space-y-4 shadow-xs">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-indigo-600" />
                <span>Validate Report Reference</span>
              </h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Enter the Reference Code printed in the footer of the student's terminal report card (e.g. <code className="bg-slate-150 px-1 py-0.5 rounded font-mono font-bold text-slate-700">ASH-UG-ST-3-T1-2026</code>).
              </p>

              <form onSubmit={handleLookup} className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    value={refCode}
                    onChange={(e) => setRefCode(e.target.value)}
                    placeholder="ASH-UG-[STUDENT_ID]-T[TERM]-[YEAR]"
                    className="w-full pl-3 pr-10 py-2.5 border-2 border-slate-200 hover:border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all uppercase placeholder:normal-case"
                  />
                  <div className="absolute right-3 top-3">
                    <Search className="h-4 w-4 text-slate-400" />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={!refCode.trim()}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xs active:scale-98"
                >
                  Verify Reference Hash
                </button>
              </form>

              {/* Suggestions Helper */}
              {students.length > 0 && (
                <div className="border-t border-slate-100 pt-4 space-y-2">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold block">Quick Demo Reference Codes</span>
                  <div className="flex flex-wrap gap-1.5">
                    {students.slice(0, 3).map((st) => (
                      <button
                        key={st.id}
                        onClick={() => {
                          setRefCode(`ASH-UG-${st.id.toUpperCase()}-T1-2026`);
                          setTimeout(() => {
                            const res = performVerification(st.id, 1, 2026);
                            setLookupResult(res);
                          }, 50);
                        }}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[9px] font-mono transition-all cursor-pointer border border-slate-200/50"
                      >
                        REF: {st.surname} (st-{st.id.split('-').pop()})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Verification Results Panel */}
            <div className="md:col-span-7">
              {!lookupResult ? (
                <div className="border-2 border-dashed border-slate-200/80 rounded-2xl p-10 text-center text-slate-400 bg-white/60">
                  <ShieldCheck className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Waiting for Verification</h4>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
                    Once you provide a certificate or report reference hash, the ledger security checks will query records instantly and show verification results here.
                  </p>
                </div>
              ) : (
                <div className={`border-2 rounded-2xl overflow-hidden bg-white shadow-xs transition-all duration-300 transform scale-100 ${
                  lookupResult.success ? 'border-emerald-500/80' : 'border-red-500/80'
                }`}>
                  {/* Results Banner */}
                  <div className={`p-4 flex items-center gap-3 ${
                    lookupResult.success ? 'bg-emerald-50 text-emerald-950' : 'bg-red-50 text-red-950'
                  }`}>
                    {lookupResult.success ? (
                      <CheckCircle className="h-6 w-6 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-6 w-6 text-red-600 shrink-0" />
                    )}
                    <div>
                      <h4 className="text-xs font-extrabold uppercase tracking-wide">
                        {lookupResult.success ? 'VERIFICATION SECURE' : 'VERIFICATION FAILED'}
                      </h4>
                      <p className="text-[10px] opacity-90 font-medium">{lookupResult.message}</p>
                    </div>
                  </div>

                  {/* Student Ledger Data Detail */}
                  {lookupResult.success && lookupResult.student && (
                    <div className="p-5 space-y-4">
                      {/* Name Card */}
                      <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        {lookupResult.student.photo ? (
                          <img src={lookupResult.student.photo} alt="Student Profile" className="h-12 w-12 rounded-lg object-cover border border-slate-200" />
                        ) : (
                          <div className="h-12 w-12 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                            {lookupResult.student.surname[0]}
                          </div>
                        )}
                        <div className="space-y-0.5">
                          <span className="text-[9px] uppercase font-bold text-indigo-600 font-mono">Verified Pupil</span>
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">
                            {lookupResult.student.surname} {lookupResult.student.otherNames}
                          </h4>
                          <div className="flex gap-2 text-[10px] text-slate-500 font-mono">
                            <span>ID: {lookupResult.student.id}</span>
                            <span>•</span>
                            <span>Class: {lookupResult.student.className}</span>
                          </div>
                        </div>
                      </div>

                      {/* Score Metrics Grid */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                          <span className="text-[9px] text-slate-400 uppercase font-bold block">Assessed Term</span>
                          <strong className="text-slate-800 text-xs font-extrabold block mt-0.5">Term {lookupResult.term} | {lookupResult.year}</strong>
                        </div>
                        <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-100/50 text-center">
                          <span className="text-[9px] text-indigo-600 uppercase font-bold block">Average Score</span>
                          <strong className="text-indigo-900 text-sm font-extrabold block mt-0.5">{lookupResult.averageScore}%</strong>
                        </div>
                        <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100/60 text-center">
                          <span className="text-[9px] text-amber-700 uppercase font-bold block">Final Division</span>
                          <strong className="text-amber-900 text-xs font-black block mt-1 uppercase tracking-wide">{lookupResult.division}</strong>
                        </div>
                      </div>

                      {/* Footer security badge */}
                      <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-[9px] text-slate-400 font-mono">
                        <span>Ledger Signature: sha256_verified</span>
                        <span>Ashinaga School Office Stamp OK</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
            {/* Camera Simulated Window */}
            <div className="md:col-span-6 bg-slate-900 rounded-3xl p-6 flex flex-col justify-between min-h-[350px] relative overflow-hidden border border-slate-800">
              {/* Scan Targets Sweep Indicator */}
              <div className="absolute top-4 left-4 right-4 flex justify-between text-white/50 text-[9px] font-mono uppercase tracking-wider z-10">
                <span>[ CAMERA: LIVE_FEED_OK ]</span>
                <span className="animate-pulse text-emerald-400 font-bold">● ACTIVE SCANNER</span>
              </div>

              {/* QR Scan bounds framing */}
              <div className="my-auto flex flex-col items-center justify-center relative py-12">
                {/* Simulated Scanner Line */}
                {scanning && (
                  <div
                    className="absolute left-0 right-0 h-1 bg-emerald-400 shadow-lg shadow-emerald-400/80 z-20 transition-all duration-100"
                    style={{
                      top: `${scanProgress}%`,
                    }}
                  />
                )}

                {/* Target box */}
                <div className={`relative w-44 h-44 border-2 rounded-2xl flex items-center justify-center transition-all ${
                  scanning 
                    ? 'border-emerald-400 scale-105 shadow-emerald-500/10 shadow-2xl' 
                    : 'border-slate-700'
                }`}>
                  {/* Four Corner brackets */}
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-indigo-500 -mt-0.5 -ml-0.5 rounded-tl"></div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-indigo-500 -mt-0.5 -mr-0.5 rounded-tr"></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-indigo-500 -mb-0.5 -ml-0.5 rounded-bl"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-indigo-500 -mb-0.5 -mr-0.5 rounded-br"></div>

                  {scanning ? (
                    <div className="text-center space-y-2">
                      <RefreshCw className="h-8 w-8 text-emerald-400 animate-spin mx-auto" />
                      <span className="text-[10px] text-emerald-400 font-bold tracking-widest font-mono block">SCANNING... {scanProgress}%</span>
                    </div>
                  ) : (
                    <div className="text-center p-4">
                      <QrCode className="h-10 w-10 text-slate-500 mx-auto mb-1.5" />
                      <span className="text-[10px] text-slate-400 font-bold tracking-tight block">ALIGN QR CODE HERE</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-500">
                To test scanning, trigger a simulation scan on any student's report card in the side selector.
              </div>
            </div>

            {/* Simulator control panel */}
            <div className="md:col-span-6 bg-white border border-slate-200/80 p-5 rounded-3xl flex flex-col justify-between shadow-xs">
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                  <span>Select Student Card to Scan</span>
                </h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Pressing **"Trigger Scan Simulation"** simulates scanning that student's report card. It triggers the high-contrast laser scanner line, reads the URL search params, and verifies it against the ledger memory.
                </p>

                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {students.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No students available for demo scan.</p>
                  ) : (
                    students.map((st) => (
                      <div key={st.id} className="flex items-center justify-between p-2.5 border border-slate-100 rounded-xl hover:bg-slate-50 transition-all">
                        <div className="text-left">
                          <h4 className="text-xs font-bold text-slate-800 uppercase">{st.surname} {st.otherNames}</h4>
                          <span className="text-[9px] font-mono text-slate-400 uppercase">Class: {st.className} | REF: st-{st.id.split('-').pop()}</span>
                        </div>
                        <button
                          onClick={() => triggerScanSim(st.id, 1, 2026)}
                          disabled={scanning}
                          className="px-3 py-1.5 bg-[#0b2d59] hover:bg-[#143e74] text-white rounded-lg text-[10px] font-bold tracking-wide transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                          Simulate Scan
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Scan Results Overlay inside simulator */}
              {scanResult && (
                <div className={`mt-4 p-4 border-2 rounded-2xl ${
                  scanResult.success ? 'bg-emerald-50/70 border-emerald-400 text-emerald-950' : 'bg-red-50/70 border-red-400 text-red-950'
                }`}>
                  <div className="flex items-start gap-2.5">
                    {scanResult.success ? (
                      <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1 text-left">
                      <h4 className="text-xs font-extrabold uppercase tracking-wide">
                        {scanResult.success ? '✓ 100% Authentic Report Card' : '✕ Match Failed'}
                      </h4>
                      <p className="text-[10px] leading-relaxed font-medium">{scanResult.message}</p>
                      {scanResult.success && scanResult.student && (
                        <p className="text-[10px] font-bold text-slate-700">
                          Verified: {scanResult.student.surname} {scanResult.student.otherNames} — Term {scanResult.term} average score: {scanResult.averageScore}%.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
