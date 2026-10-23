import { motion, useReducedMotion } from "motion/react";
import { shimmer } from "@zapas/tokens/motion";
import { cn } from "../lib/cn.ts";

/** Единственный индикатор загрузки. Повторяет форму будущего контента. */
export function Skeleton({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <div
      className={cn("relative overflow-hidden rounded-sm bg-muted", className)}
      aria-hidden
    >
      {!reduce && (
        <motion.div
          className="absolute inset-0 -translate-x-full"
          style={{ backgroundImage: "var(--gradient-sheen)", opacity: 0.5 }}
          animate={{ x: ["-100%", "100%"] }}
          transition={shimmer}
        />
      )}
    </div>
  );
}

/** Обёртка для загружаемой области: скринридер слышит «Загрузка», визуально — скелетоны. */
export function LoadingRegion({
  loading,
  label = "Загрузка",
  children,
}: {
  loading: boolean;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div aria-busy={loading} aria-live="polite">
      {loading && <span className="sr-only">{label}</span>}
      {children}
    </div>
  );
}
