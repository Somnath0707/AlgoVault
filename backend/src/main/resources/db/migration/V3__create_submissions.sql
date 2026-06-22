CREATE TABLE submissions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    problem_id BIGINT REFERENCES problems(id),
    verdict VARCHAR(30) NOT NULL,
    language VARCHAR(50),
    runtime_ms INTEGER,
    submitted_at TIMESTAMP NOT NULL,
    is_contest BOOLEAN DEFAULT FALSE,
    contest_slug VARCHAR(100),
    attempt_number INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_sub_user ON submissions(user_id);
CREATE INDEX idx_sub_user_verdict ON submissions(user_id, verdict);
CREATE INDEX idx_sub_user_date ON submissions(user_id, submitted_at DESC);
CREATE INDEX idx_sub_problem ON submissions(problem_id);
