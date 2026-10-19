UPDATE staff 
SET password_hash = NULL, 
    password_salt = NULL, 
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
  '1e6aac477f90ae8e0af5ea9d1a85015d0247364e8b300f35694471d228551d9f',
  '017061b64f169f672553f890cc6f5cbf3076f2f69dcdd5c2',
  100000,
  0,
  0,
  1,
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
