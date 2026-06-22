CREATE TABLE vault_entries (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    problem_id BIGINT REFERENCES problems(id),
    title VARCHAR(500),
    content TEXT NOT NULL,
    tags TEXT[],
    entry_type VARCHAR(30),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_vault_user ON vault_entries(user_id);
CREATE INDEX idx_vault_fts ON vault_entries USING GIN(to_tsvector('english', content));
