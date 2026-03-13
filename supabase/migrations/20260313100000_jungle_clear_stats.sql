-- Jungle clear speed pipeline tables

CREATE TABLE IF NOT EXISTS jungle_clear_stats (
  id BIGSERIAL PRIMARY KEY,
  champion_id INT NOT NULL,
  patch TEXT NOT NULL,
  rank_tier TEXT NOT NULL,
  games INT DEFAULT 0,
  clear_time_p5 INT,
  clear_time_p50 INT,
  hp_after_clear_p50 NUMERIC(5,2),
  most_common_path JSONB,
  second_path JSONB,
  third_path JSONB,
  path_popularity JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(champion_id, patch, rank_tier)
);

CREATE INDEX IF NOT EXISTS idx_jcs_champ ON jungle_clear_stats(champion_id, patch, rank_tier);

CREATE TABLE IF NOT EXISTS jungle_clear_raw (
  id BIGSERIAL PRIMARY KEY,
  match_id TEXT NOT NULL,
  champion_id INT NOT NULL,
  puuid TEXT NOT NULL,
  clear_time_seconds INT,
  hp_after_clear NUMERIC(5,2),
  path_order JSONB,
  patch TEXT NOT NULL,
  rank_tier TEXT NOT NULL,
  game_timestamp TIMESTAMPTZ,
  UNIQUE(match_id, puuid)
);

CREATE INDEX IF NOT EXISTS idx_jcr_champ ON jungle_clear_raw(champion_id, patch, rank_tier);
