import { buttonVariants } from "./Button.tsx";

export const calendarStyles = {
  root: "relative",
  months: "relative",
  month_caption: "flex h-control-md items-center justify-center px-12",
  caption_label: "text-sm font-semibold",
  nav: "absolute inset-x-0 top-0 flex justify-between",
  button_previous: buttonVariants({ variant: "ghost", size: "icon" }),
  button_next: buttonVariants({ variant: "ghost", size: "icon" }),
  chevron: "size-4 fill-current",
  month_grid: "border-collapse",
  weekday: "h-control-sm text-xs font-medium text-muted-foreground",
  day: "p-0 text-center text-sm tabular-nums",
  day_button:
    "size-control-md rounded-sm outline-none transition-colors duration-fast hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
  selected: "rounded-sm bg-primary text-primary-foreground [&_button]:hover:bg-primary-hover",
  today: "font-semibold underline underline-offset-4",
  disabled: "text-muted-foreground opacity-50",
  hidden: "invisible",
} as const;
