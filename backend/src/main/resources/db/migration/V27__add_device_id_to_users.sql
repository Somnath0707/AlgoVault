ALTER TABLE users ADD COLUMN IF NOT EXISTS device_id VARCHAR(128);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_device_id ON users(device_id);

-- Backfill device_id for existing guest users created with guest:<deviceId>
UPDATE users
SET device_id = SUBSTRING(github_id FROM 7)
WHERE github_id LIKE 'guest:%' AND device_id IS NULL;
