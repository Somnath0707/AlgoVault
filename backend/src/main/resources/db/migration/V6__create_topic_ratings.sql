CREATE TABLE topic_ratings (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    tag VARCHAR(100) NOT NULL,
    elo_rating INTEGER DEFAULT 1200,
    peak_rating INTEGER DEFAULT 1200,
    problems_played INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, tag)
);
