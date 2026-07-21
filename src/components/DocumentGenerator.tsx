import React, { useState } from 'react';
import { 
  FileText, 
  Printer, 
  Settings, 
  User, 
  Download, 
  Check, 
  Award, 
  Briefcase, 
  FileSpreadsheet, 
  BookOpen, 
  Smile, 
  Palette,
  Signature
} from 'lucide-react';
import { Student, Mark } from '../types';
import AshinagaLogo from './AshinagaLogo';

interface DocumentGeneratorProps {
  students: Student[];
  marks: Mark[];
}

type DocType = 
  | 'idcard' 
  | 'admission' 
  | 'graduation' 
  | 'scholarship' 
  | 'attendance_report' 
  | 'class_list' 
  | 'worker_report' 
  | 'support_summary';

export default function DocumentGenerator({ students, marks }: DocumentGeneratorProps) {
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || '');
  const [selectedDocType, setSelectedDocType] = useState<DocType>('admission');
  
  // Customization Options
  const [brandColor, setBrandColor] = useState<'emerald' | 'indigo' | 'slate' | 'rose'>('indigo');
  const [signatureName, setSignatureName] = useState('Mukasa John Bosco');
  const [signatureTitle, setSignatureTitle] = useState('Executive Director, Ashinaga Uganda');
  const [orgName, setOrgName] = useState('Ashinaga Uganda Rainbow House');
  const [customLogo, setCustomLogo] = useState('🛡️'); // E.g. Emoji or text
  const [customWording, setCustomWording] = useState('');

  // Default wording templates
  const wordingTemplates: Record<DocType, string> = {
    admission: 'We are pleased to inform you that the applicant named below has been granted official admission into our specialized community learning center. Registration is fully funded under our primary education support initiative.',
    graduation: 'This is to certify that the pupil named below has successfully completed the rigorous Primary Seven (P.7) curriculum requirements and has been officially cleared for the National Primary Leaving Examinations (PLE).',
    scholarship: 'On behalf of the scholarship desk, we are delighted to confirm that the pupil named below has been awarded full-tuition sponsorship, including school lunch, uniform allocations, and textbooks.',
    idcard: 'Official Student Identification Card. Authorized signature required. Keep on person.',
    attendance_report: 'Academic termly attendance log compiled for primary level, reflecting presence and excused/unexcused absence ratios verified by community-workers.',
    class_list: 'Official registration roster compiled for current class, certified for EMIS submission and Ministry node integration.',
    worker_report: 'Confidential social worker home visitation log, detailing family environment diagnostics, physical welfare assessments, and referral recommendations.',
    support_summary: 'Comprehensive social support portfolio detailing material disbursements, meals, uniforms, counseling tracking, and sponsorship history.'
  };

  const currentStudent = students.find(s => s.id === selectedStudentId) || students[0];

  const handlePrint = () => {
    window.print();
  };

  // Get color styles based on brand selection
  const getColorClasses = () => {
    switch (brandColor) {
      case 'emerald':
        return {
          primary: 'text-emerald-700',
          border: 'border-emerald-200',
          borderAccent: 'border-emerald-600',
          bg: 'bg-emerald-50',
          bgAccent: 'bg-emerald-600',
          bgAccentHover: 'hover:bg-emerald-700',
          textAccent: 'text-emerald-600',
          accentFill: '#059669'
        };
      case 'rose':
        return {
          primary: 'text-rose-700',
          border: 'border-rose-200',
          borderAccent: 'border-rose-600',
          bg: 'bg-rose-50',
          bgAccent: 'bg-rose-600',
          bgAccentHover: 'hover:bg-rose-700',
          textAccent: 'text-rose-600',
          accentFill: '#e11d48'
        };
      case 'slate':
        return {
          primary: 'text-slate-800',
          border: 'border-slate-300',
          borderAccent: 'border-slate-700',
          bg: 'bg-slate-100',
          bgAccent: 'bg-slate-700',
          bgAccentHover: 'hover:bg-slate-800',
          textAccent: 'text-slate-700',
          accentFill: '#334155'
        };
      case 'indigo':
      default:
        return {
          primary: 'text-indigo-700',
          border: 'border-indigo-200',
          borderAccent: 'border-indigo-600',
          bg: 'bg-indigo-50',
          bgAccent: 'bg-indigo-600',
          bgAccentHover: 'hover:bg-indigo-700',
          textAccent: 'text-indigo-600',
          accentFill: '#4f46e5'
        };
    }
  };

  const cl = getColorClasses();
  const textBody = customWording || wordingTemplates[selectedDocType];

  return (
    <div id="document_generator_view" className="p-8 space-y-6 font-sans max-w-7xl mx-auto">
      
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-sky-150 pb-5 no-print">
        <div className="flex items-center gap-3">
          <AshinagaLogo size={50} className="shrink-0 bg-white p-1 rounded-xl shadow-xs border border-slate-100" />
          <div>
            <h1 className="font-display text-2xl font-black text-slate-800">Custom Document Creator</h1>
            <p className="text-xs text-slate-400 mt-1">Generate official admission letters, scholarship certificates, pupil ID cards, and home visit logs with flexible templates.</p>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className={`inline-flex items-center gap-2 text-white px-5 py-3 rounded-xl font-bold shadow-md transition-all active:scale-95 cursor-pointer text-xs ${cl.bgAccent} ${cl.bgAccentHover}`}
        >
          <Printer className="h-4 w-4" />
          <span>Print Document (PDF)</span>
        </button>
      </div>

      {/* 2. Main Workstation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Control Board (4 columns) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-150 shadow-sm space-y-5 no-print">
          <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
            <Settings className="h-4.5 w-4.5 text-indigo-500" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Document Configurator</h3>
          </div>

          {/* Student selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500">Target Student</label>
            <select
              value={selectedStudentId}
              onChange={(e) => {
                setSelectedStudentId(e.target.value);
                // Clear custom text when shifting student so it reloads template
                setCustomWording('');
              }}
              className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
            >
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.surname} {student.otherNames} ({student.className})
                </option>
              ))}
            </select>
          </div>

          {/* Document selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500">Document Template Type</label>
            <select
              value={selectedDocType}
              onChange={(e) => {
                setSelectedDocType(e.target.value as DocType);
                setCustomWording(''); // Reset custom text
              }}
              className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
            >
              <option value="admission">Admission Letter</option>
              <option value="scholarship">Scholarship Award Letter</option>
              <option value="graduation">Completion Certificate</option>
              <option value="idcard">Printable ID Card</option>
              <option value="attendance_report">Attendance Ledger Summary</option>
              <option value="class_list">Class Enrollment Roster</option>
              <option value="worker_report">Social Visit Diagnostics</option>
              <option value="support_summary">Support Disbursement Dossier</option>
            </select>
          </div>

          {/* Style Customizer */}
          <div className="space-y-4 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-slate-400" />
              <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500">Branding & Style</h4>
            </div>

            {/* Colors */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase">Brand Color Palette</label>
              <div className="flex gap-2">
                {[
                  { id: 'indigo', color: 'bg-indigo-600', label: 'Indigo' },
                  { id: 'emerald', color: 'bg-emerald-600', label: 'Emerald' },
                  { id: 'rose', color: 'bg-rose-600', label: 'Rose' },
                  { id: 'slate', color: 'bg-slate-700', label: 'Slate' }
                ].map((col) => (
                  <button
                    key={col.id}
                    onClick={() => setBrandColor(col.id as any)}
                    className={`h-6 w-6 rounded-full ${col.color} border-2 transition-all cursor-pointer ${brandColor === col.id ? 'border-amber-400 scale-110 shadow-md' : 'border-transparent'}`}
                    title={col.label}
                  />
                ))}
              </div>
            </div>

            {/* Logo Emblem Customizer */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500">Header Icon / Emblem</label>
              <input
                type="text"
                value={customLogo}
                onChange={(e) => setCustomLogo(e.target.value)}
                placeholder="🛡️ or Symbol"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
              />
            </div>

            {/* Org Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500">Organisation Header Name</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
              />
            </div>
          </div>

          {/* Signature Customizer */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <Signature className="h-4 w-4 text-slate-400" />
              <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500">Signatory Details</h4>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase">Signee Name</label>
              <input
                type="text"
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase">Signee Designation</label>
              <input
                type="text"
                value={signatureTitle}
                onChange={(e) => setSignatureTitle(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
              />
            </div>
          </div>

          {/* Template Customizer Wording */}
          <div className="space-y-1.5 pt-3 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-500">Edit Wording Template</label>
            <textarea
              rows={3}
              value={textBody}
              onChange={(e) => setCustomWording(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none resize-none font-sans"
            />
          </div>
        </div>

        {/* Right Preview Pane (8 columns) */}
        <div className="lg:col-span-8 space-y-4 print:p-0 print:m-0 print:border-none">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest no-print">Live Print Preview Sheet</p>
          
          {/* Main Printable Document Canvas */}
          <div className="bg-white border-2 border-slate-200 rounded-3xl p-8 shadow-xl min-h-[75vh] flex flex-col justify-between font-sans print:border-none print:shadow-none print:p-0">
            
            {/* Inner Header */}
            <div>
              <div className={`border-b-4 ${cl.borderAccent} pb-6 flex items-start justify-between gap-4`}>
                <div className="flex gap-4">
                  <span className="text-4xl">{customLogo}</span>
                  <div>
                    <h2 className={`font-display font-black text-lg tracking-tight uppercase ${cl.primary}`}>{orgName}</h2>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Nansana Learning Center & Community Hub</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">PO Box 11202, Kampala Uganda | info@ashinaga-rainbow.org</p>
                  </div>
                </div>
                
                <div className="text-right text-[10px] font-bold font-mono text-slate-500">
                  <p>DATE: {new Date().toLocaleDateString('en-GB')}</p>
                  <p>REF NO: ASH-{currentStudent?.id.toUpperCase()}-{selectedDocType.substring(0, 3).toUpperCase()}</p>
                </div>
              </div>

              {/* Template Render Logic */}
              {currentStudent ? (
                <div className="mt-8 space-y-6">
                  
                  {/* ID CARD TEMPLATE SPECIAL VIEW */}
                  {selectedDocType === 'idcard' ? (
                    <div className="flex justify-center py-10">
                      <div className={`w-80 border-4 ${cl.borderAccent} rounded-3xl p-6 bg-slate-50/50 relative shadow-md text-center`}>
                        <div className="absolute top-2 right-4 text-xs font-black uppercase text-slate-300">STUDENT ID</div>
                        <div className="h-24 w-24 bg-white rounded-full overflow-hidden border-2 border-slate-200 mx-auto mt-2">
                          {currentStudent.photo ? (
                            <img src={currentStudent.photo} alt={currentStudent.surname} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="h-full w-full bg-slate-100 flex items-center justify-center text-slate-500 text-xl font-bold">
                              {currentStudent.surname[0]}{currentStudent.otherNames[0]}
                            </div>
                          )}
                        </div>
                        <h3 className="font-extrabold text-slate-800 text-lg uppercase mt-3">{currentStudent.surname} {currentStudent.otherNames}</h3>
                        <p className={`text-xs font-black uppercase tracking-wider ${cl.textAccent}`}>{currentStudent.className} Candidate Pupil</p>
                        
                        <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-2 gap-2 text-[10px] text-left text-slate-600 font-medium">
                          <p>STUDENT ID: <span className="font-bold text-slate-800">{currentStudent.id}</span></p>
                          <p>GENDER: <span className="font-bold text-slate-800">{currentStudent.gender}</span></p>
                          <p>ZONE: <span className="font-bold text-slate-800 truncate block">{currentStudent.zoneInNansana}</span></p>
                          <p>SCHOLARSHIP: <span className="font-bold text-slate-800">{currentStudent.hasScholarship ? 'YES' : 'NO'}</span></p>
                        </div>
                        <div className="mt-5 text-[8px] text-slate-400 font-mono">
                          {orgName} • CHILD WELLBEING DIRECTORY
                        </div>
                      </div>
                    </div>
                  ) : (
                    // LETTER TEMPLATES
                    <div className="space-y-6">
                      <div className="space-y-1">
                        <h3 className={`font-display font-black text-sm uppercase tracking-wide ${cl.primary}`}>
                          {selectedDocType === 'graduation' ? 'PRIMARY SEVEN (P.7) COMPLETION DECREE' : 
                           selectedDocType === 'admission' ? 'OFFICIAL INTELLECTUAL ADMISSION MEMO' : 
                           selectedDocType === 'scholarship' ? 'SCHOLARSHIP SPONSORSHIP AWARD LETTER' :
                           selectedDocType.replace('_', ' ').toUpperCase()}
                        </h3>
                        <p className="text-xs font-extrabold text-slate-800">
                          SUBMITTED TO: Parent/Guardian of {currentStudent.surname} {currentStudent.otherNames}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Student ID: {currentStudent.id} | Class Level: {currentStudent.className} | Zone: {currentStudent.zoneInNansana}
                        </p>
                      </div>

                      <p className="text-xs text-slate-700 font-medium leading-relaxed font-sans pt-2">
                        {textBody}
                      </p>

                      {/* Dynamic Details block for certificate/letter */}
                      <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5 grid grid-cols-2 md:grid-cols-3 gap-4 text-xs font-medium text-slate-600 font-sans">
                        <div>
                          <span className="text-[9px] text-slate-400 font-extrabold uppercase block">Assigned Welfare Worker</span>
                          <span className="font-bold text-slate-800">{currentStudent.communityWorker || 'Florence Namatovu'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 font-extrabold uppercase block">Emergency Contact</span>
                          <span className="font-bold text-slate-800">{currentStudent.guardianContact || '+256 702 445588'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 font-extrabold uppercase block">Year of Intake</span>
                          <span className="font-bold text-slate-800">{currentStudent.yearOfEntry} Academic Year</span>
                        </div>
                        {selectedDocType === 'graduation' && (
                          <div className="col-span-2">
                            <span className="text-[9px] text-slate-400 font-extrabold uppercase block">National Examination Eligibility Status</span>
                            <span className="font-bold text-emerald-600 flex items-center gap-1.5 mt-0.5">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Ready & Eligible for Ministry Sync
                            </span>
                          </div>
                        )}
                        {selectedDocType === 'scholarship' && (
                          <div className="col-span-2">
                            <span className="text-[9px] text-slate-400 font-extrabold uppercase block">Sponsorship Funding Cap</span>
                            <span className="font-bold text-indigo-700">100% Core Costs, Uniforms, Meals & Learning Stationery Covered</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                <p className="text-center text-slate-400 py-10">Select a pupil above to populate details.</p>
              )}
            </div>

            {/* Inner Footer Signatures */}
            {selectedDocType !== 'idcard' && (
              <div className="mt-12 pt-6 border-t border-slate-100 flex items-end justify-between">
                <div>
                  <p className="text-[9px] text-slate-400 font-mono uppercase">Validated Security Node</p>
                  <p className="text-[10px] text-slate-600 font-bold uppercase mt-1">EMIS Sync Reference: ASH-{currentStudent?.id.toUpperCase()}</p>
                </div>

                <div className="text-right space-y-1">
                  {/* Mock cursive signature */}
                  <p className="font-serif italic font-black text-slate-400 pr-4" style={{ fontFamily: 'Dancing Script, cursive', fontSize: '20px' }}>
                    {signatureName.split(' ')[0]} {signatureName.split(' ')[1] || ''}
                  </p>
                  <div className={`w-48 h-0.5 ${cl.bgAccent}`} />
                  <p className="text-[11px] font-extrabold text-slate-800 uppercase leading-none mt-1">{signatureName}</p>
                  <p className="text-[9px] text-slate-500 font-medium leading-none">{signatureTitle}</p>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
