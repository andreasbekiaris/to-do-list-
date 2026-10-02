import { ListTree } from "lucide-react";

export function Brand() {
  return (
    <div className="flex items-center gap-2.5" aria-label="Thread">
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <ListTree className="size-5" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <span className="text-xl font-semibold tracking-tight">thread<span className="text-primary/50">.</span></span>
    </div>
  );
}
