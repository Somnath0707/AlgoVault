
-- 1. Submission Deduplication Constraint
ALTER TABLE submissions ADD CONSTRAINT uk_submission_unique UNIQUE (user_id, problem_id, submitted_at);

-- 2. Contest Deduplication Constraint
ALTER TABLE contest_results ADD CONSTRAINT uk_contest_unique UNIQUE (user_id, contest_title);

-- 3. Sync Metadata Table
CREATE TABLE sync_metadata (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    last_sync_time TIMESTAMP,
    total_problems INTEGER DEFAULT 0,
    total_submissions INTEGER DEFAULT 0,
    total_contests INTEGER DEFAULT 0,
    last_contest_sync TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. User Rating Buckets Table
CREATE TABLE user_rating_buckets (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    bucket_rating INTEGER NOT NULL,
    attempted INTEGER DEFAULT 0,
    solved INTEGER DEFAULT 0,
    first_ac_count INTEGER DEFAULT 0,
    avg_attempts DOUBLE PRECISION DEFAULT 0.0,
    avg_solve_time DOUBLE PRECISION DEFAULT 0.0,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, bucket_rating)
);

-- 5. Problem Open Events Table
CREATE TABLE problem_open_events (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    problem_id BIGINT REFERENCES problems(id) ON DELETE CASCADE,
    opened_at TIMESTAMP NOT NULL,
    closed_at TIMESTAMP,
    focus_seconds INTEGER DEFAULT 0,
    solved BOOLEAN DEFAULT FALSE,
    attempts_during_session INTEGER DEFAULT 0
);
CREATE INDEX idx_poe_user_prob ON problem_open_events(user_id, problem_id);

-- 6. Sync Logs Table
CREATE TABLE sync_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMP NOT NULL,
    finished_at TIMESTAMP,
    status VARCHAR(20) NOT NULL,
    new_problems INTEGER DEFAULT 0,
    new_submissions INTEGER DEFAULT 0,
    new_contests INTEGER DEFAULT 0,
    duration_ms BIGINT DEFAULT 0,
    error_message TEXT
);
