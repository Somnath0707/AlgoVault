-- 1. Deduplicate any existing unresolved predictions, keeping only the latest record
DELETE FROM analytics_metrics a
USING analytics_metrics b
WHERE a.id < b.id
  AND a.user_id = b.user_id
  AND a.problem_id = b.problem_id
  AND a.actual_result IS NULL
  AND b.actual_result IS NULL;

-- 2. Partial unique index to guarantee at most one pending prediction per user and problem
CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_metrics_user_problem_pending 
ON analytics_metrics (user_id, problem_id) 
WHERE actual_result IS NULL;
