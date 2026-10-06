CREATE TABLE IF NOT EXISTS project_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  currency char(3) NOT NULL DEFAULT 'TRY',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_line_items_project_idx ON project_line_items(project_id);

DROP VIEW IF EXISTS project_financials;
CREATE VIEW project_financials AS
SELECT
  p.id AS project_id,
  (p.total_price + COALESCE((SELECT SUM(li.amount) FROM project_line_items li WHERE li.project_id = p.id), 0))::numeric(12,2) AS total_price,
  p.monthly_minimum,
  COALESCE((SELECT SUM(pay.amount) FROM payments pay WHERE pay.project_id = p.id), 0)::numeric(12,2) AS amount_paid,
  GREATEST(
    p.total_price + COALESCE((SELECT SUM(li.amount) FROM project_line_items li WHERE li.project_id = p.id), 0)
    - COALESCE((SELECT SUM(pay.amount) FROM payments pay WHERE pay.project_id = p.id), 0),
    0
  )::numeric(12,2) AS remaining_balance
FROM projects p;
