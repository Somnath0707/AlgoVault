-- Deduplicate any existing duplicate revision cards, keeping the newest record
DELETE FROM revision_cards a USING revision_cards b
WHERE a.id < b.id 
  AND a.user_id = b.user_id 
  AND a.problem_id = b.problem_id;

-- Enforce uniqueness on (user_id, problem_id) so duplicate cards can never occur
CREATE UNIQUE INDEX IF NOT EXISTS uk_revision_cards_user_problem ON revision_cards(user_id, problem_id);
