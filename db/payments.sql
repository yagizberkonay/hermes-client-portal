ALTER TABLE projects ADD COLUMN IF NOT EXISTS monthly_minimum numeric(12,2) NOT NULL DEFAULT 0 CHECK (monthly_minimum >= 0);
DROP VIEW IF EXISTS project_financials;
CREATE VIEW project_financials AS
SELECT p.id AS project_id, p.total_price, p.monthly_minimum,
  COALESCE(SUM(pay.amount),0)::numeric(12,2) AS amount_paid,
  GREATEST(p.total_price-COALESCE(SUM(pay.amount),0),0)::numeric(12,2) AS remaining_balance
FROM projects p LEFT JOIN payments pay ON pay.project_id=p.id GROUP BY p.id;
