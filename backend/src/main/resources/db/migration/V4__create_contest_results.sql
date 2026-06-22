CREATE TABLE contest_results (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    contest_title VARCHAR(255) NOT NULL,
    contest_slug VARCHAR(100),
    contest_date TIMESTAMP NOT NULL,
    rank INTEGER,
    problems_solved INTEGER,
    total_problems INTEGER,
    finish_time_secs INTEGER,
    old_rating DOUBLE PRECISION,
    new_rating DOUBLE PRECISION,
    rating_delta DOUBLE PRECISION,
    question_details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_cr_user ON contest_results(user_id);
CREATE INDEX idx_cr_date ON contest_results(user_id, contest_date DESC);
