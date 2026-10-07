CREATE TABLE academic_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id uuid NOT NULL REFERENCES colleges(id) ON DELETE RESTRICT,
  code text NOT NULL CHECK (length(code) BETWEEN 1 AND 32),
  name text NOT NULL CHECK (length(name) BETWEEN 2 AND 100),
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','active','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_on >= starts_on),
  UNIQUE (college_id, code),
  UNIQUE (id, college_id)
);
CREATE TABLE courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id uuid NOT NULL REFERENCES colleges(id) ON DELETE RESTRICT,
  code text NOT NULL CHECK (length(code) BETWEEN 1 AND 32),
  title text NOT NULL CHECK (length(title) BETWEEN 2 AND 140),
  credits numeric(4,1) NOT NULL DEFAULT 0 CHECK (credits >= 0 AND credits <= 99),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (college_id, code),
  UNIQUE (id, college_id)
);
CREATE TABLE academic_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id uuid NOT NULL REFERENCES colleges(id) ON DELETE RESTRICT,
  course_id uuid NOT NULL,
  term_id uuid NOT NULL,
  section_code text NOT NULL CHECK (length(section_code) BETWEEN 1 AND 32),
  instructor_id uuid,
  capacity integer NOT NULL DEFAULT 60 CHECK (capacity BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (course_id, college_id) REFERENCES courses(id, college_id) ON DELETE RESTRICT,
  FOREIGN KEY (term_id, college_id) REFERENCES academic_terms(id, college_id) ON DELETE RESTRICT,
  FOREIGN KEY (college_id, instructor_id) REFERENCES college_memberships(college_id, user_id) ON DELETE RESTRICT,
  UNIQUE (course_id, term_id, section_code),
  UNIQUE (id, college_id)
);
CREATE INDEX academic_sections_college_term_idx ON academic_sections (college_id, term_id);
CREATE TABLE section_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id uuid NOT NULL,
  section_id uuid NOT NULL,
  student_id uuid NOT NULL,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled','dropped','completed')),
  FOREIGN KEY (section_id, college_id) REFERENCES academic_sections(id, college_id) ON DELETE RESTRICT,
  FOREIGN KEY (student_id, college_id) REFERENCES students(id, college_id) ON DELETE RESTRICT,
  UNIQUE (section_id, student_id)
);
CREATE INDEX section_enrollments_roster_idx ON section_enrollments (college_id, section_id, status);
CREATE TABLE attendance_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id uuid NOT NULL,
  section_id uuid NOT NULL,
  session_date date NOT NULL,
  note text NOT NULL DEFAULT '' CHECK (length(note) <= 500),
  recorded_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (section_id, college_id) REFERENCES academic_sections(id, college_id) ON DELETE RESTRICT,
  UNIQUE (section_id, session_date),
  UNIQUE (id, college_id)
);
CREATE TABLE attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id uuid NOT NULL,
  session_id uuid NOT NULL,
  student_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('present','absent','late','excused')),
  marked_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  marked_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (session_id, college_id) REFERENCES attendance_sessions(id, college_id) ON DELETE RESTRICT,
  FOREIGN KEY (student_id, college_id) REFERENCES students(id, college_id) ON DELETE RESTRICT,
  UNIQUE (session_id, student_id)
);
CREATE INDEX attendance_records_student_idx ON attendance_records (college_id, student_id, marked_at DESC);

