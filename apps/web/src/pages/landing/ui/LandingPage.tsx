import { motion } from "motion/react";
import { Link } from "react-router";
import { buttonVariants } from "@zapas/ui";
import {
  ArrowRight,
  Bell,
  LineChart,
  ShieldCheck,
  SlidersHorizontal,
} from "@zapas/ui/icons";
import { fadeUp, liftArea, liftItem, stagger } from "@zapas/tokens/motion";
import { Logo } from "@/shared/ui";

const values = [
  {
    icon: LineChart,
    title: "Прогноз на 90 дней",
    text: "Остаток на каждый день с честным интервалом: от плохого до хорошего сценария.",
  },
  {
    icon: Bell,
    title: "Разрыв — заранее",
    text: "Дата, сумма и вероятность нехватки денег за недели, а не накануне зарплаты.",
  },
  {
    icon: SlidersHorizontal,
    title: "Что если",
    text: "Клиент задержит оплату, выручка упадёт — сразу видно, хватит ли денег.",
  },
] as const;

const steps = [
  "Загрузите выписку из банка или 1С",
  "Мы разберём операции и найдём регулярные платежи",
  "Добавим налоги, счета и договоры",
  "Покажем прогноз и что сделать при риске",
];

// F1: hero-график (FR-WEB-01) — анимированный ForecastChart из @zapas/charts на демо-данных.
export function LandingPage() {
  return (
    <div className="bg-background">
      <header className="sticky top-0 z-nav glass border-b border-border">
        <div className="mx-auto flex h-header max-w-content items-center justify-between px-6">
          <Logo />
          <nav className="flex items-center gap-2">
            <Link
              to="/login"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Войти
            </Link>
            <Link to="/login" className={buttonVariants({ size: "sm" })}>
              Попробовать
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 bg-hero"
            aria-hidden
          />
          <motion.div
            className="relative mx-auto flex max-w-content flex-col items-start gap-6 px-6 py-24 lg:py-32"
            variants={stagger}
            initial="hidden"
            animate="show"
          >
            <motion.span
              variants={fadeUp}
              className="rounded-full bg-primary-soft px-3 py-1 text-sm font-medium text-primary-soft-foreground"
            >
              Для ИП и малого бизнеса
            </motion.span>
            <motion.h1
              variants={fadeUp}
              className="max-w-3xl text-4xl font-semibold sm:text-5xl"
            >
              Узнайте о нехватке денег{" "}
              <span className="text-brand-gradient">за месяц</span>, а не за
              день
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="max-w-2xl text-lg text-muted-foreground"
            >
              Запас прогнозирует остаток на счёте по вашей выписке, налоговому
              календарю и счетам, предупреждает о кассовом разрыве и
              подсказывает, как его избежать.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
              <Link to="/login" className={buttonVariants({ size: "lg" })}>
                Попробовать бесплатно <ArrowRight />
              </Link>
              <Link
                to="/login?demo=1"
                className={buttonVariants({ size: "lg", variant: "secondary" })}
              >
                Посмотреть на примере
              </Link>
            </motion.div>
          </motion.div>
        </section>

        <section
          className="mx-auto max-w-content px-6 py-16"
          aria-labelledby="values"
        >
          <h2 id="values" className="sr-only">
            Возможности
          </h2>
          <motion.ul
            className="grid gap-4 md:grid-cols-3"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
          >
            {values.map(({ icon: Icon, title, text }) => (
              <motion.li key={title} variants={fadeUp}>
                <motion.div {...liftArea} className="h-full">
                  <motion.article
                    variants={liftItem}
                    className="h-full rounded-xl border border-border bg-card p-6 shadow-card"
                  >
                    <span className="flex size-10 items-center justify-center rounded-md bg-primary-soft text-primary-soft-foreground">
                      <Icon className="size-5" strokeWidth={1.75} />
                    </span>
                    <h3 className="mt-4 text-xl font-semibold">{title}</h3>
                    <p className="mt-2 text-base text-muted-foreground">
                      {text}
                    </p>
                  </motion.article>
                </motion.div>
              </motion.li>
            ))}
          </motion.ul>
        </section>

        <section
          className="mx-auto max-w-content px-6 py-16"
          aria-labelledby="how"
        >
          <h2 id="how" className="text-3xl font-semibold">
            Как это работает
          </h2>
          <motion.ol
            className="mt-8 grid gap-4 md:grid-cols-4"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
          >
            {steps.map((s, i) => (
              <motion.li
                key={s}
                variants={fadeUp}
                className="rounded-lg border border-border bg-card p-5"
              >
                <span className="text-sm font-semibold text-primary tabular">
                  0{i + 1}
                </span>
                <p className="mt-2 text-md">{s}</p>
              </motion.li>
            ))}
          </motion.ol>
        </section>

        <section className="mx-auto max-w-content px-6 py-16">
          <div className="flex flex-col items-start gap-4 rounded-2xl bg-inverse p-10 text-inverse-foreground md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <ShieldCheck
                className="mt-1 size-6 shrink-0"
                strokeWidth={1.75}
              />
              <div>
                <p className="text-xl font-semibold">Данные под защитой</p>
                <p className="mt-1 max-w-xl text-base opacity-80">
                  Вход по коду без паролей, шифрование, изоляция компаний.
                  Выписка не хранится после разбора.
                </p>
              </div>
            </div>
            <Link to="/login" className={buttonVariants({ size: "lg" })}>
              Начать
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-content items-center justify-between px-6 py-8 text-sm text-muted-foreground">
          <Logo />
          <span>Хакатон «Центр-инвест», 2026</span>
        </div>
      </footer>
    </div>
  );
}
