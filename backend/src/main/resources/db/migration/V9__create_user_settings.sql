CREATE TABLE user_settings (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    hide_acceptance_rate BOOLEAN DEFAULT TRUE,
    dark_mode BOOLEAN DEFAULT TRUE,
    daily_potd_enabled BOOLEAN DEFAULT TRUE,
    review_notifications BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
