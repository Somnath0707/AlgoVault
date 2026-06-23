ALTER TABLE submissions ADD COLUMN IF NOT EXISTS leetcode_submission_id VARCHAR(64);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS memory_kb INTEGER;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS total_correct INTEGER;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS total_testcases INTEGER;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS source VARCHAR(30) DEFAULT 'HISTORY_SYNC';

CREATE UNIQUE INDEX IF NOT EXISTS uk_submission_lc_id
    ON submissions(user_id, leetcode_submission_id)
    WHERE leetcode_submission_id IS NOT NULL;

ALTER TABLE problem_open_events ADD COLUMN IF NOT EXISTS tab_switches INTEGER DEFAULT 0;
ALTER TABLE problem_open_events ADD COLUMN IF NOT EXISTS paste_count INTEGER DEFAULT 0;
ALTER TABLE problem_open_events ADD COLUMN IF NOT EXISTS focus_score INTEGER DEFAULT 100;
ALTER TABLE problem_open_events ADD COLUMN IF NOT EXISTS self_reported_help VARCHAR(30) DEFAULT 'NONE';

CREATE TABLE IF NOT EXISTS sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    mode VARCHAR(30) NOT NULL DEFAULT 'PRACTICE',
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMP,
    problems_attempted INTEGER DEFAULT 0,
    problems_solved INTEGER DEFAULT 0,
    focus_seconds INTEGER DEFAULT 0,
    tab_switches INTEGER DEFAULT 0,
    paste_count INTEGER DEFAULT 0,
    focus_score INTEGER DEFAULT 100
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON sessions(user_id, ended_at);

CREATE TABLE IF NOT EXISTS session_events (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT REFERENCES sessions(id) ON DELETE CASCADE,
    event_type VARCHAR(40) NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_session_events_session ON session_events(session_id, timestamp DESC);
