# Выбор и настройки — T-F2-05

Checkbox, Switch, RadioGroup и Segmented используют Radix и управляемое значение
из формы. Все подписи и ошибки доступны скринридеру; интерактивные области —
не меньше control-md, цвета и движение — из токенов.

Checkbox: checked = boolean | "indeterminate", onCheckedChange.
Switch: checked = boolean, onCheckedChange.
RadioGroup/Segmented: label, value, onValueChange, options = { value, label, disabled? }[].

Контролы передают name/required/disabled и ref в Radix для форм и RHF.
Радиогруппа представляет один выбор; Segmented использует ту же семантику
для фильтров без связанной панели. Индикатор Segmented ограничен своим экземпляром.

Проверки: клавиатура, пропуск disabled, mixed checkbox, имена полей при отправке
формы и отсутствие случайного submit, обе темы и reduced motion.
