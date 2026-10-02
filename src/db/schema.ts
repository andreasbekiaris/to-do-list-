import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const todos = pgTable(
  "todos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    parentId: uuid("parent_id").references((): AnyPgColumn => todos.id, {
      onDelete: "cascade",
    }),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description").notNull().default(""),
    isDone: boolean("is_done").notNull().default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    dueAt: timestamp("due_at", { withTimezone: true }),
    allDay: boolean("all_day").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("todos_parent_id_idx").on(table.parentId),
    check("todos_title_not_blank", sql`length(trim(${table.title})) > 0`),
    check("todos_not_own_parent", sql`${table.parentId} IS DISTINCT FROM ${table.id}`),
    check(
      "todos_completion_consistent",
      sql`${table.isDone} = (${table.completedAt} IS NOT NULL)`,
    ),
    check("todos_all_day_has_date", sql`NOT ${table.allDay} OR ${table.dueAt} IS NOT NULL`),
  ],
);

export type Todo = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;
