ALTER TABLE "todos" ADD COLUMN IF NOT EXISTS "priority" varchar(16) DEFAULT 'none' NOT NULL;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'todos_priority_valid') THEN
    ALTER TABLE "todos" ADD CONSTRAINT "todos_priority_valid" CHECK ("todos"."priority" IN ('none', 'low', 'medium', 'high', 'urgent'));
  END IF;
END $$;
