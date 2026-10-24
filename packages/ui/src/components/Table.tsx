/* eslint-disable react-hooks/incompatible-library -- Mutable TanStack instances are isolated in uncompiled components (use no memo), tested in Chromium. */
import { useRef, useState, type ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { control } from "@zapas/tokens";
import { Checkbox } from "./Checkbox.tsx";
import { Skeleton } from "./Skeleton.tsx";
import { EmptyState, ErrorState } from "./States.tsx";
import { ScrollArea } from "./Overlays.tsx";
import { ChevronDown, ChevronsUpDown } from "../icons.ts";
import { cn } from "../lib/cn.ts";

export interface TableProps<T> {
  label: string;
  data: T[];
  columns: ColumnDef<T>[];
  /** Stable resource ID. Never use a row index across paging/filtering/account changes. */
  getRowId: (row: T) => string;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  empty?: ReactNode;
  filtered?: boolean;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  /** Set for server-paginated data; sorting changes must then trigger a server query. */
  manualSorting?: boolean;
  selection?: RowSelectionState;
  onSelectionChange?: OnChangeFn<RowSelectionState>;
  className?: string;
}

function DataTable<T>({
  label,
  data,
  columns,
  getRowId,
  loading,
  error,
  onRetry,
  empty,
  filtered,
  sorting,
  onSortingChange,
  manualSorting = false,
  selection,
  onSelectionChange,
  className,
  virtual = false,
}: TableProps<T> & { virtual?: boolean }) {
  "use no memo"; // TanStack Table/Virtual expose mutable instances; preserve their subscription boundary.
  const viewport = useRef<HTMLDivElement>(null);
  const [localSorting, setLocalSorting] = useState<SortingState>([]);
  const table = useReactTable({
    data,
    columns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting,
    defaultColumn: { enableSorting: false },
    enableRowSelection: Boolean(onSelectionChange),
    state: { sorting: sorting ?? localSorting, rowSelection: selection ?? {} },
    onSortingChange: onSortingChange ?? setLocalSorting,
    onRowSelectionChange: onSelectionChange,
  });
  const rows = table.getRowModel().rows;
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => viewport.current,
    estimateSize: () => control.lg,
    overscan: 8,
    enabled: virtual && !loading,
    getItemKey: (index) => rows[index]?.id ?? index,
  });
  const visible = virtual
    ? virtualizer.getVirtualItems()
    : rows.map((_, index) => ({ index, start: 0, end: 0 }));
  const top = virtual ? (visible[0]?.start ?? 0) : 0;
  const bottom =
    virtual && visible.length ? Math.max(0, virtualizer.getTotalSize() - (visible.at(-1)?.end ?? 0)) : 0;
  const columnCount = columns.length + (onSelectionChange ? 1 : 0);
  if (error && !data.length) return <ErrorState description={error} onRetry={onRetry} />;
  if (!loading && !data.length)
    return (
      empty ?? <EmptyState title={filtered ? "Ничего не найдено" : "Данных пока нет"} filtered={filtered} />
    );
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {error && <ErrorState title="Не удалось обновить таблицу" description={error} onRetry={onRetry} />}
      <ScrollArea
        ref={viewport}
        label={label}
        className={cn("border-border h-96 rounded-lg border", className)}
      >
        <table
          aria-busy={loading || undefined}
          aria-rowcount={rows.length + 1}
          className="w-full border-separate border-spacing-0 text-left text-sm"
        >
          <caption className="sr-only">{label}</caption>
          <thead className="bg-card z-raised sticky top-0">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {onSelectionChange && (
                  <th scope="col" className="border-border border-b p-3">
                    <Checkbox
                      aria-label="Выбрать все загруженные строки"
                      checked={
                        table.getIsAllRowsSelected()
                          ? true
                          : table.getIsSomeRowsSelected()
                            ? "indeterminate"
                            : false
                      }
                      disabled={loading}
                      onCheckedChange={(checked) => table.toggleAllRowsSelected(checked === true)}
                    />
                  </th>
                )}
                {group.headers.map((header) => (
                  <th
                    key={header.id}
                    colSpan={header.colSpan}
                    scope="col"
                    className="border-border border-b p-3 font-semibold"
                    aria-sort={
                      header.column.getIsSorted() === "asc"
                        ? "ascending"
                        : header.column.getIsSorted() === "desc"
                          ? "descending"
                          : undefined
                    }
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="duration-fast hover:text-primary focus-visible:ring-ring inline-flex items-center gap-2 rounded-sm text-left transition-colors outline-none focus-visible:ring-2"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() ? (
                          <ChevronDown
                            aria-hidden
                            className={cn("size-4", header.column.getIsSorted() === "asc" && "rotate-180")}
                          />
                        ) : (
                          <ChevronsUpDown aria-hidden className="size-4" />
                        )}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i}>
                  <td colSpan={columnCount} className="p-3">
                    <Skeleton className="h-6 w-full" />
                  </td>
                </tr>
              ))
            ) : (
              <>
                {top > 0 && (
                  <tr aria-hidden>
                    <td colSpan={columnCount} style={{ height: top }} />
                  </tr>
                )}
                {visible.map(({ index }) => {
                  const row = rows[index];
                  if (!row) return null;
                  return (
                    <tr
                      key={row.id}
                      data-index={index}
                      ref={virtual ? virtualizer.measureElement : undefined}
                      aria-rowindex={index + 2}
                      data-selected={row.getIsSelected() || undefined}
                      className="duration-fast hover:bg-muted data-selected:bg-primary-soft transition-colors"
                    >
                      {onSelectionChange && (
                        <td className="border-border border-b p-3">
                          <Checkbox
                            aria-label={`Выбрать строку ${index + 1}`}
                            checked={row.getIsSelected()}
                            onCheckedChange={(checked) => row.toggleSelected(checked === true)}
                          />
                        </td>
                      )}
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="border-border border-b p-3 align-top">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {bottom > 0 && (
                  <tr aria-hidden>
                    <td colSpan={columnCount} style={{ height: bottom }} />
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </ScrollArea>
      {loading && (
        <span role="status" className="sr-only">
          Загрузка таблицы
        </span>
      )}
    </div>
  );
}
export function Table<T>(props: TableProps<T>) {
  return <DataTable {...props} />;
}
export function VirtualTable<T>(props: TableProps<T>) {
  return <DataTable {...props} virtual />;
}
export type { ColumnDef, SortingState, RowSelectionState } from "@tanstack/react-table";
