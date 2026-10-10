-- Per-day override of how many vendors work on a date. NULL means the
-- schedule's yearly default (escala_schedules.vendors_per_day) applies.
ALTER TABLE escala_entries
  ADD COLUMN vendors_count integer
  CHECK (vendors_count IS NULL OR vendors_count >= 1);
