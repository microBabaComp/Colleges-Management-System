CREATE TABLE college_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id uuid NOT NULL REFERENCES colleges(id) ON DELETE RESTRICT,
  email text NOT NULL CHECK (length(email) BETWEEN 3 AND 254),
  role text NOT NULL CHECK (role IN ('college_admin','registrar','faculty','finance','student_services')),
  invited_by uuid NOT NULL,
  token_hash char(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (accepted_at IS NULL OR revoked_at IS NULL),
  FOREIGN KEY (college_id,invited_by) REFERENCES college_memberships(college_id,user_id) ON DELETE RESTRICT
);
CREATE INDEX college_invitations_tenant_idx
  ON college_invitations(college_id,created_at DESC);
CREATE INDEX college_invitations_email_idx
  ON college_invitations(college_id,lower(email),expires_at)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;
CREATE UNIQUE INDEX college_invitations_one_open_per_email
  ON college_invitations(college_id,lower(email))
  WHERE accepted_at IS NULL AND revoked_at IS NULL;
