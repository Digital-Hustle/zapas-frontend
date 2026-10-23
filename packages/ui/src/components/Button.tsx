import { forwardRef, type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { press, spin, tween } from "@zapas/tokens/motion";
import { cn } from "../lib/cn.ts";

export const buttonVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-medium select-none transition-colors duration-fast disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary-hover",
        secondary:
          "bg-card text-foreground border border-border-strong shadow-xs hover:bg-muted",
        soft: "bg-primary-soft text-primary-soft-foreground hover:bg-primary-soft/80",
        ghost: "text-foreground hover:bg-muted",
        danger: "bg-danger text-danger-foreground shadow-xs hover:bg-danger/90",
        "danger-soft":
          "bg-danger-soft text-danger-soft-foreground hover:bg-danger-soft/80",
        link: "h-auto px-0 text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-control-sm rounded-sm px-3 text-sm",
        md: "h-control-md rounded-md px-4 text-base",
        lg: "h-control-lg rounded-lg px-6 text-md",
        icon: "size-control-md rounded-md",
        "icon-sm": "size-control-sm rounded-sm",
      },
      block: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type MotionButtonProps = Omit<HTMLMotionProps<"button">, "children">;

export interface ButtonProps
  extends MotionButtonProps, VariantProps<typeof buttonVariants> {
  children?: ReactNode;
  /** Показать индикатор; ширина кнопки не меняется, клики блокируются. */
  loading?: boolean;
  /** Отдать стили дочернему элементу (например, ссылке роутера). Анимация нажатия не применяется. */
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
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
        <Slot.Root ref={ref} className={classes}>
          {children}
        </Slot.Root>
      );
    }
    return (
      <motion.button
        ref={ref}
        type={type}
        className={classes}
        disabled={disabled ?? loading}
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
  },
);
