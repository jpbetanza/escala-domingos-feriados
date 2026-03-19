-- Add type column to escala_holidays to distinguish regular holidays from
-- special dates that count as Sundays in the scheduling algorithm.
ALTER TABLE escala_holidays
  ADD COLUMN type text NOT NULL DEFAULT 'holiday'
  CHECK (type IN ('holiday', 'special'));
