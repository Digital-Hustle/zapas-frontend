// Единая система уведомлений (DESIGN.md §6). Вид и поведение меняются только здесь.
import { useEffect, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Toaster as Sonner, toast } from "sonner";
import { spring, toastDurations, tween } from "@zapas/tokens/motion";
import {
  CircleAlert,
  CircleCheck,
  Info,
  AlertTriangle,
  X,
  type LucideIcon,
} from "../icons.ts";
import { cn } from "../lib/cn.ts";

type Tone = "success" | "error" | "warning" | "info";

interface Options {
  id?: string | number;
  description?: ReactNode;
  /** мс; 0 — пока пользователь не закроет */
  duration?: number;
  action?: { label: string; onClick: () => void };
  /** Обратный отсчёт в описании, например для 429: «Повторите через {s} с» */
  countdownSec?: number;
}

const TONES: Record<
  Tone,
  {
    icon: LucideIcon;
    bar: string;
    iconBox: string;
    role: "status" | "alert";
    duration: number;
  }
> = {
  success: {
    icon: CircleCheck,
    bar: "bg-success",
    iconBox: "bg-success-soft text-success-soft-foreground",
    role: "status",
    duration: toastDurations.success,
  },
  info: {
    icon: Info,
    bar: "bg-info",
    iconBox: "bg-info-soft text-info-soft-foreground",
    role: "status",
    duration: toastDurations.info,
  },
  warning: {
    icon: AlertTriangle,
    bar: "bg-warning",
    iconBox: "bg-warning-soft text-warning-soft-foreground",
    role: "alert",
    duration: toastDurations.warning,
  },
  error: {
    icon: CircleAlert,
    bar: "bg-danger",
    iconBox: "bg-danger-soft text-danger-soft-foreground",
    role: "alert",
    duration: toastDurations.error,
  },
};

function Countdown({ seconds }: { seconds: number }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return <span className="tabular">{left}</span>;
}

function ToastView({
  id,
  tone,
  title,
  o,
}: {
  id: string | number;
  tone: Tone;
  title: string;
  o: Options;
}) {
  const cfg = TONES[tone];
  const Icon = cfg.icon;
  const reduce = useReducedMotion();
  const duration = o.duration ?? cfg.duration;
  return (
    <motion.div
      role={cfg.role}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...spring.pop, opacity: tween.fast }}
      className="group relative flex w-full gap-3 overflow-hidden rounded-lg border border-border bg-card py-3 pr-10 pl-4 text-card-foreground shadow-pop"
    >
      <span
        className={cn("absolute inset-y-0 left-0 w-1", cfg.bar)}
        aria-hidden
      />
      <span
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
          cfg.iconBox,
        )}
        aria-hidden
      >
        <Icon className="size-4" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold">{title}</p>
        {(o.description ?? o.countdownSec) !== undefined && (
          <p className="mt-0.5 text-sm text-muted-foreground">
            {o.description}
            {o.countdownSec !== undefined && (
              <>
                {" "}
                Повторите через <Countdown seconds={o.countdownSec} /> с.
              </>
            )}
          </p>
        )}
        {o.action && (
          <button
            type="button"
            onClick={() => {
              o.action?.onClick();
              toast.dismiss(id);
            }}
            className="mt-2 text-sm font-semibold text-primary hover:underline"
          >
            {o.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => toast.dismiss(id)}
        className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-sm text-muted-foreground transition-colors duration-fast hover:bg-muted hover:text-foreground"
        aria-label="Закрыть уведомление"
      >
        <X className="size-4" />
      </button>
      {duration > 0 && (
        <span
          className="absolute bottom-0 left-0 h-0.5 w-full origin-left bg-border-strong group-hover:[animation-play-state:paused]"
          style={{
            animation: `zapas-toast-progress ${duration}ms linear forwards`,
          }}
          aria-hidden
        />
      )}
    </motion.div>
  );
}

function show(tone: Tone) {
  return (title: string, o: Options = {}) =>
    toast.custom(
      (id) => <ToastView id={id} tone={tone} title={title} o={o} />,
      {
        id: o.id,
        duration:
          o.duration === 0 ? Infinity : (o.duration ?? TONES[tone].duration),
      },
    );
}

/** Вызывается из любого места, в том числе вне React (http-клиент). */
export const notify = {
  success: show("success"),
  info: show("info"),
  warning: show("warning"),
  error: show("error"),
  dismiss: (id?: string | number) => toast.dismiss(id),
};

export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      mobileOffset={12}
      offset={20}
      gap={10}
      visibleToasts={toastDurations.maxVisible}
      toastOptions={{ unstyled: true, className: "w-full" }}
      containerAriaLabel="Уведомления"
    />
  );
}
