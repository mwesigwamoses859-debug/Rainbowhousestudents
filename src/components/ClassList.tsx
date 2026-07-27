import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  Filter, 
  Upload, 
  UserPlus,
  BookOpen,
  Calendar,
  Phone,
  User,
  MapPin,
  HeartHandshake,
  Check,
  X,
  FileSpreadsheet,
  Activity,
  QrCode,
  Camera
} from 'lucide-react';
import { Student, ClassName, Gender, Mark } from '../types';
import { googleSignIn, initAuth } from '../lib/firebase';
import { createAndExportStudentsSheet } from '../lib/googleSheets';
import { checkNameSimilarity } from '../utils/nameSimilarity';
import AshinagaLogo from './AshinagaLogo';
import StudentQrCodeModal from './StudentQrCodeModal';

interface ClassListProps {
  students: Student[];
  marks?: Mark[];
  onAddStudent: (student: Omit<Student, 'id'>) => Promise<void>;
  onUpdateStudent: (id: string, student: Partial<Student>) => Promise<void>;
  onDeleteStudent: (id: string) => Promise<void>;
  onGenerateReportCard: (student: Student) => void;
  onOpenProfile: (student: Student) => void;
  teacherClasses: ClassName[];
  isAdmin: boolean;
  autoOpenAddModal?: boolean;
  onCloseAutoOpenAddModal?: () => void;
}

export default function ClassList({ 
  students, 
  marks = [],
  onAddStudent, 
  onUpdateStudent, 
  onDeleteStudent, 
  onGenerateReportCard,
  onOpenProfile,
  teacherClasses,
  isAdmin,
  autoOpenAddModal,
  onCloseAutoOpenAddModal
}: ClassListProps) {
  const classesList: ClassName[] = ['P.1', 'P.2', 'P.3', 'P.4', 'P.5', 'P.6', 'P.7'];
  
  // States
  const [selectedClass, setSelectedClass] = useState<ClassName>('P.1');
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'All' | 'Male' | 'Female'>('All');
  const [scholarshipFilter, setScholarshipFilter] = useState<'All' | 'Yes' | 'No'>('All');
  
  // Form State
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Auto-open Add Student modal when triggered from Quick Actions FAB
  useEffect(() => {
    if (autoOpenAddModal) {
      setEditingStudent(null);
      setShowFormModal(true);
      if (onCloseAutoOpenAddModal) {
        onCloseAutoOpenAddModal();
      }
    }
  }, [autoOpenAddModal, onCloseAutoOpenAddModal]);

  // QR Code Modal State
  const [selectedQrStudent, setSelectedQrStudent] = useState<Student | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);

  const handleOpenQrModal = (student: Student) => {
    setSelectedQrStudent(student);
    setIsQrModalOpen(true);
  };

  // Google Sheets Export States
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [googleToken, setGoogleToken] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessUrl, setExportSuccessUrl] = useState<string>('');

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken('');
      }
    );
    return () => unsubscribe();
  }, []);

  // Reset export URL when class shifts
  useEffect(() => {
    setExportSuccessUrl('');
  }, [selectedClass]);

  const handleExportRoster = async () => {
    let token = googleToken;
    if (!googleUser || !token) {
      try {
        const result = await googleSignIn();
        if (result) {
          setGoogleUser(result.user);
          setGoogleToken(result.accessToken);
          token = result.accessToken;
        } else {
          return;
        }
      } catch (err) {
        alert('Google authentication failed. Please try again.');
        return;
      }
    }

    setIsExporting(true);
    setExportSuccessUrl('');
    try {
      const title = `Nansana Organisation Roster - Class ${selectedClass} (Exported ${new Date().toLocaleDateString()})`;
      const result = await createAndExportStudentsSheet(title, filteredStudents, token);
      setExportSuccessUrl(result.spreadsheetUrl);
    } catch (err) {
      alert('Roster export failed. Please verify spreadsheet permissions and try again.');
    } finally {
      setIsExporting(false);
    }
  };
  
  const [formData, setFormData] = useState({
    surname: '',
    otherNames: '',
    gender: 'Male' as Gender,
    dateOfBirth: '',
    className: 'P.1' as ClassName,
    yearOfEntry: new Date().getFullYear(),
    photo: '',
    guardianName: '',
    guardianContact: '',
    guardianRelationship: '',
    guardianContact2: '',
    communityWorker: '',
    workerContact: '',
    zoneInNansana: '',
    nextOfKin: '',
    nextOfKinContact: '',
    numberInHousehold: 0,
    deceased: '',
    causeOfDeath: '',
    school: '',
    hasScholarship: false,
    scholarshipDetails: ''
  });

  const [formError, setFormError] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');

  // Real-time camera snapshot capture state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });
      setCameraStream(stream);
      setIsCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      alert("Unable to access camera. Please check camera permissions or try uploading an image.");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 320;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const minDim = Math.min(video.videoWidth || 640, video.videoHeight || 480);
        const startX = ((video.videoWidth || 640) - minDim) / 2;
        const startY = ((video.videoHeight || 480) - minDim) / 2;
        ctx.drawImage(video, startX, startY, minDim, minDim, 0, 0, 320, 320);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setPhotoPreview(dataUrl);
        setFormData(prev => ({ ...prev, photo: dataUrl }));
      }
    }
    stopCamera();
  };

  // Handle Name Similarity Checking on typing
  const [similarityWarning, setSimilarityWarning] = useState<{
    message: string;
    type: 'exact_class' | 'exact_school' | 'typo' | 'partial';
    matchStudent?: any;
  } | null>(null);

  useEffect(() => {
    if (!formData.surname.trim() || !formData.otherNames.trim()) {
      setSimilarityWarning(null);
      return;
    }

    const check = checkNameSimilarity(
      formData.surname,
      formData.otherNames,
      formData.className,
      students,
      editingStudent?.id
    );

    if (check.resembles && check.matchStudent) {
      const match = check.matchStudent;
      const fullName = `${match.surname} ${match.otherNames}`;
      
      if (check.isExactInClass) {
        setSimilarityWarning({
          message: `⚠️ CRITICAL: "${fullName}" is already registered in this class (Class ${match.className}). Duplicates are forbidden.`,
          type: 'exact_class',
          matchStudent: match
        });
      } else if (check.isExactSchool) {
        setSimilarityWarning({
          message: `⚠️ Notice: "${fullName}" is already registered in a different class (Class ${match.className}). Is this the same student or a sibling?`,
          type: 'exact_school',
          matchStudent: match
        });
      } else if (check.resemblanceType === 'typo') {
        setSimilarityWarning({
          message: `🔍 Resembling Name (Possible Typo): "${fullName}" is registered in Class ${match.className}. Did you mean this student?`,
          type: 'typo',
          matchStudent: match
        });
      } else {
        setSimilarityWarning({
          message: `🔍 Similar Name Detected: "${fullName}" is registered in Class ${match.className}. Please check for duplication.`,
          type: 'partial',
          matchStudent: match
        });
      }
    } else {
      setSimilarityWarning(null);
    }
  }, [formData.surname, formData.otherNames, formData.className, students, editingStudent]);

  // Handle Photo File Upload & Convert to Base64
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('File is too large! Please upload a file smaller than 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPhotoPreview(base64String);
        setFormData(prev => ({ ...prev, photo: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenAddModal = () => {
    setEditingStudent(null);
    setFormData({
      surname: '',
      otherNames: '',
      gender: 'Male',
      dateOfBirth: '2015-01-01',
      className: selectedClass,
      yearOfEntry: new Date().getFullYear(),
      photo: '',
      guardianName: '',
      guardianContact: '',
      guardianRelationship: '',
      guardianContact2: '',
      communityWorker: '',
      workerContact: '',
      zoneInNansana: '',
      nextOfKin: '',
      nextOfKinContact: '',
      numberInHousehold: 0,
      deceased: '',
      causeOfDeath: '',
      school: '',
      hasScholarship: false,
      scholarshipDetails: ''
    });
    setPhotoPreview('');
    setFormError('');
    setShowFormModal(true);
  };

  const handleOpenEditModal = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      surname: student.surname,
      otherNames: student.otherNames,
      gender: student.gender,
      dateOfBirth: student.dateOfBirth,
      className: student.className,
      yearOfEntry: student.yearOfEntry,
      photo: student.photo,
      guardianName: student.guardianName,
      guardianContact: student.guardianContact,
      guardianRelationship: student.guardianRelationship || '',
      guardianContact2: student.guardianContact2 || '',
      communityWorker: student.communityWorker,
      workerContact: student.workerContact,
      zoneInNansana: student.zoneInNansana,
      nextOfKin: student.nextOfKin || '',
      nextOfKinContact: student.nextOfKinContact || '',
      numberInHousehold: student.numberInHousehold || 0,
      deceased: student.deceased || '',
      causeOfDeath: student.causeOfDeath || '',
      school: student.school || '',
      hasScholarship: student.hasScholarship,
      scholarshipDetails: student.scholarshipDetails || ''
    });
    setPhotoPreview(student.photo);
    setFormError('');
    setShowFormModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.surname || !formData.otherNames || !formData.dateOfBirth || !formData.guardianName || !formData.guardianContact || !formData.zoneInNansana) {
      setFormError('Please fill in all required fields marked with *');
      return;
    }

    if (similarityWarning && (similarityWarning.type === 'exact_class' || similarityWarning.type === 'exact_school')) {
      setFormError(`Cannot register a second record: "${formData.surname} ${formData.otherNames}" already exists. Open and update the existing student instead.`);
      return;
    }

    try {
      if (editingStudent) {
        await onUpdateStudent(editingStudent.id, formData);
      } else {
        await onAddStudent(formData);
      }
      setShowFormModal(false);
    } catch (err: any) {
      setFormError(err.message || 'Error saving student. Please try again.');
    }
  };

  // Helper calculations for ages
  const calculateAges = (dobString: string, entryYear: number) => {
    if (!dobString) return { currentAge: 0, ageAtEntry: 0 };
    const dob = new Date(dobString);
    const birthYear = dob.getFullYear();
    const currentYear = new Date().getFullYear();
    
    return {
      currentAge: currentYear - birthYear,
      ageAtEntry: entryYear - birthYear
    };
  };

  // Filtering
  const classFilteredStudents = students.filter(s => s.className === selectedClass);
  
  const filteredStudents = classFilteredStudents.filter(student => {
    const fullName = `${student.surname} ${student.otherNames}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || 
                          student.zoneInNansana.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          student.guardianName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesGender = genderFilter === 'All' || student.gender === genderFilter;
    const matchesScholarship = scholarshipFilter === 'All' || 
                              (scholarshipFilter === 'Yes' && student.hasScholarship) || 
                              (scholarshipFilter === 'No' && !student.hasScholarship);

    return matchesSearch && matchesGender && matchesScholarship;
  });

  const hasAccessToClass = (c: ClassName) => {
    if (isAdmin) return true;
    return teacherClasses.includes(c);
  };

  return (
    <div id="class_list_view" className="p-8 space-y-6 font-sans max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-sky-150 pb-5">
        <div className="flex items-center gap-3">
          <AshinagaLogo size={50} className="shrink-0 bg-white p-1 rounded-xl shadow-xs border border-slate-100" />
          <div>
            <h1 className="font-display text-2xl font-black text-slate-800">Student Database</h1>
            <p className="text-xs text-slate-400 mt-1">Manage and view pupil details separately across classes P.1 to P.7</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2.5">
          {exportSuccessUrl ? (
            <a
              href={exportSuccessUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 border-2 border-emerald-200 px-5 py-2.5 rounded-xl font-bold hover:bg-emerald-100 transition-all text-xs animate-pulse"
            >
              <Check className="h-4 w-4 text-emerald-600" />
              <span>Roster Exported! Open Sheet ↗</span>
            </a>
          ) : (
            <button
              onClick={handleExportRoster}
              disabled={isExporting || filteredStudents.length === 0}
              className="inline-flex items-center gap-2 bg-white text-indigo-600 border-2 border-indigo-200 hover:border-indigo-400 px-5 py-2.5 rounded-xl font-bold shadow-sm transition-all active:scale-95 cursor-pointer text-xs disabled:opacity-50"
            >
              <FileSpreadsheet className="h-4 w-4 text-indigo-600" />
              <span>{isExporting ? 'Exporting...' : 'Export to Google Sheets'}</span>
            </button>
          )}

          {hasAccessToClass(selectedClass) && (
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-emerald-600 shadow-md transition-all active:scale-95 cursor-pointer text-xs"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add Student to {selectedClass}</span>
            </button>
          )}
        </div>
      </div>

      {/* Class Level Navigation Tabs */}
      <div className="flex flex-wrap bg-slate-100 p-1 rounded-2xl gap-1">
        {classesList.map((c) => {
          const isSelected = selectedClass === c;
          const hasAccess = hasAccessToClass(c);
          return (
            <button
              key={c}
              onClick={() => setSelectedClass(c)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-white text-indigo-600 shadow-sm font-black'
                  : 'text-slate-500 hover:text-slate-800'
              } ${!hasAccess ? 'opacity-50' : ''}`}
            >
              Class {c} {!hasAccess && '🔒'}
            </button>
          );
        })}
      </div>

      {/* Search and Filters Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        {/* Search input */}
        <div className="md:col-span-2 relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search by name, zone, or guardian..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        {/* Gender Filter */}
        <div className="relative">
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value as any)}
            className="w-full appearance-none px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
          >
            <option value="All">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>

        {/* Scholarship Filter */}
        <div className="relative">
          <select
            value={scholarshipFilter}
            onChange={(e) => setScholarshipFilter(e.target.value as any)}
            className="w-full appearance-none px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
          >
            <option value="All">All Scholarship Statuses</option>
            <option value="Yes">On Scholarship</option>
            <option value="No">Self-Sponsored</option>
          </select>
        </div>
      </div>

      {/* Class Level Restrictions Banner if teacher cannot access */}
      {!hasAccessToClass(selectedClass) && (
        <div className="bg-amber-50 text-amber-800 border border-amber-100 rounded-xl p-4 text-xs font-medium">
          ⚠️ You are logged in as a teacher with class restrictions. Mr. John Mukasa manages P.5 - P.7, while Mrs. Sarah Babirye manages P.1 - P.4. 
          You can view the student list for Class {selectedClass}, but you are restricted from adding, editing, or deleting students in this class.
        </div>
      )}

      {/* Student Cards Grid */}
      {filteredStudents.length === 0 ? (
        <div className="bg-slate-50 text-center py-16 rounded-2xl border border-dashed border-slate-200">
          <User className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-slate-600 font-bold text-sm">No Pupils Found</h3>
          <p className="text-slate-400 text-xs mt-1">Try adjusting your filters or add a new student above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudents.map((student) => {
            const { currentAge, ageAtEntry } = calculateAges(student.dateOfBirth, student.yearOfEntry);
            const canModify = hasAccessToClass(selectedClass);

            return (
              <div 
                key={student.id} 
                className="bg-white rounded-3xl border-2 border-transparent hover:border-indigo-400 p-5 shadow-sm transition-all flex flex-col justify-between group"
              >
                {/* Upper profile content */}
                <div>
                  <div className="flex gap-4">
                    {/* Student photo */}
                    <div className="h-20 w-20 bg-slate-100 rounded-2xl shrink-0 overflow-hidden border border-slate-100 relative shadow-sm">
                      {student.photo ? (
                        <img 
                          src={student.photo} 
                          alt={`${student.surname} photo`} 
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-indigo-50 text-indigo-600 text-xl font-bold uppercase">
                          {student.surname[0]}{student.otherNames[0]}
                        </div>
                      )}
                    </div>

                    {/* Basic names and badges */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-1.5 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          student.className === 'P.7' ? 'bg-orange-100 text-orange-600' : 
                          student.className === 'P.1' ? 'bg-green-100 text-green-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {student.className === 'P.7' ? 'P.7 Candidate' : `${student.className} Pupil`}
                        </span>
                        
                        {student.hasScholarship && (
                          <span className="px-1.5 py-0.5 bg-yellow-400 text-white rounded text-[9px] font-bold uppercase tracking-tighter">
                            Scholarship
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-extrabold text-slate-900 mt-2 leading-tight uppercase truncate">
                        {student.surname} {student.otherNames}
                      </h3>
                    </div>
                  </div>

                  {/* Comprehensive student details in Design Grid layout */}
                  <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 mt-4 pt-3 border-t border-slate-50 text-xs text-slate-600">
                    <p className="text-slate-500 italic">DOB: <span className="text-slate-800 font-semibold not-italic font-mono">{student.dateOfBirth}</span></p>
                    <p className="text-slate-500 italic">Age: <span className="text-slate-800 font-semibold not-italic">{currentAge} yrs</span></p>
                    <p className="text-slate-500 italic">Zone: <span className="text-slate-800 font-semibold not-italic truncate block max-w-[100px]">{student.zoneInNansana}</span></p>
                    <p className="text-slate-500 italic">Gender: <span className="text-slate-800 font-semibold not-italic">{student.gender}</span></p>
                    <p className="text-slate-500 italic col-span-2 truncate">Guardian: <span className="text-slate-800 font-semibold not-italic">{student.guardianName}</span></p>
                    <p className="text-slate-500 italic col-span-2">Contact: <span className="text-slate-850 font-semibold not-italic font-mono">{student.guardianContact || 'N/A'}</span></p>
                    {student.communityWorker && (
                      <p className="text-slate-500 italic col-span-2 truncate">Worker: <span className="text-slate-800 font-semibold not-italic">{student.communityWorker}</span></p>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex gap-2 flex-wrap items-center">
                    <button
                      onClick={() => onGenerateReportCard(student)}
                      className="text-indigo-600 font-bold text-xs hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <BookOpen className="h-3 w-3" />
                      <span>REPORTS</span>
                    </button>
                    <button
                      onClick={() => onOpenProfile(student)}
                      className="text-emerald-600 font-bold text-xs hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Activity className="h-3 w-3" />
                      <span>360° PROFILE</span>
                    </button>
                    <button
                      onClick={() => handleOpenQrModal(student)}
                      className="text-amber-600 font-bold text-xs hover:underline flex items-center gap-1 cursor-pointer"
                      title="Generate Unique Student QR Code"
                    >
                      <QrCode className="h-3 w-3 text-amber-500" />
                      <span>QR CODE</span>
                    </button>
                  </div>

                  <div className="flex gap-2 items-center">
                    {canModify && (
                      <>
                        <button
                          onClick={() => handleOpenEditModal(student)}
                          className="p-1 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-md transition-colors cursor-pointer"
                          title="Edit Pupil Details"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDeleteStudent(student.id)}
                          className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-md transition-colors cursor-pointer"
                          title="Delete Pupil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit/Add Form Dialog Modal */}
      {showFormModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-100 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative font-sans">
            <button
              onClick={() => setShowFormModal(false)}
              className="absolute top-4 right-4 p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <form onSubmit={handleFormSubmit} className="p-6 md:p-8 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="font-display font-bold text-lg text-slate-800">
                  {editingStudent ? 'Edit Student Details' : `Register New Pupil to Class ${selectedClass}`}
                </h2>
                <p className="text-slate-400 text-xs mt-1">Fill in the student's personal details and guardian contacts.</p>
              </div>

              {formError && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-100 rounded-lg text-xs font-medium">
                  {formError}
                </div>
              )}

              {similarityWarning && (
                <div className={`p-3 border rounded-xl text-xs font-semibold flex items-start gap-2.5 transition-all duration-200 ${
                  similarityWarning.type === 'exact_class'
                    ? 'bg-red-50 text-red-800 border-red-200 shadow-sm'
                    : similarityWarning.type === 'exact_school'
                    ? 'bg-amber-50/70 text-amber-800 border-amber-200 shadow-sm'
                    : 'bg-indigo-50 text-indigo-800 border-indigo-200 shadow-sm'
                }`}>
                  <span className="text-base mt-0.5 leading-none">⚠️</span>
                  <div className="space-y-1">
                    <p className="font-extrabold">{similarityWarning.message}</p>
                    {similarityWarning.matchStudent && (
                      <div className="text-[10px] opacity-90 font-mono flex gap-x-2 flex-wrap">
                        <span>Student ID: {similarityWarning.matchStudent.id}</span>
                        <span>•</span>
                        <span>Guardian: {similarityWarning.matchStudent.guardianName || 'N/A'}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Surname *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mukasa"
                    value={formData.surname}
                    onChange={(e) => setFormData(prev => ({ ...prev, surname: e.target.value }))}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Other Names *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Bosco"
                    value={formData.otherNames}
                    onChange={(e) => setFormData(prev => ({ ...prev, otherNames: e.target.value }))}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Gender *</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value as Gender }))}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Date of Birth *</label>
                  <input
                    type="date"
                    required
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Class Name *</label>
                  <select
                    value={formData.className}
                    onChange={(e) => setFormData(prev => ({ ...prev, className: e.target.value as ClassName }))}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                  >
                    {classesList.map(c => (
                      <option key={c} value={c}>Class {c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Year of Entry *</label>
                  <input
                    type="number"
                    required
                    value={formData.yearOfEntry}
                    onChange={(e) => setFormData(prev => ({ ...prev, yearOfEntry: Number(e.target.value) }))}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Nansana Zone Residence *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Gganda, Nabweru, Kabulengwa"
                    value={formData.zoneInNansana}
                    onChange={(e) => setFormData(prev => ({ ...prev, zoneInNansana: e.target.value }))}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {/* Scholarship Toggle */}
                <div className="flex items-center gap-3.5 h-full mt-5">
                  <input
                    type="checkbox"
                    id="scholarship_checkbox"
                    checked={formData.hasScholarship}
                    onChange={(e) => setFormData(prev => ({ ...prev, hasScholarship: e.target.checked }))}
                    className="h-4.5 w-4.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="scholarship_checkbox" className="text-xs font-semibold text-slate-600 select-none cursor-pointer">
                    Eligible for Sponsorship / Scholarship ⭐
                  </label>
                </div>

                <div className="border-t border-slate-100 pt-4 md:col-span-2">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Guardian & Community Worker Contacts</h3>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Guardian Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Father, Mother, Uncle"
                    value={formData.guardianName}
                    onChange={(e) => setFormData(prev => ({ ...prev, guardianName: e.target.value }))}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Relationship to Child</label>
                  <input
                    type="text"
                    placeholder="e.g. Mother, Father, Aunt"
                    value={formData.guardianRelationship}
                    onChange={(e) => setFormData(prev => ({ ...prev, guardianRelationship: e.target.value }))}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Guardian Contact-1 *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +256 702 445588"
                    value={formData.guardianContact}
                    onChange={(e) => setFormData(prev => ({ ...prev, guardianContact: e.target.value }))}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Guardian Contact-2</label>
                  <input
                    type="text"
                    value={formData.guardianContact2}
                    onChange={(e) => setFormData(prev => ({ ...prev, guardianContact2: e.target.value }))}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Community Worker Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Namatovu Florence"
                    value={formData.communityWorker}
                    onChange={(e) => setFormData(prev => ({ ...prev, communityWorker: e.target.value }))}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Community Worker Contact</label>
                  <input
                    type="text"
                    placeholder="e.g. +256 772 112233"
                    value={formData.workerContact}
                    onChange={(e) => setFormData(prev => ({ ...prev, workerContact: e.target.value }))}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Next of Kin</label>
                  <input type="text" value={formData.nextOfKin} onChange={(e) => setFormData(prev => ({ ...prev, nextOfKin: e.target.value }))} className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-800" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Next of Kin Contact</label>
                  <input type="text" value={formData.nextOfKinContact} onChange={(e) => setFormData(prev => ({ ...prev, nextOfKinContact: e.target.value }))} className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-800" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Number in Household</label>
                  <input type="number" min="0" value={formData.numberInHousehold} onChange={(e) => setFormData(prev => ({ ...prev, numberInHousehold: Number(e.target.value) }))} className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-800" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Deceased</label>
                  <input type="text" placeholder="e.g. No, Father, Both parents" value={formData.deceased} onChange={(e) => setFormData(prev => ({ ...prev, deceased: e.target.value }))} className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-800" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Cause of Death</label>
                  <input type="text" value={formData.causeOfDeath} onChange={(e) => setFormData(prev => ({ ...prev, causeOfDeath: e.target.value }))} className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-800" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">School</label>
                  <input type="text" value={formData.school} onChange={(e) => setFormData(prev => ({ ...prev, school: e.target.value }))} className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-800" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Scholarship Details</label>
                  <input type="text" placeholder="e.g. Yes, Full, Partial, Sponsor name" value={formData.scholarshipDetails} onChange={(e) => setFormData(prev => ({ ...prev, scholarshipDetails: e.target.value, hasScholarship: Boolean(e.target.value && !/^no$/i.test(e.target.value)) }))} className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-800" />
                </div>

                {/* Photo upload section */}
                <div className="md:col-span-2 border-t border-slate-100 pt-4">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Student Photo</label>
                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 rounded-xl">
                    <div className="h-16 w-16 rounded-xl bg-slate-200 shrink-0 overflow-hidden border border-slate-200 relative">
                      {photoPreview ? (
                        <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-slate-400 text-xs text-center font-semibold">
                          No Photo
                        </div>
                      )}
                    </div>
                    <div className="flex-1 w-full space-y-2 text-center sm:text-left">
                      <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoChange}
                          className="hidden"
                          id="photo_file_input"
                        />
                        <label
                          htmlFor="photo_file_input"
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-700 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          Upload File
                        </label>

                        <button
                          type="button"
                          onClick={startCamera}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
                        >
                          <Camera className="h-3.5 w-3.5 text-amber-300" />
                          Snap Photo with Camera
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400">PNG, JPEG or live camera snapshot. Automatically saved to profile.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3.5">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-100 transition-all cursor-pointer font-sans"
                >
                  {editingStudent ? 'Save Changes' : 'Register Child'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Unique Student QR Code Modal */}
      <StudentQrCodeModal
        student={selectedQrStudent}
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        marks={marks}
        onOpenProfile={onOpenProfile}
      />

      {/* Camera Live Snapshot Capture Overlay Modal */}
      {isCameraActive && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 flex flex-col items-center space-y-4">
            <div className="flex items-center justify-between w-full border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-indigo-600" />
                <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wide">Live Student Photo Snap</h3>
              </div>
              <button
                type="button"
                onClick={stopCamera}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative w-full aspect-square bg-slate-900 rounded-2xl overflow-hidden shadow-inner border-2 border-indigo-500/30 flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover transform -scale-x-100"
              />
              <div className="absolute inset-0 border-2 border-dashed border-white/50 rounded-full m-8 pointer-events-none"></div>
              <div className="absolute bottom-2 bg-slate-900/70 text-white text-[10px] px-2.5 py-1 rounded-full backdrop-blur-sm">
                Center student's face in frame
              </div>
            </div>

            <div className="flex items-center justify-between w-full gap-3 pt-2">
              <button
                type="button"
                onClick={stopCamera}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-200 transition-all cursor-pointer flex justify-center items-center gap-2"
              >
                <Camera className="h-4 w-4 text-amber-300" />
                <span>Capture & Save Photo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
