CREATE TABLE "todos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"title" varchar(500) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"is_done" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone,
	"due_at" timestamp with time zone,
	"all_day" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "todos_title_not_blank" CHECK (length(trim("todos"."title")) > 0),
	CONSTRAINT "todos_not_own_parent" CHECK ("todos"."parent_id" IS DISTINCT FROM "todos"."id"),
	CONSTRAINT "todos_completion_consistent" CHECK ("todos"."is_done" = ("todos"."completed_at" IS NOT NULL)),
	CONSTRAINT "todos_all_day_has_date" CHECK (NOT "todos"."all_day" OR "todos"."due_at" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_parent_id_todos_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."todos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "todos_parent_id_idx" ON "todos" USING btree ("parent_id");