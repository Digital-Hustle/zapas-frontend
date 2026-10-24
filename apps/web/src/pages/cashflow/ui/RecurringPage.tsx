import { useCallback, useId, useState } from "react";
import { Controller } from "react-hook-form";
import { z } from "zod";
import { Amount, Badge, Button, DatePicker, Field, MoneyInput, Select } from "@zapas/ui";
import { BusinessWorkspace, type BusinessScope } from "@/widgets/business-workspace";
import {
  cashflowApi,
  useCashflow,
  recurringDraftSchema,
  businessDate,
  type Recurring,
  type RecurringDraft,
  type Job,
} from "@/entities/cashflow";
import { PostForm, VersionedForm } from "@/features/cashflow-actions";
import { JobStatus, NoRows, QueryState, ReadOnly, Section } from "./parts.tsx";
import { useRefresh, visible } from "../model/helpers.ts";

function EditRecurring({
  scope,
  rule,
  onClose,
}: {
  scope: BusinessScope;
  rule: Recurring;
  onClose: () => void;
}) {
  const id = useId();
  const refresh = useRefresh(scope);
  const initial: RecurringDraft = {
    status: rule.status === "UNKNOWN" ? "DETECTED" : rule.status,
    schedule: rule.schedule,
    amount: rule.amount,
  };
  return (
    <Section title="Уточнить регулярный платёж">
      <VersionedForm
        schema={recurringDraftSchema}
        defaults={initial}
        resource={rule}
        queryKey={["recurring-edit", scope.company.id, scope.account.id, rule.id]}
        read={async (signal) => {
          const current = await cashflowApi.recurring(scope.company.id, scope.account.id, 0, signal);
          let found = current.items.find((item) => item.id === rule.id),
            page = 1,
            hasNext = current.page.hasNext;
          while (!found && hasNext) {
            const next = await cashflowApi.recurring(scope.company.id, scope.account.id, page++, signal);
            found = next.items.find((item) => item.id === rule.id);
            hasNext = next.page.hasNext;
          }
          if (!found) throw new Error("Правило не найдено");
          return found;
        }}
        write={(draft, version) =>
          cashflowApi.updateRecurring(scope.company.id, scope.account.id, rule.id, draft, version)
        }
        active={scope.writable && scope.active && !scope.busy}
        recovery={scope.recovery}
        label="Сохранить регулярность"
        onSaved={() => {
          refresh();
          onClose();
        }}
        onClose={onClose}
      >
        {(form, disabled) => (
          <>
            <Controller
              name="status"
              control={form.control}
              render={({ field }) => (
                <Field htmlFor={`${id}-status`} label="Использование в прогнозе">
                  <Select
                    id={`${id}-status`}
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={disabled}
                    options={[
                      { value: "DETECTED", label: "Кандидат — не учитывать" },
                      { value: "CONFIRMED", label: "Подтвердить — учитывать" },
                      { value: "EXCLUDED", label: "Исключить" },
                    ]}
                  />
                </Field>
              )}
            />
            <Controller
              name="amount"
              control={form.control}
              render={({ field }) => (
                <Field
                  htmlFor={`${id}-amount`}
                  label="Сумма регулярного платежа"
                  error={form.formState.errors.amount?.message}
                >
                  <MoneyInput
                    id={`${id}-amount`}
                    value={field.value}
                    onChange={(value) => field.onChange(value ?? "")}
                    disabled={disabled}
                  />
                </Field>
              )}
            />
            <Controller
              name="schedule.frequency"
              control={form.control}
              render={({ field }) => (
                <Field htmlFor={`${id}-frequency`} label="Периодичность">
                  <Select
                    id={`${id}-frequency`}
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue("schedule.weekday", value === "WEEKLY" ? 1 : null);
                      form.setValue("schedule.dayOfMonth", value === "MONTHLY" ? 1 : null);
                    }}
                    disabled={disabled}
                    options={[
                      { value: "WEEKLY", label: "Каждую неделю" },
                      { value: "MONTHLY", label: "Каждый месяц" },
                    ]}
                  />
                </Field>
              )}
            />
            {form.watch("schedule.frequency") === "WEEKLY" ? (
              <Controller
                name="schedule.weekday"
                control={form.control}
                render={({ field }) => (
                  <Field htmlFor={`${id}-day`} label="День недели">
                    <Select
                      id={`${id}-day`}
                      value={String(field.value ?? "")}
                      onValueChange={(value) => field.onChange(Number(value))}
                      disabled={disabled}
                      options={[
                        "Понедельник",
                        "Вторник",
                        "Среда",
                        "Четверг",
                        "Пятница",
                        "Суббота",
                        "Воскресенье",
                      ].map((label, index) => ({ value: String(index + 1), label }))}
                    />
                  </Field>
                )}
              />
            ) : (
              <Controller
                name="schedule.dayOfMonth"
                control={form.control}
                render={({ field }) => (
                  <Field htmlFor={`${id}-day`} label="Число месяца">
                    <Select
                      id={`${id}-day`}
                      value={String(field.value ?? "")}
                      onValueChange={(value) => field.onChange(Number(value))}
                      disabled={disabled}
                      options={Array.from({ length: 31 }, (_, index) => ({
                        value: String(index + 1),
                        label: String(index + 1),
                      }))}
                    />
                  </Field>
                )}
              />
            )}
            <Controller
              name="schedule.businessDayRule"
              control={form.control}
              render={({ field }) => (
                <Field htmlFor={`${id}-business-day`} label="Если дата приходится на выходной">
                  <Select
                    id={`${id}-business-day`}
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={disabled}
                    options={[
                      { value: "NONE", label: "Не переносить" },
                      { value: "FOLLOWING", label: "Следующий рабочий день" },
                    ]}
                  />
                </Field>
              )}
            />
            <p className="text-muted-foreground text-sm">
              В v1 рабочие дни — понедельник–пятница, без официального производственного календаря. 31-е число
              в коротком месяце означает последний день месяца.
            </p>
          </>
        )}
      </VersionedForm>
    </Section>
  );
}
function RecurringContent({ scope }: { scope: BusinessScope }) {
  const [page, setPage] = useState(0),
    [editing, setEditing] = useState<Recurring | null>(null),
    [job, setJob] = useState<Job | null>(null);
  const query = useCashflow(
    scope.company.id,
    scope.account.id,
    "recurring",
    (signal) => cashflowApi.recurring(scope.company.id, scope.account.id, page, signal),
    scope.active,
    [page],
  );
  const refresh = useRefresh(scope);
  const finished = useCallback(
    (value: Job) => {
      setJob(value);
      refresh();
    },
    [refresh],
  );
  const allowed = scope.writable && scope.company.permissions.canManagePlans && !query.isError;
  const activeJob = job?.status === "QUEUED" || job?.status === "RUNNING";
  return (
    <div className="space-y-6">
      <ReadOnly scope={scope} />
      <p className="text-muted-foreground">
        Найденная регулярность — только кандидат. Пока вы её не подтвердите, она не включается в будущий
        календарь.
      </p>
      {allowed && !activeJob && (
        <Section title="Поиск по истории">
          <PostForm
            schema={z.object({ asOfDate: z.iso.date() }).refine((value) => value.asOfDate <= businessDate(), {
              path: ["asOfDate"],
              message: "Выберите дату не позже сегодня",
            })}
            defaults={{ asOfDate: businessDate() }}
            active={!scope.busy}
            recovery={scope.recovery}
            label="Найти регулярности"
            execute={(draft, key) =>
              cashflowApi.detect(scope.company.id, scope.account.id, draft.asOfDate, key)
            }
            onSuccess={(value) => setJob(value)}
          >
            {(form, disabled) => (
              <Controller
                name="asOfDate"
                control={form.control}
                render={({ field }) => (
                  <Field
                    htmlFor="detect-date"
                    label="История по дату"
                    error={form.formState.errors.asOfDate?.message}
                  >
                    <DatePicker
                      id="detect-date"
                      value={field.value}
                      onValueChange={(value) => field.onChange(value ?? "")}
                      disabled={disabled}
                    />
                  </Field>
                )}
              />
            )}
          </PostForm>
        </Section>
      )}
      {job && <JobStatus key={job.id} scope={scope} initial={job} onFinished={finished} />}
      <Button size="sm" variant="secondary" loading={query.isFetching} onClick={() => void query.refetch()}>
        Обновить регулярности
      </Button>
      <QueryState query={query} recovery={scope.recovery} />
      {visible(query) && query.data && (
        <>
          {query.data.items.length === 0 ? (
            <NoRows title="Регулярности пока не найдены" />
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {query.data.items.map((rule) => (
                <li key={rule.id} className="border-border bg-card space-y-3 rounded-lg border p-5">
                  <h2 className="text-lg font-semibold">
                    {rule.categoryCode} ·{" "}
                    {rule.direction === "IN"
                      ? "Поступление"
                      : rule.direction === "OUT"
                        ? "Списание"
                        : "Неизвестное направление"}
                  </h2>
                  <Badge>
                    {rule.status === "CONFIRMED"
                      ? "Подтверждено"
                      : rule.status === "EXCLUDED"
                        ? "Исключено"
                        : rule.status === "DETECTED"
                          ? "Кандидат"
                          : "Неизвестный статус"}
                  </Badge>
                  <Amount value={rule.amount} animated={false} />
                  <p className="text-muted-foreground text-sm">
                    {rule.schedule.frequency === "WEEKLY"
                      ? `Еженедельно, день ${rule.schedule.weekday}`
                      : `Ежемесячно, число ${rule.schedule.dayOfMonth}`}{" "}
                    · Наблюдений: {rule.observations}
                  </p>
                  {allowed && rule.status !== "UNKNOWN" && rule.direction !== "UNKNOWN" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={scope.busy || scope.locked}
                      onClick={() => setEditing(rule)}
                    >
                      Подтвердить или уточнить
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-3">
            <Button
              size="sm"
              variant="secondary"
              disabled={page === 0}
              onClick={() => setPage((value) => value - 1)}
            >
              Предыдущая страница
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={!query.data.page.hasNext}
              onClick={() => setPage((value) => value + 1)}
            >
              Следующая страница
            </Button>
          </div>
        </>
      )}
      {editing && allowed && (
        <EditRecurring key={editing.id} scope={scope} rule={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
export function RecurringPage() {
  return (
    <BusinessWorkspace
      title="Регулярности"
      description="Повторяющиеся платежи и поступления: найти по истории, подтвердить и уточнить расписание."
    >
      {(scope) => <RecurringContent scope={scope} />}
    </BusinessWorkspace>
  );
}
