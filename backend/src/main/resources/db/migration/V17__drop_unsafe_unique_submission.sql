-- Drop the unsafe unique constraint on submissions that uses problem_id and submitted_at (as LeetCode timestamps are second-granular)
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS uk_submission_unique;
