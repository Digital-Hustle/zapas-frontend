import { motion } from "motion/react";
import { Link } from "react-router";
import { buttonVariants } from "@zapas/ui";
import { ForecastChart } from "@zapas/charts";
import { ArrowRight, Bell, LineChart, ShieldCheck, SlidersHorizontal } from "@zapas/ui/icons";
import { fadeUp, liftArea, liftItem, stagger } from "@zapas/tokens/motion";
import { Logo } from "@/shared/ui";
import { exampleActuals, exampleAsOfDate, examplePoints, exampleThreshold } from "../model/example.ts";

const values = [
  {
    icon: LineChart,
    title: "Прогноз на 30 дней",
    text: "Остаток на каждый день: основной прогноз отдельно от диапазона исторических сценариев.",
  },
  {
    icon: Bell,
    title: "Разрыв — заранее",
    text: "Ожидаемые дата и сумма нехватки денег. Сценарная вероятность доступна при достаточной истории.",
  },
  {
    icon: SlidersHorizontal,
    title: "Планы под контролем",
    text: "Добавляйте известные счета и налоги. Частичные оплаты учитываются без дублирования факта и плана.",
  },
] as const;

const steps = [
  "Загрузите историю операций в CSV",
  "Мы разберём операции и найдём регулярные платежи",
  "Добавьте известные счета и налоги",
  "Покажем прогноз и что сделать при риске",
];

const questions = [
  {
    title: "Какие выписки подходят?",
    text: "В текущей версии — CSV. После загрузки можно проверить число принятых, отклонённых и повторных строк и отчёт о качестве. Полноту периода нужно подтвердить отдельно.",
  },
  {
    title: "На сколько дней рассчитан прогноз?",
    text: "Ровно на 30 дней для выбранного рублёвого счёта. Будущие поступления и платежи могут измениться, поэтому прогноз не гарантирует остаток.",
  },
  {
    title: "Что означает интервал P10–P90?",
    text: "Это диапазон исторических сценариев. P50 — медиана сценариев, основной прогноз показан отдельной линией. Если истории недостаточно, интервал и вероятность недоступны. Это не показатель точности.",
  },
  {
    title: "Что делать, если денег может не хватить?",
    text: "Проверьте поступления, планы и факторы риска. Возможные действия требуют вашего решения: предложение переноса платежа не означает, что перенос согласован или разрешён.",
  },
];

export function LandingPage() {
  return (
    <div className="bg-background">
      <header className="z-nav glass border-border sticky top-0 border-b">
        <div className="h-header max-w-content mx-auto flex items-center justify-between px-6">
          <Logo />
          <nav className="flex items-center gap-2">
            <Link to="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
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
          <div className="bg-hero pointer-events-none absolute inset-0" aria-hidden />
          <motion.div
            className="max-w-content relative mx-auto grid items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24"
            variants={stagger}
            initial="hidden"
            animate="show"
          >
            <div className="flex min-w-0 flex-col items-start gap-6">
              <motion.span
                variants={fadeUp}
                className="bg-primary-soft text-primary-soft-foreground rounded-full px-3 py-1 text-sm font-medium"
              >
                Для ИП и малого бизнеса
              </motion.span>
              <motion.h1 variants={fadeUp} className="max-w-3xl text-4xl font-semibold sm:text-5xl">
                Узнайте о нехватке денег <span className="text-brand-gradient">за месяц</span>, а не за день
              </motion.h1>
              <motion.p variants={fadeUp} className="text-muted-foreground max-w-2xl text-lg">
                Запас прогнозирует остаток на счёте по истории CSV и известным будущим платежам, предупреждает
                о кассовом разрыве и подсказывает, как его избежать.
              </motion.p>
              <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
                <Link to="/login" className={buttonVariants({ size: "lg" })}>
                  Попробовать бесплатно <ArrowRight />
                </Link>
                <a href="#forecast-example" className={buttonVariants({ size: "lg", variant: "secondary" })}>
                  Посмотреть на примере
                </a>
              </motion.div>
            </div>
            <section
              id="forecast-example"
              aria-labelledby="forecast-example-title"
              className="scroll-mt-header border-border bg-card shadow-card min-w-0 rounded-xl border p-4 sm:p-6"
            >
              <h2 id="forecast-example-title" className="sr-only">
                Пример прогноза остатка
              </h2>
              <p className="bg-primary-soft text-primary-soft-foreground mb-4 w-fit rounded-full px-3 py-1 text-sm font-medium">
                Смоделированный пример
              </p>
              <ForecastChart
                points={examplePoints}
                actuals={exampleActuals}
                asOfDate={exampleAsOfDate}
                threshold={exampleThreshold}
                label="Как может измениться остаток"
              />
              <p className="text-muted-foreground mt-4 text-sm">
                Иллюстрация на 30 дней. Это не расчёт по данным вашей компании. Вероятность — сценарная оценка
                по истории.
              </p>
            </section>
          </motion.div>
        </section>

        <section className="max-w-content mx-auto px-6 py-16" aria-labelledby="values">
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
                    className="border-border bg-card shadow-card h-full rounded-xl border p-6"
                  >
                    <span className="bg-primary-soft text-primary-soft-foreground flex size-10 items-center justify-center rounded-md">
                      <Icon className="size-5" strokeWidth={1.75} />
                    </span>
                    <h3 className="mt-4 text-xl font-semibold">{title}</h3>
                    <p className="text-muted-foreground mt-2 text-base">{text}</p>
                  </motion.article>
                </motion.div>
              </motion.li>
            ))}
          </motion.ul>
        </section>

        <section className="max-w-content mx-auto px-6 py-16" aria-labelledby="how">
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
              <motion.li key={s} variants={fadeUp} className="border-border bg-card rounded-lg border p-5">
                <span className="text-primary tabular text-sm font-semibold">0{i + 1}</span>
                <p className="text-md mt-2">{s}</p>
              </motion.li>
            ))}
          </motion.ol>
        </section>

        <section className="max-w-content mx-auto px-6 py-16">
          <div className="bg-inverse text-inverse-foreground flex flex-col items-start gap-4 rounded-2xl p-10 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <ShieldCheck className="mt-1 size-6 shrink-0" strokeWidth={1.75} />
              <div>
                <h2 className="text-xl font-semibold">Без доступа к вашему банку</h2>
                <p className="mt-1 max-w-xl text-base opacity-80">
                  Для работы нужна выписка, а не пароль от банковского аккаунта. В примере используются только
                  смоделированные данные.
                </p>
              </div>
            </div>
            <Link to="/login" className={buttonVariants({ size: "lg" })}>
              Начать
            </Link>
          </div>
        </section>
        <section className="max-w-content mx-auto px-6 py-16" aria-labelledby="accuracy">
          <h2 id="accuracy" className="text-3xl font-semibold">
            Точность проверяем на истории
          </h2>
          <p className="text-muted-foreground mt-4 max-w-3xl text-lg">
            Качество прогноза оценивают, сравнивая его с фактическим остатком за прошедшие периоды. Оно
            зависит от полноты выписки и известных будущих платежей. Для этого примера метрики не рассчитаны —
            обещать конкретный процент точности было бы неверно.
          </p>
        </section>
        <section className="max-w-content mx-auto px-6 py-16" aria-labelledby="faq">
          <h2 id="faq" className="text-3xl font-semibold">
            Частые вопросы
          </h2>
          <dl className="mt-8 grid gap-6 md:grid-cols-2">
            {questions.map(({ title, text }) => (
              <div key={title} className="border-border bg-card rounded-lg border p-6">
                <dt className="text-xl font-semibold">{title}</dt>
                <dd className="text-muted-foreground mt-3 text-base">{text}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <footer className="border-border border-t">
        <div className="max-w-content text-muted-foreground mx-auto flex flex-col items-start justify-between gap-4 px-6 py-8 text-sm sm:flex-row sm:items-center">
          <Logo />
          <span>Хакатон «Центр-инвест», 2026</span>
        </div>
      </footer>
    </div>
  );
}
