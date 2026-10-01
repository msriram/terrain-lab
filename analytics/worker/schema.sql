CREATE TABLE IF NOT EXISTS daily_counts (
  day TEXT NOT NULL,
  mode TEXT NOT NULL,
  event TEXT NOT NULL,
  theme TEXT NOT NULL,
  detail TEXT NOT NULL,
  total INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, mode, event, theme, detail)
);
CREATE INDEX IF NOT EXISTS daily_counts_day ON daily_counts(day);
