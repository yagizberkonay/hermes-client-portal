ALTER TABLE digital_approvals ADD COLUMN IF NOT EXISTS terms_version text NOT NULL DEFAULT 'hermes-digital-approval-v1';
ALTER TABLE digital_approvals ADD COLUMN IF NOT EXISTS legal_notice text NOT NULL DEFAULT 'Bu işlem nitelikli elektronik imza değildir. Portal üzerinde yapılan dijital onay, tarafların belgeyi okuduğuna ve kabul iradesine ilişkin elektronik kayıt oluşturur.';
ALTER TABLE digital_approvals ADD COLUMN IF NOT EXISTS read_confirmed_at timestamptz;
ALTER TABLE digital_approvals ADD COLUMN IF NOT EXISTS read_by uuid REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE digital_approvals ADD COLUMN IF NOT EXISTS read_ip_address inet;
ALTER TABLE digital_approvals ADD COLUMN IF NOT EXISTS read_user_agent text;
