// Публичный API @zapas/ui. Новые компоненты добавлять сюда; приложения импортируют только отсюда.
export { cn } from "./lib/cn.ts";
export * from "./lib/format.ts";
export { useMediaQuery } from "./lib/useMediaQuery.ts";

export { Button, buttonVariants, type ButtonProps } from "./components/Button.tsx";
export { Input, Field, type InputProps } from "./components/Input.tsx";
export { Textarea, type TextareaProps } from "./components/Textarea.tsx";
export { FileDrop, type FileDropProps } from "./components/FileDrop.tsx";
export { Amount, type AmountProps } from "./components/Amount.tsx";
export {
  Badge,
  StatusDot,
  RiskBadge,
  EmptyState,
  ErrorState,
  type StatusTone,
} from "./components/States.tsx";
export { Stepper, Progress, type Step } from "./components/Progress.tsx";
export { MoneyInput, type MoneyInputProps } from "./components/MoneyInput.tsx";
export { OtpInput, type OtpInputProps } from "./components/OtpInput.tsx";
export { ResendCode, type ResendCodeProps } from "./components/ResendCode.tsx";
export { Select, type SelectProps, type SelectOption } from "./components/Select.tsx";
export { DatePicker, type DatePickerProps } from "./components/DatePicker.tsx";
export {
  DateRangePicker,
  type DateRangePickerProps,
  type CalendarRange,
} from "./components/DateRangePicker.tsx";
export { Combobox, MultiSelect, type ComboboxProps, type MultiSelectProps } from "./components/Combobox.tsx";
export {
  TooltipProvider,
  Tooltip,
  Popover,
  DropdownMenu,
  ContextMenu,
  ScrollArea,
  type MenuItem,
  type PopoverProps,
  type ScrollAreaProps,
} from "./components/Overlays.tsx";
export { AlertDialog, Sheet, type AlertDialogProps } from "./components/AlertDialog.tsx";
export { CommandPalette, type CommandAction } from "./components/CommandPalette.tsx";
export {
  Table,
  VirtualTable,
  type TableProps,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
} from "./components/Table.tsx";
export { Checkbox, type CheckboxProps, type CheckedState } from "./components/Checkbox.tsx";
export { Switch, type SwitchProps } from "./components/Switch.tsx";
export { RadioGroup, Segmented, type RadioGroupProps, type ChoiceOption } from "./components/RadioGroup.tsx";
export { Slider, RangeSlider, type SliderProps, type RangeSliderProps } from "./components/Slider.tsx";
export { Tabs, type TabsProps, type TabItem } from "./components/Tabs.tsx";
export { Dialog, useDialogState, type DialogProps } from "./components/Dialog.tsx";
export { Skeleton, LoadingRegion } from "./components/Skeleton.tsx";

export { notify, Toaster } from "./feedback/notify.tsx";
export { confirmDialog, ConfirmHost } from "./feedback/confirm.tsx";
