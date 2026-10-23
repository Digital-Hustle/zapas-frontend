# Motion: единый стандарт

Источник значений — `frontend/packages/tokens/src/tokens.ts`, presets — `@zapas/tokens/motion`. Этот документ написан для финансового продукта; QR/лица/турникеты из прежнего кейса не применяются.

| Ситуация | Паттерн | Граница |
|---|---|---|
| Page transition | AnimatePresence + frozen outlet, pageSwap | не задерживать интерактивность, восстановить scroll/focus |
| Фильтр/горизонт | spring.snappy/layout + fade | abort старый запрос, отсутствие цифр не выдавать за 0 |
| График | transform/clip/opacity из chart preset | факты/вероятности неизменны; не рисовать фиктивный smooth forecast |
| KPI | NumberFlow или эквивалент общий | промежуточные кадры только визуальные, screenreader получает итог |
| Dialog/Sheet | Radix lifecycle + AnimatePresence, sheet preset | focus trap/возврат фокуса/Esc не теряются на exit; close прерываем |
| Popover/Select/Tooltip | origin-aware popIn | origin от Radix, без прыжка позиции при flip |
| List add/remove | layout + AnimatePresence | stagger ≤35мс, первые 8; виртуализированные тысячи не анимировать одновременно |
| Ошибка OTP | общая короткая shake | reduced motion заменяет fade/текст; попытки и cooldown сообщает API |
| Toast | единый notify | hover/focus pause, close, max3; предупреждение доступно после исчезновения |
| Hover/tap | неподвижная оболочка + liftItem/press | только hover-capable pointer, не мешать scrolling на touch |

Новые двигатели (GSAP/Lenis/react-spring/Three/WebGL) в MVP не добавляем. Registry-компонент с ними либо переносится на motion, либо остаётся визуальным референсом. CSS-переходы для состояния допустимы на токенах. CSS-loop в UI-ките — только явно описанное исключение для индикатора, со статичным reduced-motion вариантом.

Жесты: пороги в tokens, drag не мешает pan-y, не скрывает единственный способ удалить/подтвердить. Для dangerous actions есть кнопка и confirmation, не только свайп.

Проверка: быстрая смена маршрутов/фильтров, двойной submit, закрыть/открыть, touch keyboard, min-width360, reduced motion, CPU4×. Снять trace/screenshot вне git; не заявлять «60fps везде» без измерения.
