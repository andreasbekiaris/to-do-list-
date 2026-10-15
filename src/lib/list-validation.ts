import { z } from "zod";

export const taskListInputSchema = z.object({
  title: z.string().trim().min(1, "Give your list a name.").max(200, "Keep the list name under 200 characters."),
});

export const taskListItemInputSchema = z.object({
  title: z.string().trim().min(1, "Give this item a name.").max(500, "Keep the item name under 500 characters."),
  url: z.string().trim().max(2048, "Keep the link under 2,048 characters.").refine((value) => {
    if (!value) return true;
    try {
      return ["http:", "https:"].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }, "Enter a full http:// or https:// link."),
  note: z.string().max(5000, "Keep the note under 5,000 characters."),
});

export type TaskListInput = z.infer<typeof taskListInputSchema>;
export type TaskListItemInput = z.infer<typeof taskListItemInputSchema>;
export type ReferenceListItem = TaskListItemInput & {
  id: string;
  listId: string;
  sortOrder: number;
};
export type ReferenceList = {
  id: string;
  taskId: string;
  title: string;
  sortOrder: number;
  items: ReferenceListItem[];
};
export type ListResult = { ok: true; id?: string } | { ok: false; error: string };
