-- Migration: Create tables from ARCHITECTURE.md that are missing from the current schema.
-- Does NOT touch the existing `matches` table (PK: match_id+puuid).
-- Instead creates `matches_v2` (one row per match) and `match_participants` (one row per participant).

-- ============================================================
-- summoners — tracking table for the aggregate cron worker
-- ============================================================
CREATE TABLE IF NOT EXISTS summoners (
  puuid            TEXT PRIMARY KEY,
  summoner_id      TEXT,
  riot_id          TEXT,
  region           TEXT,
  profile_icon_id  INT,
  summoner_level   INT,
  rank_solo        TEXT,
  rank_flex        TEXT,
  lp_solo          INT,
  lp_flex          INT,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_summoners_riot_id
  ON summoners (LOWER(riot_id));

-- ============================================================
-- matches_v2 — one row per match (spec's "matches" table)
-- ============================================================
CREATE TABLE IF NOT EXISTS matches_v2 (
  match_id        TEXT PRIMARY KEY,
  region          TEXT NOT NULL,
  patch           TEXT NOT NULL,
  game_duration   INT,
  game_timestamp  TIMESTAMPTZ,
  queue_type      TEXT
);

-- ============================================================
-- match_participants — one row per participant per match
-- ============================================================
CREATE TABLE IF NOT EXISTS match_participants (
  id                     BIGSERIAL PRIMARY KEY,
  match_id               TEXT NOT NULL REFERENCES matches_v2(match_id),
  puuid                  TEXT NOT NULL,
  champion_id            INT NOT NULL,
  role                   TEXT,
  rank_tier              TEXT,
  win                    BOOLEAN,
  kills                  INT,
  deaths                 INT,
  assists                INT,
  cs_total               INT,
  game_duration_seconds  INT,
  vision_score           INT,
  items                  JSONB,
  runes                  JSONB,
  summoner_spells        JSONB,
  deaths_before_15       INT,
  game_timestamp         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mp_champ
  ON match_participants (champion_id, role, rank_tier);

CREATE INDEX IF NOT EXISTS idx_mp_puuid
  ON match_participants (puuid);

-- ============================================================
-- champion_stats — global aggregates rebuilt by cron
-- ============================================================
CREATE TABLE IF NOT EXISTS champion_stats (
  id                  BIGSERIAL PRIMARY KEY,
  champion_id         INT NOT NULL,
  patch               TEXT NOT NULL,
  rank_tier           TEXT NOT NULL,
  role                TEXT NOT NULL,
  games               INT,
  wins                INT,
  avg_kills           NUMERIC(5,2),
  avg_deaths          NUMERIC(5,2),
  avg_assists         NUMERIC(5,2),
  avg_cs_per_min      NUMERIC(5,2),
  avg_vision_per_min  NUMERIC(5,2),
  pick_rate           NUMERIC(6,4),
  ban_rate            NUMERIC(6,4),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (champion_id, patch, rank_tier, role)
);

-- ============================================================
-- item_slot_stats — item win rates by build-order position
-- ============================================================
CREATE TABLE IF NOT EXISTS item_slot_stats (
  id             BIGSERIAL PRIMARY KEY,
  champion_id    INT NOT NULL,
  item_id        INT NOT NULL,
  slot_position  INT NOT NULL,
  patch          TEXT NOT NULL,
  rank_tier      TEXT NOT NULL,
  role           TEXT NOT NULL,
  games          INT,
  wins           INT,
  UNIQUE (champion_id, item_id, slot_position, patch, rank_tier, role)
);

-- ============================================================
-- item_path_stats — first item → second item win rates
-- ============================================================
CREATE TABLE IF NOT EXISTS item_path_stats (
  champion_id     INT,
  role            TEXT,
  patch           TEXT,
  rank_tier       TEXT,
  first_item_id   INT,
  second_item_id  INT,
  games           INT,
  wins            INT,
  PRIMARY KEY (champion_id, role, patch, rank_tier, first_item_id, second_item_id)
);

CREATE INDEX IF NOT EXISTS idx_ips_champ
  ON item_path_stats (champion_id, role, patch, rank_tier, first_item_id);

-- ============================================================
-- rune_stats — per-slot pick rates and win rates
-- ============================================================
CREATE TABLE IF NOT EXISTS rune_stats (
  id           BIGSERIAL PRIMARY KEY,
  champion_id  INT NOT NULL,
  rune_id      INT NOT NULL,
  rune_type    TEXT NOT NULL,
  path_id      INT,
  is_primary   BOOLEAN,
  slot_index   INT,
  patch        TEXT NOT NULL,
  rank_tier    TEXT NOT NULL,
  role         TEXT NOT NULL,
  games        INT,
  wins         INT,
  pick_rate    NUMERIC(6,4),
  win_rate     NUMERIC(6,4),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (champion_id, rune_id, rune_type, patch, rank_tier, role)
);

-- ============================================================
-- summoner_sessions — session grouping for Session Health card
-- ============================================================
CREATE TABLE IF NOT EXISTS summoner_sessions (
  id                BIGSERIAL PRIMARY KEY,
  puuid             TEXT NOT NULL,
  session_date      DATE NOT NULL,
  session_index     INT NOT NULL,
  games             JSONB,
  wins              INT,
  losses            INT,
  max_loss_streak   INT,
  champion_switches INT,
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_puuid_date
  ON summoner_sessions (puuid, session_date);

-- ============================================================
-- champion_leaderboard — per-champion rankings rebuilt by cron
-- ============================================================
CREATE TABLE IF NOT EXISTS champion_leaderboard (
  champion_id    INT,
  region         TEXT,
  puuid          TEXT,
  score          FLOAT,
  rank_position  INT,
  total_players  INT,
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (champion_id, region, puuid)
);

CREATE INDEX IF NOT EXISTS idx_champ_lb
  ON champion_leaderboard (champion_id, region, rank_position);
