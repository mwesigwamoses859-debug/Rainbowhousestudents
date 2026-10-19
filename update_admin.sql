UPDATE staff 
SET password_hash = '49fe940585d0594651158fe2d2f8335bfa56fa61d315aa2ae0d431e5ce79cba4', 
    password_salt = '10fb29ddff6c2007ac5dc7050a93e1845eb41b0d2139ee98', 
    password_iterations = 100000,
    failed_attempts = 0, 
    locked_until = 0 
WHERE username = 'admin';

INSERT INTO staff (
  username, name, email, role, subjects, classes, active_terms, active,
  password_hash, password_salt, password_iterations, failed_attempts, locked_until, must_change_password, password_changed_at
) VALUES (
  'mwesigwa',
  'Moses Mwesigwa',
  'mwesigwa.m@ashinaga.org',
  'Headteacher',
  '["All"]',
  '["P.1","P.2","P.3","P.4","P.5","P.6","P.7"]',
  '[1,2,3]',
  1,
  '49fe940585d0594651158fe2d2f8335bfa56fa61d315aa2ae0d431e5ce79cba4',
  '10fb29ddff6c2007ac5dc7050a93e1845eb41b0d2139ee98',
  100000,
  0,
  0,
  0,
  CAST(strftime('%s', 'now') AS INTEGER) * 1000
) ON CONFLICT(username) DO UPDATE SET
  name = excluded.name,
  email = excluded.email,
  role = excluded.role,
  subjects = excluded.subjects,
  classes = excluded.classes,
  password_hash = excluded.password_hash,
  password_salt = excluded.password_salt,
  must_change_password = 1,
  failed_attempts = 0,
  locked_until = 0;
