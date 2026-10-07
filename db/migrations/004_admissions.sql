CREATE TABLE admission_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id uuid NOT NULL REFERENCES colleges(id) ON DELETE RESTRICT,
  code text NOT NULL CHECK (length(code) BETWEEN 1 AND 32),
  title text NOT NULL CHECK (length(title) BETWEEN 2 AND 140),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (college_id,code),
  UNIQUE (id,college_id)
);
CREATE TABLE admission_intakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id uuid NOT NULL REFERENCES colleges(id) ON DELETE RESTRICT,
  code text NOT NULL CHECK (length(code) BETWEEN 1 AND 32),
  name text NOT NULL CHECK (length(name) BETWEEN 2 AND 120),
  opens_on date NOT NULL,
  closes_on date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','open','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (closes_on >= opens_on),
  UNIQUE (college_id,code),
  UNIQUE (id,college_id)
);
CREATE TABLE admission_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id uuid NOT NULL,
  intake_id uuid NOT NULL,
  program_id uuid NOT NULL,
  application_number text NOT NULL CHECK (length(application_number) BETWEEN 8 AND 40),
  applicant_name text NOT NULL CHECK (length(applicant_name) BETWEEN 2 AND 120),
  applicant_email text NOT NULL CHECK (length(applicant_email) BETWEEN 3 AND 254),
  phone text NOT NULL DEFAULT '' CHECK (length(phone) <= 40),
  statement text NOT NULL DEFAULT '' CHECK (length(statement) <= 1200),
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','under_review','offered','rejected','withdrawn')),
  tracking_token_hash char(64) NOT NULL UNIQUE,
  review_note text NOT NULL DEFAULT '' CHECK (length(review_note) <= 500),
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (intake_id,college_id) REFERENCES admission_intakes(id,college_id) ON DELETE RESTRICT,
  FOREIGN KEY (program_id,college_id) REFERENCES admission_programs(id,college_id) ON DELETE RESTRICT,
  FOREIGN KEY (college_id,reviewed_by) REFERENCES college_memberships(college_id,user_id) ON DELETE RESTRICT,
  UNIQUE (college_id,application_number),
  UNIQUE (id,college_id)
);
CREATE UNIQUE INDEX admission_duplicate_application_idx
  ON admission_applications (college_id,intake_id,program_id,lower(applicant_email))
  WHERE status <> 'withdrawn';
CREATE INDEX admission_application_tenant_date_idx
  ON admission_applications (college_id,created_at DESC);
CREATE INDEX admission_application_status_idx
  ON admission_applications (college_id,status,created_at DESC);
