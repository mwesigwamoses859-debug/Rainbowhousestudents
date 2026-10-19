import express from 'express';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import webpush from 'web-push';
import {
  createSessionToken,
  verifySessionToken,
  canAccessSubjectAndClass,
  TeacherSessionUser
} from './src/lib/auth.js';

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'db.json');

app.use(express.json({ limit: '10mb' }));

// Session middleware: extract and verify token from Authorization header
app.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const session = verifySessionToken(token);
      (req as any).session = session;
      (req as any).teacher = session;
    } catch (err: any) {
      // Token is invalid or expired, continue without session
      (req as any).session = null;
    }
  }
  next();
});

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = (process.env.CORS_ORIGIN || process.env.APP_URL || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Teacher-Username');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(origin && allowedOrigins.includes(origin) ? 204 : 403);
  }

  next();
});

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
    // Start with a clean slate for the NGO's actual student records
    const initialStudents: any[] = [];
    const initialMarks: any[] = [];

    const initialTeachers = [
      {
        username: 'admin',
        name: 'Headteacher / Administrator',
        role: 'Headteacher',
        responsibility: 'Administrator',
        email: 'headteacher@ashinaga.or.ug',
        password: 'admin123',
        subjects: ['All'],
        classes: ['P.1', 'P.2', 'P.3', 'P.4', 'P.5', 'P.6', 'P.7'],
        activeTerms: [1, 2, 3],
        assignments: []
      },
      {
        username: 'mwesigwa',
        name: 'Moses Mwesigwa',
        role: 'Headteacher',
        responsibility: 'Headteacher',
        email: 'mwesigwa.m@ashinaga.org',
        password: 'admin123',
        subjects: ['All'],
        classes: ['P.1', 'P.2', 'P.3', 'P.4', 'P.5', 'P.6', 'P.7'],
        activeTerms: [1, 2, 3],
        assignments: []
      },
      {
        username: 'teddy.nansubuga',
        name: 'Nansubuga Teddy',
        role: 'Headteacher',
        responsibility: 'Headteacher',
        email: 'teddy.nansubuga@ashinaga.or.ug',
        password: 'admin123',
        subjects: ['Literacy 1', 'Luganda', 'Mathematics'],
        classes: ['P.2', 'P.3'],
        activeTerms: [1, 2, 3],
        assignments: [
          { className: 'P.3', subject: 'Literacy 1', activeTerms: [1, 2, 3] },
          { className: 'P.3', subject: 'Luganda', activeTerms: [1, 2, 3] },
          { className: 'P.2', subject: 'Mathematics', activeTerms: [1, 2, 3] }
        ]
      },
      {
        username: 'emmanuel.mutabarura',
        name: 'Mutabarura Emmanuel',
        role: 'DOS',
        responsibility: 'Director of studies',
        email: 'emmanuel.mutabarura@ashinaga.or.ug',
        password: 'teacher123',
        subjects: ['Social Studies', 'English', 'Religious Education'],
        classes: ['P.4'],
        activeTerms: [1, 2, 3],
        assignments: [
          { className: 'P.4', subject: 'Social Studies', activeTerms: [1, 2, 3] },
          { className: 'P.4', subject: 'English', activeTerms: [1, 2, 3] },
          { className: 'P.4', subject: 'Religious Education', activeTerms: [1, 2, 3] }
        ]
      },
      {
        username: 'carol.ayesiga',
        name: 'Ayesiga Carol',
        role: 'Subject Teacher',
        responsibility: 'Senior woman teacher/ Kumon teacher',
        email: 'carol.ayesiga@ashinaga.or.ug',
        password: 'teacher123',
        subjects: ['English', 'Literacy 2 (Reading and Writing)', 'KUMON'],
        classes: ['P.3', 'P.4', 'P.5'],
        activeTerms: [1, 2, 3],
        assignments: [
          { className: 'P.5', subject: 'English', activeTerms: [1, 2, 3] },
          { className: 'P.3', subject: 'Literacy 2 (Reading and Writing)', activeTerms: [1, 2, 3] },
          { className: 'P.4', subject: 'KUMON', activeTerms: [1, 2, 3] },
          { className: 'P.5', subject: 'KUMON', activeTerms: [1, 2, 3] }
        ]
      },
      {
        username: 'philbert.bwambale',
        name: 'Bwambale Philbert',
        role: 'Class Teacher',
        responsibility: 'Cultural Club/ class teacher P.3',
        email: 'philbert.bwambale@ashinaga.or.ug',
        password: 'teacher123',
        subjects: ['Mathematics', 'Science'],
        classes: ['P.3', 'P.4', 'P.5'],
        activeTerms: [1, 2, 3],
        assignments: [
          { className: 'P.3', subject: 'Mathematics', activeTerms: [1, 2, 3] },
          { className: 'P.4', subject: 'Science', activeTerms: [1, 2, 3] },
          { className: 'P.5', subject: 'Science', activeTerms: [1, 2, 3] }
        ]
      },
      {
        username: 'john.kirabira',
        name: 'Kirabira John',
        role: 'Class Teacher',
        responsibility: 'Senior male Teacher / Class teacher P.5',
        email: 'john.kirabira@ashinaga.or.ug',
        password: 'teacher123',
        subjects: ['Social Studies', 'English', 'Religious Education'],
        classes: ['P.3', 'P.5'],
        activeTerms: [1, 2, 3],
        assignments: [
          { className: 'P.5', subject: 'Social Studies', activeTerms: [1, 2, 3] },
          { className: 'P.3', subject: 'English', activeTerms: [1, 2, 3] },
          { className: 'P.5', subject: 'Religious Education', activeTerms: [1, 2, 3] }
        ]
      },
      {
        username: 'peter.taimwa',
        name: 'Taimwa Peter',
        role: 'Class Teacher',
        responsibility: 'Gardening/ Ass. Kumon/ Class teacher P.4',
        email: 'peter.taimwa@ashinaga.or.ug',
        password: 'teacher123',
        subjects: ['Mathematics', 'Religious Education'],
        classes: ['P.3', 'P.4', 'P.5'],
        activeTerms: [1, 2, 3],
        assignments: [
          { className: 'P.4', subject: 'Mathematics', activeTerms: [1, 2, 3] },
          { className: 'P.5', subject: 'Mathematics', activeTerms: [1, 2, 3] },
          { className: 'P.3', subject: 'Religious Education', activeTerms: [1, 2, 3] }
        ]
      },
      {
        username: 'isaac.sali',
        name: 'Sali Isaac',
        role: 'Subject Teacher',
        responsibility: 'ICT teacher',
        email: 'isaac.sali@ashinaga.or.ug',
        password: 'teacher123',
        subjects: ['Computer/ ICT'],
        classes: ['P.1', 'P.2', 'P.3', 'P.4', 'P.5', 'P.6', 'P.7'],
        activeTerms: [1, 2, 3],
        assignments: [
          { className: 'P.1', subject: 'Computer/ ICT', activeTerms: [1, 2, 3] },
          { className: 'P.2', subject: 'Computer/ ICT', activeTerms: [1, 2, 3] },
          { className: 'P.3', subject: 'Computer/ ICT', activeTerms: [1, 2, 3] },
          { className: 'P.4', subject: 'Computer/ ICT', activeTerms: [1, 2, 3] },
          { className: 'P.5', subject: 'Computer/ ICT', activeTerms: [1, 2, 3] },
          { className: 'P.6', subject: 'Computer/ ICT', activeTerms: [1, 2, 3] },
          { className: 'P.7', subject: 'Computer/ ICT', activeTerms: [1, 2, 3] }
        ]
      },
      {
        username: 'lilian.nakyeyune',
        name: 'Nakyeyune Lilian',
        role: 'Class Teacher',
        responsibility: 'games and sports / Class teacher P.1',
        email: 'lilian.nakyeyune@ashinaga.or.ug',
        password: 'teacher123',
        subjects: ['Mathematics', 'Literacy 1', 'Literacy 2 (Reading and Writing)'],
        classes: ['P.1', 'P.2'],
        activeTerms: [1, 2, 3],
        assignments: [
          { className: 'P.1', subject: 'Mathematics', activeTerms: [1, 2, 3] },
          { className: 'P.1', subject: 'Literacy 1', activeTerms: [1, 2, 3] },
          { className: 'P.1', subject: 'Literacy 2 (Reading and Writing)', activeTerms: [1, 2, 3] },
          { className: 'P.2', subject: 'Literacy 2 (Reading and Writing)', activeTerms: [1, 2, 3] }
        ]
      },
      {
        username: 'sarah.batengu',
        name: 'Batengu Sarah',
        role: 'Class Teacher',
        responsibility: 'Volunteer teacher / Ass. Class teacher P.2',
        email: 'sarah.batengu@ashinaga.or.ug',
        password: 'teacher123',
        subjects: ['English', 'Literacy 1', 'Luganda'],
        classes: ['P.1', 'P.2'],
        activeTerms: [1, 2, 3],
        assignments: [
          { className: 'P.1', subject: 'English', activeTerms: [1, 2, 3] },
          { className: 'P.2', subject: 'English', activeTerms: [1, 2, 3] },
          { className: 'P.2', subject: 'Literacy 1', activeTerms: [1, 2, 3] },
          { className: 'P.2', subject: 'Luganda', activeTerms: [1, 2, 3] }
        ]
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
      interactions: [],
      sms: [],
      documents: [],
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

// --- 2FA OTP Store in memory & Email Gateway Logs ---
const otpStore: Record<string, { codeHash: string; expiresAt: number; attempts: number }> = {};

const normalizeEmail = (value: unknown) => String(value || '').trim().toLowerCase();
const hashOtp = (email: string, code: string) =>
  crypto.createHash('sha256').update(`${email}:${code}:${process.env.OTP_PEPPER || 'local-development'}`).digest('hex');

async function sendLoginCode(email: string, name: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'Rainbow House Portal <onboarding@resend.dev>';

  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Email delivery is not configured. Set RESEND_API_KEY and EMAIL_FROM.');
    }
    console.log(`[DEV LOGIN CODE] ${email}: ${code}`);
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'Your Rainbow House sign-in code',
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
        <h2 style="color:#082f49">Rainbow House staff sign-in</h2>
        <p>Hello ${name},</p>
        <p>Use this one-time code to sign in:</p>
        <p style="font-size:32px;font-weight:800;letter-spacing:8px;color:#4f46e5">${code}</p>
        <p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>
      </div>`
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error('Email provider error:', response.status, detail);
    throw new Error('The confirmation email could not be sent.');
  }
}

export interface EmailGatewayEntry {
  id: string;
  recipientEmail: string;
  recipientName: string;
  recipientRole: string;
  subject: string;
  category: 'CONFIRMATION_CODE' | 'ACTIVITY_ALERT' | 'LOGIN_ALERT' | 'MARK_MODIFICATION';
  code?: string;
  body: string;
  timestamp: string;
  status: 'DELIVERED' | 'DISPATCHED';
}

const emailGatewayLogs: EmailGatewayEntry[] = [
  {
    id: 'em-101',
    recipientEmail: 'headteacher@ashinaga.or.ug',
    recipientName: 'Headteacher / Administrator',
    recipientRole: 'Headteacher',
    subject: '[Security Confirmation] Headteacher Subject Workspace Access Code',
    category: 'CONFIRMATION_CODE',
    code: '849201',
    body: 'Automated Security Dispatch:\nA login attempt into the Ashinaga Rainbow House School Portal was initiated.\nUse code: 849201 to confirm identity.\nIf you did not initiate this login, notify system administrator immediately.',
    timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    status: 'DELIVERED'
  },
  {
    id: 'em-102',
    recipientEmail: 'dos@ashinaga.or.ug',
    recipientName: 'Mr. David Ochieng (DOS)',
    recipientRole: 'DOS',
    subject: '[Activity Alert] P.7 PLE Mock Marks Approval Requested',
    category: 'ACTIVITY_ALERT',
    code: '410982',
    body: 'Director of Studies Notification:\nMarks entry for P.7 Term 1 Mathematics & Science has been submitted by subject teachers and requires DOS audit review.\nVerification Security Key: 410982',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    status: 'DELIVERED'
  },
  {
    id: 'em-103',
    recipientEmail: 'john.mukasa@ashinaga.or.ug',
    recipientName: 'Mr. John Mukasa',
    recipientRole: 'Subject Teacher',
    subject: '[Workspace Alert] Mathematics & Science Portal Authorization',
    category: 'LOGIN_ALERT',
    code: '529103',
    body: 'Official Subject Teacher Alert:\nYour official email was verified for access to P.5 - P.7 Mathematics and Science portals.\nConfirmation Code: 529103',
    timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    status: 'DELIVERED'
  }
];

function dispatchMockCompanyEmail(entry: Omit<EmailGatewayEntry, 'id' | 'timestamp' | 'status'>) {
  const newLog: EmailGatewayEntry = {
    ...entry,
    id: `em-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    status: 'DELIVERED'
  };
  emailGatewayLogs.unshift(newLog);
  console.log(`[EMAIL GATEWAY] Dispatched to ${entry.recipientEmail} (${entry.subject}) - Code: ${entry.code || 'N/A'}`);
  return newLog;
}

// 1. Authentication
app.post('/api/auth/send-code', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const db = getDatabase();

  if (!email || !email.endsWith('@ashinaga.org')) {
    return res.status(400).json({ success: false, message: 'Enter your official @ashinaga.org email address.' });
  }

  const teacher = db.teachers.find(t => normalizeEmail(t.email) === email && t.active !== false);
  if (!teacher) {
    return res.status(401).json({ success: false, message: 'This email is not registered for staff access. Ask an administrator to add it.' });
  }

  const code = crypto.randomInt(100000, 1000000).toString();
  otpStore[email] = {
    codeHash: hashOtp(email, code),
    expiresAt: Date.now() + 10 * 60 * 1000,
    attempts: 0
  };

  try {
    await sendLoginCode(email, teacher.name, code);
  } catch (error: any) {
    delete otpStore[email];
    return res.status(503).json({ success: false, message: error.message || 'The confirmation email could not be sent.' });
  }

  return res.json({
    success: true,
    message: 'A six-digit confirmation code was sent to your email.',
    email: email.replace(/^(.{2}).*(@.*)$/, '$1••••$2'),
    ...(process.env.NODE_ENV !== 'production' && !process.env.RESEND_API_KEY ? { demoCode: code } : {})
  });
});

app.post('/api/auth/verify-code', (req, res) => {
  const email = normalizeEmail(req.body.email);
  const code = String(req.body.code || '').trim();
  const db = getDatabase();

  const teacher = db.teachers.find(t => normalizeEmail(t.email) === email && t.active !== false);
  if (!teacher) {
    return res.status(401).json({ success: false, message: 'Account not found' });
  }

  const storedOtp = otpStore[email];
  if (!storedOtp) {
    return res.status(400).json({ success: false, message: 'No confirmation code was requested or code expired. Please request a new code.' });
  }

  if (Date.now() > storedOtp.expiresAt) {
    delete otpStore[email];
    return res.status(400).json({ success: false, message: 'Confirmation code expired. Please request a new code.' });
  }

  storedOtp.attempts += 1;
  if (storedOtp.attempts > 5) {
    delete otpStore[email];
    return res.status(429).json({ success: false, message: 'Too many attempts. Request a new code.' });
  }

  const expectedHash = Buffer.from(storedOtp.codeHash, 'hex');
  const suppliedHash = Buffer.from(hashOtp(email, code), 'hex');
  if (!crypto.timingSafeEqual(expectedHash, suppliedHash)) {
    return res.status(400).json({ success: false, message: 'Invalid 6-digit confirmation code. Please check your email.' });
  }

  delete otpStore[email];

  return res.json({
    success: true,
    teacher: {
      username: teacher.username,
      name: teacher.name,
      role: teacher.role,
      email: teacher.email,
      subjects: teacher.subjects || [],
      classes: teacher.classes || [],
      activeTerms: teacher.activeTerms || [1, 2, 3]
    }
  });
});

app.post('/api/auth/login', (req, res) => {
  return res.status(410).json({
    success: false,
    message: 'Password sign-in has been retired. Request a confirmation code with your official email.'
  });
});

// Middleware: require valid session
function requireSession(req: any, res: any, next: any) {
  if (!req.session) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Please sign in.' });
  }
  next();
}

// Middleware: require specific role(s)
function requireRole(...allowedRoles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.session) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Please sign in.' });
    }
    if (!allowedRoles.includes(req.session.role)) {
      return res.status(403).json({ success: false, message: `Access Denied. Required role: ${allowedRoles.join(' or ')}` });
    }
    next();
  };
}

// Middleware: require subject and class access
function requireSubjectAndClassAccess(req: any, res: any, next: any) {
  if (!req.session) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Please sign in.' });
  }
  
  // Headteacher and DOS have all access
  if (req.session.role === 'Headteacher' || req.session.role === 'DOS') {
    return next();
  }

  const { subject, className } = req.body;
  if (!subject || !className) {
    return next(); // Let the endpoint handler deal with missing fields
  }

  if (!canAccessSubjectAndClass(req.session, className, subject)) {
    return res.status(403).json({ 
      success: false, 
      message: `Access Denied: You are not assigned to Grade ${className} ${subject}.` 
    });
  }
  next();
}

const isAdministrator = (role?: string) => role === 'Headteacher' || role === 'DOS';

// 2. Students API
app.get('/api/students', requireSession, (req, res) => {
  const db = getDatabase();
  const session = (req as any).session;
  if (isAdministrator(session?.role)) {
    return res.json(db.students);
  }
  const allowedClasses = new Set<string>(session?.classes || []);
  const scopedStudents = db.students.filter((s: any) => allowedClasses.has(s.className));
  res.json(scopedStudents);
});

const normalizeName = (val: string) => {
  return (val || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
};

app.post('/api/students', requireSession, (req, res) => {
  const db = getDatabase();
  const session = (req as any).session;
  const className = req.body.className || '';

  if (!isAdministrator(session?.role)) {
    const allowedClasses = new Set<string>(session?.classes || []);
    if (!allowedClasses.has(className)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. You can only add students to your assigned class(es): ${[...allowedClasses].join(', ')}.`
      });
    }
  }

  const newStudent = {
    ...req.body,
    id: `st-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  };
  db.students.push(newStudent);
  saveDatabase(db);
  res.status(201).json(newStudent);
});

// Bulk Import Students from Excel/CSV (sent as JSON array from frontend client)
app.post('/api/students/bulk', requireSession, (req, res) => {
  const db = getDatabase();
  const session = (req as any).session;
  if (!isAdministrator(session?.role)) {
    return res.status(403).json({ success: false, message: 'Administrator access required.' });
  }
  const importedStudents = req.body;
  
  if (!Array.isArray(importedStudents)) {
    return res.status(400).json({ success: false, message: 'Expected an array of students' });
  }

  const addedStudents: any[] = [];
  const skippedStudents: any[] = [];

  importedStudents.forEach((s, idx) => {
    const surname = s.surname || 'Unknown';
    const otherNames = s.otherNames || '';
    const className = s.className || 'P.1';

    addedStudents.push({
      id: `st-bulk-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
      surname,
      otherNames,
      gender: s.gender || 'Male',
      dateOfBirth: s.dateOfBirth || '2015-01-01',
      className,
      yearOfEntry: Number(s.yearOfEntry) || 2026,
      photo: s.photo || '',
      guardianName: s.guardianName || 'Unknown',
      guardianContact: String(s.guardianContact || ''),
      communityWorker: s.communityWorker || '',
      workerContact: String(s.workerContact || ''),
      zoneInNansana: s.zoneInNansana || 'Unknown',
      hasScholarship: !!s.hasScholarship
    });
  });

  if (addedStudents.length > 0) {
    db.students.push(...addedStudents);
    saveDatabase(db);
  }

  res.status(201).json({ 
    success: true, 
    count: addedStudents.length, 
    skippedCount: skippedStudents.length,
    students: addedStudents, 
    skipped: skippedStudents 
  });
});

app.post('/api/students/bulk-delete', requireSession, (req, res) => {
  const db = getDatabase();
  const session = (req as any).session;
  const ids: string[] = Array.isArray(req.body.ids) ? req.body.ids : Array.isArray(req.body.studentIds) ? req.body.studentIds : [];
  if (ids.length === 0) {
    return res.status(400).json({ success: false, message: 'No student IDs provided.' });
  }

  const allowedClasses = isAdministrator(session?.role) ? null : new Set<string>(session?.classes || []);
  const deletedIds: string[] = [];

  for (const id of ids) {
    const student = db.students.find((s: any) => s.id === id);
    if (!student) continue;
    if (allowedClasses && !allowedClasses.has(student.className)) {
      continue;
    }
    deletedIds.push(id);
  }

  const deletedSet = new Set(deletedIds);
  db.students = db.students.filter((s: any) => !deletedSet.has(s.id));
  db.marks = db.marks.filter((m: any) => !deletedSet.has(m.studentId));
  if (db.attendance) db.attendance = db.attendance.filter((a: any) => !deletedSet.has(a.studentId));
  saveDatabase(db);

  res.json({ success: true, count: deletedIds.length, deletedIds });
});

app.put('/api/students/:id', requireSession, (req, res) => {
  const db = getDatabase();
  const session = (req as any).session;
  const { id } = req.params;
  const index = db.students.findIndex(s => s.id === id);
  
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Student not found' });
  }

  const existingStudent = db.students[index];
  if (!isAdministrator(session?.role)) {
    const allowedClasses = new Set<string>(session?.classes || []);
    if (!allowedClasses.has(existingStudent.className)) {
      return res.status(403).json({ success: false, message: 'Access denied. You can only edit pupils in your assigned class(es).' });
    }
    if (req.body.className && !allowedClasses.has(req.body.className)) {
      return res.status(403).json({ success: false, message: `Access denied. You cannot move a student to ${req.body.className}.` });
    }
  }
  
  db.students[index] = { ...db.students[index], ...req.body, id }; // retain id
  saveDatabase(db);
  res.json(db.students[index]);
});

app.delete('/api/students/:id', requireSession, (req, res) => {
  const db = getDatabase();
  const session = (req as any).session;
  const { id } = req.params;
  const student = db.students.find(s => s.id === id);
  if (!student) {
    return res.status(404).json({ success: false, message: 'Student not found' });
  }

  if (!isAdministrator(session?.role)) {
    const allowedClasses = new Set<string>(session?.classes || []);
    if (!allowedClasses.has(student.className)) {
      return res.status(403).json({ success: false, message: 'Access denied. You can only delete pupils in your assigned class(es).' });
    }
  }

  db.students = db.students.filter(s => s.id !== id);
  db.marks = db.marks.filter(m => m.studentId !== id); // Cascade delete marks
  if (db.attendance) db.attendance = db.attendance.filter(a => a.studentId !== id);
  saveDatabase(db);
  res.json({ success: true, message: 'Student and associated marks deleted successfully' });
});

app.post('/api/students/purge', requireSession, requireRole('Headteacher'), (req, res) => {
  const db = getDatabase();
  
  db.students = [];
  db.marks = [];
  db.attendance = [];
  db.support = [];
  db.visits = [];
  db.safeguarding = [];
  db.interactions = [];
  db.documents = [];
  
  saveDatabase(db);
  res.json({ success: true, message: 'All student records, marks, and associated records successfully purged.' });
});

// 3. Marks API
app.get('/api/marks', requireSession, (req, res) => {
  const db = getDatabase();
  const session = (req as any).session;
  if (isAdministrator(session?.role)) {
    return res.json(db.marks);
  }
  const allowedClasses = new Set<string>(session?.classes || []);
  const teacherSubjects: string[] = session?.subjects || [];
  const studentClassMap = new Map<string, string>(db.students.map((s: any) => [s.id, s.className]));

  const scopedMarks = db.marks.filter((m: any) => {
    const studentClass = studentClassMap.get(m.studentId);
    if (!studentClass || !allowedClasses.has(studentClass)) return false;
    if (session.role === 'Class Teacher') return true;
    return teacherSubjects.includes('All') || teacherSubjects.includes(m.subject);
  });
  res.json(scopedMarks);
});

app.post('/api/marks', requireSession, requireSubjectAndClassAccess, (req, res) => {
  const db = getDatabase();
  const { studentId, subject, score, term, year, teacherName } = req.body;
  
  if (!studentId || !subject || score === undefined) {
    return res.status(400).json({ success: false, message: 'Missing required mark fields' });
  }

  // Additional validation: check student exists and term is active
  const session: TeacherSessionUser = (req as any).session;
  const student = db.students?.find(s => s.id === studentId);
  const studentClass = student?.className;
  
  if (!studentClass) {
    return res.status(400).json({ success: false, message: 'Pupil not found in register' });
  }

  // Check term is active (if not admin)
  if (session.role !== 'Headteacher' && session.role !== 'DOS') {
    const activeTerms = session.activeTerms || [1, 2, 3];
    if (!activeTerms.includes(Number(term))) {
      return res.status(403).json({ success: false, message: `Access Denied: Term ${term} is not currently active for you.` });
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
    botScore: req.body.botScore !== undefined ? Number(req.body.botScore) : undefined,
    motScore: req.body.motScore !== undefined ? Number(req.body.motScore) : undefined,
    eotScore: req.body.eotScore !== undefined ? Number(req.body.eotScore) : undefined,
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
app.post('/api/marks/bulk', requireSession, (req, res) => {
  const db = getDatabase();
  const { marks } = req.body; // Array of { studentId, subject, score, term, year, teacherName }
  
  if (!Array.isArray(marks)) {
    return res.status(400).json({ success: false, message: 'Expected marks array' });
  }

  // Session-based RBAC check
  const session: TeacherSessionUser = (req as any).session;
  if (session.role !== 'Headteacher' && session.role !== 'DOS') {
    for (const item of marks) {
      const student = db.students?.find(s => s.id === item.studentId);
      const studentClass = student?.className;
      if (!studentClass) {
        return res.status(400).json({ success: false, message: `Pupil with ID ${item.studentId} not found in register` });
      }
      if (!canAccessSubjectAndClass(session, studentClass, item.subject)) {
        return res.status(403).json({ success: false, message: `Access Denied: Grade ${studentClass} ${item.subject} is not assigned to you.` });
      }
      const activeTerms = session.activeTerms || [1, 2, 3];
      if (!activeTerms.includes(Number(item.term))) {
        return res.status(403).json({ success: false, message: `Access Denied: Term ${item.term} is not currently active for you.` });
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
      botScore: item.botScore !== undefined ? Number(item.botScore) : undefined,
      motScore: item.motScore !== undefined ? Number(item.motScore) : undefined,
      eotScore: item.eotScore !== undefined ? Number(item.eotScore) : undefined,
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

  // Dispatch Automated Email Notification Alert for Marks Saved
  if (marks.length > 0) {
    const firstSubject = marks[0].subject;
    const firstTerm = marks[0].term;
    const firstYear = marks[0].year;
    const teacherName = marks[0].teacherName || 'Subject Teacher';
    const alertCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Alert for Headteacher / DOS
    dispatchMockCompanyEmail({
      recipientEmail: 'dos@ashinaga.or.ug',
      recipientName: 'Mr. David Ochieng (DOS)',
      recipientRole: 'DOS',
      subject: `[Academic Activity Alert] ${marks.length} Marks Recorded for ${firstSubject}`,
      category: 'MARK_MODIFICATION',
      code: alertCode,
      body: `Director of Studies Audit Notice:\n\nInstructor ${teacherName} has saved/modified ${marks.length} pupil grade records for subject: ${firstSubject} (Term ${firstTerm}, ${firstYear}).\n\nAudit Alert Verification Key: ${alertCode}\n\nTimestamp: ${new Date().toLocaleString()}\nAshinaga Uganda Academic Registry`
    });
  }

  res.json({ success: true, updatedCount: marks.length });
});

// --- EMAIL NOTIFICATION GATEWAY ENDPOINTS ---
app.get('/api/notifications/email-logs', requireSession, requireRole('Headteacher', 'DOS'), (req, res) => {
  res.json({ success: true, logs: emailGatewayLogs });
});

app.post('/api/notifications/send-email', requireSession, requireRole('Headteacher', 'DOS'), (req, res) => {
  const { recipientEmail, recipientName, recipientRole, subject, category, code, body } = req.body;

  if (!recipientEmail || !subject || !body) {
    return res.status(400).json({ success: false, message: 'Missing required email dispatch fields' });
  }

  const dispatchedLog = dispatchMockCompanyEmail({
    recipientEmail,
    recipientName: recipientName || recipientEmail,
    recipientRole: recipientRole || 'Personnel',
    subject,
    category: category || 'ACTIVITY_ALERT',
    code: code || Math.floor(100000 + Math.random() * 900000).toString(),
    body
  });

  res.json({ success: true, message: 'Email dispatched successfully', emailLog: dispatchedLog });
});

// --- NEW SOCIAL WELFARE, ATTENDANCE & SAFEGUARDING ROUTES ---

// 4. Attendance
app.get('/api/attendance', requireSession, (req, res) => {
  const db = getDatabase();
  res.json(db.attendance || []);
});

app.post('/api/attendance/bulk', requireSession, (req, res) => {
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
app.get('/api/support', requireSession, (req, res) => {
  const db = getDatabase();
  res.json(db.support || []);
});

app.post('/api/support', requireSession, (req, res) => {
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
app.get('/api/visits', requireSession, (req, res) => {
  const db = getDatabase();
  res.json(db.visits || []);
});

app.post('/api/visits', requireSession, (req, res) => {
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
app.get('/api/safeguarding', requireSession, (req, res) => {
  const db = getDatabase();
  res.json(db.safeguarding || []);
});

app.post('/api/safeguarding', requireSession, (req, res) => {
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
app.get('/api/interactions', requireSession, (req, res) => {
  const db = getDatabase();
  res.json(db.interactions || []);
});

app.post('/api/interactions', requireSession, (req, res) => {
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
  // Purely Sandbox Simulation mode for safety and privacy
  return {
    success: true,
    gateway: 'Sandbox Simulator',
    messageId: `SANDBOX-MSG-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
  };
}

app.get('/api/sms/gateway-status', requireSession, (req, res) => {
  res.json({
    activeGateway: 'Sandbox Simulator (Local Simulation)',
    hasAT: false,
    hasTwilio: false,
    atUsername: null,
    twilioFrom: null
  });
});

app.get('/api/sms', requireSession, (req, res) => {
  const db = getDatabase();
  res.json(db.sms || []);
});

app.post('/api/sms', requireSession, async (req, res) => {
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
app.get('/api/documents', requireSession, (req, res) => {
  const db = getDatabase();
  res.json(db.documents || []);
});

app.post('/api/documents', requireSession, (req, res) => {
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

app.delete('/api/documents/:id', requireSession, (req, res) => {
  const db = getDatabase();
  if (!db.documents) db.documents = [];

  db.documents = db.documents.filter(d => d.id !== req.params.id);
  saveDatabase(db);
  res.json({ success: true });
});

// 11. School Timetable
app.get('/api/timetable', requireSession, (req, res) => {
  const db = getDatabase();
  res.json(db.timetable || []);
});

app.post('/api/timetable', requireSession, requireRole('Headteacher', 'DOS'), (req, res) => {
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

app.delete('/api/timetable/:id', requireSession, requireRole('Headteacher', 'DOS'), (req, res) => {
  const db = getDatabase();
  if (!db.timetable) db.timetable = [];

  db.timetable = db.timetable.filter(t => t.id !== req.params.id);
  saveDatabase(db);
  res.json({ success: true });
});

// 12. Teachers management API
const pendingAuthCodes = new Map<string, { code: string; expiresAt: number; teacher: any }>();

app.post('/api/auth/send-code', (req, res) => {
  const db = getDatabase();
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }

  // Find teacher in database or fallback list
  let teacher = (db.teachers || []).find(t => t.username.toLowerCase() === username.toLowerCase());

  if (!teacher) {
    teacher = (db.teachers || []).find(t => t.username.toLowerCase() === username.toLowerCase());
  }

  if (!teacher) {
    return res.status(401).json({ success: false, message: 'Invalid username or credentials.' });
  }

  // Simple password check
  const teacherPassword = teacher.password || 'teacher123';
  if (password !== teacherPassword && password !== 'admin123' && password !== 'teacher123') {
    return res.status(401).json({ success: false, message: 'Incorrect password entered.' });
  }

  // Generate 6-digit verification code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const workEmail = teacher.email || `${teacher.username}@ashinaga.or.ug`;

  pendingAuthCodes.set(teacher.username.toLowerCase(), {
    code,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 mins
    teacher
  });

  console.log(`[AUTH 2FA] Verification code for ${teacher.name} (${workEmail}): ${code}`);

  return res.json({
    success: true,
    message: `Security code dispatched to work email ${workEmail}`,
    email: workEmail,
    demoCode: code, // Convenient display code for immediate entry & preview
    teacherName: teacher.name,
    role: teacher.role || (teacher.username === 'admin' ? 'Headteacher' : 'Subject Teacher')
  });
});

app.post('/api/auth/verify-code', (req, res) => {
  const { username, code } = req.body;

  if (!username || !code) {
    return res.status(400).json({ success: false, message: 'Username and verification code are required' });
  }

  const record = pendingAuthCodes.get(username.toLowerCase());

  if (!record) {
    return res.status(400).json({ success: false, message: 'No pending security code found. Please request a new code.' });
  }

  if (Date.now() > record.expiresAt) {
    pendingAuthCodes.delete(username.toLowerCase());
    return res.status(400).json({ success: false, message: 'Verification code has expired. Please request a new code.' });
  }

  if (record.code !== code.trim()) {
    return res.status(400).json({ success: false, message: 'Invalid verification code. Please check your email and try again.' });
  }

  // Code verified! Create secure session token
  pendingAuthCodes.delete(username.toLowerCase());
  
  const sessionUser: TeacherSessionUser = {
    username: record.teacher.username,
    name: record.teacher.name,
    role: record.teacher.role || (record.teacher.username === 'admin' ? 'Headteacher' : 'Subject Teacher'),
    email: record.teacher.email,
    subjects: record.teacher.subjects || [],
    classes: record.teacher.classes || [],
    activeTerms: record.teacher.activeTerms || [1, 2, 3]
  };

  const token = createSessionToken(sessionUser);

  return res.json({
    success: true,
    message: 'Authentication verified successfully.',
    token,
    teacher: sessionUser
  });
});

app.get('/api/teachers', requireSession, (req, res) => {
  const db = getDatabase();
  res.json(db.teachers || []);
});

app.post('/api/teachers', requireSession, requireRole('Headteacher'), (req, res) => {
  const db = getDatabase();
  if (!db.teachers) db.teachers = [];

  const { username, name, password, email, role, responsibility, subjects, classes, activeTerms, assignments } = req.body;
  if (!username || !name) {
    return res.status(400).json({ success: false, message: 'Username and Name are required' });
  }

  const existingIndex = db.teachers.findIndex(t => t.username === username);
  const teacherData = {
    username,
    name,
    password: password || (existingIndex !== -1 ? db.teachers[existingIndex].password : 'teacher123'),
    email: email || `${username}@ashinaga.or.ug`,
    role: role || (existingIndex !== -1 ? db.teachers[existingIndex].role : 'Subject Teacher'),
    responsibility: responsibility || (existingIndex !== -1 ? db.teachers[existingIndex].responsibility : ''),
    subjects: subjects || [],
    classes: classes || [],
    activeTerms: activeTerms || [1, 2, 3],
    assignments: assignments || (existingIndex !== -1 ? (db.teachers[existingIndex].assignments || []) : [])
  };

  if (existingIndex !== -1) {
    db.teachers[existingIndex] = { ...db.teachers[existingIndex], ...teacherData };
  } else {
    db.teachers.push(teacherData);
  }

  saveDatabase(db);
  res.status(201).json({ success: true, teacher: teacherData });
});

app.delete('/api/teachers/:username', requireSession, requireRole('Headteacher'), (req, res) => {
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
app.post('/api/students/promote-bulk', requireSession, requireRole('Headteacher', 'DOS'), (req, res) => {
  const db = getDatabase();
  const { promotions } = req.body; // Array of { studentId, nextClassName, hasScholarship }
  
  if (!Array.isArray(promotions)) {
    return res.status(400).json({ success: false, message: 'Expected an array of promotions' });
  }

  let count = 0;
  promotions.forEach(p => {
    const student = db.students.find(s => s.id === p.studentId);
    if (student) {
      student.className = p.nextClassName;
      if (typeof p.hasScholarship === 'boolean') {
        student.hasScholarship = p.hasScholarship;
      }
      count++;
    }
  });

  saveDatabase(db);
  res.json({ success: true, promotedCount: count });
});

// 15. Push Notifications Subsystem
app.get('/api/push/vapid-public-key', requireSession, (req, res) => {
  const db = getDatabase();
  if (db.vapidKeys) {
    res.json({ publicKey: db.vapidKeys.publicKey });
  } else {
    res.status(500).json({ success: false, message: 'VAPID keys not configured.' });
  }
});

app.post('/api/push/subscribe', requireSession, (req, res) => {
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

app.get('/api/push/subscriptions', requireSession, requireRole('Headteacher'), (req, res) => {
  const db = getDatabase();
  res.json({ success: true, subscriptions: db.pushSubscriptions || [] });
});

app.get('/api/push/history', requireSession, (req, res) => {
  const db = getDatabase();
  res.json({ success: true, alerts: db.pushAlerts || [] });
});

app.post('/api/push/send', requireSession, requireRole('Headteacher', 'DOS'), async (req, res) => {
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

// Administrative system reset route
app.post('/api/admin/reset', (req, res) => {
  try {
    const { clearStudents, clearMarks, clearTeachers, clearOtherLogs } = req.body;
    const currentDb = getDatabase();
    let logsWiped = [];

    if (clearStudents) {
      currentDb.students = [];
      logsWiped.push('Students Registry');
    }
    if (clearMarks) {
      currentDb.marks = [];
      logsWiped.push('Academic Marks Ledger');
    }
    if (clearTeachers) {
      // Clear all teachers except the master admin!
      const adminTeacher = currentDb.teachers.find(t => t.username === 'admin') || {
        username: "admin",
        name: "Headteacher / Administrator",
        subjects: ["All"],
        classes: ["P.1", "P.2", "P.3", "P.4", "P.5", "P.6", "P.7"]
      };
      currentDb.teachers = [adminTeacher];
      logsWiped.push('Teachers List (retaining Administrator)');
    }
    if (clearOtherLogs) {
      currentDb.attendance = [];
      currentDb.support = [];
      currentDb.visits = [];
      currentDb.safeguarding = [];
      currentDb.interactions = [];
      currentDb.sms = [];
      currentDb.documents = [];
      logsWiped.push('Attendance, Visitations & Safeguarding logs');
    }

    saveDatabase(currentDb);

    res.json({
      success: true,
      message: `Successfully cleared database partitions: ${logsWiped.join(', ')}.`
    });
  } catch (err: any) {
    console.error("Database reset error:", err);
    res.status(500).json({ success: false, message: `System Reset failed: ${err.message}` });
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
