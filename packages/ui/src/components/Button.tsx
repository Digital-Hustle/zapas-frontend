import { forwardRef, type MouseEventHandler, type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { press, spin, tween } from "@zapas/tokens/motion";
import { cn } from "../lib/cn.ts";
const MotionSlot = motion.create(Slot.Root);

export const buttonVariants = cva(
  "duration-fast relative inline-flex shrink-0 items-center justify-center gap-2 font-medium whitespace-nowrap transition-colors select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover shadow-xs",
        secondary: "bg-card text-foreground border-border-strong hover:bg-muted border shadow-xs",
        soft: "bg-primary-soft text-primary-soft-foreground hover:bg-primary-soft-hover",
        ghost: "text-foreground hover:bg-muted",
        danger: "bg-danger text-danger-foreground hover:bg-danger-hover shadow-xs",
        "danger-soft": "bg-danger-soft text-danger-soft-foreground hover:bg-danger-soft-hover",
        link: "text-primary h-auto px-0 underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-control-sm rounded-sm px-3 text-sm",
        md: "h-control-md rounded-md px-4 text-base",
        lg: "h-control-lg text-md rounded-lg px-6",
        icon: "size-control-md rounded-md",
        "icon-sm": "size-control-sm rounded-sm",
      },
      block: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type MotionButtonProps = Omit<HTMLMotionProps<"button">, "children" | "onClickCapture"> & {
  onClickCapture?: MouseEventHandler<HTMLElement>;
};

export interface ButtonProps extends MotionButtonProps, VariantProps<typeof buttonVariants> {
  children?: ReactNode;
  /** Показать индикатор; ширина кнопки не меняется, клики блокируются. */
  loading?: boolean;
  /** Отдать стили дочернему элементу (например, ссылке роутера). Анимация нажатия не применяется. */
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant,
    size,
    block,
    loading = false,
    disabled,
    asChild = false,
    children,
    type = "button",
    ...props
  },
  ref,
) {
  const classes = cn(buttonVariants({ variant, size, block }), className);
  if (asChild) {
    return (
      <MotionSlot
        ref={ref}
        className={cn(classes, "aria-disabled:opacity-50")}
        {...props}
        aria-disabled={disabled || loading || undefined}
        aria-busy={loading || undefined}
        tabIndex={disabled || loading ? -1 : props.tabIndex}
        onClickCapture={(event) => {
          if (disabled || loading) {
            event.preventDefault();
            event.stopPropagation();
          } else props.onClickCapture?.(event);
        }}
      >
        {children}
      </MotionSlot>
    );
  }
  return (
    <motion.button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...(loading || disabled ? {} : press)}
      {...props}
    >
      <motion.span
        className="inline-flex items-center gap-2"
        animate={{ opacity: loading ? 0 : 1 }}
        transition={tween.fast}
      >
        {children}
      </motion.span>
      {loading && (
        <motion.span
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={tween.fast}
          aria-hidden
        >
          <motion.span
            className="size-4 rounded-full border-2 border-current border-t-transparent"
            animate={{ rotate: 360 }}
            transition={spin}
          />
        </motion.span>
      )}
    </motion.button>
  );
});
