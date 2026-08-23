-- Partial unique index to prevent duplicate pending/unresolved predictions for the same user and problem
CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_metrics_user_problem_pending 
ON analytics_metrics (user_id, problem_id) 
WHERE actual_result IS NULL;
