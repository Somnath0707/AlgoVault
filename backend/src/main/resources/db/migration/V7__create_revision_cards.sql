CREATE TABLE revision_cards (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    problem_id BIGINT REFERENCES problems(id),
    confidence DOUBLE PRECISION DEFAULT 1.0,
    interval_days INTEGER DEFAULT 1,
    ease_factor DOUBLE PRECISION DEFAULT 2.5,
    next_review DATE NOT NULL,
    last_reviewed DATE,
    review_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_rev_user_date ON revision_cards(user_id, next_review);
