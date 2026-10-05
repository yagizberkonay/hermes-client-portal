CREATE TABLE IF NOT EXISTS digital_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  document_type text NOT NULL DEFAULT 'project_approval',
  content text NOT NULL,
  content_hash text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','revoked')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  approved_by_name text,
  approved_by_email text,
  ip_address inet,
  user_agent text,
  approval_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS approval_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_id uuid NOT NULL REFERENCES digital_approvals(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  event_at timestamptz NOT NULL DEFAULT now(),
  ip_address inet,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS digital_approvals_project_idx ON digital_approvals(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS approval_events_approval_idx ON approval_events(approval_id, event_at DESC);
