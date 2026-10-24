import { useId, useState } from "react";
import { Button, Popover, RadioGroup } from "@zapas/ui";
import { Moon, Sun } from "@zapas/ui/icons";
import { useTheme } from "../providers/ThemeProvider.tsx";

const choices = [
  { value: "light", label: "Светлая" },
  { value: "dark", label: "Тёмная" },
  { value: "system", label: "Как в системе" },
] as const;

export function ThemeControl() {
  const { theme, setTheme } = useTheme();
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Popover
        label="Цветовая тема"
        open={open}
        onOpenChange={setOpen}
        className="min-w-48"
        trigger={
          <Button variant="ghost" size="sm" aria-describedby={id}>
            {theme === "dark" ? (
              <Moon aria-hidden className="size-4" />
            ) : (
              <Sun aria-hidden className="size-4" />
            )}
            Тема
          </Button>
        }
      >
        <RadioGroup
          label="Цветовая тема"
          value={theme}
          options={choices}
          onValueChange={(value) => {
            const choice = choices.find((option) => option.value === value);
            if (choice) {
              setTheme(choice.value);
              setOpen(false);
            }
          }}
        />
      </Popover>
      <span id={id} className="sr-only">
        Текущая тема: {choices.find((choice) => choice.value === theme)?.label}
      </span>
    </>
  );
}
