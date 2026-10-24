import { useEffect, useId, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Combobox, DateRangePicker, Field, Input, Select } from "@zapas/ui";
import {
  useCounterparties,
  paymentFilterSchema,
  preparePaymentFilters,
  type Category,
  type PaymentFilters,
} from "@/entities/payments";
import { businessIssue, accessDenied } from "@/shared/api/problem.ts";
import { Pagination } from "@/shared/ui/BusinessData.tsx";
import { initialPaymentFilters } from "../model/filters.ts";

export function PaymentFiltersForm({
  companyId,
  accountId,
  categories,
  active,
  busy,
  onChange,
}: {
  companyId: string;
  accountId: string;
  categories: Category[];
  active: boolean;
  busy: boolean;
  onChange: (value: PaymentFilters) => void;
}) {
  const id = useId();
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<{ value: string; label: string } | null>(null);
  const validSearch = Array.from(search).length <= 200;
  const counterparties = useCounterparties(companyId, accountId, search, page, active && validSearch);
  const denied = counterparties.isError && accessDenied(counterparties.error);
  useEffect(() => {
    if (denied) void client.invalidateQueries({ queryKey: ["workspace"] });
  }, [client, denied]);
  const form = useForm({ resolver: zodResolver(paymentFilterSchema), defaultValues: initialPaymentFilters });
  const toDate = useWatch({ control: form.control, name: "toDate" });
  const options = denied
    ? []
    : (counterparties.data?.items.map((value) => ({
        value: value.key,
        label: `${value.name ?? "Без названия"}${value.inn ? ` · ИНН ${value.inn}` : " · ИНН не указан"}`,
      })) ?? []);
  if (!denied && selected && !options.some((value) => value.value === selected.value))
    options.unshift(selected);
  const reset = () => {
    form.reset(initialPaymentFilters);
    setSelected(null);
    setSearch("");
    setPage(0);
    onChange(preparePaymentFilters(initialPaymentFilters));
  };
  return (
    <form
      noValidate
      className="border-border bg-card space-y-4 rounded-lg border p-5 sm:p-6"
      onSubmit={(event) => {
        void form.handleSubmit((value) => onChange(preparePaymentFilters(value)))(event);
      }}
    >
      <h2 className="text-xl font-semibold">Фильтры операций</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Controller
          name="fromDate"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field htmlFor={`${id}-dates`} label="Период операций" error={fieldState.error?.message}>
              <DateRangePicker
                id={`${id}-dates`}
                ref={field.ref}
                value={field.value && toDate ? { from: field.value, to: toDate } : undefined}
                onValueChange={(value) => {
                  field.onChange(value?.from ?? "");
                  form.setValue("toDate", value?.to ?? "");
                }}
                onBlur={field.onBlur}
                disabled={busy}
                invalid={Boolean(fieldState.error)}
                aria-describedby={fieldState.error ? `${id}-dates-error` : undefined}
              />
            </Field>
          )}
        />
        <Controller
          name="direction"
          control={form.control}
          render={({ field }) => (
            <Field htmlFor={`${id}-direction`} label="Направление">
              <Select
                id={`${id}-direction`}
                ref={field.ref}
                name={field.name}
                value={field.value}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
                disabled={busy}
                options={[
                  { value: "ALL", label: "Все операции" },
                  { value: "IN", label: "Поступления" },
                  { value: "OUT", label: "Списания" },
                ]}
              />
            </Field>
          )}
        />
        <Controller
          name="categoryCode"
          control={form.control}
          render={({ field }) => (
            <Field htmlFor={`${id}-category`} label="Категория">
              <Select
                id={`${id}-category`}
                ref={field.ref}
                name={field.name}
                value={field.value || "__all__"}
                onValueChange={(value) => field.onChange(value === "__all__" ? "" : value)}
                onBlur={field.onBlur}
                disabled={busy}
                options={[
                  { value: "__all__", label: "Все категории" },
                  ...categories.map((value) => ({ value: value.code, label: value.name })),
                ]}
              />
            </Field>
          )}
        />
        <Field
          htmlFor={`${id}-q`}
          label="Поиск по операциям"
          hint="До 200 символов"
          error={form.formState.errors.q?.message}
        >
          <Input
            id={`${id}-q`}
            {...form.register("q")}
            disabled={busy}
            invalid={Boolean(form.formState.errors.q)}
            aria-describedby={form.formState.errors.q ? `${id}-q-error` : undefined}
          />
        </Field>
        <Controller
          name="sort"
          control={form.control}
          render={({ field }) => (
            <Field htmlFor={`${id}-sort`} label="Порядок по дате">
              <Select
                id={`${id}-sort`}
                ref={field.ref}
                name={field.name}
                value={field.value}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
                disabled={busy}
                options={[
                  { value: "operationDate,desc", label: "Сначала новые" },
                  { value: "operationDate,asc", label: "Сначала старые" },
                ]}
              />
            </Field>
          )}
        />
        <Controller
          name="counterpartyKey"
          control={form.control}
          render={({ field }) => (
            <Field
              htmlFor={`${id}-counterparty`}
              label="Контрагент"
              error={
                !validSearch
                  ? "Поиск: до 200 символов"
                  : counterparties.isError
                    ? businessIssue(counterparties.error).message
                    : undefined
              }
            >
              <Combobox
                id={`${id}-counterparty`}
                ref={field.ref}
                name={field.name}
                value={field.value || undefined}
                onValueChange={(value) => {
                  field.onChange(value);
                  setSelected(options.find((option) => option.value === value) ?? null);
                }}
                onBlur={field.onBlur}
                options={options}
                placeholder="Все контрагенты"
                searchLabel="Поиск контрагента"
                remote
                onSearchChange={(value) => {
                  setSearch(value);
                  setPage(0);
                }}
                loading={counterparties.isFetching}
                disabled={busy}
                invalid={!validSearch || counterparties.isError}
                aria-describedby={
                  !validSearch || counterparties.isError ? `${id}-counterparty-error` : undefined
                }
                error={counterparties.isError ? businessIssue(counterparties.error).message : undefined}
              />
            </Field>
          )}
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={busy}>
          Применить фильтры
        </Button>
        <Button variant="secondary" disabled={busy} onClick={reset}>
          Сбросить фильтры
        </Button>
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() => {
            form.setValue("counterpartyKey", "");
            setSelected(null);
          }}
        >
          Все контрагенты
        </Button>
      </div>
      {!denied &&
        counterparties.data &&
        (counterparties.data.page.hasNext || counterparties.data.page.page > 0) && (
          <div aria-label="Страницы поиска контрагента" className="space-y-2">
            <p className="text-muted-foreground text-sm">Результаты поиска контрагентов</p>
            <Pagination
              page={counterparties.data.page}
              pending={counterparties.isFetching || busy}
              onChange={setPage}
            />
          </div>
        )}
      {counterparties.isError && (
        <Button
          variant="secondary"
          size="sm"
          disabled={busy || !active}
          onClick={() => void counterparties.refetch()}
        >
          Повторить поиск контрагентов
        </Button>
      )}
    </form>
  );
}
