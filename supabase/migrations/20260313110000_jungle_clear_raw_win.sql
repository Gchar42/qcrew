-- Add win column to jungle_clear_raw for path-level win rate aggregation
ALTER TABLE jungle_clear_raw ADD COLUMN IF NOT EXISTS win BOOLEAN;
