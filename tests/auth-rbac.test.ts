import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createSessionToken,
  verifySessionToken,
  canAccessSubjectAndClass,
  requireRole
} from '../src/lib/auth.ts';

test('creates and verifies session tokens', () => {
  const secret = 'test-secret';
  const teacher = {
    username: 'admin',
    email: 'admin@ashinaga.org',
    role: 'Headteacher',
    subjects: ['All'],
    classes: ['P.1', 'P.2']
  };

  const token = createSessionToken(teacher, secret);
  const payload = verifySessionToken(token, secret);

  assert.equal(payload.username, 'admin');
  assert.equal(payload.role, 'Headteacher');
  assert.equal(payload.email, 'admin@ashinaga.org');
});

test('enforces class and subject access based on teacher profile', () => {
  const teacher = {
    username: 'teacher1',
    role: 'Subject Teacher',
    classes: ['P.5'],
    subjects: ['Mathematics']
  };

  assert.equal(canAccessSubjectAndClass(teacher, 'P.5', 'Mathematics'), true);
  assert.equal(canAccessSubjectAndClass(teacher, 'P.6', 'Mathematics'), false);
  assert.equal(canAccessSubjectAndClass(teacher, 'P.5', 'Science'), false);
});

test('role checks allow only authorized users', () => {
  assert.equal(requireRole('Headteacher', ['Headteacher', 'DOS']), true);
  assert.equal(requireRole('Teacher', ['Headteacher', 'DOS']), false);
});
