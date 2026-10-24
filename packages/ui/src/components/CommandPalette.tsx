import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { Dialog } from "./Dialog.tsx";

export interface CommandAction {
  id: string;
  label: string;
  keywords?: string[];
  disabled?: boolean;
  onSelect: () => void;
}
export function CommandPalette({
  actions,
  label = "Быстрые действия",
}: {
  actions: readonly CommandAction[];
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        !open &&
        target instanceof HTMLElement &&
        (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
      )
        return;
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey) && !event.altKey) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={setOpen} title={label}>
      <Command label={label} className="flex flex-col gap-3">
        <Command.Input
          aria-label="Найти действие"
          placeholder="Найти действие…"
          className="border-input bg-card h-control-md focus-visible:border-ring rounded-md border px-3 text-base outline-none"
        />
        <Command.List className="max-h-64 overflow-auto">
          <Command.Empty className="text-muted-foreground p-3 text-sm">Действия не найдены</Command.Empty>
          {actions.map((action) => (
            <Command.Item
              key={action.id}
              value={action.label}
              keywords={action.keywords}
              disabled={action.disabled}
              className="zapas-command-item h-control-md cursor-default rounded-sm px-3 py-2 text-sm"
              onSelect={() => {
                setOpen(false);
                action.onSelect();
              }}
            >
              {action.label}
            </Command.Item>
          ))}
        </Command.List>
      </Command>
    </Dialog>
  );
}
