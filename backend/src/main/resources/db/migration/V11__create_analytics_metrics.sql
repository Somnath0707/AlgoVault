
CREATE TABLE analytics_metrics (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    problem_id BIGINT REFERENCES problems(id) ON DELETE CASCADE,
    predicted_probability DOUBLE PRECISION NOT NULL,
    actual_result BOOLEAN, 
    problem_rating DOUBLE PRECISION,
    tags TEXT,
    confidence VARCHAR(20),
    predicted_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP
);
