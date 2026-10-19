-- Migration 0004: Terakoya Teachers and Exact Class-Subject Assignments
-- Adds the 9 official Terakoya primary school teachers and their assignments

-- 1. Remove legacy placeholder teachers
DELETE FROM staff_assignments WHERE username IN ('teacher1', 'teacher2');
DELETE FROM staff WHERE username IN ('teacher1', 'teacher2');

-- 2. Insert or update the 9 official Terakoya teachers
INSERT INTO staff (username, name, email, role, responsibility, subjects, classes, active_terms, active)
VALUES
  (
    'teddy.nansubuga',
    'Nansubuga Teddy',
    'teddy.nansubuga@ashinaga.or.ug',
    'Headteacher',
    'Headteacher',
    '["Literacy 1","Luganda","Mathematics"]',
    '["P.2","P.3"]',
    '[1,2,3]',
    1
  ),
  (
    'emmanuel.mutabarura',
    'Mutabarura Emmanuel',
    'emmanuel.mutabarura@ashinaga.or.ug',
    'DOS',
    'Director of studies',
    '["Social Studies","English","Religious Education"]',
    '["P.4"]',
    '[1,2,3]',
    1
  ),
  (
    'carol.ayesiga',
    'Ayesiga Carol',
    'carol.ayesiga@ashinaga.or.ug',
    'Subject Teacher',
    'Senior woman teacher/ Kumon teacher',
    '["English","Literacy 2 (Reading and Writing)","KUMON"]',
    '["P.3","P.4","P.5"]',
    '[1,2,3]',
    1
  ),
  (
    'philbert.bwambale',
    'Bwambale Philbert',
    'philbert.bwambale@ashinaga.or.ug',
    'Subject Teacher',
    'Cultural Club/ class teacher P.3',
    '["Mathematics","Science"]',
    '["P.3","P.4","P.5"]',
    '[1,2,3]',
    1
  ),
  (
    'john.kirabira',
    'Kirabira John',
    'john.kirabira@ashinaga.or.ug',
    'Subject Teacher',
    'Senior male Teacher / Class teacher P.5',
    '["Social Studies","English","Religious Education"]',
    '["P.3","P.5"]',
    '[1,2,3]',
    1
  ),
  (
    'peter.taimwa',
    'Taimwa Peter',
    'peter.taimwa@ashinaga.or.ug',
    'Subject Teacher',
    'Gardening/ Ass. Kumon/ Class teacher P.4',
    '["Mathematics","Religious Education"]',
    '["P.3","P.4","P.5"]',
    '[1,2,3]',
    1
  ),
  (
    'isaac.sali',
    'Sali Isaac',
    'isaac.sali@ashinaga.or.ug',
    'Subject Teacher',
    'ICT teacher',
    '["Computer/ ICT"]',
    '["P.1","P.2","P.3","P.4","P.5","P.6","P.7"]',
    '[1,2,3]',
    1
  ),
  (
    'lilian.nakyeyune',
    'Nakyeyune Lilian',
    'lilian.nakyeyune@ashinaga.or.ug',
    'Subject Teacher',
    'games and sports / Class teacher P.1',
    '["Mathematics","Literacy 1","Literacy 2 (Reading and Writing)"]',
    '["P.1","P.2"]',
    '[1,2,3]',
    1
  ),
  (
    'sarah.batengu',
    'Batengu Sarah',
    'sarah.batengu@ashinaga.or.ug',
    'Subject Teacher',
    'Volunteer teacher / Ass. Class teacher P.2',
    '["English","Literacy 1","Luganda"]',
    '["P.1","P.2"]',
    '[1,2,3]',
    1
  )
ON CONFLICT(username) DO UPDATE SET
  name = excluded.name,
  email = excluded.email,
  role = excluded.role,
  responsibility = excluded.responsibility,
  subjects = excluded.subjects,
  classes = excluded.classes,
  active_terms = excluded.active_terms,
  active = 1;

-- 3. Insert or update exact class-subject assignments
INSERT OR IGNORE INTO staff_assignments (username, class_name, subject, active_terms, active, created_at, updated_at)
VALUES
  -- Nansubuga Teddy (Literacy 1 - P.3, Luganda P.3, Maths P.2)
  ('teddy.nansubuga', 'P.3', 'Literacy 1', '[1,2,3]', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  ('teddy.nansubuga', 'P.3', 'Luganda', '[1,2,3]', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  ('teddy.nansubuga', 'P.2', 'Mathematics', '[1,2,3]', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),

  -- Mutabarura Emmanuel (SST P.4, English P.4, Religious Educ. P.4)
  ('emmanuel.mutabarura', 'P.4', 'Social Studies', '[1,2,3]', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  ('emmanuel.mutabarura', 'P.4', 'English', '[1,2,3]', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  ('emmanuel.mutabarura', 'P.4', 'Religious Education', '[1,2,3]', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),

  -- Ayesiga Carol (Eng. P.5, Lit 2 P.3, KUMON P.4 and P.5)
  ('carol.ayesiga', 'P.5', 'English', '[1,2,3]', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  ('carol.ayesiga', 'P.3', 'Literacy 2 (Reading and Writing)', '[1,2,3]', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  ('carol.ayesiga', 'P.4', 'KUMON', '[1,2,3]', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  ('carol.ayesiga', 'P.5', 'KUMON', '[1,2,3]', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),

  -- Bwambale Philbert (Maths P.3, Science P.4 and P.5)
  ('philbert.bwambale', 'P.3', 'Mathematics', '[1,2,3]', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  ('philbert.bwambale', 'P.4', 'Science', '[1,2,3]', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  ('philbert.bwambale', 'P.5', 'Science', '[1,2,3]', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),

  -- Kirabira John (SST P.5, English P.3, Religious Educ. P.5)
  ('john.kirabira', 'P.5', 'Social Studies', '[1,2,3]', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  ('john.kirabira', 'P.3', 'English', '[1,2,3]', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  ('john.kirabira', 'P.5', 'Religious Education', '[1,2,3]', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),

  -- Taimwa Peter (Maths P.5 and P.4, Religious Educ. P.3)
  ('peter.taimwa', 'P.4', 'Mathematics', '[1,2,3]', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  ('peter.taimwa', 'P.5', 'Mathematics', '[1,2,3]', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  ('peter.taimwa', 'P.3', 'Religious Education', '[1,2,3]', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),

  -- Sali Isaac (ICT all classes)
  ('isaac.sali', 'P.1', 'Computer/ ICT', '[1,2,3]', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  ('isaac.sali', 'P.2', 'Computer/ ICT', '[1,2,3]', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  ('isaac.sali', 'P.3', 'Computer/ ICT', '[1,2,3]', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  ('isaac.sali', 'P.4', 'Computer/ ICT', '[1,2,3]', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  ('isaac.sali', 'P.5', 'Computer/ ICT', '[1,2,3]', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  ('isaac.sali', 'P.6', 'Computer/ ICT', '[1,2,3]', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  ('isaac.sali', 'P.7', 'Computer/ ICT', '[1,2,3]', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),

  -- Nakyeyune Lilian (Maths P.1, Lit.1 P.1, Literacy 2 P.1 and P.2)
  ('lilian.nakyeyune', 'P.1', 'Mathematics', '[1,2,3]', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  ('lilian.nakyeyune', 'P.1', 'Literacy 1', '[1,2,3]', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  ('lilian.nakyeyune', 'P.1', 'Literacy 2 (Reading and Writing)', '[1,2,3]', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  ('lilian.nakyeyune', 'P.2', 'Literacy 2 (Reading and Writing)', '[1,2,3]', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),

  -- Batengu Sarah (Eng. P.1 and P.2, Lit 1 P.2, Luganda P.2)
  ('sarah.batengu', 'P.1', 'English', '[1,2,3]', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  ('sarah.batengu', 'P.2', 'English', '[1,2,3]', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  ('sarah.batengu', 'P.2', 'Literacy 1', '[1,2,3]', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  ('sarah.batengu', 'P.2', 'Luganda', '[1,2,3]', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
