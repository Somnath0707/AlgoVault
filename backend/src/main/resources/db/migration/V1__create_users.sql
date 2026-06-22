CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    github_id VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(512),
    lc_username VARCHAR(100),
    lc_rating INTEGER,
    virtual_rating INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
