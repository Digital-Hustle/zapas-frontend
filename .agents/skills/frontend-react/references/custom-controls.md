# Карта контролов

| Контрол | Поведение | Где/когда |
|---|---|---|
| Button/Input/Field/MoneyInput | общий пакет, строки денег, aria-describedby | все формы, сервер повторяет валидацию |
| OTP | input-otp, numeric keyboard, paste | ttl/retry/lock данные API, реальный resend, текст ошибки |
| Select/Combobox/MultiSelect | Radix + cmdk, async query, keyboard | категории/контрагенты/режим; >100 опций виртуализировать |
| DatePicker/Range | Radix Popover + react-day-picker | дата бизнеса не UTC timestamp; даты 29/30/31 и zone тестируются |
| Slider/Segmented/Switch/Tabs | Radix | сценарии/горизонты, значения и движение из tokens |
| Dialog/AlertDialog/Sheet | Radix lifecycle, ExitPresence | Escape, возврат фокуса, safe-area, busy только пока запрос pending |
| Toast | Sonner unstyled + notify | один renderer; error status не только временный тост |
| Table/VirtualList | TanStack Table/Virtual | колонок data model, cursor/server filters; логика баланса не на UI |
| ScrollArea | Radix, либо согласованная стилизованная browser scrollbar | доступная клавиатура, не скрывать возможность прокрутки |
| FileDrop | drag/drop + hidden input type=file | браузерный выбор файла неизбежен, acceptance на сервере |
| Skeleton/Empty/Error | общий пакет | геометрия реального экрана, действие «повторить», не фейковая загрузка |

После установки: изучить исходный код/лицензию, поместить в packages/ui, заменить литералы токенами, экспорт index.ts, написать keyboard/a11y/reduced-motion тест, атрибуция в THIRD_PARTY_NOTICES. Чужой компонент без понятной лицензии не копировать. В документации и package.json должен быть один стек, без оставшихся axios/react-hot-toast/старых aliases.
