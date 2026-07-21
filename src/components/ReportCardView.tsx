import { useState, useEffect } from 'react';
import { Printer, Users, Calendar, Award, MapPin } from 'lucide-react';
import QRCode from 'qrcode';
import { Student, Mark } from '../types';

interface ReportCardViewProps {
  students: Student[];
  marks: Mark[];
  selectedStudent: Student | null;
}

export default function ReportCardView({ students, marks, selectedStudent: initialSelectedStudent }: ReportCardViewProps) {
  const [activeStudentId, setActiveStudentId] = useState<string>('');
  const [activeTerm, setActiveTerm] = useState<1 | 2 | 3>(1);
  const [activeYear, setActiveYear] = useState<number>(2026);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // Synchronize with selected student from ClassList
  useEffect(() => {
    if (initialSelectedStudent) {
      setActiveStudentId(initialSelectedStudent.id);
      // Determine if they have marks for this term
      const termMarks = marks.filter(m => m.studentId === initialSelectedStudent.id);
      if (termMarks.length > 0) {
        setActiveTerm(termMarks[0].term as 1 | 2 | 3);
        setActiveYear(termMarks[0].year);
      }
    } else if (students.length > 0 && !activeStudentId) {
      setActiveStudentId(students[0].id);
    }
  }, [initialSelectedStudent, students, marks]);

  const student = students.find(s => s.id === activeStudentId);

  // Generate QR Code dynamically on student, term, or year change
  useEffect(() => {
    if (student) {
      const verificationUrl = `${window.location.origin}/?verifyReport=${student.id}&term=${activeTerm}&year=${activeYear}`;
      QRCode.toDataURL(verificationUrl, { margin: 1, width: 120 })
        .then(url => {
          setQrCodeDataUrl(url);
        })
        .catch(err => {
          console.error('Error generating QR Code', err);
        });
    } else {
      setQrCodeDataUrl('');
    }
  }, [student, activeTerm, activeYear]);

  // Filter marks for selected student, term, and year
  const studentMarks = marks.filter(
    m => m.studentId === activeStudentId && m.term === activeTerm && m.year === activeYear
  );

  // Calculate student age
  const calculateStudentAge = (dobString: string | undefined) => {
    if (!dobString) return { currentAge: 0, ageAtEntry: 0 };
    const dob = new Date(dobString);
    const birthYear = dob.getFullYear();
    const currentYear = new Date().getFullYear();
    const entryYear = student?.yearOfEntry || currentYear;

    return {
      currentAge: currentYear - birthYear,
      ageAtEntry: entryYear - birthYear
    };
  };

  const { currentAge, ageAtEntry } = calculateStudentAge(student?.dateOfBirth);

  // Ugandan Grading helper
  const getGradeValue = (score: number): { grade: string; points: number; remark: string; initials: string } => {
    if (score >= 90) return { grade: 'D1', points: 1, remark: 'Excellent performance', initials: 'T.M' };
    if (score >= 80) return { grade: 'D2', points: 2, remark: 'Very good progress', initials: 'T.M' };
    if (score >= 70) return { grade: 'C3', points: 3, remark: 'Good effort, keep it up', initials: 'T.E' };
    if (score >= 60) return { grade: 'C4', points: 4, remark: 'Very satisfactory', initials: 'T.E' };
    if (score >= 55) return { grade: 'C5', points: 5, remark: 'Satisfactory standard', initials: 'T.S' };
    if (score >= 50) return { grade: 'C6', points: 6, remark: 'Fair, put in more effort', initials: 'T.S' };
    if (score >= 45) return { grade: 'P7', points: 7, remark: 'Passed, aims can be higher', initials: 'T.R' };
    if (score >= 40) return { grade: 'P8', points: 8, remark: 'Weak pass, revision needed', initials: 'T.R' };
    return { grade: 'F9', points: 9, remark: 'Failed, seek urgent remedial guidance', initials: 'T.G' };
  };

  // Compile academic totals
  const compiledMarks = studentMarks.map(m => {
    const info = getGradeValue(m.score);
    return {
      subject: m.subject,
      score: m.score,
      grade: info.grade,
      points: info.points,
      remark: info.remark,
      teacher: m.teacherName || info.initials
    };
  });

  const totalScore = compiledMarks.reduce((sum, m) => sum + m.score, 0);
  const averageScore = compiledMarks.length > 0 ? Math.round(totalScore / compiledMarks.length) : 0;
  
  // Dynamic Aggregate (Sum of grades) - Standard primary system
  // We sum the points (1-9) across subjects (Math, English, Science, SST)
  const totalPoints = compiledMarks.reduce((sum, m) => sum + m.points, 0);

  // Determine Primary Division class
  const getDivision = (aggregate: number, count: number): { division: string; desc: string; textClass: string } => {
    if (count === 0) return { division: 'N/A', desc: 'No assessments', textClass: 'text-slate-400' };
    
    // Normalize to a 4-subject system or direct 5-subject system
    // Usually PLE uses best 4, let's base it on the average points
    const avgPoint = aggregate / count;
    
    if (avgPoint <= 2.2) return { division: 'Division I', desc: 'Distinction Class', textClass: 'text-emerald-700 font-bold' };
    if (avgPoint <= 4.8) return { division: 'Division II', desc: 'Credit Class', textClass: 'text-indigo-700 font-bold' };
    if (avgPoint <= 6.8) return { division: 'Division III', desc: 'Pass Class', textClass: 'text-amber-700 font-bold' };
    if (avgPoint <= 8.0) return { division: 'Division IV', desc: 'Weak Pass', textClass: 'text-orange-700 font-medium' };
    return { division: 'Division U', desc: 'Ungraded (Fail)', textClass: 'text-red-700 font-bold' };
  };

  const divisionInfo = getDivision(totalPoints, compiledMarks.length);

  // Dynamic comments
  const getClassTeacherRemark = (div: string) => {
    if (div === 'Division I') return 'An outstanding scholar. Demonstrates exemplary dedication, sharp intellectual curiosity, and superb scores.';
    if (div === 'Division II') return 'A very good termly performance. Steady, highly capable, and responsive in class. Maintain this fine focus.';
    if (div === 'Division III') return 'A fair outcome. Needs to step up independent evening revision, particularly in critical subjects.';
    if (div === 'Division IV') return 'Satisfactory but weak. Focus must double. Regular revision of test papers is highly recommended.';
    return 'Struggled to meet targets this term. Close parental guidance and rigorous coaching are required for improvement.';
  };

  const getHeadTeacherRemark = (div: string) => {
    if (div === 'Division I') return 'Excellent results! A sterling representation of our school standard. Keep up the high level of success.';
    if (div === 'Division II') return 'Good work. You have strong potential to enter Division I next term. Push harder!';
    if (div === 'Division III') return 'Fair progress. With more commitment and focus on tutoring, you will attain higher grades.';
    if (div === 'Division IV') return 'More effort is needed. Seek help from your subject teachers to raise these marks.';
    return 'Urgent improvement is required. Please discuss a study program with the class teacher immediately.';
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="report_card_module" className="p-8 space-y-6 max-w-5xl mx-auto font-sans">
      
      {/* Control selectors - Hidden during printing */}
      <div className="bg-white border-2 border-transparent hover:border-indigo-400 p-6 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all no-print">
        <div className="space-y-1">
          <h1 className="font-display font-black text-slate-800 text-lg">Report Card Generator</h1>
          <p className="text-slate-400 text-xs">Generate and print authentic Ugandan primary school terminal progress reports</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Student Selector */}
          <div className="flex-1 sm:flex-initial">
            <select
              value={activeStudentId}
              onChange={(e) => {
                setActiveStudentId(e.target.value);
              }}
              className="w-full px-3.5 py-2.5 border-2 border-slate-200 hover:border-slate-300 rounded-xl text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold cursor-pointer"
            >
              <option value="">-- Choose Student --</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.surname} {s.otherNames} ({s.className})</option>
              ))}
            </select>
          </div>

          {/* Term Selector */}
          <div>
            <select
              value={activeTerm}
              onChange={(e) => setActiveTerm(Number(e.target.value) as any)}
              className="px-3.5 py-2.5 border-2 border-slate-200 hover:border-slate-300 rounded-xl text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold cursor-pointer"
            >
              <option value={1}>Term 1</option>
              <option value={2}>Term 2</option>
              <option value={3}>Term 3</option>
            </select>
          </div>

          {/* Print trigger */}
          <button
            onClick={handlePrint}
            disabled={!student}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Printer className="h-4 w-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Main Report Card Paper Canvas */}
      {!student ? (
        <div className="bg-white rounded-3xl border-2 border-transparent hover:border-indigo-400 py-20 text-center shadow-sm no-print transition-all">
          <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-slate-600 font-bold text-sm">No Student Selected</h3>
          <p className="text-slate-400 text-xs mt-1">Select a student from the filter menu to view their printable progress report.</p>
        </div>
      ) : (
        <div id="printable_report_card" className="bg-white text-slate-900 border-[6px] border-double border-slate-950 p-6 md:p-10 mx-auto w-full max-w-[800px] shadow-lg relative print:shadow-none print:border-[4px] print:p-6">
          
          {/* Ministry Seal or School Crest Embellishment */}
          <div className="text-center space-y-2 border-b-2 border-slate-900 pb-5">
            {/* National Motto / Embellishment line */}
            <div className="text-[9px] font-bold tracking-widest text-slate-500 uppercase font-mono">FOR GOD AND MY COUNTRY</div>
            <h2 className="font-display font-extrabold text-2xl md:text-3xl text-indigo-950 uppercase tracking-tight">NANSANA EDUCATION ORGANISATION</h2>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              P.O. Box 123, Nansana, Wakiso, Uganda<br />
              Tel: +256 414 556677 | Email: reports@nansanaschool.org<br />
              <strong className="text-slate-800 text-xs tracking-wider block mt-2 uppercase font-mono">TERMLY PROGRESS ACADEMIC REPORT</strong>
            </p>
          </div>

          {/* Student Biodata Profile Frame */}
          <div className="mt-6 flex flex-col sm:flex-row gap-6 justify-between items-stretch">
            {/* Details Column */}
            <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div className="col-span-2 border-b border-slate-100 pb-1.5 mb-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block font-mono">Student Profile</span>
              </div>
              <div>
                <span className="text-slate-400 block font-light">Surname:</span>
                <strong className="text-slate-800 text-sm uppercase">{student.surname}</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-light">Other Names:</span>
                <strong className="text-slate-800 text-sm">{student.otherNames}</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-light">Gender / Sex:</span>
                <strong className="text-slate-800">{student.gender}</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-light">Class:</span>
                <strong className="text-indigo-700 text-sm font-bold">{student.className}</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-light">Current Age:</span>
                <strong className="text-slate-800">{currentAge} Years</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-light">Age at Entry:</span>
                <strong className="text-slate-800">{ageAtEntry} Years</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-light">Year of Entry:</span>
                <strong className="text-slate-800">{student.yearOfEntry}</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-light">Scholarship:</span>
                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] uppercase font-mono border ${
                  student.hasScholarship 
                    ? 'bg-amber-50 text-amber-800 border-amber-300 font-bold' 
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  {student.hasScholarship ? 'SPONSORED' : 'SELF-PAY'}
                </span>
              </div>
              <div className="col-span-2 mt-2">
                <span className="text-slate-400 block font-light">Nansana Residence Zone:</span>
                <strong className="text-slate-800 flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-slate-400 inline" /> {student.zoneInNansana} Zone
                </strong>
              </div>
            </div>

            {/* Photo Box Frame */}
            <div className="w-32 h-36 bg-slate-50 border-2 border-slate-800 flex items-center justify-center shrink-0 overflow-hidden relative mx-auto sm:mx-0">
              {student.photo ? (
                <img src={student.photo} alt="Student" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
              ) : (
                <div className="text-center p-3 text-slate-300 text-[10px] font-bold font-mono">
                  AFFIX PHOTO HERE
                </div>
              )}
            </div>
          </div>

          {/* Academic Report Table */}
          <div className="mt-8">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-2 font-mono">Academic Marks Record</div>
            {compiledMarks.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 border border-slate-200 text-slate-400 text-xs italic font-light">
                * No marks have been uploaded or saved for this student for Term {activeTerm}, {activeYear} yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse border-2 border-slate-900">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-900 text-[10px] font-bold uppercase tracking-wider font-mono">
                    <th className="border-r border-slate-900 p-2.5">Subject</th>
                    <th className="border-r border-slate-900 p-2.5 text-center w-24">Pupil's Score (%)</th>
                    <th className="border-r border-slate-900 p-2.5 text-center w-20">Uganda Grade</th>
                    <th className="border-r border-slate-900 p-2.5 w-44">Subject Remark</th>
                    <th className="p-2.5 text-center w-20">Teacher</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-400">
                  {compiledMarks.map((m, index) => (
                    <tr key={index}>
                      <td className="border-r border-slate-900 p-2.5 font-bold text-slate-800">{m.subject}</td>
                      <td className="border-r border-slate-900 p-2.5 text-center font-bold text-slate-800 text-sm font-mono">{m.score}%</td>
                      <td className="border-r border-slate-900 p-2.5 text-center font-extrabold text-slate-900 font-mono text-sm">{m.grade}</td>
                      <td className="border-r border-slate-900 p-2.5 text-slate-600 font-medium">{m.remark}</td>
                      <td className="p-2.5 text-center text-slate-500 font-mono text-[10px]">{m.teacher}</td>
                    </tr>
                  ))}

                  {/* Summary Rows */}
                  <tr className="bg-slate-50/60 font-bold border-t-2 border-slate-900">
                    <td className="border-r border-slate-900 p-2.5 text-right font-mono uppercase text-[10px]">Total Marks:</td>
                    <td className="border-r border-slate-900 p-2.5 text-center font-bold text-slate-850 text-sm font-mono">{totalScore} / {compiledMarks.length * 100}</td>
                    <td colSpan={3} className="p-2.5 font-light italic text-slate-400 text-[10px]">Accumulated termly score</td>
                  </tr>

                  <tr className="bg-slate-50/60 font-bold">
                    <td className="border-r border-slate-900 p-2.5 text-right font-mono uppercase text-[10px]">Average Score:</td>
                    <td className="border-r border-slate-900 p-2.5 text-center font-bold text-indigo-750 text-sm font-mono">{averageScore}%</td>
                    <td colSpan={3} className="p-2.5 font-light italic text-slate-400 text-[10px]">Overall percentage average</td>
                  </tr>

                  <tr className="bg-indigo-50/35 font-bold border-t border-slate-900">
                    <td className="border-r border-slate-900 p-2.5 text-right font-mono uppercase text-[10px]">Termly Aggregate:</td>
                    <td className="border-r border-slate-900 p-2.5 text-center font-bold text-slate-850 text-sm font-mono">{totalPoints} Points</td>
                    <td colSpan={3} className="p-2.5 text-slate-500 font-medium">
                      Aggregate Points (Best 4/5 subjects sum)
                    </td>
                  </tr>

                  <tr className="bg-amber-50/20 font-bold">
                    <td className="border-r border-slate-900 p-2.5 text-right font-mono uppercase text-[10px]">Overall Division:</td>
                    <td className="border-r border-slate-900 p-2.5 text-center font-extrabold font-mono text-sm uppercase" colSpan={1}>
                      <span className={divisionInfo.textClass}>{divisionInfo.division}</span>
                    </td>
                    <td colSpan={3} className="p-2.5 text-slate-700 font-semibold uppercase tracking-wide text-[10px]">
                      {divisionInfo.desc}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          {/* Official Comments & Signatures */}
          <div className="mt-8 space-y-4 border-t-2 border-slate-900 pt-5 text-xs text-slate-800">
            <div>
              <p className="leading-relaxed">
                <strong>Class Teacher's Remark:</strong><br />
                <span className="italic text-slate-700 border-b border-dashed border-slate-400 block pb-1 mt-1 font-medium">
                  {compiledMarks.length > 0 ? getClassTeacherRemark(divisionInfo.division) : '__________________________________________________________________________________________'}
                </span>
              </p>
            </div>

            <div>
              <p className="leading-relaxed">
                <strong>Head Teacher's Remark:</strong><br />
                <span className="italic text-slate-700 border-b border-dashed border-slate-400 block pb-1 mt-1 font-medium">
                  {compiledMarks.length > 0 ? getHeadTeacherRemark(divisionInfo.division) : '__________________________________________________________________________________________'}
                </span>
              </p>
            </div>

            {/* Signature Grid */}
            <div className="mt-10 pt-4 flex justify-between items-center gap-4 flex-col sm:flex-row text-center">
              <div className="w-44">
                <div className="border-b border-slate-800 h-8 font-serif italic text-sm text-slate-600">Sarah Babirye</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase mt-1 font-mono">Class Teacher</div>
              </div>

              {/* School Stamp Frame */}
              <div className="border border-dashed border-slate-400 rounded p-3 h-20 w-40 flex items-center justify-center text-center text-[10px] font-bold font-mono text-slate-300 select-none uppercase tracking-wider relative">
                <span className="absolute transform -rotate-12 border-2 border-indigo-200 text-indigo-200/55 rounded px-2.5 py-1 text-[11px] font-extrabold uppercase">
                  SCHOOL STAMP
                </span>
              </div>

              <div className="w-44">
                <div className="border-b border-slate-800 h-8 font-serif italic text-sm text-slate-600">William Mukasa</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase mt-1 font-mono">Head Teacher</div>
              </div>
            </div>

            {/* Verification Security Footer */}
            <div className="mt-10 pt-5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {qrCodeDataUrl ? (
                  <div className="p-1 border border-slate-300 rounded bg-white shrink-0 shadow-xs">
                    <img src={qrCodeDataUrl} alt="Verification QR Code" className="w-16 h-16" />
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-slate-50 border border-slate-200 text-[8px] text-slate-400 flex items-center justify-center font-mono">
                    GENERATING
                  </div>
                )}
                <div className="text-left text-[10px] text-slate-500 space-y-0.5">
                  <p className="font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1 text-[11px]">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    SECURE VERIFICATION SYSTEM
                  </p>
                  <p className="text-[10px] text-slate-500 leading-normal">This report card is digitally verified. Scan the QR code to confirm registry authenticity.</p>
                  <p className="font-mono text-[9px] text-slate-400 font-bold uppercase">REF: ASH-UG-{student.id.toUpperCase()}-T{activeTerm}-{activeYear}</p>
                </div>
              </div>
              <div className="text-right text-[9px] text-slate-400 font-mono italic">
                Ashinaga Uganda Ledger ID
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
