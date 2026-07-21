import React, { useState } from 'react';
import { 
  CreditCard, 
  Award, 
  Printer, 
  Sparkles, 
  Download, 
  MapPin, 
  Phone, 
  User, 
  QrCode,
  CheckCircle,
  FileText
} from 'lucide-react';
import { Student, ClassName } from '../types';
import AshinagaLogo from './AshinagaLogo';

interface StudentIdCardsProps {
  students: Student[];
}

export default function StudentIdCards({ students }: StudentIdCardsProps) {
  const [selectedClass, setSelectedClass] = useState<ClassName>('P.1');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [mode, setMode] = useState<'idcard' | 'certificate'>('idcard');
  const [certYear, setCertYear] = useState<string>('2026');
  const [certType, setCertType] = useState<string>('Primary Education Completion');

  const classesList: ClassName[] = ['P.1', 'P.2', 'P.3', 'P.4', 'P.5', 'P.6', 'P.7'];
  const filteredStudents = students.filter(s => s.className === selectedClass);

  // Set first student as default when class shifts
  React.useEffect(() => {
    if (filteredStudents.length > 0) {
      setSelectedStudentId(filteredStudents[0].id);
    } else {
      setSelectedStudentId('');
    }
  }, [selectedClass]);

  const activeStudent = students.find(s => s.id === selectedStudentId);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="id_cards_certificates_view" className="p-8 space-y-6 font-sans max-w-7xl mx-auto print:p-0">
      {/* Header section - Hidden during printing */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-sky-150 pb-5 print:hidden">
        <div className="flex items-center gap-3">
          <AshinagaLogo size={50} className="shrink-0 bg-white p-1 rounded-xl shadow-xs border border-slate-100" />
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-wider mb-2">
              <Sparkles className="h-3 w-3 text-amber-500 animate-pulse" /> School Credentials Generator
            </div>
            <h1 className="font-display text-2xl font-black text-slate-800">ID Cards & Completion Certificates</h1>
            <p className="text-xs text-slate-400 mt-1">Generate official printable pupil ID cards with barcodes and elegant primary graduation certificates.</p>
          </div>
        </div>

        {/* Sub-Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 self-start md:self-center">
          <button
            onClick={() => setMode('idcard')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              mode === 'idcard'
                ? 'bg-white text-indigo-600 shadow-md font-black scale-105'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <CreditCard className="h-4 w-4" />
            <span>Student ID Cards</span>
          </button>
          <button
            onClick={() => setMode('certificate')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              mode === 'certificate'
                ? 'bg-white text-indigo-600 shadow-md font-black scale-105'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Award className="h-4 w-4" />
            <span>Completion Certificates</span>
          </button>
        </div>
      </div>

      {/* Control Panel - Hidden during printing */}
      <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-500">Filter Class Level</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value as ClassName)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-800 focus:outline-none"
          >
            {classesList.map(c => (
              <option key={c} value={c}>Class {c}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-500">Select Student Profile</label>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-800 focus:outline-none uppercase font-bold"
          >
            {filteredStudents.length === 0 ? (
              <option value="">-- No pupils in this class --</option>
            ) : (
              filteredStudents.map(s => (
                <option key={s.id} value={s.id}>{s.surname} {s.otherNames}</option>
              ))
            )}
          </select>
        </div>

        {mode === 'certificate' ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500">Graduation Year</label>
              <input
                type="text"
                value={certYear}
                onChange={(e) => setCertYear(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-850 focus:outline-none"
              />
            </div>
            <div className="space-y-2 flex items-end">
              <button
                onClick={handlePrint}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>Print Credentials</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 flex items-end">
            <button
              onClick={handlePrint}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Print ID Card</span>
            </button>
          </div>
        )}
      </div>

      {/* Render Stage */}
      <div className="flex justify-center items-center py-6 bg-slate-100/40 rounded-3xl border-2 border-dashed border-slate-200 print:bg-transparent print:border-none print:py-0">
        {!activeStudent ? (
          <div className="text-center text-slate-400 text-xs py-12">
            Please select a student profile to generate active credentials.
          </div>
        ) : mode === 'idcard' ? (
          /* ID Card Layout: Front and Back pocketsize specs (85mm x 54mm equivalent ratio) */
          <div className="flex flex-col md:flex-row gap-8 print:flex-row print:gap-12">
            {/* FRONT OF ID CARD */}
            <div className="w-[340px] h-[215px] bg-gradient-to-br from-indigo-700 via-indigo-600 to-indigo-800 text-white rounded-3xl p-4 shadow-xl flex flex-col justify-between relative overflow-hidden border-2 border-indigo-400 print:shadow-none print:border-indigo-800">
              {/* Pattern Background Overlay */}
              <div className="absolute top-0 right-0 h-40 w-40 bg-white/5 rounded-full -mr-10 -mt-10 blur-xl"></div>
              <div className="absolute bottom-0 left-0 h-24 w-24 bg-amber-400/10 rounded-full -ml-8 -mb-8 blur-lg"></div>

              {/* Header block */}
              <div className="flex justify-between items-start border-b border-white/20 pb-2">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 bg-white rounded-lg flex items-center justify-center font-black text-indigo-700 text-xs shadow-md">
                    N
                  </div>
                  <div>
                    <h3 className="text-[11px] font-black uppercase tracking-wider leading-none">Nansana Organisation</h3>
                    <p className="text-[7px] text-indigo-100 font-medium leading-none mt-1">Pupil Identity Credential</p>
                  </div>
                </div>
                <span className="text-[8px] font-mono bg-amber-400 text-slate-900 font-black px-1.5 py-0.5 rounded-full">
                  CLASS {activeStudent.className}
                </span>
              </div>

              {/* Profile area */}
              <div className="flex gap-3.5 py-2">
                {/* Photo frame */}
                <div className="h-20 w-16 bg-white rounded-xl overflow-hidden shrink-0 border-2 border-indigo-200/50 flex items-center justify-center relative">
                  {activeStudent.photo ? (
                    <img src={activeStudent.photo} alt="Pupil" className="h-full w-full object-cover" />
                  ) : (
                    <div className="text-center text-indigo-600 font-black text-lg">
                      {activeStudent.surname[0]}{activeStudent.otherNames[0]}
                    </div>
                  )}
                </div>

                {/* Details list */}
                <div className="space-y-1.5 flex-1 text-left min-w-0">
                  <h4 className="text-[13px] font-black uppercase tracking-wide truncate leading-none mt-1">
                    {activeStudent.surname}
                  </h4>
                  <p className="text-[11px] text-indigo-100 truncate font-semibold leading-none">
                    {activeStudent.otherNames}
                  </p>

                  <div className="grid grid-cols-2 gap-1.5 pt-1.5 text-[8px] font-semibold text-indigo-200">
                    <div>
                      <span className="text-white/60 block uppercase text-[6px]">Pupil No:</span>
                      <span className="text-white font-mono uppercase">{activeStudent.id.substring(9, 17)}</span>
                    </div>
                    <div>
                      <span className="text-white/60 block uppercase text-[6px]">Gender:</span>
                      <span className="text-white">{activeStudent.gender}</span>
                    </div>
                    <div>
                      <span className="text-white/60 block uppercase text-[6px]">Admission Year:</span>
                      <span className="text-white font-mono">{activeStudent.yearOfEntry}</span>
                    </div>
                    <div>
                      <span className="text-white/60 block uppercase text-[6px]">Parish Zone:</span>
                      <span className="text-white truncate block">{activeStudent.zoneInNansana}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer bar */}
              <div className="flex justify-between items-center text-[7px] text-indigo-200 border-t border-white/10 pt-2 font-mono">
                <span>Authorized Teacher Signature</span>
                <span className="font-bold text-white">Valid Term 1-3 2026</span>
              </div>
            </div>

            {/* BACK OF ID CARD */}
            <div className="w-[340px] h-[215px] bg-white text-slate-800 rounded-3xl p-4 shadow-xl flex flex-col justify-between relative border-2 border-slate-200 print:shadow-none print:border-slate-300">
              <div className="space-y-2 text-left">
                <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                  <Phone className="h-3.5 w-3.5 text-indigo-600" />
                  <h4 className="text-[10px] font-black uppercase text-slate-800 tracking-wide">Emergency Safeguarding Contact</h4>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[9px] font-semibold text-slate-500">
                  <p>Guardian: <span className="text-slate-800 font-extrabold uppercase block">{activeStudent.guardianName || 'Unknown'}</span></p>
                  <p>Contact No: <span className="text-slate-800 font-extrabold font-mono block">{activeStudent.guardianContact || 'None Listed'}</span></p>
                  <p className="col-span-2">Community Worker: <span className="text-slate-850 block font-bold">{activeStudent.communityWorker || 'Assigned Officer'}</span></p>
                </div>
              </div>

              {/* Guidelines or EMIS note */}
              <div className="bg-slate-50 p-2.5 rounded-xl text-[8px] text-slate-400 font-medium leading-relaxed text-left border border-slate-100">
                This ID card remains the legal property of the Nansana primary support organisation. If found, please return to any authorized community worker in Nansana Parish.
              </div>

              {/* Barcode representation */}
              <div className="flex justify-between items-center border-t border-slate-100 pt-2">
                <div className="flex flex-col items-start leading-none gap-0.5">
                  <span className="text-[6px] text-slate-400 font-bold uppercase">Barcode Scanner EMIS</span>
                  <div className="h-6 w-32 bg-slate-900 flex items-center justify-center mt-1 relative overflow-hidden rounded-xs">
                    {/* Mock lines */}
                    <div className="absolute inset-0 flex justify-between px-1 bg-white">
                      {[2, 4, 1, 3, 2, 4, 1, 2, 4, 1, 3, 2, 3, 1, 4, 2].map((w, i) => (
                        <div key={i} className="bg-slate-950 h-full" style={{ width: `${w}px` }}></div>
                      ))}
                    </div>
                  </div>
                  <span className="text-[7px] text-slate-500 font-mono mt-1 uppercase">PUPIL-{activeStudent.id.substring(9, 15)}</span>
                </div>
                <div className="p-1 bg-slate-50 rounded-lg">
                  <QrCode className="h-8 w-8 text-slate-700" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* COMPLETION CERTIFICATE MODEL */
          <div className="w-[800px] h-[550px] bg-white border-[16px] border-double border-indigo-600 rounded-3xl p-10 relative overflow-hidden shadow-2xl flex flex-col justify-between print:shadow-none print:border-indigo-800 print:m-0">
            {/* Elegant corner patterns */}
            <div className="absolute top-4 left-4 h-12 w-12 border-t-4 border-l-4 border-indigo-600"></div>
            <div className="absolute top-4 right-4 h-12 w-12 border-t-4 border-r-4 border-indigo-600"></div>
            <div className="absolute bottom-4 left-4 h-12 w-12 border-b-4 border-l-4 border-indigo-600"></div>
            <div className="absolute bottom-4 right-4 h-12 w-12 border-b-4 border-r-4 border-indigo-600"></div>

            <div className="text-center space-y-6 flex-1 flex flex-col justify-center">
              <div className="space-y-1.5">
                <div className="h-10 w-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-extrabold text-lg mx-auto shadow-md">
                  N
                </div>
                <h2 className="font-display font-black text-xl text-slate-800 uppercase tracking-widest leading-none">
                  Nansana Children Primary Support Organisation
                </h2>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest font-mono">
                  Nansana Parish, Wakiso District, Uganda
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-serif italic text-slate-500 block">This official certificate of merit is awarded to:</span>
                <h1 className="text-3xl font-display font-black text-indigo-700 uppercase tracking-wide border-b-2 border-indigo-100 max-w-xl mx-auto pb-1">
                  {activeStudent.surname} {activeStudent.otherNames}
                </h1>
                <p className="text-xs text-slate-400 uppercase font-bold font-mono">
                  Student Number: PUPIL-{activeStudent.id.substring(9, 17).toUpperCase()}
                </p>
              </div>

              <div className="max-w-lg mx-auto text-center space-y-3">
                <p className="text-xs text-slate-600 leading-relaxed font-serif italic">
                  "For outstanding discipline, academic resilience, and complete scholastic participation throughout their primary education curriculum, culminating in successful graduation from the Primary Level program."
                </p>
                <p className="text-[11px] text-slate-800 font-bold uppercase tracking-wider">
                  Given at Nansana Parish this academic year {certYear}
                </p>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-20 pt-10 max-w-xl mx-auto text-center">
                <div className="border-t border-slate-300 pt-1.5 space-y-1">
                  <div className="h-6 flex items-center justify-center">
                    <span className="font-serif italic text-xs text-indigo-600">Head Teacher Signature</span>
                  </div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">School Administrator</p>
                </div>
                <div className="border-t border-slate-300 pt-1.5 space-y-1">
                  <div className="h-6 flex items-center justify-center">
                    <span className="font-serif italic text-xs text-emerald-600">Community Worker Representative</span>
                  </div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Social Officer</p>
                </div>
              </div>
            </div>

            {/* Official seal image representation */}
            <div className="absolute bottom-6 right-6 flex flex-col items-center leading-none">
              <div className="h-16 w-16 rounded-full border-4 border-double border-indigo-600 bg-indigo-50 flex items-center justify-center relative">
                <CheckCircle className="h-8 w-8 text-indigo-600" />
                <div className="absolute inset-0 rounded-full border border-dashed border-indigo-400 animate-spin" style={{ animationDuration: '20s' }}></div>
              </div>
              <span className="text-[7px] font-mono font-bold text-indigo-700 mt-1.5 uppercase tracking-widest">OFFICIAL SEAL</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
