import type { Transition, Variants } from "motion/react";
import { motion as m } from "./tokens.ts";

/** Всё, что двигается, — пружиной; цвет и прозрачность — твином; уход быстрее входа. */
export const spring = m.spring as unknown as Record<
  keyof typeof m.spring,
  Transition
>;

const tw = (duration: number, ease: readonly number[]): Transition => ({
  type: "tween",
  duration,
  ease: [...ease] as unknown as Transition["ease"],
});

export const tween = {
  instant: tw(m.duration.instant, m.ease.out),
  fast: tw(m.duration.fast, m.ease.out),
  base: tw(m.duration.base, m.ease.out),
  slow: tw(m.duration.slow, m.ease.out),
  exit: tw(m.duration.fast, m.ease.in),
  emphasized: tw(m.duration.page, m.ease.emphasized),
} satisfies Record<string, Transition>;

export const press = {
  whileTap: { scale: m.scale.tap },
  transition: spring.press,
} as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: m.distance.enter },
  show: {
    opacity: 1,
    y: 0,
    transition: { ...spring.soft, opacity: tween.base },
  },
  exit: { opacity: 0, y: -m.distance.exit, transition: tween.exit },
};

export const popIn: Variants = {
  hidden: { opacity: 0, scale: m.scale.popIn },
  show: {
    opacity: 1,
    scale: 1,
    transition: { ...spring.pop, opacity: tween.fast },
  },
  exit: { opacity: 0, scale: m.scale.popIn, transition: tween.exit },
};

/** Контейнер списка; для длинных списков используйте staggerIndexDelay — задержка не растёт после m.stagger.max. */
export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: m.stagger.step } },
  exit: {
    transition: { staggerChildren: m.stagger.step / 2, staggerDirection: -1 },
  },
};

export const staggerIndexDelay = (i: number) =>
  Math.min(i, m.stagger.max) * m.stagger.step;

/** Hover-подъём: неподвижная обёртка (liftArea) + двигающееся содержимое (liftItem), чтобы край не дрожал. */
export const liftArea = {
  initial: "rest",
  animate: "rest",
  whileHover: "hover",
  whileTap: "tap",
} as const;
export const liftItem: Variants = {
  rest: { y: 0, scale: 1, transition: spring.hover },
  hover: {
    y: -m.distance.lift,
    scale: m.scale.hover,
    transition: spring.hover,
  },
  tap: { y: 0, scale: m.scale.tap, transition: spring.press },
};

/** Смена страниц: custom = направление (1 вперёд, -1 назад). */
export const pageSwap: Variants = {
  initial: (dir: number) => ({
    opacity: 0,
    y: dir >= 0 ? m.distance.enter : -m.distance.enter,
  }),
  animate: {
    opacity: 1,
    y: 0,
    transition: { ...spring.page, opacity: tween.base },
  },
  exit: (dir: number) => ({
    opacity: 0,
    y: dir >= 0 ? -m.distance.exit : m.distance.exit,
    transition: tween.exit,
  }),
};

/** Шторка снизу (мобильные) и модалка (десктоп). */
export const sheet: Variants = {
  hidden: { y: "100%" },
  show: { y: 0, transition: spring.sheet },
  exit: { y: "100%", transition: { ...spring.sheet, bounce: 0 } },
};
export const dialog: Variants = {
  hidden: { opacity: 0, scale: m.scale.popIn, y: m.distance.enter },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { ...spring.sheet, opacity: tween.fast },
  },
  exit: { opacity: 0, scale: m.scale.popIn, transition: tween.exit },
};
export const overlay: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: tween.base },
  exit: { opacity: 0, transition: tween.exit },
};

/** Ошибка ввода (OTP, поля): короткая тряска пружиной. */
export const shake = {
  x: [0, -m.distance.shake, m.distance.shake, -m.distance.shake / 2, 0],
  transition: {
    duration: m.duration.base,
    ease: [...m.ease.inOut] as unknown as [number, number, number, number],
  },
};

/** Popover/Select/Tooltip растут от триггера. */
export const originFor = (
  side: "top" | "bottom" | "left" | "right" = "bottom",
  align: "start" | "center" | "end" = "center",
) => {
  const y = side === "top" ? "bottom" : side === "bottom" ? "top" : "center";
  const x =
    side === "left"
      ? "right"
      : side === "right"
        ? "left"
        : align === "start"
          ? "left"
          : align === "end"
            ? "right"
            : "center";
  return `${y} ${x}`;
};

/** Индикатор загрузки внутри Button (единственное разрешённое вращение). */
export const spin: Transition = {
  repeat: Infinity,
  ease: "linear",
  duration: m.duration.spin,
};

/** Мерцание скелетона. */
export const shimmer: Transition = {
  repeat: Infinity,
  ease: "linear",
  duration: m.duration.skeleton,
};

export const duration = m.duration;
export const toastDurations = m.toast;
export const swipe = m.swipe;
export const debounce = m.debounce;
