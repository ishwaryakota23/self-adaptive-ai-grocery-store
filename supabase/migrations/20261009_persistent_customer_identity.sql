-- Persist email-verified customer identity and protect signup verification.
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email VARCHAR(320);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE customers ALTER COLUMN whatsapp_number DROP NOT NULL;
ALTER TABLE customer_identity_tokens ADD COLUMN IF NOT EXISTS delivered_via_email BOOLEAN NOT NULL DEFAULT FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_email_unique
  ON customers (LOWER(email)) WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS verified_customer_emails (
  email VARCHAR(320) PRIMARY KEY,
  verified_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE otps ALTER COLUMN phone TYPE VARCHAR(320);
ALTER TABLE otps ADD COLUMN IF NOT EXISTS used BOOLEAN NOT NULL DEFAULT FALSE;
