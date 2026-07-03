ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_heartbeat_epoch VARCHAR(64);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS accumulated_focus_seconds INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS accumulated_tab_switches INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS accumulated_paste_count INTEGER DEFAULT 0;
