CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE colleges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(name) BETWEEN 2 AND 120),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  country text NOT NULL DEFAULT '',
  timezone text NOT NULL DEFAULT 'UTC',
  academic_year text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  display_name text NOT NULL CHECK (length(display_name) BETWEEN 1 AND 120),
  password_hash text NOT NULL,
  platform_role text NOT NULL DEFAULT 'user' CHECK (platform_role IN ('user','platform_admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_lower_unique ON users (lower(email));

CREATE TABLE college_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id uuid NOT NULL REFERENCES colleges(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  role text NOT NULL CHECK (role IN ('college_admin','registrar','faculty','finance','student_services')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (college_id, user_id),
  UNIQUE (college_id, user_id, role)
);

CREATE TABLE sessions (
  token_hash char(64) PRIMARY KEY,
  csrf_hash char(64) NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  college_id uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (college_id, user_id) REFERENCES college_memberships(college_id, user_id) ON DELETE CASCADE
);
CREATE INDEX sessions_expiry_idx ON sessions (expires_at);

CREATE TABLE students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id uuid NOT NULL REFERENCES colleges(id) ON DELETE RESTRICT,
  student_number text NOT NULL CHECK (length(student_number) BETWEEN 1 AND 40),
  first_name text NOT NULL CHECK (length(first_name) BETWEEN 1 AND 80),
  last_name text NOT NULL CHECK (length(last_name) BETWEEN 1 AND 80),
  email text NOT NULL DEFAULT '',
  program text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','on_leave','graduated','withdrawn')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  UNIQUE (college_id, student_number),
  UNIQUE (id, college_id)
);
CREATE INDEX students_college_name_idx ON students (college_id, lower(last_name), lower(first_name)) WHERE archived_at IS NULL;

CREATE TABLE audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  college_id uuid NOT NULL REFERENCES colleges(id) ON DELETE RESTRICT,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_college_created_idx ON audit_events (college_id, created_at DESC);

CREATE OR REPLACE FUNCTION reject_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit events are append-only';
END;
$$;
CREATE TRIGGER audit_events_immutable
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION reject_audit_mutation();
