ALTER TABLE milestones ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','internal_review','waiting_client','changes_requested','approved','completed'));
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS change_request text;
CREATE INDEX IF NOT EXISTS milestones_project_sort_idx ON milestones(project_id, sort_order);
