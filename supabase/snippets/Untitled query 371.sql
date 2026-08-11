CREATE UNIQUE INDEX IF NOT EXISTS "HabitLog_habitId_date_key"
ON "HabitLog" ("habitId", "date");
