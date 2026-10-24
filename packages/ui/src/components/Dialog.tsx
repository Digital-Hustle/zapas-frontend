// Модалка на десктопе, шторка снизу на мобильных (drag-to-close). Поведение и фокус — Radix Dialog.
import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { AnimatePresence, motion, useDragControls, type PanInfo } from "motion/react";
import { Dialog as D } from "radix-ui";
import { dialog, overlay, sheet, swipe } from "@zapas/tokens/motion";
import { X } from "../icons.ts";
import { cn } from "../lib/cn.ts";
import { useMediaQuery } from "../lib/useMediaQuery.ts";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** Пока true — закрыть нельзя (идёт сохранение). */
  busy?: boolean;
  size?: "sm" | "md" | "lg";
  /** Вызывается после завершения анимации закрытия. */
  onClosed?: () => void;
  layer?: "modal" | "popover";
  placement?: "auto" | "bottom";
  role?: "dialog" | "alertdialog";
  dismissOnOutside?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
}

const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" } as const;

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  busy = false,
  size = "md",
  onClosed,
  layer = "modal",
  placement = "auto",
  role = "dialog",
  dismissOnOutside = true,
  initialFocusRef,
}: DialogProps) {
  const desktop = useMediaQuery("(min-width: 768px)");
  const drag = useDragControls();
  const returnFocus = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (open && document.activeElement instanceof HTMLElement) returnFocus.current = document.activeElement;
  }, [open]);
  const change = (next: boolean) => {
    if (!next && busy) return;
    onOpenChange(next);
  };
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > swipe.offset || info.velocity.y > swipe.velocity) change(false);
  };
  const z = layer === "modal" ? "z-modal" : "z-popover";

  return (
    <D.Root open={open} onOpenChange={change}>
      <AnimatePresence onExitComplete={onClosed}>
        {open && (
          <D.Portal forceMount>
            <D.Overlay asChild forceMount>
              <motion.div
                className={cn("bg-overlay fixed inset-0", z)}
                variants={overlay}
                initial="hidden"
                animate="show"
                exit="exit"
              />
            </D.Overlay>
            <D.Content
              role={role}
              asChild
              forceMount
              onOpenAutoFocus={(e) => {
                if (initialFocusRef?.current) {
                  e.preventDefault();
                  initialFocusRef.current.focus();
                }
              }}
              onEscapeKeyDown={(e) => {
                if (busy) e.preventDefault();
              }}
              onPointerDownOutside={(e) => {
                if (busy || !dismissOnOutside) e.preventDefault();
              }}
              onCloseAutoFocus={(e) => {
                e.preventDefault();
                if (returnFocus.current?.isConnected) returnFocus.current.focus();
              }}
            >
              {desktop && placement === "auto" ? (
                <motion.div
                  className={cn(
                    "max-h-dialog border-border bg-popover text-popover-foreground shadow-pop fixed inset-x-4 top-1/2 mx-auto flex -translate-y-1/2 flex-col overflow-hidden rounded-xl border",
                    widths[size],
                    z,
                  )}
                  variants={dialog}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                >
                  <Header title={title} description={description} busy={busy} />
                  <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">{children}</div>
                  {footer && (
                    <div className="border-border flex justify-end gap-2 border-t px-6 py-4">{footer}</div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  className={cn(
                    "max-h-sheet border-border bg-popover text-popover-foreground shadow-pop pb-safe fixed inset-x-0 bottom-0 flex flex-col rounded-t-2xl border-t",
                    z,
                  )}
                  variants={sheet}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  drag={busy ? false : "y"}
                  dragListener={false}
                  dragControls={drag}
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={{ top: 0, bottom: 0.6 }}
                  onDragEnd={onDragEnd}
                >
                  <div
                    className="flex touch-none justify-center pt-2 pb-1"
                    onPointerDown={(e) => drag.start(e)}
                    aria-hidden
                  >
                    <span className="bg-border-strong h-1 w-10 rounded-full" />
                  </div>
                  <Header title={title} description={description} busy={busy} />
                  <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
                  {footer && (
                    <div className="border-border flex flex-col-reverse gap-2 border-t px-4 py-3">
                      {footer}
                    </div>
                  )}
                </motion.div>
              )}
            </D.Content>
          </D.Portal>
        )}
      </AnimatePresence>
    </D.Root>
  );
}

function Header({ title, description, busy }: { title: ReactNode; description?: ReactNode; busy: boolean }) {
  return (
    <div className="flex items-start gap-4 px-6 pt-5 pb-4 max-md:px-4 max-md:pt-2">
      <div className="min-w-0 flex-1">
        <D.Title className="text-xl font-semibold">{title}</D.Title>
        {description ? (
          <D.Description className="text-muted-foreground mt-1 text-base">{description}</D.Description>
        ) : (
          <D.Description className="sr-only">{title}</D.Description>
        )}
      </div>
      <D.Close
        disabled={busy}
        className="size-control-sm text-muted-foreground duration-fast hover:bg-muted hover:text-foreground -mr-2 flex items-center justify-center rounded-sm transition-colors disabled:opacity-40"
        aria-label="Закрыть"
      >
        <X className="size-5" />
      </D.Close>
    </div>
  );
}

/** Управление состоянием с корректным размонтированием содержимого после анимации выхода. */
export function useDialogState<T = true>() {
  const [payload, setPayload] = useState<T | null>(null);
  const [open, setOpen] = useState(false);
  return {
    open,
    payload,
    show: (p: T) => {
      setPayload(p);
      setOpen(true);
    },
    onOpenChange: setOpen,
    onClosed: () => setPayload(null),
  };
}
