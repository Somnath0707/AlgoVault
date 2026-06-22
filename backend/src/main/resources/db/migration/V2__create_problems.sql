CREATE TABLE problems (
    id BIGSERIAL PRIMARY KEY,
    frontend_id INTEGER,
    title VARCHAR(500) NOT NULL,
    title_slug VARCHAR(500) NOT NULL UNIQUE,
    difficulty VARCHAR(20),
    actual_rating DOUBLE PRECISION,
    tags TEXT[],
    acceptance_rate DOUBLE PRECISION,
    contest_slug VARCHAR(100),
    problem_index VARCHAR(10),
    is_premium BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_problems_rating ON problems(actual_rating);
CREATE INDEX idx_problems_tags ON problems USING GIN(tags);
CREATE INDEX idx_problems_slug ON problems(title_slug);
