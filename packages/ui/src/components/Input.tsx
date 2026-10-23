import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "../lib/cn.ts";

export interface InputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "prefix"
> {
  invalid?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, prefix, suffix, ...props },
  ref,
) {
  return (
    <div
      className={cn(
        "flex h-control-md items-center gap-2 rounded-md border bg-card px-3 transition duration-fast focus-within:border-ring focus-within:shadow-glow",
        invalid ? "border-danger" : "border-input",
        props.disabled && "opacity-50",
        className,
      )}
    >
      {prefix && (
        <span className="text-muted-foreground [&_svg]:size-4">{prefix}</span>
      )}
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
        {...props}
      />
      {suffix && (
        <span className="text-muted-foreground [&_svg]:size-4">{suffix}</span>
      )}
    </div>
  );
});

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : (
        hint && <p className="text-sm text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
