# Каталог UI-источников

Это **каталог поиска**, не список установленных пакетов или разрешение копировать всё. Каждую конкретную компоненту/версию и лицензию проверить перед копированием; MIT плюс дополнительная оговорка — не чистый MIT.

| Источник | URL | Что смотреть | Решение |
|---|---|---|---|
| shadcn/ui | https://ui.shadcn.com/ | composable Radix primitives, forms, calendar, sidebar | базовый источник поведения, вид адаптировать |
| Motion Primitives | https://motion-primitives.com/ | transition-panel, popover/dialog, animated-background, sliding-number | предпочтительно небольшие motion-рецепты |
| Magic UI | https://magicui.design/ | number/list, restrained grid, mockups | только полезные эффекты, не confetti/glow на каждом блоке |
| Animate UI | https://animate-ui.com/ | animated primitives | проверить Commons Clause/условия; reference или отдельный ADR |
| Aceternity | https://ui.aceternity.com/ | upload, timeline, modal, calm backgrounds | собственная лицензия, без автоматического vendoring |
| React Bits | https://reactbits.dev/ | stepper, animated lists, useful micro-interactions | проверить лицензию; GSAP/WebGL не ставить ради одного эффекта |
| Eldora UI | https://eldoraui.site/ | OTP, mockups, animated badges | проверить конкретный source/version |
| Animata | https://github.com/codse/animata | charts, tabs, transaction/list patterns | маленькие SVG/motion-рецепты |
| Cult UI | https://cult-ui.com/ | inputs, panels, selection, onboarding | без тяжёлых shaders |
| Smooth UI | https://smoothui.dev/ | combobox, upload, steps, OTP | единый tokens/motion/notify, не второй UI-кит |
| Evil Charts | https://evilcharts.com/ | Recharts examples | серверные ряды/интервал, единый tooltip |
| Lucide Animated | https://lucide-animated.com/ | check/bell/refresh micro-motion | иконки всё равно через @zapas/ui/icons |
| 21st.dev | https://21st.dev/ | curated component search | лицензия на каждый компонент; не запускать installer без просмотра |
| Uiverse | https://uiverse.io/ | visual reference | переписать на tokens, не считать каждую карточку MIT автоматически |

Визуальные референсы: https://saasframe.io/, https://mobbin.com/, https://www.refactoringui.com/, https://emilkowal.ski/ui/. Платный доступ не даёт права распространять картинки/тексты/код.

Рецепт выбора: задача → поиск готового подхода → исходник/зависимости/лицензия → UX и keyboard → tokens/motion → тест → атрибуция. Все поддерживаемые URL реестров — отдельно в components.json; они не означают автоматическую установку.
