import { Link } from "react-router";

export function Logo({ to = "/" }: { to?: string }) {
  return (
    <Link
      to={to}
      className="inline-flex w-fit items-center gap-2 rounded-sm text-lg font-semibold"
      aria-label="Запас — на главную"
    >
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <rect width="32" height="32" rx="9" className="fill-primary" />
        <rect
          x="8"
          y="17"
          width="4"
          height="7"
          rx="2"
          className="fill-primary-foreground opacity-60"
        />
        <rect
          x="14"
          y="12"
          width="4"
          height="12"
          rx="2"
          className="fill-primary-foreground opacity-80"
        />
        <rect
          x="20"
          y="8"
          width="4"
          height="16"
          rx="2"
          className="fill-accent"
        />
      </svg>
      Запас
    </Link>
  );
}
