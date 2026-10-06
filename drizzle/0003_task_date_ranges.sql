ALTER TABLE "todos" ADD COLUMN IF NOT EXISTS "start_at" timestamp with time zone;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'todos_start_before_due') THEN
    ALTER TABLE "todos" ADD CONSTRAINT "todos_start_before_due" CHECK ("todos"."start_at" IS NULL OR ("todos"."due_at" IS NOT NULL AND "todos"."start_at" <= "todos"."due_at"));
  END IF;
END $$;
