CREATE TABLE "task_list_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"url" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_list_items_title_not_blank" CHECK (length(trim("task_list_items"."title")) > 0),
	CONSTRAINT "task_list_items_sort_order_nonnegative" CHECK ("task_list_items"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "task_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"todo_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_lists_title_not_blank" CHECK (length(trim("task_lists"."title")) > 0),
	CONSTRAINT "task_lists_sort_order_nonnegative" CHECK ("task_lists"."sort_order" >= 0)
);
--> statement-breakpoint
ALTER TABLE "task_list_items" ADD CONSTRAINT "task_list_items_list_id_task_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."task_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_lists" ADD CONSTRAINT "task_lists_todo_id_todos_id_fk" FOREIGN KEY ("todo_id") REFERENCES "public"."todos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_list_items_list_id_idx" ON "task_list_items" USING btree ("list_id");--> statement-breakpoint
CREATE INDEX "task_lists_todo_id_idx" ON "task_lists" USING btree ("todo_id");