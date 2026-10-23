---
name: frontend-react
description: React/TypeScript frontend «Запас» — web/admin, FSD, общий UI-кит, токены, motion, Radix, TanStack Query, формы и OpenAPI. Используй при разработке и ревью фронтенда, анимаций, графиков и UI-компонентов.
---

# Frontend «Запас»

Сначала `zapas-dev`, затем `docs/DESIGN.md`, `docs/SCREENS.md`, `docs/DELIVERY.md`. Стек и реальные версии — package.json/lock; не ставь latest поверх рабочего каркаса.

## Зоны и зависимости
- F1: `frontend/apps/web`, будущий `packages/charts`.
- F2: `apps/admin`, `packages/ui`, `tokens`, `api`, `config`, CI/infra. Новый shared-компонент запрашивает F1, пишет F2.
- FSD: app → pages → widgets → features → entities → shared. Межслайсовый импорт — через index.ts, внутри — относительные пути. Пакеты — через exports, без доступа в чужой src.
- DTO из `@zapas/api/<svc>` → mapper → доменная модель. Серверное состояние в TanStack Query; Zustand только UI (компания/фильтры), не второе хранилище операций.
- Формы RHF + zod; backend повторяет всю валидацию. Ошибка field → под полем, ошибка операции → общий notify.

## Общий источник дизайна
`packages/tokens/src/tokens.ts` → CSS/JSON/документ через gen. Цвет/spacing/radius/z-index/motion только оттуда. CSS supports squircle — progressive enhancement, не обещание геометрии Apple во всех браузерах. Конкретные исключения — DESIGN, не произвольные значения в страницах.

## Контролы и движение
- UI-поведение брать у Radix; styling — токены; motion — общий preset. Не переписывать focus-trap/aria/keyboard от руки ради анимации.
- Нативные select/date/time/number picker и alert/confirm/prompt запрещены; file input допускается скрытым за FileDrop (браузерный диалог выбора файла неизбежен).
- Каждый изменяемый элемент плавно реагирует; это не значит бесконечные движения. Ввод/результат никогда не ждёт окончания анимации. Reduced motion: отключить пространственные эффекты/loop, оставить короткий fade/статичный контент.
- Тосты — только `notify` из @zapas/ui. Важная ошибка сохраняется в форме/центре уведомлений, а не исчезает вместе с тостом.
- Readonly/API pending/empty/error/stale/offline/partial обязательны. Skeleton не заменяет нереализованный экран.
- График: только отображение серверных данных. number допускается для координат; деньги не пересчитывать в JS. Тултип имеет точные строки, интервалы/риск не только цветом.

## API и проверки
- `pnpm --filter @zapas/api gen` — единственный способ обновить DTO/хуки; если export создаёт внутренние вызовы — исправить tags/filters.
- Cookies HttpOnly; CSRF bootstrap и Origin; refresh single-flight, только окончательный 401 завершает сессию, outage не logout. ADMIN не определяется доверенным X-Client.
- `node tools/check.mjs frontend contracts tooling` перед PR; визуально 360/768/1440, светлая/тёмная, reduced motion, табы/скринридер.
- Показать screen matrix до/после и известные ограничения. Новые библиотеки по registry сначала просматривать, не запускать install scripts с секретами.

Справки: `references/component-catalog.md`, `custom-controls.md`, `motion.md`. Это адаптированные рекомендации, не скопированный брендинг Сбера.
