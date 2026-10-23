// Публичный API @zapas/ui. Новые компоненты добавлять сюда; приложения импортируют только отсюда.
export { cn } from "./lib/cn.ts";
export * from "./lib/format.ts";
export { useMediaQuery } from "./lib/useMediaQuery.ts";

export { Button, buttonVariants, type ButtonProps } from "./components/Button.tsx";
export { Input, Field, type InputProps } from "./components/Input.tsx";
export { MoneyInput, type MoneyInputProps } from "./components/MoneyInput.tsx";
export { OtpInput, type OtpInputProps } from "./components/OtpInput.tsx";
export { Select, type SelectProps, type SelectOption } from "./components/Select.tsx";
export { DatePicker, type DatePickerProps } from "./components/DatePicker.tsx";
export { Checkbox, type CheckboxProps, type CheckedState } from "./components/Checkbox.tsx";
export { Switch, type SwitchProps } from "./components/Switch.tsx";
export { RadioGroup, Segmented, type RadioGroupProps, type ChoiceOption } from "./components/RadioGroup.tsx";
export { Slider, RangeSlider, type SliderProps, type RangeSliderProps } from "./components/Slider.tsx";
export { Tabs, type TabsProps, type TabItem } from "./components/Tabs.tsx";
export { Dialog, useDialogState, type DialogProps } from "./components/Dialog.tsx";
export { Skeleton, LoadingRegion } from "./components/Skeleton.tsx";

export { notify, Toaster } from "./feedback/notify.tsx";
export { confirmDialog, ConfirmHost } from "./feedback/confirm.tsx";

// Следующие компоненты — T-F2-05 (см. docs/DESIGN.md §5): Combobox, DateRangePicker,
// Tooltip, Popover, DropdownMenu, Table, VirtualTable, EmptyState, ErrorState,
// Badge, RiskBadge, Stepper, Progress, CommandPalette, FileDrop, ScrollArea, NumberFlow-обёртка Amount.
