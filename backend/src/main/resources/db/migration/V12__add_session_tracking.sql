CREATE TABLE sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    mode VARCHAR(50) NOT NULL,
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP,
    problems_attempted INT DEFAULT 0,
    problems_solved INT DEFAULT 0,
    focus_seconds INT DEFAULT 0,
    tab_switches INT DEFAULT 0,
    paste_count INT DEFAULT 0,
    focus_score INT DEFAULT 100
);

CREATE TABLE session_events (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES sessions(id),
    event_type VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    metadata JSONB
);

ALTER TABLE problem_open_events ADD COLUMN tab_switches INT DEFAULT 0;
ALTER TABLE problem_open_events ADD COLUMN paste_count INT DEFAULT 0;
ALTER TABLE problem_open_events ADD COLUMN self_reported_help VARCHAR(50);
ALTER TABLE problem_open_events ADD COLUMN focus_score INT DEFAULT 100;
