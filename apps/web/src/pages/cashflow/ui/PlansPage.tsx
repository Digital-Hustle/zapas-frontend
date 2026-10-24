import { useId, useState } from "react";
import { useSearchParams } from "react-router";
import { Controller, type UseFormReturn } from "react-hook-form";
import { z } from "zod";
import {
  Amount,
  Badge,
  Button,
  Checkbox,
  DatePicker,
  Field,
  Input,
  RadioGroup,
  Select,
  Textarea,
} from "@zapas/ui";
import { BusinessWorkspace, type BusinessScope } from "@/widgets/business-workspace";
import { PostForm, VersionedForm } from "@/features/cashflow-actions";
import {
  cashflowApi,
  cashflowKeys,
  useCashflow,
  planDraftSchema,
  reasonSchema,
  versionSchema,
  allocationDraftSchema,
  externalRegisterSchema,
  type PlanDraft,
  type Plan,
  type ExternalRegister,
} from "@/entities/cashflow";
import { paymentsApi } from "@/entities/payments";
import { MoneyInput } from "@zapas/ui";
import { NoRows, QueryState, ReadOnly, Section } from "./parts.tsx";
import { useRefresh, visible } from "../model/helpers.ts";

const editorSchema = planDraftSchema
  .safeExtend({ additionalConfirmed: z.boolean() })
  .refine((value) => value.relation !== "ADDITIONAL" || value.additionalConfirmed, {
    path: ["additionalConfirmed"],
    message: "Подтвердите отсутствие двойного учёта",
  });
type EditorDraft = z.infer<typeof editorSchema>;
function wire(value: EditorDraft): PlanDraft {
  return planDraftSchema.parse({
    title: value.title,
    direction: value.direction,
    amount: value.amount,
    dueDate: value.dueDate,
    categoryCode: value.categoryCode,
    counterpartyKey: value.counterpartyKey,
    note: value.note,
    relation: value.relation,
    recurringPatternId: value.recurringPatternId,
    baselineCounterpartyKey: value.baselineCounterpartyKey,
  });
}
const defaults: EditorDraft = {
  title: "",
  direction: "OUT",
  amount: "",
  dueDate: "",
  categoryCode: "",
  counterpartyKey: null,
  note: null,
  relation: "ADDITIONAL",
  recurringPatternId: null,
  baselineCounterpartyKey: null,
  additionalConfirmed: false,
};

function PlanFields({
  scope,
  form,
  disabled,
}: {
  scope: BusinessScope;
  form: UseFormReturn<EditorDraft>;
  disabled: boolean;
}) {
  const id = useId();
  const direction = form.watch("direction");
  const relation = form.watch("relation");
  const [counterpartyPage, setCounterpartyPage] = useState(0);
  const [recurringPage, setRecurringPage] = useState(0);
  const categories = useCashflow(
    scope.company.id,
    scope.account.id,
    "categories",
    (signal) => paymentsApi.categories(scope.company.id, signal),
    scope.active,
  );
  const counterparties = useCashflow(
    scope.company.id,
    scope.account.id,
    "counterparties",
    (signal) => paymentsApi.counterparties(scope.company.id, scope.account.id, "", counterpartyPage, signal),
    scope.active,
    [counterpartyPage],
  );
  const recurring = useCashflow(
    scope.company.id,
    scope.account.id,
    "recurring",
    (signal) => cashflowApi.recurring(scope.company.id, scope.account.id, recurringPage, signal),
    scope.active && relation === "REPLACES_RECURRING",
    [recurringPage],
  );
  const err = (name: keyof EditorDraft) => form.formState.errors[name]?.message;
  return (
    <>
      <Field htmlFor={`${id}-title`} label="Название платежа" error={err("title")}>
        <Input
          id={`${id}-title`}
          {...form.register("title")}
          disabled={disabled}
          invalid={Boolean(err("title"))}
          aria-describedby={err("title") ? `${id}-title-error` : undefined}
        />
      </Field>
      <Controller
        name="direction"
        control={form.control}
        render={({ field }) => (
          <RadioGroup
            label="Направление"
            value={field.value}
            onValueChange={(value) => {
              field.onChange(value);
              form.setValue("categoryCode", "");
              form.setValue("recurringPatternId", null);
            }}
            disabled={disabled}
            options={[
              { value: "OUT", label: "Списание" },
              { value: "IN", label: "Поступление" },
            ]}
          />
        )}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          name="amount"
          control={form.control}
          render={({ field }) => (
            <Field htmlFor={`${id}-amount`} label="Сумма" error={err("amount")}>
              <MoneyInput
                id={`${id}-amount`}
                value={field.value}
                onChange={(value) => field.onChange(value ?? "")}
                ref={field.ref}
                onBlur={field.onBlur}
                disabled={disabled}
                invalid={Boolean(err("amount"))}
                aria-describedby={err("amount") ? `${id}-amount-error` : undefined}
              />
            </Field>
          )}
        />
        <Controller
          name="dueDate"
          control={form.control}
          render={({ field }) => (
            <Field htmlFor={`${id}-date`} label="Дата платежа" error={err("dueDate")}>
              <DatePicker
                id={`${id}-date`}
                value={field.value}
                onValueChange={(value) => field.onChange(value ?? "")}
                disabled={disabled}
                invalid={Boolean(err("dueDate"))}
                aria-describedby={err("dueDate") ? `${id}-date-error` : undefined}
              />
            </Field>
          )}
        />
      </div>
      <QueryState query={categories} recovery={scope.recovery} />
      <Controller
        name="categoryCode"
        control={form.control}
        render={({ field }) => (
          <Field htmlFor={`${id}-category`} label="Категория" error={err("categoryCode")}>
            <Select
              id={`${id}-category`}
              value={field.value}
              onValueChange={field.onChange}
              disabled={disabled || categories.isError || !categories.data}
              options={(categories.data ?? [])
                .filter((item) => item.directions.includes(direction))
                .map((item) => ({ value: item.code, label: item.name }))}
              invalid={Boolean(err("categoryCode"))}
              aria-describedby={err("categoryCode") ? `${id}-category-error` : undefined}
            />
          </Field>
        )}
      />
      <QueryState query={counterparties} recovery={scope.recovery} />
      <Controller
        name="counterpartyKey"
        control={form.control}
        render={({ field }) => (
          <Field
            htmlFor={`${id}-counterparty`}
            label="Контрагент"
            hint="Необязательно. Выберите из истории счёта."
          >
            <Select
              id={`${id}-counterparty`}
              value={field.value ?? "none"}
              onValueChange={(value) => field.onChange(value === "none" ? null : value)}
              disabled={disabled || counterparties.isError}
              options={[
                { value: "none", label: "Не указан" },
                ...(counterparties.data?.items ?? []).map((item) => ({
                  value: item.key,
                  label: item.name ?? item.inn ?? item.key,
                })),
              ]}
            />
          </Field>
        )}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="ghost"
          disabled={disabled || counterpartyPage === 0}
          onClick={() => setCounterpartyPage((page) => page - 1)}
        >
          Предыдущие контрагенты
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={disabled || !counterparties.data?.page.hasNext}
          onClick={() => setCounterpartyPage((page) => page + 1)}
        >
          Следующие контрагенты
        </Button>
      </div>
      <Controller
        name="relation"
        control={form.control}
        render={({ field }) => (
          <Field htmlFor={`${id}-relation`} label="Как учитывать в прогнозе">
            <Select
              id={`${id}-relation`}
              value={field.value}
              onValueChange={(value) => {
                field.onChange(value);
                form.setValue("recurringPatternId", null);
                form.setValue("baselineCounterpartyKey", null);
                form.setValue("additionalConfirmed", false);
              }}
              disabled={disabled}
              options={[
                { value: "ADDITIONAL", label: "Дополнительно к ожидаемым потокам" },
                { value: "REPLACES_RECURRING", label: "Вместо регулярного платежа" },
                { value: "REPLACES_BASELINE", label: "Вместо базового потока контрагента" },
              ]}
            />
          </Field>
        )}
      />
      {relation === "ADDITIONAL" && (
        <Controller
          name="additionalConfirmed"
          control={form.control}
          render={({ field }) => (
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <Checkbox
                  id={`${id}-confirm`}
                  checked={field.value}
                  onCheckedChange={(value) => field.onChange(value === true)}
                  disabled={disabled}
                />
                <label htmlFor={`${id}-confirm`} className="pt-2 text-sm">
                  Подтверждаю, что этот платёж не дублирует ожидаемый поток
                </label>
              </div>
              {err("additionalConfirmed") && (
                <p role="alert" className="text-danger text-sm">
                  {err("additionalConfirmed")}
                </p>
              )}
            </div>
          )}
        />
      )}
      {relation === "REPLACES_RECURRING" && (
        <>
          <QueryState query={recurring} recovery={scope.recovery} />
          <Controller
            name="recurringPatternId"
            control={form.control}
            render={({ field }) => (
              <Field
                htmlFor={`${id}-recurring`}
                label="Заменяемая регулярность"
                error={err("recurringPatternId")}
              >
                <Select
                  id={`${id}-recurring`}
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  disabled={disabled || recurring.isError}
                  options={(recurring.data?.items ?? [])
                    .filter((item) => item.status === "CONFIRMED" && item.direction === direction)
                    .map((item) => ({ value: item.id, label: `${item.categoryCode} · ${item.amount} ₽` }))}
                />
              </Field>
            )}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={disabled || recurringPage === 0}
              onClick={() => setRecurringPage((page) => page - 1)}
            >
              Предыдущие правила
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={disabled || !recurring.data?.page.hasNext}
              onClick={() => setRecurringPage((page) => page + 1)}
            >
              Следующие правила
            </Button>
          </div>
        </>
      )}
      {relation === "REPLACES_BASELINE" && (
        <>
          <p role="status" className="bg-warning-soft text-warning-soft-foreground rounded-md p-4 text-sm">
            Все базовые потоки выбранного контрагента и направления на 30 дней заменяются открытыми планами.
            Это может убрать ожидаемые платежи, которые вы не добавили в планы.
          </p>
          <Controller
            name="baselineCounterpartyKey"
            control={form.control}
            render={({ field }) => (
              <Field
                htmlFor={`${id}-baseline`}
                label="Заменяемый контрагент"
                error={err("baselineCounterpartyKey")}
              >
                <Select
                  id={`${id}-baseline`}
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  disabled={disabled || counterparties.isError}
                  options={(counterparties.data?.items ?? []).map((item) => ({
                    value: item.key,
                    label: item.name ?? item.inn ?? item.key,
                  }))}
                />
              </Field>
            )}
          />
        </>
      )}
      <Controller
        name="note"
        control={form.control}
        render={({ field }) => (
          <Field htmlFor={`${id}-note`} label="Примечание" hint="Необязательно">
            <Textarea
              id={`${id}-note`}
              value={field.value ?? ""}
              onChange={(event) => field.onChange(event.target.value || null)}
              disabled={disabled}
            />
          </Field>
        )}
      />
    </>
  );
}
function PlanEditor({ scope, value, onClose }: { scope: BusinessScope; value?: Plan; onClose: () => void }) {
  const refresh = useRefresh(scope);
  const initial: EditorDraft =
    value && value.direction !== "UNKNOWN" && value.relation !== "UNKNOWN"
      ? {
          title: value.title,
          direction: value.direction,
          amount: value.amount,
          dueDate: value.dueDate,
          categoryCode: value.categoryCode,
          counterpartyKey: value.counterpartyKey,
          note: value.note,
          relation: value.relation,
          recurringPatternId: value.recurringPatternId,
          baselineCounterpartyKey: value.baselineCounterpartyKey,
          additionalConfirmed: true,
        }
      : defaults;
  return (
    <Section title={value ? "Редактировать будущий платёж" : "Новый будущий платёж"}>
      <p className="text-muted-foreground text-sm">
        План не добавляет банковскую операцию. Исполненную сумму сервер связывает с фактом отдельно.
      </p>
      {value ? (
        <VersionedForm
          schema={editorSchema}
          defaults={initial}
          resource={value}
          queryKey={[...cashflowKeys.resource(scope.company.id, scope.account.id, "plan-edit"), value.id]}
          read={(signal) => cashflowApi.plan(scope.company.id, scope.account.id, value.id, signal)}
          active={scope.writable && scope.active && !scope.busy}
          write={(draft, version) =>
            cashflowApi.updatePlan(scope.company.id, scope.account.id, value.id, wire(draft), version)
          }
          onSaved={() => {
            refresh();
            onClose();
          }}
          recovery={scope.recovery}
          label="Сохранить изменения"
          onClose={onClose}
        >
          {(form, disabled) => <PlanFields scope={scope} form={form} disabled={disabled} />}
        </VersionedForm>
      ) : (
        <PostForm
          schema={editorSchema}
          defaults={initial}
          active={scope.writable && scope.active && !scope.busy}
          execute={(draft, key) =>
            cashflowApi.createPlan(scope.company.id, scope.account.id, wire(draft), key)
          }
          onSuccess={() => {
            refresh();
            onClose();
          }}
          recovery={scope.recovery}
          label="Создать платёж"
          onClose={onClose}
        >
          {(form, disabled) => <PlanFields scope={scope} form={form} disabled={disabled} />}
        </PostForm>
      )}
    </Section>
  );
}
function PlanDetail({ scope, id, onClose }: { scope: BusinessScope; id: string; onClose: () => void }) {
  const query = useCashflow(
    scope.company.id,
    scope.account.id,
    "plan-detail",
    (signal) => cashflowApi.plan(scope.company.id, scope.account.id, id, signal),
    scope.active,
    [id],
  );
  const [edit, setEdit] = useState(false),
    [cancel, setCancel] = useState(false);
  const [allocationPage, setAllocationPage] = useState(0),
    [paymentPage, setPaymentPage] = useState(0);
  const refresh = useRefresh(scope);
  const readable = visible(query) && !query.isError;
  const allocations = useCashflow(
    scope.company.id,
    scope.account.id,
    "allocations",
    (signal) => cashflowApi.allocations(scope.company.id, id, allocationPage, signal),
    scope.active && readable,
    [id, allocationPage],
  );
  const payments = useCashflow(
    scope.company.id,
    scope.account.id,
    "allocation-payments",
    (signal) =>
      paymentsApi.list(
        scope.company.id,
        scope.account.id,
        {
          sort: "operationDate,desc",
          ...(query.data?.direction !== "UNKNOWN" ? { direction: query.data?.direction } : {}),
        },
        paymentPage,
        signal,
      ),
    scope.active && readable && scope.writable,
    [id, paymentPage],
  );
  const active =
    scope.writable &&
    scope.company.permissions.canManagePlans &&
    query.data?.direction !== "UNKNOWN" &&
    query.data?.relation !== "UNKNOWN" &&
    readable &&
    query.data?.status !== "CANCELLED" &&
    query.data?.status !== "SETTLED" &&
    query.data?.status !== "UNKNOWN";
  return (
    <Section title="Подробности будущего платежа">
      <Button size="sm" variant="ghost" onClick={onClose}>
        Закрыть подробности
      </Button>
      <QueryState query={query} recovery={scope.recovery} />
      {visible(query) && query.data && (
        <>
          <h3 className="text-lg font-semibold break-words">{query.data.title}</h3>
          <p>
            Дата: {query.data.dueDate} · {query.data.source}
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Исходная сумма", query.data.amount],
              ["Исполнено", query.data.settledAmount],
              ["Осталось", query.data.remainingAmount],
            ].map(([label, amount]) => (
              <div key={label}>
                <p className="text-muted-foreground text-sm">{label}</p>
                {amount === undefined ? <p>Нет данных</p> : <Amount value={amount} animated={false} />}
              </div>
            ))}
          </div>
          {query.data.overdue && (
            <p className="text-warning-soft-foreground text-sm">
              Платёж просрочен. Он не переносится автоматически на завтра: уточните ожидаемую дату.
            </p>
          )}
          {query.data.sourceDocument && (
            <p className="text-muted-foreground text-sm">
              Внешний документ: {query.data.sourceDocument.externalSystem} ·{" "}
              {query.data.sourceDocument.documentNumber ?? query.data.sourceDocument.externalId}. Получен{" "}
              {query.data.knownAt}.
            </p>
          )}
          {active && (
            <div className="flex flex-wrap gap-3">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setEdit(!edit);
                  setCancel(false);
                }}
              >
                Редактировать платёж
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setCancel(!cancel);
                  setEdit(false);
                }}
              >
                Отменить неоплаченную часть
              </Button>
            </div>
          )}
          {edit && active && <PlanEditor scope={scope} value={query.data} onClose={() => setEdit(false)} />}
          {cancel && active && (
            <PostForm
              schema={reasonSchema.extend({ version: versionSchema })}
              defaults={{ reason: "", version: query.data.version }}
              active={!scope.busy}
              recovery={scope.recovery}
              label="Подтвердить отмену"
              execute={(value, key) =>
                cashflowApi.cancelPlan(
                  scope.company.id,
                  scope.account.id,
                  id,
                  value.reason,
                  value.version,
                  key,
                )
              }
              versionRead={{
                queryKey: ["cancel-plan", scope.company.id, scope.account.id, id],
                read: (signal) => cashflowApi.plan(scope.company.id, scope.account.id, id, signal),
              }}
              onSuccess={() => {
                refresh();
                setCancel(false);
              }}
              onClose={() => setCancel(false)}
            >
              {(form, disabled) => (
                <Field
                  htmlFor="cancel-reason"
                  label="Причина отмены"
                  error={form.formState.errors.reason?.message}
                >
                  <Input id="cancel-reason" {...form.register("reason")} disabled={disabled} />
                </Field>
              )}
            </PostForm>
          )}
          <h3 className="font-semibold">Сопоставление с оплатами из выписки</h3>
          <p className="text-muted-foreground text-sm">
            Связь уменьшает неоплаченную часть плана; банковский факт не создаётся повторно. Лимиты и
            направление проверяет сервер.
          </p>
          <QueryState query={allocations} recovery={scope.recovery} />
          {visible(allocations) && allocations.data && (
            <>
              {allocations.data.items.length === 0 && (
                <p className="text-muted-foreground text-sm">Оплаты пока не сопоставлены.</p>
              )}
              {allocations.data.items.map((item) => (
                <div key={item.id} className="border-border space-y-3 rounded-md border p-4">
                  <Amount value={item.amount} animated={false} />
                  <p className="text-muted-foreground text-sm break-all">Операция {item.paymentId}</p>
                  {scope.writable && scope.company.permissions.canManagePlans && !query.isError && (
                    <VersionedForm
                      schema={z.object({}).strict()}
                      defaults={{}}
                      resource={query.data}
                      queryKey={["reverse-allocation", scope.company.id, id, item.id]}
                      read={(signal) => cashflowApi.plan(scope.company.id, scope.account.id, id, signal)}
                      write={async (_value, version) => {
                        await cashflowApi.deleteAllocation(scope.company.id, id, item.id, version);
                        return cashflowApi.plan(
                          scope.company.id,
                          scope.account.id,
                          id,
                          new AbortController().signal,
                        );
                      }}
                      active={scope.active && !scope.busy}
                      recovery={scope.recovery}
                      label="Снять сопоставление"
                      onSaved={refresh}
                    >
                      {() => (
                        <p className="text-muted-foreground text-sm">
                          Удаляется связь, не операция и не её история.
                        </p>
                      )}
                    </VersionedForm>
                  )}
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={allocationPage === 0}
                  onClick={() => setAllocationPage((page) => page - 1)}
                >
                  Предыдущие оплаты
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!allocations.data.page.hasNext}
                  onClick={() => setAllocationPage((page) => page + 1)}
                >
                  Следующие оплаты
                </Button>
              </div>
            </>
          )}
          {active && (
            <Section title="Сопоставить оплату">
              <QueryState query={payments} recovery={scope.recovery} />
              <PostForm
                schema={allocationDraftSchema.extend({ version: versionSchema })}
                defaults={{ paymentId: "", amount: "", version: query.data.version }}
                active={!scope.busy && !payments.isError && !allocations.isError}
                recovery={scope.recovery}
                label="Сопоставить оплату"
                execute={(draft, key) =>
                  cashflowApi.allocate(
                    scope.company.id,
                    id,
                    { paymentId: draft.paymentId, amount: draft.amount },
                    draft.version,
                    key,
                  )
                }
                versionRead={{
                  queryKey: ["allocate-check", scope.company.id, scope.account.id, id],
                  read: (signal) => cashflowApi.plan(scope.company.id, scope.account.id, id, signal),
                }}
                onSuccess={refresh}
              >
                {(form, disabled) => (
                  <>
                    <Controller
                      name="paymentId"
                      control={form.control}
                      render={({ field }) => (
                        <Field
                          htmlFor="allocation-payment"
                          label="Операция из выписки"
                          error={form.formState.errors.paymentId?.message}
                        >
                          <Select
                            id="allocation-payment"
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={disabled}
                            options={(payments.data?.items ?? []).map((item) => ({
                              value: item.id,
                              label: `${item.operationDate} · ${item.counterpartyName ?? "Без контрагента"} · ${item.amount} ₽`,
                            }))}
                          />
                        </Field>
                      )}
                    />
                    <Controller
                      name="amount"
                      control={form.control}
                      render={({ field }) => (
                        <Field
                          htmlFor="allocation-amount"
                          label="Сумма сопоставления"
                          error={form.formState.errors.amount?.message}
                        >
                          <MoneyInput
                            id="allocation-amount"
                            value={field.value}
                            onChange={(value) => field.onChange(value ?? "")}
                            disabled={disabled}
                          />
                        </Field>
                      )}
                    />
                  </>
                )}
              </PostForm>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={paymentPage === 0}
                  onClick={() => setPaymentPage((page) => page - 1)}
                >
                  Предыдущие операции
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!payments.data?.page.hasNext}
                  onClick={() => setPaymentPage((page) => page + 1)}
                >
                  Следующие операции
                </Button>
              </div>
            </Section>
          )}
        </>
      )}
    </Section>
  );
}

function RegisterImport({ scope }: { scope: BusinessScope }) {
  const refresh = useRefresh(scope);
  const schema = z.object({ json: z.string().max(2 * 1024 * 1024) }).superRefine((value, context) => {
    try {
      const parsed = externalRegisterSchema.safeParse(JSON.parse(value.json));
      if (!parsed.success || parsed.data.items.some((item) => item.accountId !== scope.account.id))
        context.addIssue({
          code: "custom",
          path: ["json"],
          message: "Проверьте JSON реестра и ID выбранного счёта",
        });
    } catch {
      context.addIssue({ code: "custom", path: ["json"], message: "Некорректный JSON" });
    }
  });
  return (
    <details className="border-border bg-card rounded-lg border p-5">
      <summary className="cursor-pointer font-medium">Импорт внешнего реестра счетов и налогов</summary>
      <div className="mt-4 space-y-4">
        <p className="text-muted-foreground text-sm">
          Вставьте JSON из согласованного внешнего экспорта, не банковскую выписку. Это не подключение к ФНС и
          не автоматический расчёт налогов. ID выбранного счёта:{" "}
          <span className="break-all">{scope.account.id}</span>.
        </p>
        <PostForm
          schema={schema}
          defaults={{ json: "" }}
          active={scope.writable && !scope.busy}
          recovery={scope.recovery}
          label="Импортировать реестр"
          execute={(draft, key) =>
            cashflowApi.importPlans(
              scope.company.id,
              scope.account.id,
              JSON.parse(draft.json) as ExternalRegister,
              key,
            )
          }
          onSuccess={refresh}
        >
          {(form, disabled) => (
            <Field htmlFor="register-json" label="JSON реестра" error={form.formState.errors.json?.message}>
              <Textarea id="register-json" {...form.register("json")} disabled={disabled} rows={8} />
            </Field>
          )}
        </PostForm>
      </div>
    </details>
  );
}
function Plans({ scope }: { scope: BusinessScope }) {
  const [params] = useSearchParams();
  const [page, setPage] = useState(0),
    [status, setStatus] = useState<"ALL" | "OPEN" | "PARTIALLY_SETTLED" | "SETTLED" | "CANCELLED">("ALL");
  const [creating, setCreating] = useState(false),
    [selected, setSelected] = useState<string | null>(() => {
      const value = z.uuid().safeParse(params.get("plan"));
      return value.success ? value.data : null;
    });
  const query = useCashflow(
    scope.company.id,
    scope.account.id,
    "plans",
    (signal) => cashflowApi.plans(scope.company.id, scope.account.id, page, status, signal),
    scope.active,
    [page, status],
  );
  const allowed = scope.writable && scope.company.permissions.canManagePlans && !query.isError;
  return (
    <div className="space-y-6">
      <ReadOnly scope={scope} />
      <div className="flex flex-wrap items-end gap-4">
        <Field htmlFor="plan-status" label="Состояние">
          <Select
            id="plan-status"
            value={status}
            onValueChange={(value) => {
              setStatus(value as typeof status);
              setPage(0);
              setSelected(null);
            }}
            options={[
              { value: "ALL", label: "Все платежи" },
              { value: "OPEN", label: "Открытые" },
              { value: "PARTIALLY_SETTLED", label: "Частично оплаченные" },
              { value: "SETTLED", label: "Исполненные" },
              { value: "CANCELLED", label: "Отменённые" },
            ]}
          />
        </Field>
        {allowed && (
          <Button
            size="sm"
            disabled={scope.busy || scope.locked}
            onClick={() => {
              setCreating(true);
              setSelected(null);
            }}
          >
            Добавить будущий платёж
          </Button>
        )}
        <Button size="sm" variant="secondary" loading={query.isFetching} onClick={() => void query.refetch()}>
          Обновить платежи
        </Button>
      </div>
      {creating && allowed && <PlanEditor scope={scope} onClose={() => setCreating(false)} />}
      <QueryState query={query} recovery={scope.recovery} />
      {visible(query) && query.data && (
        <>
          {query.data.items.length === 0 ? (
            <NoRows filtered={status !== "ALL"} title="Будущих платежей пока нет" />
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {query.data.items.map((item) => (
                <li key={item.id} className="border-border bg-card space-y-3 rounded-lg border p-5">
                  <h2 className="text-lg font-semibold break-words">{item.title}</h2>
                  <p className="text-muted-foreground text-sm">
                    {item.dueDate} ·{" "}
                    {item.direction === "IN"
                      ? "Поступление"
                      : item.direction === "OUT"
                        ? "Списание"
                        : "Неизвестное направление"}{" "}
                    · {item.status}
                  </p>
                  {item.overdue && <Badge tone="warning">Просрочен · уточните дату</Badge>}
                  <p className="text-sm">
                    Осталось <Amount value={item.remainingAmount} animated={false} />
                  </p>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setSelected(item.id);
                      setCreating(false);
                    }}
                  >
                    Подробнее
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-3">
            <Button
              size="sm"
              variant="secondary"
              disabled={page === 0 || query.isFetching}
              onClick={() => setPage((number) => number - 1)}
            >
              Предыдущая страница
            </Button>
            <p className="text-muted-foreground text-sm">Всего: {query.data.page.total}</p>
            <Button
              size="sm"
              variant="secondary"
              disabled={!query.data.page.hasNext || query.isFetching}
              onClick={() => setPage((number) => number + 1)}
            >
              Следующая страница
            </Button>
          </div>
        </>
      )}
      {selected && (
        <PlanDetail
          key={selected}
          scope={{
            ...scope,
            writable: scope.writable && scope.company.permissions.canManagePlans && !query.isError,
          }}
          id={selected}
          onClose={() => setSelected(null)}
        />
      )}
      {allowed && <RegisterImport scope={scope} />}
    </div>
  );
}
export function PlansPage() {
  return (
    <BusinessWorkspace
      title="Будущие платежи"
      description="Известные поступления и списания отдельно от банковского факта. Планы, частичные оплаты и просрочки без двойного учёта."
    >
      {(scope) => <Plans scope={scope} />}
    </BusinessWorkspace>
  );
}
