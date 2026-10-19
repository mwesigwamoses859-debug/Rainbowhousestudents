import crypto from 'crypto';

export type TeacherSessionUser = {
  username: string;
  name: string;
  role: string;
  email: string;
  subjects: string[];
  classes: string[];
  activeTerms?: number[];
};

const defaultSessionSecret = 'rainbow-house-local-development-secret';

const toBase64Url = (value: string) => Buffer.from(value).toString('base64url');
const fromBase64Url = (value: string) => Buffer.from(value, 'base64url').toString('utf-8');

export function getSessionSecret(secret?: string) {
  return secret || process.env.SESSION_SECRET || defaultSessionSecret;
}

export function createSessionToken(user: TeacherSessionUser, secret?: string) {
  const payload = {
    username: user.username,
    name: user.name,
    role: user.role,
    email: user.email,
    subjects: user.subjects || [],
    classes: user.classes || [],
    activeTerms: user.activeTerms || [1, 2, 3],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8
  };

  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', getSessionSecret(secret))
    .update(encodedPayload)
    .digest('base64url');

  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string, secret?: string): TeacherSessionUser & { iat: number; exp: number } {
  if (!token || typeof token !== 'string') {
    throw new Error('Missing session token');
  }

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) {
    throw new Error('Invalid session token');
  }

  const expected = crypto
    .createHmac('sha256', getSessionSecret(secret))
    .update(encodedPayload)
    .digest('base64url');

  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
    throw new Error('Session token signature mismatch');
  }

  const payload = JSON.parse(fromBase64Url(encodedPayload)) as TeacherSessionUser & { iat: number; exp: number };
  if (!payload.username || !payload.email || !payload.role) {
    throw new Error('Invalid session payload');
  }

  if (Math.floor(Date.now() / 1000) > payload.exp) {
    throw new Error('Session expired');
  }

  return payload;
}

export function canAccessSubjectAndClass(
  teacher: Pick<TeacherSessionUser, 'classes' | 'subjects' | 'role'>,
  className: string,
  subject: string
) {
  if (!teacher) return false;
  const allowedClasses = teacher.classes || [];
  const allowedSubjects = teacher.subjects || [];

  const hasClassAccess = allowedClasses.includes('All') || allowedClasses.includes(className);
  const hasSubjectAccess = allowedSubjects.includes('All') || allowedSubjects.includes(subject);

  if (teacher.role === 'Headteacher' || teacher.role === 'DOS') {
    return true;
  }

  return hasClassAccess && hasSubjectAccess;
}

export function requireRole(userRole: string, allowedRoles: string[]) {
  return !!userRole && allowedRoles.includes(userRole);
}
