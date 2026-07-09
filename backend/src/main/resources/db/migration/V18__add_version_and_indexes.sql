-- Add @Version column for optimistic locking on sessions
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;

-- Composite indexes for query performance
CREATE INDEX IF NOT EXISTS idx_problem_open_events_user_problem ON problem_open_events(user_id, problem_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user_problem ON submissions(user_id, problem_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user_verdict ON submissions(user_id, verdict);
CREATE INDEX IF NOT EXISTS idx_problem_open_events_user_closed ON problem_open_events(user_id, closed_at);
CREATE INDEX IF NOT EXISTS idx_session_events_session ON session_events(session_id);
CREATE INDEX IF NOT EXISTS idx_revision_cards_user_problem ON revision_cards(user_id, problem_id);
CREATE INDEX IF NOT EXISTS idx_tag_mastery_user ON tag_mastery(user_id);
CREATE INDEX IF NOT EXISTS idx_contest_results_user ON contest_results(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_user_result ON analytics_metrics(user_id, actual_result);
