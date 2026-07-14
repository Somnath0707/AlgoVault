CREATE TABLE zenith_sessions (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    problem_id BIGINT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    grade VARCHAR(20) NOT NULL,
    focus_score DOUBLE PRECISION NOT NULL,
    time_spent_seconds INT NOT NULL,
    is_verified BOOLEAN NOT NULL,
    reason VARCHAR(255),
    solved_at TIMESTAMP NOT NULL,
    code_submitted TEXT,
    problem_rating DOUBLE PRECISION
);
CREATE INDEX idx_zenith_sessions_user ON zenith_sessions(user_id);
