# Слайдеры и вкладки — T-F2-05

Slider: управляемый value: number, label, onValueChange; RangeSlider:
value: [number, number], label, thumbLabels, onValueChange.
Доступны min/max/step, disabled, name, onValueCommit и форматирование aria-valuetext.
Числа предназначены для параметров сценария, финансовые суммы остаются строками API.
Ref указывает на первый бегунок для фокуса формы; геометрия горизонтальная.

Tabs: label, value, onValueChange, items: { value, label, content, disabled? }[].
Для фильтра без связанной панели применяется Segmented. Клавиатура и ARIA — Radix;
движение индикатора уважает reduced motion и изолировано экземпляром.
