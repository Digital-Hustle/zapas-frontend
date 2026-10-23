import { Link } from "react-router";
import { buttonVariants } from "@zapas/ui";

export function NotFoundPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-semibold text-primary">404</p>
      <h1 className="text-2xl font-semibold">Такой страницы нет</h1>
      <p className="max-w-sm text-base text-muted-foreground">
        Возможно, ссылка устарела. Вернитесь на главную — там всё на месте.
      </p>
      <Link to="/" className={buttonVariants({})}>
        На главную
      </Link>
    </main>
  );
}
