/* eslint-disable react-hooks/incompatible-library -- Mutable TanStack instances are isolated in uncompiled components (use no memo), tested in Chromium. */
import {
  forwardRef,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ComponentPropsWithoutRef,
} from "react";
import { Popover as P } from "radix-ui";
import { Command } from "cmdk";
import { defaultRangeExtractor, useVirtualizer } from "@tanstack/react-virtual";
import { control } from "@zapas/tokens";
import { Check, ChevronsUpDown } from "../icons.ts";
import { cn } from "../lib/cn.ts";
import { Skeleton } from "./Skeleton.tsx";
import type { SelectOption } from "./Select.tsx";

export interface ComboboxProps extends Pick<
  ComponentPropsWithoutRef<"button">,
  "id" | "aria-label" | "aria-labelledby" | "aria-describedby" | "onBlur"
> {
  value?: string;
  onValueChange: (value: string) => void;
  options: readonly SelectOption[];
  placeholder?: string;
  searchLabel?: string;
  disabled?: boolean;
  loading?: boolean;
  invalid?: boolean;
  error?: string;
  onSearchChange?: (value: string) => void;
  /** For remote search, the server supplies already filtered options. */
  remote?: boolean;
  name?: string;
}
interface ChoicesProps {
  options: readonly SelectOption[];
  selected: readonly string[];
  multiple?: boolean;
  choose: (value: string) => void;
  query: string;
  setQuery: (value: string) => void;
  label: string;
  loading?: boolean;
  error?: string;
}
function Choices({
  options,
  selected,
  choose,
  query,
  setQuery,
  label,
  loading,
  error,
  multiple,
}: ChoicesProps) {
  "use no memo"; // TanStack Virtual exposes a mutable instance; do not compile this boundary.
  const list = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState("");
  const candidate =
    options.find((o) => o.value === active && !o.disabled) ?? options.find((o) => !o.disabled);
  const current = candidate?.value ?? "";
  const activeIndex = options.findIndex((o) => o.value === current);
  const virtual = options.length > 100;
  const rows = useVirtualizer({
    count: options.length,
    getScrollElement: () => list.current,
    estimateSize: () => control.md,
    overscan: 5,
    enabled: virtual,
    rangeExtractor: (range) =>
      [...new Set([...defaultRangeExtractor(range), ...(activeIndex >= 0 ? [activeIndex] : [])])].sort(
        (a, b) => a - b,
      ),
  });
  const move = (key: string) => {
    const indexes = options.flatMap((option, i) => (option.disabled ? [] : [i]));
    if (!indexes.length) return;
    const position = indexes.indexOf(activeIndex);
    const next =
      key === "Home"
        ? indexes[0]
        : key === "End"
          ? indexes.at(-1)
          : indexes[Math.max(0, Math.min(indexes.length - 1, position + (key === "ArrowDown" ? 1 : -1)))];
    if (next !== undefined) {
      setActive(options[next]?.value ?? "");
      if (virtual) rows.scrollToIndex(next, { align: "auto" });
    }
  };
  const row = (index: number, virtualStyle?: CSSProperties) => {
    const option = options[index];
    if (!option) return null;
    return (
      <Command.Item
        key={option.value}
        value={option.value}
        disabled={option.disabled}
        onSelect={() => choose(option.value)}
        aria-checked={multiple ? selected.includes(option.value) : undefined}
        style={virtualStyle}
        className="h-control-md duration-fast zapas-command-item flex cursor-default items-center gap-2 rounded-sm px-3 text-sm transition-colors outline-none"
      >
        <Check
          aria-hidden
          className={cn("size-4 shrink-0", !selected.includes(option.value) && "invisible")}
        />
        <span className="truncate">{option.label}</span>
        {multiple && (
          <span className="sr-only">{selected.includes(option.value) ? "Выбрано" : "Не выбрано"}</span>
        )}
      </Command.Item>
    );
  };
  return (
    <Command
      label={label}
      shouldFilter={false}
      value={current}
      onValueChange={setActive}
      onKeyDownCapture={(e) => {
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
          e.preventDefault();
          e.stopPropagation();
          move(e.key);
        }
        if (e.key === "Enter" && candidate && !loading && !error) {
          e.preventDefault();
          e.stopPropagation();
          choose(candidate.value);
        }
      }}
    >
      <Command.Input
        value={query}
        onValueChange={(next) => {
          setActive("");
          setQuery(next);
          if (virtual) rows.scrollToOffset(0);
        }}
        aria-label={label}
        placeholder="Поиск…"
        className="border-border placeholder:text-muted-foreground h-control-md w-full border-b bg-transparent px-3 text-base outline-none"
      />
      {loading && (
        <div role="status" className="p-3">
          <span className="sr-only">Загрузка вариантов</span>
          <Skeleton className="h-6 w-full" />
        </div>
      )}
      {error && (
        <p role="alert" className="text-danger p-3 text-sm">
          {error}
        </p>
      )}
      <Command.List
        ref={list}
        aria-label="Варианты"
        className="max-h-64 overflow-auto p-1"
        aria-busy={loading || undefined}
      >
        {!loading && !error && options.length === 0 && (
          <div role="status" className="text-muted-foreground p-3 text-sm">
            Ничего не найдено
          </div>
        )}
        {!loading &&
          !error &&
          (virtual ? (
            <div style={{ height: rows.getTotalSize(), position: "relative" }}>
              {rows.getVirtualItems().map((item) =>
                row(item.index, {
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: item.size,
                  transform: `translateY(${item.start}px)`,
                }),
              )}
            </div>
          ) : (
            options.map((_, index) => row(index))
          ))}
      </Command.List>
    </Command>
  );
}

interface ChoiceControlProps extends Omit<ComboboxProps, "value" | "onValueChange"> {
  selected: readonly string[];
  change: (value: string) => void;
  multiple?: boolean;
}
const ChoiceControl = forwardRef<HTMLButtonElement, ChoiceControlProps>(function ChoiceControl(
  {
    selected,
    change,
    options,
    multiple,
    placeholder = "Выберите значение",
    searchLabel = "Поиск вариантов",
    disabled,
    loading,
    invalid,
    error,
    onSearchChange,
    remote,
    name,
    ...props
  },
  ref,
) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const labelId = useId();
  const filtered = remote
    ? options
    : options.filter((o) => o.label.toLocaleLowerCase("ru").includes(query.trim().toLocaleLowerCase("ru")));
  const selectedOptions = options.filter((o) => selected.includes(o.value));
  return (
    <P.Root
      open={open && !disabled}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) {
          setQuery("");
          onSearchChange?.("");
        }
      }}
    >
      {name &&
        selected.map((value) => (
          <input type="hidden" key={value} name={name} value={value} disabled={disabled} />
        ))}
      <P.Trigger
        type="button"
        ref={ref}
        disabled={disabled}
        aria-invalid={invalid || Boolean(error) || undefined}
        aria-busy={loading || undefined}
        className={cn(
          "h-control-md border-input bg-card duration-fast focus-visible:border-ring focus-visible:shadow-glow flex w-full items-center justify-between gap-2 rounded-md border px-3 text-left text-base transition-colors outline-none disabled:opacity-50",
          invalid && "border-danger",
        )}
        {...props}
      >
        <span className="truncate">
          {selectedOptions.length
            ? multiple
              ? `Выбрано: ${selected.length}`
              : selectedOptions[0]?.label
            : selected.length
              ? `Выбрано: ${selected.length}`
              : placeholder}
        </span>
        <ChevronsUpDown aria-hidden className="text-muted-foreground size-4 shrink-0" />
      </P.Trigger>
      <P.Portal>
        <P.Content
          aria-labelledby={labelId}
          align="start"
          sideOffset={6}
          className="zapas-popup z-popover border-border bg-popover text-popover-foreground shadow-pop w-72 max-w-full overflow-hidden rounded-md border"
          style={{ maxWidth: "var(--radix-popover-content-available-width)" }}
        >
          <h3 id={labelId} className="sr-only">
            {searchLabel}
          </h3>
          <Choices
            options={filtered}
            selected={selected}
            multiple={multiple}
            label={searchLabel}
            query={query}
            setQuery={(value) => {
              setQuery(value);
              onSearchChange?.(value);
            }}
            loading={loading}
            error={error}
            choose={(value) => {
              change(value);
              if (!multiple) setOpen(false);
            }}
          />
        </P.Content>
      </P.Portal>
    </P.Root>
  );
});
export const Combobox = forwardRef<HTMLButtonElement, ComboboxProps>(function Combobox(
  { value, onValueChange, ...props },
  ref,
) {
  return <ChoiceControl ref={ref} selected={value ? [value] : []} change={onValueChange} {...props} />;
});
export interface MultiSelectProps extends Omit<ComboboxProps, "value" | "onValueChange"> {
  value: readonly string[];
  onValueChange: (value: string[]) => void;
}
export const MultiSelect = forwardRef<HTMLButtonElement, MultiSelectProps>(function MultiSelect(
  { value, onValueChange, ...props },
  ref,
) {
  return (
    <ChoiceControl
      ref={ref}
      selected={value}
      multiple
      change={(selected) =>
        onValueChange(value.includes(selected) ? value.filter((v) => v !== selected) : [...value, selected])
      }
      {...props}
    />
  );
});
