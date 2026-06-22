CREATE TABLE tag_mastery (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    tag VARCHAR(100) NOT NULL,
    total_attempted INTEGER DEFAULT 0,
    total_solved INTEGER DEFAULT 0,
    first_ac_count INTEGER DEFAULT 0,
    success_rate DOUBLE PRECISION,
    avg_solve_time DOUBLE PRECISION,
    mastery_score DOUBLE PRECISION,
    last_solved_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, tag)
);
