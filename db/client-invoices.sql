ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_id uuid REFERENCES payments(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS invoices_payment_idx ON invoices(payment_id);
