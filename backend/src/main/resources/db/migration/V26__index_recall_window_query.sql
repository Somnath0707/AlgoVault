CREATE INDEX IF NOT EXISTS idx_submissions_user_problem_verdict_submitted_at
    ON submissions(user_id, problem_id, verdict, submitted_at DESC);
