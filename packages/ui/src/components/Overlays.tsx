import { forwardRef, type ComponentPropsWithoutRef, type ReactElement, type ReactNode } from "react";
import { ContextMenu as C, DropdownMenu as D, Popover as P, ScrollArea as S, Tooltip as T } from "radix-ui";
import { cn } from "../lib/cn.ts";
import { motion } from "@zapas/tokens";

const popup =
  "zapas-popup z-popover border-border bg-popover text-popover-foreground shadow-pop rounded-md border p-2";
const item =
  "duration-fast flex cursor-default items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none transition-colors data-highlighted:bg-muted data-disabled:pointer-events-none data-disabled:opacity-50";

/** Mount one provider near the app root to share the skip-delay across tooltips. */
export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <T.Provider
      delayDuration={motion.duration.tooltip * 1000}
      skipDelayDuration={motion.duration.tooltip * 1000}
    >
      {children}
    </T.Provider>
  );
}
export function Tooltip({ children, content }: { children: ReactElement; content: ReactNode }) {
  return (
    <T.Root>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content sideOffset={6} className={cn(popup, "max-w-xs text-sm")}>
          {content}
          <T.Arrow className="fill-popover" />
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}

export interface PopoverProps {
  trigger: ReactElement;
  label: string;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}
export function Popover({ trigger, label, children, open, onOpenChange, className }: PopoverProps) {
  return (
    <P.Root open={open} onOpenChange={onOpenChange}>
      <P.Trigger asChild>{trigger}</P.Trigger>
      <P.Portal>
        <P.Content
          align="start"
          aria-label={label}
          sideOffset={6}
          className={cn(popup, "max-w-full overflow-auto", className)}
          style={{
            maxWidth: "var(--radix-popover-content-available-width)",
            maxHeight: "var(--radix-popover-content-available-height)",
          }}
        >
          {children}
        </P.Content>
      </P.Portal>
    </P.Root>
  );
}

export interface MenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  danger?: boolean;
  onSelect: () => void;
  separatorBefore?: boolean;
}
export function DropdownMenu({
  trigger,
  items,
  label,
}: {
  trigger: ReactElement;
  items: readonly MenuItem[];
  label: string;
}) {
  return (
    <D.Root>
      <D.Trigger asChild>{trigger}</D.Trigger>
      <D.Portal>
        <D.Content aria-label={label} sideOffset={6} className={cn(popup, "max-w-full min-w-48")}>
          {items.map((entry) => (
            <div key={entry.id}>
              {entry.separatorBefore && <D.Separator className="bg-border my-1 h-px" />}
              <D.Item
                disabled={entry.disabled}
                onSelect={entry.onSelect}
                className={cn(item, entry.danger && "text-danger")}
              >
                {entry.icon && (
                  <span aria-hidden className="[&_svg]:size-4">
                    {entry.icon}
                  </span>
                )}
                {entry.label}
              </D.Item>
            </div>
          ))}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
export function ContextMenu({
  children,
  items,
  label,
}: {
  children: ReactElement;
  items: readonly MenuItem[];
  label: string;
}) {
  return (
    <C.Root>
      <C.Trigger
        asChild
        onKeyDown={(event) => {
          if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
            event.preventDefault();
            const rect = event.currentTarget.getBoundingClientRect();
            event.currentTarget.dispatchEvent(
              new MouseEvent("contextmenu", {
                bubbles: true,
                cancelable: true,
                clientX: rect.left,
                clientY: rect.bottom,
              }),
            );
          }
        }}
      >
        {children}
      </C.Trigger>
      <C.Portal>
        <C.Content aria-label={label} className={cn(popup, "min-w-48")}>
          {items.map((entry) => (
            <div key={entry.id}>
              {entry.separatorBefore && <C.Separator className="bg-border my-1 h-px" />}
              <C.Item
                disabled={entry.disabled}
                onSelect={entry.onSelect}
                className={cn(item, entry.danger && "text-danger")}
              >
                {entry.icon}
                {entry.label}
              </C.Item>
            </div>
          ))}
        </C.Content>
      </C.Portal>
    </C.Root>
  );
}

export interface ScrollAreaProps extends ComponentPropsWithoutRef<typeof S.Root> {
  viewportClassName?: string;
  label: string;
}
/** ref points to the viewport, including for TanStack Virtual's scroll element. */
export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(function ScrollArea(
  { children, className, viewportClassName, label, ...props },
  ref,
) {
  return (
    <S.Root type="auto" className={cn("relative overflow-hidden", className)} {...props}>
      <S.Viewport
        ref={ref}
        tabIndex={0}
        role="region"
        aria-label={label}
        className={cn(
          "focus-visible:ring-ring size-full rounded-md outline-none focus-visible:ring-2",
          viewportClassName,
        )}
      >
        {children}
      </S.Viewport>
      <S.Scrollbar orientation="vertical" className="bg-muted flex w-2.5 touch-none p-0.5">
        <S.Thumb className="bg-border-strong relative flex-1 rounded-full" />
      </S.Scrollbar>
      <S.Scrollbar orientation="horizontal" className="bg-muted flex h-2.5 touch-none flex-col p-0.5">
        <S.Thumb className="bg-border-strong relative flex-1 rounded-full" />
      </S.Scrollbar>
      <S.Corner className="bg-muted" />
    </S.Root>
  );
});
