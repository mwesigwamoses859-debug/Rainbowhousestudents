import React, { useState, useEffect } from 'react';
import { 
  QrCode, 
  Download, 
  Copy, 
  Check, 
  Printer, 
  X, 
  ExternalLink, 
  ShieldCheck, 
  User, 
  GraduationCap, 
  Calendar, 
  Sparkles,
  Share2
} from 'lucide-react';
import QRCode from 'qrcode';
import { Student, Mark } from '../types';
import AshinagaLogo from './AshinagaLogo';

interface StudentQrCodeModalProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
  marks?: Mark[];
  onOpenProfile?: (student: Student) => void;
}

export default function StudentQrCodeModal({
  student,
  isOpen,
  onClose,
  marks = [],
  onOpenProfile
}: StudentQrCodeModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loadingQr, setLoadingQr] = useState(true);

  if (!isOpen || !student) return null;

  // Build the unique shareable/scannable digital profile URL
  const profileUrl = `${window.location.origin}${window.location.pathname}?studentId=${student.id}`;

  useEffect(() => {
    let isMounted = true;
    setLoadingQr(true);

    QRCode.toDataURL(profileUrl, {
      margin: 1,
      width: 320,
      color: {
        dark: '#0b2d59',
        light: '#ffffff'
      }
    })
      .then(url => {
        if (isMounted) {
          setQrDataUrl(url);
          setLoadingQr(false);
        }
      })
      .catch(err => {
        console.error('Error generating QR code:', err);
        if (isMounted) setLoadingQr(false);
      });

    return () => {
      isMounted = false;
    };
  }, [student, profileUrl]);

  // Handle Copy Profile Link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Handle Download QR PNG
  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR_Code_${student.surname}_${student.otherNames}_${student.id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Handle Print QR Pass
  const handlePrint = () => {
    window.print();
  };

  // Filter student marks for verified history summary
  const studentMarks = marks.filter(m => m.studentId === student.id);
  const avgAcademicScore = studentMarks.length > 0 
    ? Math.round(studentMarks.reduce((sum, m) => sum + m.score, 0) / studentMarks.length) 
    : 0;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto no-print">
      <div className="bg-white rounded-3xl border border-slate-100 w-full max-w-xl shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200 font-sans">
        
        {/* Header Bar */}
        <div className="bg-[#0b2d59] p-6 text-white flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <AshinagaLogo size={38} className="shrink-0 bg-white p-1 rounded-xl" />
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-400 text-slate-900 rounded-full text-[9px] font-black uppercase tracking-wider mb-1">
                <Sparkles className="h-3 w-3 text-slate-900" /> Unique Pupil QR Code
              </div>
              <h2 className="text-lg font-black tracking-tight uppercase leading-none">
                {student.surname} {student.otherNames}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 text-white/80 hover:text-white rounded-xl transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 md:p-8 space-y-6">
          
          {/* Main Printable / Downloadable QR Pass Card */}
          <div id="student_qr_card_printable" className="bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-50 p-6 rounded-3xl border-2 border-indigo-100 shadow-sm text-center relative overflow-hidden">
            
            <div className="flex items-center justify-between border-b border-indigo-100/80 pb-3 mb-4">
              <div className="flex items-center gap-2 text-left">
                <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0">
                  {student.surname[0]}{student.otherNames[0]}
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-800 tracking-wide">Digital Profile Pass</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Class {student.className} • ID: {student.id}</p>
                </div>
              </div>

              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[9px] font-extrabold rounded-full flex items-center gap-1 border border-emerald-200">
                <ShieldCheck className="h-3 w-3 text-emerald-600" /> VERIFIED
              </span>
            </div>

            {/* QR Code Container */}
            <div className="my-2 flex flex-col items-center justify-center">
              <div className="p-4 bg-white rounded-2xl shadow-md border-2 border-slate-200/80 inline-block relative group">
                {loadingQr ? (
                  <div className="w-48 h-48 flex items-center justify-center text-xs text-slate-400 font-bold">
                    Generating Code...
                  </div>
                ) : (
                  <img src={qrDataUrl} alt={`QR Code for ${student.surname}`} className="w-48 h-48 object-contain mx-auto" />
                )}
                
                <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-all rounded-2xl flex items-center justify-center">
                  <span className="bg-slate-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg">
                    Scan to Open Profile
                  </span>
                </div>
              </div>

              <span className="text-[10px] font-mono font-bold text-slate-500 mt-3 uppercase tracking-wider">
                REF: ASH-UG-{student.id.toUpperCase()}
              </span>
            </div>

            {/* Quick Summary Bar */}
            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-indigo-100 text-left text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                <span className="text-[9px] text-slate-400 uppercase font-bold block">Class Level</span>
                <span className="font-extrabold text-slate-800">{student.className}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                <span className="text-[9px] text-slate-400 uppercase font-bold block">Academic Avg</span>
                <span className="font-extrabold text-indigo-700">{avgAcademicScore > 0 ? `${avgAcademicScore}%` : 'Assessed'}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                <span className="text-[9px] text-slate-400 uppercase font-bold block">Sponsorship</span>
                <span className="font-extrabold text-emerald-700">{student.hasScholarship ? 'Scholar' : 'Standard'}</span>
              </div>
            </div>
          </div>

          {/* Shareable Link Bar */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Direct Digital Profile Link</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={profileUrl}
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 focus:outline-none select-all"
              />
              <button
                onClick={handleCopyLink}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  copied 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <button
              onClick={handleDownloadQr}
              className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Download className="h-4 w-4" />
              <span>Download PNG</span>
            </button>

            <button
              onClick={handlePrint}
              className="py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Printer className="h-4 w-4 text-slate-500" />
              <span>Print Pass</span>
            </button>

            {onOpenProfile && (
              <button
                onClick={() => {
                  onClose();
                  onOpenProfile(student);
                }}
                className="py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <ExternalLink className="h-4 w-4 text-emerald-600" />
                <span>360° Profile</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
