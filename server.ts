import express from 'express';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import webpush from 'web-push';

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'db.json');

app.use(express.json({ limit: '10mb' }));

// Helper to get or initialize the database
interface DatabaseSchema {
  students: any[];
  marks: any[];
  teachers: any[];
  attendance?: any[];
  support?: any[];
  visits?: any[];
  safeguarding?: any[];
  interactions?: any[];
  sms?: any[];
  documents?: any[];
  timetable?: any[];
  vapidKeys?: { publicKey: string; privateKey: string };
  pushSubscriptions?: any[];
  pushAlerts?: any[];
}

function getDatabase(): DatabaseSchema {
  if (!fs.existsSync(DB_FILE)) {
    // Generate pre-populated realistic Ugandan students
    const initialStudents = [
      {
        id: 'st-1',
        surname: 'Mukasa',
        otherNames: 'John Bosco',
        gender: 'Male',
        dateOfBirth: '2014-04-12', // 12 years old (P.7)
        className: 'P.7',
        yearOfEntry: 2020,
        photo: 'https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=150&h=150&fit=crop&q=80',
        guardianName: 'Mukasa William',
        guardianContact: '+256 702 445588',
        communityWorker: 'Namatovu Florence',
        workerContact: '+256 772 112233',
        zoneInNansana: 'Gganda',
        hasScholarship: true
      },
      {
        id: 'st-2',
        surname: 'Babirye',
        otherNames: 'Sarah',
        gender: 'Female',
        dateOfBirth: '2015-08-22', // 10 years old (P.6)
        className: 'P.6',
        yearOfEntry: 2021,
        photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&q=80',
        guardianName: 'Nassolo Harriet',
        guardianContact: '+256 752 998877',
        communityWorker: 'Kibirige Sula',
        workerContact: '+256 701 445522',
        zoneInNansana: 'Nabweru',
        hasScholarship: false
      },
      {
        id: 'st-3',
        surname: 'Kato',
        otherNames: 'Julius',
        gender: 'Male',
        dateOfBirth: '2014-11-03', // 11 years old (P.7)
        className: 'P.7',
        yearOfEntry: 2020,
        photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&q=80',
        guardianName: 'Ssekyanzi Peter',
        guardianContact: '+256 782 554433',
        communityWorker: 'Namatovu Florence',
        workerContact: '+256 772 112233',
        zoneInNansana: 'Kabulengwa',
        hasScholarship: false
      },
      {
        id: 'st-4',
        surname: 'Namubiru',
        otherNames: 'Dorothy',
        gender: 'Female',
        dateOfBirth: '2016-01-30', // 10 years old (P.5)
        className: 'P.5',
        yearOfEntry: 2022,
        photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&q=80',
        guardianName: 'Nsubuga Joseph',
        guardianContact: '+256 703 121212',
        communityWorker: 'Mirembe Agnes',
        workerContact: '+256 756 223344',
        zoneInNansana: 'Nansana West',
        hasScholarship: true
      },
      {
        id: 'st-5',
        surname: 'Okello',
        otherNames: 'Emmanuel',
        gender: 'Male',
        dateOfBirth: '2017-05-15', // 9 years old (P.4)
        className: 'P.4',
        yearOfEntry: 2023,
        photo: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop&q=80',
        guardianName: 'Onyango Patrick',
        guardianContact: '+256 774 445566',
        communityWorker: 'Kibirige Sula',
        workerContact: '+256 701 445522',
        zoneInNansana: 'Nansana East',
        hasScholarship: false
      },
      {
        id: 'st-6',
        surname: 'Atwine',
        otherNames: 'Patience',
        gender: 'Female',
        dateOfBirth: '2018-09-05', // 7 years old (P.2)
        className: 'P.2',
        yearOfEntry: 2024,
        photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&q=80',
        guardianName: 'Karuhanga Fred',
        guardianContact: '+256 701 889900',
        communityWorker: 'Mirembe Agnes',
        workerContact: '+256 756 223344',
        zoneInNansana: 'Kazi Zone',
        hasScholarship: true
      },
      {
        id: 'st-7',
        surname: 'Nsubuga',
        otherNames: 'Sula',
        gender: 'Male',
        dateOfBirth: '2019-12-10', // 6 years old (P.1)
        className: 'P.1',
        yearOfEntry: 2025,
        photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&q=80',
        guardianName: 'Kato Ssenyonga',
        guardianContact: '+256 771 223344',
        communityWorker: 'Mirembe Agnes',
        workerContact: '+256 756 223344',
        zoneInNansana: 'West II',
        hasScholarship: false
      },
      {
        id: 'st-8',
        surname: 'Nakato',
        otherNames: 'Daphine',
        gender: 'Female',
        dateOfBirth: '2016-06-18', // 10 years old (P.5)
        className: 'P.5',
        yearOfEntry: 2022,
        photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&q=80',
        guardianName: 'Nalweyiso Scovia',
        guardianContact: '+256 755 776655',
        communityWorker: 'Namatovu Florence',
        workerContact: '+256 772 112233',
        zoneInNansana: 'Nabweru',
        hasScholarship: true
      },
      {
        id: 'st-9',
        surname: 'Ssewankambo',
        otherNames: 'Mark',
        gender: 'Male',
        dateOfBirth: '2015-02-11', // 11 years old (P.6)
        className: 'P.6',
        yearOfEntry: 2021,
        photo: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&h=150&fit=crop&q=80',
        guardianName: 'Ssewankambo Henry',
        guardianContact: '+256 702 334455',
        communityWorker: 'Kibirige Sula',
        workerContact: '+256 701 445522',
        zoneInNansana: 'Kabulengwa',
        hasScholarship: false
      },
      {
        id: 'st-10',
        surname: 'Kyobe',
        otherNames: 'Arthur',
        gender: 'Male',
        dateOfBirth: '2018-03-08', // 8 years old (P.3)
        className: 'P.3',
        yearOfEntry: 2024,
        photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&q=80',
        guardianName: 'Kyobe Richard',
        guardianContact: '+256 772 888777',
        communityWorker: 'Kibirige Sula',
        workerContact: '+256 701 445522',
        zoneInNansana: 'Gganda',
        hasScholarship: false
      }
    ];

    // Pre-populate realistic grades/marks
    const subjects = ['Mathematics', 'English', 'Science', 'Social Studies', 'Religious Education'];
    const initialMarks: any[] = [];
    
    // Fill in marks for some students to display beautiful report cards immediately
    initialStudents.forEach(student => {
      // P.7 and P.6 and P.5 students have marks
      if (['P.5', 'P.6', 'P.7', 'P.4'].includes(student.className)) {
        subjects.forEach(subject => {
          // Generate a realistic score
          let baseScore = 65;
          if (student.surname === 'Mukasa') baseScore = 85; // Distinction level
          if (student.surname === 'Babirye') baseScore = 74; // Credit level
          if (student.surname === 'Atwine') baseScore = 52; // Pass level
          
          const randomOffset = Math.floor(Math.random() * 16) - 5; // -5 to +10
          const score = Math.min(100, Math.max(0, baseScore + randomOffset));

          initialMarks.push({
            id: `mk-${student.id}-${subject.toLowerCase().replace(/ /g, '-')}`,
            studentId: student.id,
            subject,
            score,
            term: 1,
            year: 2026,
            teacherName: 'John Mukasa'
          });
        });
      }
    });

    const initialTeachers = [
      {
        username: 'admin',
        name: 'Headteacher / Administrator',
        subjects: ['All'],
        classes: ['P.1', 'P.2', 'P.3', 'P.4', 'P.5', 'P.6', 'P.7']
      },
      {
        username: 'teacher1',
        name: 'Mr. John Mukasa',
        subjects: ['Mathematics', 'Science'],
        classes: ['P.5', 'P.6', 'P.7']
      },
      {
        username: 'teacher2',
        name: 'Mrs. Sarah Babirye',
        subjects: ['English', 'Social Studies', 'Religious Education'],
        classes: ['P.1', 'P.2', 'P.3', 'P.4']
      }
    ];

    const dbData: DatabaseSchema = {
      students: initialStudents,
      marks: initialMarks,
      teachers: initialTeachers,
      attendance: [],
      support: [],
      visits: [],
      safeguarding: [],
      interactions: [
        {
          id: 'int-1',
          studentId: 'st-1',
          date: '2026-06-10',
          type: 'In-Person Meeting',
          guardianName: 'Mukasa William',
          summary: 'Discussed graduation prep for John Bosco. Guardian confirmed attendance for the term-end candidate prayer day.',
          actionRequired: 'Ensure the graduation gown size is registered.',
          loggedBy: 'Madam Namutebi Proscovia'
        },
        {
          id: 'int-2',
          studentId: 'st-2',
          date: '2026-06-14',
          type: 'Phone Call',
          guardianName: 'Nassolo Harriet',
          summary: 'Called Sarah\'s guardian regarding recent math performance. Guardian promised to monitor homework.',
          actionRequired: 'Send remediation worksheet home.',
          loggedBy: 'Mr. John Mukasa'
        }
      ],
      sms: [
        {
          id: 'sms-1',
          studentId: 'st-1',
          guardianName: 'Mukasa William',
          phoneNumber: '+256 702 445588',
          messageBody: 'Dear Mukasa William, John Bosco has successfully completed all Term 1 baseline exams. View reports next week.',
          status: 'Delivered',
          dateSent: '2026-07-02'
        },
        {
          id: 'sms-2',
          studentId: 'st-2',
          guardianName: 'Nassolo Harriet',
          phoneNumber: '+256 752 998877',
          messageBody: 'Dear Nassolo Harriet, please remember tomorrow\'s parent-teacher committee meeting at Nansana school.',
          status: 'Delivered',
          dateSent: '2026-07-10'
        }
      ],
      documents: [
        {
          id: 'doc-1',
          studentId: 'st-1',
          studentName: 'Mukasa John Bosco',
          title: 'Birth_Certificate_Mukasa_John',
          category: 'Birth Certificate',
          fileSize: '315.4 KB',
          dateUploaded: '2026-02-15'
        },
        {
          id: 'doc-2',
          studentId: 'st-1',
          studentName: 'Mukasa John Bosco',
          title: 'Parent_Scholarship_Agreement_Term1_2026',
          category: 'Guardian Consent',
          fileSize: '1.2 MB',
          dateUploaded: '2026-02-18'
        },
        {
          id: 'doc-3',
          studentId: 'st-2',
          studentName: 'Babirye Sarah',
          title: 'EMIS_Enrollment_Slip_Wakiso_ Sarah',
          category: 'EMIS Registration',
          fileSize: '480.2 KB',
          dateUploaded: '2026-03-01'
        }
      ],
      timetable: [
        {
          id: 'slot-1',
          className: 'P.7',
          day: 'Monday',
          timeSlot: '08:30 - 09:30',
          subject: 'Mathematics',
          teacherName: 'Madam Namutebi Proscovia',
          roomName: 'Main Stream A Room'
        },
        {
          id: 'slot-2',
          className: 'P.7',
          day: 'Monday',
          timeSlot: '11:00 - 12:00',
          subject: 'Integrated Science',
          teacherName: 'Mr. John Mukasa',
          roomName: 'Science Lab'
        },
        {
          id: 'slot-3',
          className: 'P.1',
          day: 'Tuesday',
          timeSlot: '09:30 - 10:30',
          subject: 'English Language',
          teacherName: 'Mrs. Sarah Babirye',
          roomName: 'P.1 Main Classroom'
        }
      ]
    };

    fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2));
    return dbData;
  }

  const fileData = fs.readFileSync(DB_FILE, 'utf-8');
  const parsed = JSON.parse(fileData);
  
  // Backwards compatibility patch
  if (!parsed.attendance) parsed.attendance = [];
  if (!parsed.support) parsed.support = [];
  if (!parsed.visits) parsed.visits = [];
  if (!parsed.safeguarding) parsed.safeguarding = [];
  if (!parsed.interactions) parsed.interactions = [];
  if (!parsed.sms) parsed.sms = [];
  if (!parsed.documents) parsed.documents = [];
  if (!parsed.timetable) parsed.timetable = [];
  if (!parsed.pushSubscriptions) parsed.pushSubscriptions = [];
  if (!parsed.pushAlerts) parsed.pushAlerts = [];
  if (!parsed.vapidKeys) {
    parsed.vapidKeys = webpush.generateVAPIDKeys();
    fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2));
  }
  
  return parsed;
}

function saveDatabase(data: DatabaseSchema) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Ensure database is initialized
const db = getDatabase();
if (db.vapidKeys) {
  webpush.setVapidDetails(
    'mailto:mwesigwamoses859@gmail.com',
    db.vapidKeys.publicKey,
    db.vapidKeys.privateKey
  );
}

// --- API ROUTES ---

// 1. Authentication
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const db = getDatabase();
  
  // Find teacher in database
  const teacher = db.teachers.find(t => t.username === username);
  
  if (teacher) {
    // If teacher exists, match password. Custom password or default.
    const expectedPassword = teacher.password || (username === 'admin' ? 'admin123' : 'teacher123');
    if (password === expectedPassword) {
      return res.json({
        success: true,
        teacher: {
          username: teacher.username,
          name: teacher.name,
          subjects: teacher.subjects,
          classes: teacher.classes
        }
      });
    }
  }
  
  return res.status(401).json({ success: false, message: 'Invalid username or password' });
});

// 2. Students API
app.get('/api/students', (req, res) => {
  const db = getDatabase();
  res.json(db.students);
});

app.post('/api/students', (req, res) => {
  const db = getDatabase();
  const newStudent = {
    ...req.body,
    id: `st-${Date.now()}`
  };
  db.students.push(newStudent);
  saveDatabase(db);
  res.status(201).json(newStudent);
});

// Bulk Import Students from Excel/CSV (sent as JSON array from frontend client)
app.post('/api/students/bulk', (req, res) => {
  const db = getDatabase();
  const importedStudents = req.body;
  
  if (!Array.isArray(importedStudents)) {
    return res.status(400).json({ success: false, message: 'Expected an array of students' });
  }

  const addedStudents = importedStudents.map((s, idx) => ({
    id: `st-bulk-${Date.now()}-${idx}`,
    surname: s.surname || 'Unknown',
    otherNames: s.otherNames || '',
    gender: s.gender || 'Male',
    dateOfBirth: s.dateOfBirth || '2015-01-01',
    className: s.className || 'P.1',
    yearOfEntry: Number(s.yearOfEntry) || 2026,
    photo: s.photo || '',
    guardianName: s.guardianName || 'Unknown',
    guardianContact: s.guardianContact || '',
    communityWorker: s.communityWorker || '',
    workerContact: s.workerContact || '',
    zoneInNansana: s.zoneInNansana || 'Unknown',
    hasScholarship: !!s.hasScholarship
  }));

  db.students.push(...addedStudents);
  saveDatabase(db);
  res.status(201).json({ success: true, count: addedStudents.length, students: addedStudents });
});

app.put('/api/students/:id', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const index = db.students.findIndex(s => s.id === id);
  
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Student not found' });
  }
  
  db.students[index] = { ...db.students[index], ...req.body, id }; // retain id
  saveDatabase(db);
  res.json(db.students[index]);
});

app.delete('/api/students/:id', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  db.students = db.students.filter(s => s.id !== id);
  db.marks = db.marks.filter(m => m.studentId !== id); // Cascade delete marks
  saveDatabase(db);
  res.json({ success: true, message: 'Student and associated marks deleted successfully' });
});

// 3. Marks API
app.get('/api/marks', (req, res) => {
  const db = getDatabase();
  res.json(db.marks);
});

app.post('/api/marks', (req, res) => {
  const db = getDatabase();
  const { studentId, subject, score, term, year, teacherName } = req.body;
  
  if (!studentId || !subject || score === undefined) {
    return res.status(400).json({ success: false, message: 'Missing required mark fields' });
  }

  // Server-side lock check
  const requesterUsername = req.headers['x-teacher-username'] as string;
  if (requesterUsername && requesterUsername !== 'admin') {
    const teacher = db.teachers?.find(t => t.username === requesterUsername);
    if (teacher) {
      const student = db.students?.find(s => s.id === studentId);
      const studentClass = student?.className;
      if (!studentClass) {
        return res.status(400).json({ success: false, message: 'Pupil not found in register' });
      }
      if (!teacher.classes.includes(studentClass)) {
        return res.status(403).json({ success: false, message: `Access Denied: Grade ${studentClass} is not assigned to you.` });
      }
      if (!teacher.subjects.includes(subject)) {
        return res.status(403).json({ success: false, message: `Access Denied: Subject ${subject} is not assigned to you.` });
      }
      const activeTerms = teacher.activeTerms || [1, 2, 3];
      if (!activeTerms.includes(Number(term))) {
        return res.status(403).json({ success: false, message: `Access Denied: Term ${term} is not currently active for you.` });
      }
    }
  }

  // Check if mark already exists for student, subject, term, year
  const existingMarkIndex = db.marks.findIndex(
    m => m.studentId === studentId && 
         m.subject === subject && 
         m.term === term && 
         m.year === year
  );

  const markData = {
    id: existingMarkIndex !== -1 ? db.marks[existingMarkIndex].id : `mk-${Date.now()}`,
    studentId,
    subject,
    score: Number(score),
    term: Number(term) as 1 | 2 | 3,
    year: Number(year),
    teacherName
  };

  if (existingMarkIndex !== -1) {
    db.marks[existingMarkIndex] = markData;
  } else {
    db.marks.push(markData);
  }

  saveDatabase(db);
  res.json({ success: true, mark: markData });
});

// Bulk update marks for a class & subject
app.post('/api/marks/bulk', (req, res) => {
  const db = getDatabase();
  const { marks } = req.body; // Array of { studentId, subject, score, term, year, teacherName }
  
  if (!Array.isArray(marks)) {
    return res.status(400).json({ success: false, message: 'Expected marks array' });
  }

  // Server-side lock check
  const requesterUsername = req.headers['x-teacher-username'] as string;
  if (requesterUsername && requesterUsername !== 'admin') {
    const teacher = db.teachers?.find(t => t.username === requesterUsername);
    if (teacher) {
      for (const item of marks) {
        const student = db.students?.find(s => s.id === item.studentId);
        const studentClass = student?.className;
        if (!studentClass) {
          return res.status(400).json({ success: false, message: `Pupil with ID ${item.studentId} not found in register` });
        }
        if (!teacher.classes.includes(studentClass)) {
          return res.status(403).json({ success: false, message: `Access Denied: Grade ${studentClass} is not assigned to you.` });
        }
        if (!teacher.subjects.includes(item.subject)) {
          return res.status(403).json({ success: false, message: `Access Denied: Subject ${item.subject} is not assigned to you.` });
        }
        const activeTerms = teacher.activeTerms || [1, 2, 3];
        if (!activeTerms.includes(Number(item.term))) {
          return res.status(403).json({ success: false, message: `Access Denied: Term ${item.term} is not currently active for you.` });
        }
      }
    }
  }

  marks.forEach(item => {
    const existingMarkIndex = db.marks.findIndex(
      m => m.studentId === item.studentId && 
           m.subject === item.subject && 
           m.term === item.term && 
           m.year === item.year
    );

    const markData = {
      id: existingMarkIndex !== -1 ? db.marks[existingMarkIndex].id : `mk-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      studentId: item.studentId,
      subject: item.subject,
      score: Number(item.score),
      term: Number(item.term) as 1 | 2 | 3,
      year: Number(item.year),
      teacherName: item.teacherName
    };

    if (existingMarkIndex !== -1) {
      db.marks[existingMarkIndex] = markData;
    } else {
      db.marks.push(markData);
    }
  });

  saveDatabase(db);
  res.json({ success: true, updatedCount: marks.length });
});

// --- NEW SOCIAL WELFARE, ATTENDANCE & SAFEGUARDING ROUTES ---

// 4. Attendance
app.get('/api/attendance', (req, res) => {
  const db = getDatabase();
  res.json(db.attendance || []);
});

app.post('/api/attendance/bulk', (req, res) => {
  const db = getDatabase();
  const { records } = req.body; // Array of { studentId, date, status }
  
  if (!Array.isArray(records)) {
    return res.status(400).json({ success: false, message: 'Expected records array' });
  }

  if (!db.attendance) db.attendance = [];

  records.forEach(item => {
    const existingIndex = db.attendance!.findIndex(
      r => r.studentId === item.studentId && r.date === item.date
    );

    const recordData = {
      id: existingIndex !== -1 ? db.attendance![existingIndex].id : `att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      studentId: item.studentId,
      date: item.date,
      status: item.status
    };

    if (existingIndex !== -1) {
      db.attendance![existingIndex] = recordData;
    } else {
      db.attendance!.push(recordData);
    }
  });

  saveDatabase(db);
  res.json({ success: true, count: records.length });
});

// 5. Support / Welfare Log
app.get('/api/support', (req, res) => {
  const db = getDatabase();
  res.json(db.support || []);
});

app.post('/api/support', (req, res) => {
  const db = getDatabase();
  if (!db.support) db.support = [];

  const newRecord = {
    ...req.body,
    id: `sup-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
  };
  
  db.support.push(newRecord);
  saveDatabase(db);
  res.status(201).json(newRecord);
});

// 6. Home Visits Log
app.get('/api/visits', (req, res) => {
  const db = getDatabase();
  res.json(db.visits || []);
});

app.post('/api/visits', (req, res) => {
  const db = getDatabase();
  if (!db.visits) db.visits = [];

  const newVisit = {
    ...req.body,
    id: `vis-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
  };

  db.visits.push(newVisit);
  saveDatabase(db);
  res.status(201).json(newVisit);
});

// 7. Safeguarding Cases Ledger
app.get('/api/safeguarding', (req, res) => {
  const db = getDatabase();
  res.json(db.safeguarding || []);
});

app.post('/api/safeguarding', (req, res) => {
  const db = getDatabase();
  if (!db.safeguarding) db.safeguarding = [];

  const newIncident = {
    ...req.body,
    id: `safe-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
  };

  db.safeguarding.push(newIncident);
  saveDatabase(db);
  res.status(201).json(newIncident);
});

// 8. Guardian Interactions
app.get('/api/interactions', (req, res) => {
  const db = getDatabase();
  res.json(db.interactions || []);
});

app.post('/api/interactions', (req, res) => {
  const db = getDatabase();
  if (!db.interactions) db.interactions = [];

  const newLog = {
    ...req.body,
    id: `int-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
  };

  db.interactions.push(newLog);
  saveDatabase(db);
  res.status(201).json(newLog);
});

// 9. SMS outbox
async function sendRealSMS(to: string, message: string): Promise<{ success: boolean; gateway: string; messageId?: string; error?: string }> {
  // 1. Try Africa's Talking (East Africa's premier SMS gateway, e.g. Uganda)
  const atApiKey = process.env.AFRICAS_TALKING_API_KEY;
  const atUsername = process.env.AFRICAS_TALKING_USERNAME;
  if (atApiKey && atUsername) {
    try {
      const isSandbox = atUsername.toLowerCase() === 'sandbox';
      const url = isSandbox 
        ? 'https://api.sandbox.africastalking.com/version1/messaging' 
        : 'https://api.africastalking.com/version1/messaging';
        
      const params = new URLSearchParams();
      params.append('username', atUsername);
      params.append('to', to);
      params.append('message', message);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'apiKey': atApiKey,
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });
      
      if (response.ok) {
        const data: any = await response.json();
        const recipients = data?.SMSMessageData?.Recipients || [];
        if (recipients.length > 0) {
          const first = recipients[0];
          const isSuccess = ['Success', 'Pending', 'Success (Sent)'].includes(first.status);
          if (isSuccess) {
            return {
              success: true,
              gateway: "Africa's Talking",
              messageId: first.messageId
            };
          } else {
            return {
              success: false,
              gateway: "Africa's Talking",
              error: first.status || 'Failed transmission status'
            };
          }
        } else {
          return {
            success: false,
            gateway: "Africa's Talking",
            error: 'No recipients returned by gateway'
          };
        }
      } else {
        const errText = await response.text();
        return {
          success: false,
          gateway: "Africa's Talking",
          error: `HTTP ${response.status}: ${errText}`
        };
      }
    } catch (err: any) {
      return {
        success: false,
        gateway: "Africa's Talking",
        error: err.message || String(err)
      };
    }
  }

  // 2. Try Twilio (Alternative international gateway)
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_FROM_NUMBER;
  if (twilioSid && twilioAuthToken && twilioFrom) {
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
      const credentials = Buffer.from(`${twilioSid}:${twilioAuthToken}`).toString('base64');
      
      const params = new URLSearchParams();
      params.append('To', to);
      params.append('From', twilioFrom);
      params.append('Body', message);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });
      
      if (response.ok) {
        const data: any = await response.json();
        return {
          success: true,
          gateway: 'Twilio',
          messageId: data.sid
        };
      } else {
        const errText = await response.text();
        return {
          success: false,
          gateway: 'Twilio',
          error: `HTTP ${response.status}: ${errText}`
        };
      }
    } catch (err: any) {
      return {
        success: false,
        gateway: 'Twilio',
        error: err.message || String(err)
      };
    }
  }

  // 3. Fallback to Sandbox Simulation (for offline local development or when missing credentials)
  return {
    success: true,
    gateway: 'Sandbox Simulator',
    messageId: `SANDBOX-MSG-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
  };
}

app.get('/api/sms/gateway-status', (req, res) => {
  const hasAT = !!(process.env.AFRICAS_TALKING_API_KEY && process.env.AFRICAS_TALKING_USERNAME);
  const hasTwilio = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);
  
  let activeGateway = 'Sandbox Simulator';
  if (hasAT) {
    activeGateway = "Africa's Talking";
  } else if (hasTwilio) {
    activeGateway = 'Twilio';
  }
  
  res.json({
    activeGateway,
    hasAT,
    hasTwilio,
    atUsername: process.env.AFRICAS_TALKING_USERNAME || null,
    twilioFrom: process.env.TWILIO_FROM_NUMBER || null
  });
});

app.get('/api/sms', (req, res) => {
  const db = getDatabase();
  res.json(db.sms || []);
});

app.post('/api/sms', async (req, res) => {
  const db = getDatabase();
  if (!db.sms) db.sms = [];

  const { studentId, guardianName, phoneNumber, messageBody } = req.body;
  if (!phoneNumber || !messageBody) {
    return res.status(400).json({ success: false, message: 'phoneNumber and messageBody are required.' });
  }

  // Send real SMS (or fallback sandbox)
  const result = await sendRealSMS(phoneNumber, messageBody);

  const newSMS = {
    id: `sms-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    studentId: studentId || null,
    guardianName: guardianName || 'Parent / Guardian',
    phoneNumber,
    messageBody,
    status: result.success ? 'Delivered' : 'Failed',
    gatewayUsed: result.gateway,
    messageId: result.messageId || null,
    errorMessage: result.error || null,
    dateSent: new Date().toISOString().split('T')[0]
  };

  db.sms.unshift(newSMS); // Prepend so it appears at top of outbox logs
  saveDatabase(db);
  res.status(201).json(newSMS);
});

// 10. Documents Vault
app.get('/api/documents', (req, res) => {
  const db = getDatabase();
  res.json(db.documents || []);
});

app.post('/api/documents', (req, res) => {
  const db = getDatabase();
  if (!db.documents) db.documents = [];

  const newDoc = {
    ...req.body,
    id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
  };

  db.documents.push(newDoc);
  saveDatabase(db);
  res.status(201).json(newDoc);
});

app.delete('/api/documents/:id', (req, res) => {
  const db = getDatabase();
  if (!db.documents) db.documents = [];

  db.documents = db.documents.filter(d => d.id !== req.params.id);
  saveDatabase(db);
  res.json({ success: true });
});

// 11. School Timetable
app.get('/api/timetable', (req, res) => {
  const db = getDatabase();
  res.json(db.timetable || []);
});

app.post('/api/timetable', (req, res) => {
  const db = getDatabase();
  if (!db.timetable) db.timetable = [];

  const newSlot = {
    ...req.body,
    id: `slot-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
  };

  db.timetable.push(newSlot);
  saveDatabase(db);
  res.status(201).json(newSlot);
});

app.delete('/api/timetable/:id', (req, res) => {
  const db = getDatabase();
  if (!db.timetable) db.timetable = [];

  db.timetable = db.timetable.filter(t => t.id !== req.params.id);
  saveDatabase(db);
  res.json({ success: true });
});

// 12. Teachers management API
app.get('/api/teachers', (req, res) => {
  const db = getDatabase();
  res.json(db.teachers || []);
});

app.post('/api/teachers', (req, res) => {
  const db = getDatabase();
  if (!db.teachers) db.teachers = [];

  const { username, name, password, subjects, classes, activeTerms } = req.body;
  if (!username || !name) {
    return res.status(400).json({ success: false, message: 'Username and Name are required' });
  }

  const existingIndex = db.teachers.findIndex(t => t.username === username);
  const teacherData = {
    username,
    name,
    password: password || 'teacher123',
    subjects: subjects || [],
    classes: classes || [],
    activeTerms: activeTerms || [1, 2, 3]
  };

  if (existingIndex !== -1) {
    db.teachers[existingIndex] = { ...db.teachers[existingIndex], ...teacherData };
  } else {
    db.teachers.push(teacherData);
  }

  saveDatabase(db);
  res.status(201).json({ success: true, teacher: teacherData });
});

app.delete('/api/teachers/:username', (req, res) => {
  const db = getDatabase();
  const { username } = req.params;
  if (username === 'admin') {
    return res.status(403).json({ success: false, message: 'Cannot delete the administrator account' });
  }
  db.teachers = (db.teachers || []).filter(t => t.username !== username);
  saveDatabase(db);
  res.json({ success: true, message: 'Teacher deleted successfully' });
});

// 13. Automatic and Bulk Student Promotion Engine
app.post('/api/students/promote-bulk', (req, res) => {
  const db = getDatabase();
  const { promotions } = req.body; // Array of { studentId, nextClassName }
  
  if (!Array.isArray(promotions)) {
    return res.status(400).json({ success: false, message: 'Expected an array of promotions' });
  }

  let count = 0;
  promotions.forEach(p => {
    const student = db.students.find(s => s.id === p.studentId);
    if (student) {
      student.className = p.nextClassName;
      count++;
    }
  });

  saveDatabase(db);
  res.json({ success: true, promotedCount: count });
});

// 15. Push Notifications Subsystem
app.get('/api/push/vapid-public-key', (req, res) => {
  const db = getDatabase();
  if (db.vapidKeys) {
    res.json({ publicKey: db.vapidKeys.publicKey });
  } else {
    res.status(500).json({ success: false, message: 'VAPID keys not configured.' });
  }
});

app.post('/api/push/subscribe', (req, res) => {
  const db = getDatabase();
  const { subscription, username } = req.body;

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ success: false, message: 'Invalid subscription object.' });
  }

  if (!db.pushSubscriptions) {
    db.pushSubscriptions = [];
  }

  // Check if endpoint already subscribed
  const existingIndex = db.pushSubscriptions.findIndex(s => s.subscription.endpoint === subscription.endpoint);
  
  const subscriptionRecord = {
    id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    subscription,
    username: username || 'anonymous',
    subscribedAt: new Date().toISOString()
  };

  if (existingIndex !== -1) {
    db.pushSubscriptions[existingIndex] = subscriptionRecord;
  } else {
    db.pushSubscriptions.push(subscriptionRecord);
  }

  saveDatabase(db);
  res.json({ success: true, message: 'Subscription successfully registered.' });
});

app.get('/api/push/subscriptions', (req, res) => {
  const db = getDatabase();
  res.json({ success: true, subscriptions: db.pushSubscriptions || [] });
});

app.get('/api/push/history', (req, res) => {
  const db = getDatabase();
  res.json({ success: true, alerts: db.pushAlerts || [] });
});

app.post('/api/push/send', async (req, res) => {
  const db = getDatabase();
  const { title, body, tag, clickAction } = req.body;

  if (!title || !body) {
    return res.status(400).json({ success: false, message: 'Title and body are required.' });
  }

  const subscriptions = db.pushSubscriptions || [];
  const payload = {
    title,
    body,
    tag: tag || 'emis-alert',
    data: {
      clickAction: clickAction || '/'
    }
  };

  let sentCount = 0;
  let failedCount = 0;
  const subscriptionsToRemove: string[] = [];

  const sendPromises = subscriptions.map(async (subRecord) => {
    try {
      await webpush.sendNotification(subRecord.subscription, JSON.stringify(payload));
      sentCount++;
    } catch (error: any) {
      console.error(`Error sending push notification to ${subRecord.username}:`, error);
      failedCount++;
      // If subscription has expired or is no longer valid, we should prune it
      if (error.statusCode === 410 || error.statusCode === 404) {
        subscriptionsToRemove.push(subRecord.subscription.endpoint);
      }
    }
  });

  await Promise.all(sendPromises);

  // Prune dead subscriptions
  if (subscriptionsToRemove.length > 0) {
    db.pushSubscriptions = subscriptions.filter(s => !subscriptionsToRemove.includes(s.subscription.endpoint));
  }

  // Record the alert in history
  if (!db.pushAlerts) {
    db.pushAlerts = [];
  }

  const alertRecord = {
    id: `push-alert-${Date.now()}`,
    title,
    body,
    tag: tag || 'emis-alert',
    clickAction: clickAction || '/',
    sentAt: new Date().toISOString(),
    recipientCount: sentCount + failedCount,
    successCount: sentCount,
    failureCount: failedCount
  };

  db.pushAlerts.unshift(alertRecord); // latest first
  saveDatabase(db);

  res.json({
    success: true,
    sentCount,
    failedCount,
    totalSubscriptions: db.pushSubscriptions.length,
    alert: alertRecord
  });
});

// 14. Backup & Recovery API
const BACKUP_DIR = path.join(process.cwd(), 'backups');
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const MANIFEST_FILE = path.join(BACKUP_DIR, 'manifest.json');
const ENCRYPTION_KEY = process.env.BACKUP_ENCRYPTION_KEY || 'ashinaga_uganda_sms_backup_key_32!';

function getCipherKey(key: string): Buffer {
  return crypto.createHash('sha256').update(String(key)).digest();
}

function encrypt(text: string): { iv: string; encryptedData: string } {
  const iv = crypto.randomBytes(16);
  const key = getCipherKey(ENCRYPTION_KEY);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return {
    iv: iv.toString('hex'),
    encryptedData: encrypted
  };
}

function decrypt(encryptedData: string, ivHex: string): string {
  const iv = Buffer.from(ivHex, 'hex');
  const key = getCipherKey(ENCRYPTION_KEY);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function getManifest() {
  if (!fs.existsSync(MANIFEST_FILE)) {
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf-8'));
  } catch (e) {
    return [];
  }
}

function saveManifest(manifest: any[]) {
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
}

// Get all backup history
app.get('/api/backups', (req, res) => {
  const manifest = getManifest();
  res.json(manifest);
});

// Trigger manual backup
app.post('/api/backups', (req, res) => {
  try {
    const { note } = req.body;
    const db = getDatabase();
    
    // Convert current DB to string
    const dbString = JSON.stringify(db);
    const { iv, encryptedData } = encrypt(dbString);
    
    const timestamp = new Date().toISOString();
    const formattedDate = timestamp.replace(/[:.]/g, '-');
    const filename = `backup_${formattedDate}.enc`;
    const filepath = path.join(BACKUP_DIR, filename);
    
    // Write encrypted data
    const payload = JSON.stringify({ iv, encryptedData });
    fs.writeFileSync(filepath, payload, 'utf8');
    
    // Count records for display
    const studentCount = db.students?.length || 0;
    const marksCount = db.marks?.length || 0;
    const teachersCount = db.teachers?.length || 0;
    const totalRecords = studentCount + marksCount + teachersCount;
    
    const manifest = getManifest();
    const newBackup = {
      id: `bk-${Date.now()}`,
      filename,
      timestamp,
      size: fs.statSync(filepath).size,
      recordCount: totalRecords,
      note: note || 'Manual administrator backup',
      status: 'Success',
      encrypted: true,
      cipher: 'aes-256-cbc'
    };
    
    manifest.unshift(newBackup); // latest first
    saveManifest(manifest);
    
    res.status(201).json({ success: true, backup: newBackup });
  } catch (err: any) {
    console.error("Backup creation error:", err);
    res.status(500).json({ success: false, message: `Backup failed: ${err.message}` });
  }
});

// Restore from backup
app.post('/api/backups/:id/restore', (req, res) => {
  try {
    const { id } = req.params;
    const manifest = getManifest();
    const backup = manifest.find((b: any) => b.id === id);
    
    if (!backup) {
      return res.status(404).json({ success: false, message: 'Backup restore point not found' });
    }
    
    const filepath = path.join(BACKUP_DIR, backup.filename);
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ success: false, message: 'Backup file missing on server' });
    }
    
    const filePayload = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    const { iv, encryptedData } = filePayload;
    
    if (!iv || !encryptedData) {
      return res.status(400).json({ success: false, message: 'Invalid or corrupted backup payload format' });
    }
    
    // Decrypt the database
    const decryptedString = decrypt(encryptedData, iv);
    const decryptedDb = JSON.parse(decryptedString);
    
    // Overwrite main db
    saveDatabase(decryptedDb);
    
    res.json({ 
      success: true, 
      message: `Database successfully restored to backup dated ${new Date(backup.timestamp).toLocaleString()}` 
    });
  } catch (err: any) {
    console.error("Backup restore error:", err);
    res.status(500).json({ success: false, message: `Restore failed: ${err.message}. Key or format might be incorrect.` });
  }
});

// Delete a backup
app.delete('/api/backups/:id', (req, res) => {
  try {
    const { id } = req.params;
    let manifest = getManifest();
    const backupIndex = manifest.findIndex((b: any) => b.id === id);
    
    if (backupIndex === -1) {
      return res.status(404).json({ success: false, message: 'Backup not found' });
    }
    
    const backup = manifest[backupIndex];
    const filepath = path.join(BACKUP_DIR, backup.filename);
    
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
    
    manifest.splice(backupIndex, 1);
    saveManifest(manifest);
    
    res.json({ success: true, message: 'Backup removed successfully' });
  } catch (err: any) {
    console.error("Backup deletion error:", err);
    res.status(500).json({ success: false, message: `Deletion failed: ${err.message}` });
  }
});

// --- GEMINI CHAT BACKEND SERVICES ---
let genAIInstance: any = null;
function getGenAI() {
  if (!genAIInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing.");
    }
    genAIInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return genAIInstance;
}

function getSystemInstruction(role: string, db: DatabaseSchema) {
  const studentSummary = db.students.map(s => ({
    id: s.id,
    name: `${s.surname} ${s.otherNames}`,
    gender: s.gender,
    class: s.className,
    guardian: s.guardianName,
    communityWorker: s.communityWorker,
    zone: s.zoneInNansana,
    scholarship: s.hasScholarship ? 'Yes' : 'No'
  }));

  const marksSummary = db.marks.map(m => {
    const student = db.students.find(s => s.id === m.studentId);
    return {
      studentName: student ? `${student.surname} ${student.otherNames}` : m.studentId,
      subject: m.subject,
      score: m.score,
      term: m.term,
      year: m.year
    };
  });

  const supportSummary = (db.support || []).map((sup: any) => {
    const student = db.students.find(s => s.id === sup.studentId);
    return {
      studentName: student ? `${student.surname} ${student.otherNames}` : sup.studentId,
      needsList: sup.needsList || [],
      notes: sup.notes || '',
      status: sup.status || ''
    };
  });

  const visitsSummary = (db.visits || []).map((v: any) => {
    const student = db.students.find(s => s.id === v.studentId);
    return {
      studentName: student ? `${student.surname} ${student.otherNames}` : v.studentId,
      date: v.date,
      purpose: v.purpose,
      observations: v.observations,
      actionsTaken: v.actionsTaken
    };
  });

  const contextData = {
    students: studentSummary,
    marks: marksSummary,
    support: supportSummary,
    homeVisits: visitsSummary
  };

  let roleInstruction = "";
  if (role === 'academic') {
    roleInstruction = "You are the Senior Academic Advisor for Nansana Community School in Uganda. Your role is to analyze student performance, suggest targeted Ugandan-curriculum-aligned remedial activities, assist in drafting academic report card comments, and suggest tutoring strategies. Use the provided student marks data to give precise, data-driven advice.";
  } else if (role === 'social') {
    roleInstruction = "You are a Community Social Worker in Nansana, Uganda. Your role is to advocate for student welfare, prepare for household visits, advise on scholarship outreach, suggest local NGO resources, and address safeguarding and emotional/social needs. Keep your tone supportive, community-centric, and focused on Ugandan cultural contexts and local challenges.";
  } else {
    roleInstruction = "You are the Lead School Administrator and Curriculum Coordinator for Nansana Community School. Your role is to assist teachers with lesson plans, timetable optimization, drafting school circulars/communications to parents, designing classroom projects, and managing teacher assignments. Provide professional, structured templates and administrative assistance.";
  }

  return `
${roleInstruction}

You have real-time access to the school database. Use this data whenever the user asks questions about specific students, marks, support programs, or home visits. Never make up data if a student is in the database; refer to the data below.

CURRENT SCHOOL DATA IN CONTEXT:
${JSON.stringify(contextData, null, 2)}

Ensure your responses are clear, action-oriented, professional, and directly useful to teachers and community workers. Avoid dry, generic answers; offer specific, practical Ugandan school-context suggestions. Keep formatting clean and use Markdown formatting for lists and headers to look polished.
  `.trim();
}

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, role, model } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, message: "Invalid or missing messages array." });
    }

    const db = getDatabase();
    const systemInstruction = getSystemInstruction(role || 'admin', db);

    const selectedModel = model || 'gemini-3.5-flash';

    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const ai = getGenAI();
    const response = await ai.models.generateContent({
      model: selectedModel,
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    res.json({
      success: true,
      reply: response.text || "I'm sorry, I couldn't generate a response."
    });
  } catch (err: any) {
    console.error("Gemini API Chat Error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "An error occurred while communicating with Gemini."
    });
  }
});

// --- INTEGRATE VITE MIDDLEWARE OR STATIC FILES ---

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
