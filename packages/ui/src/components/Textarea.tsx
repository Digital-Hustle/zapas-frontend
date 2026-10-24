import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "../lib/cn.ts";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid, className, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "border-input bg-card duration-fast placeholder:text-muted-foreground focus-visible:border-ring focus-visible:shadow-glow min-h-24 w-full resize-y rounded-md border px-3 py-2 text-base transition-colors outline-none disabled:opacity-50",
        invalid && "border-danger",
        className,
      )}
      {...props}
    />
  );
});
