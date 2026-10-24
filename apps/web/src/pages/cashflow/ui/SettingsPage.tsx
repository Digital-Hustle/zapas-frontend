import { useId, useState } from "react";
import { Controller } from "react-hook-form";
import { z } from "zod";
import { Button, Checkbox, DatePicker, Field, Input, MoneyInput, Select } from "@zapas/ui";
import { BusinessWorkspace, type BusinessScope } from "@/widgets/business-workspace";
import { useProfile } from "@/entities/auth-profile";
import {
  cashflowApi,
  useCashflow,
  settingsDraftSchema,
  memberDraftSchema,
  completenessDraftSchema,
  businessDate,
  type AccountSettings,
  type Member,
} from "@/entities/cashflow";
import { PostForm, VersionedForm } from "@/features/cashflow-actions";
import { NoRows, QueryState, ReadOnly, Section } from "./parts.tsx";
import { useRefresh, visible } from "../model/helpers.ts";

function SettingsForm({ scope, value }: { scope: BusinessScope; value: AccountSettings }) {
  const id = useId(),
    refresh = useRefresh(scope);
  return (
    <VersionedForm
      schema={settingsDraftSchema}
      defaults={{ forecast: value.forecast, autoRecalculate: value.autoRecalculate }}
      resource={value}
      queryKey={["settings-edit", scope.company.id, scope.account.id]}
      active={scope.writable && scope.active && !scope.busy}
      recovery={scope.recovery}
      label="Сохранить настройки"
      read={(signal) => cashflowApi.settings(scope.company.id, scope.account.id, signal)}
      write={(draft, version) =>
        cashflowApi.updateSettings(scope.company.id, scope.account.id, draft, version)
      }
      onSaved={refresh}
    >
      {(form, disabled) => (
        <>
          <Controller
            name="forecast.windowWeeks"
            control={form.control}
            render={({ field }) => (
              <Field htmlFor={`${id}-window`} label="Окно истории">
                <Select
                  id={`${id}-window`}
                  value={String(field.value)}
                  onValueChange={(value) => field.onChange(Number(value))}
                  disabled={disabled}
                  options={[8, 10, 12].map((value) => ({ value: String(value), label: `${value} недель` }))}
                />
              </Field>
            )}
          />
          <Controller
            name="forecast.bufferAmount"
            control={form.control}
            render={({ field }) => (
              <Field
                htmlFor={`${id}-buffer`}
                label="Минимальный запас денег"
                error={form.formState.errors.forecast?.bufferAmount?.message}
              >
                <MoneyInput
                  id={`${id}-buffer`}
                  value={field.value}
                  onChange={(value) => field.onChange(value ?? "")}
                  disabled={disabled}
                  invalid={Boolean(form.formState.errors.forecast?.bufferAmount)}
                />
              </Field>
            )}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              name="forecast.scenarioCount"
              control={form.control}
              render={({ field }) => (
                <Field
                  htmlFor={`${id}-count`}
                  label="Количество исторических сценариев"
                  error={form.formState.errors.forecast?.scenarioCount?.message}
                >
                  <Input
                    id={`${id}-count`}
                    inputMode="numeric"
                    value={Number.isNaN(field.value) ? "" : field.value}
                    onChange={(event) =>
                      field.onChange(event.target.value === "" ? NaN : Number(event.target.value))
                    }
                    disabled={disabled}
                  />
                </Field>
              )}
            />
            <Controller
              name="forecast.minCalibrationOrigins"
              control={form.control}
              render={({ field }) => (
                <Field
                  htmlFor={`${id}-origins`}
                  label="Минимум зрелых исторических срезов"
                  error={form.formState.errors.forecast?.minCalibrationOrigins?.message}
                >
                  <Input
                    id={`${id}-origins`}
                    inputMode="numeric"
                    value={Number.isNaN(field.value) ? "" : field.value}
                    onChange={(event) =>
                      field.onChange(event.target.value === "" ? NaN : Number(event.target.value))
                    }
                    disabled={disabled}
                  />
                </Field>
              )}
            />
          </div>
          <Controller
            name="autoRecalculate"
            control={form.control}
            render={({ field }) => (
              <div className="flex items-center gap-3">
                <Checkbox
                  id={`${id}-auto`}
                  checked={field.value}
                  onCheckedChange={(value) => field.onChange(value === true)}
                  disabled={disabled}
                />
                <label htmlFor={`${id}-auto`} className="text-sm">
                  Автоматически пересчитывать после изменения данных
                </label>
              </div>
            )}
          />
          <p className="text-muted-foreground text-sm">
            Горизонт — 30 дней. Алгоритм — средние по дням недели и календарь; без ML. Шаг калибровочных
            срезов — 7 дней. Параметры риска не гарантируют калиброванную вероятность.
          </p>
        </>
      )}
    </VersionedForm>
  );
}
function MemberCard({
  scope,
  member,
  onSaved,
}: {
  scope: BusinessScope;
  member: Member;
  onSaved: () => void;
}) {
  const [role, setRole] = useState<"ACCOUNTANT" | "VIEWER">(
    member.role === "ACCOUNTANT" ? "ACCOUNTANT" : "VIEWER",
  );
  const writable =
    scope.company.role === "OWNER" &&
    scope.company.permissions.canManageMembers &&
    scope.writable &&
    member.role !== "OWNER" &&
    member.role !== "UNKNOWN";
  const read = async (signal: AbortSignal) => {
    let page = 0,
      hasNext = true;
    while (hasNext) {
      const current = await cashflowApi.members(scope.company.id, page++, signal);
      const found = current.items.find((item) => item.userId === member.userId);
      if (found) return found;
      hasNext = current.page.hasNext;
    }
    throw new Error("Участник не найден");
  };
  return (
    <div className="border-border space-y-3 rounded-md border p-4">
      <p className="text-sm break-all">{member.userId}</p>
      <p className="text-muted-foreground text-sm">
        {member.role === "OWNER"
          ? "Владелец"
          : member.role === "ACCOUNTANT"
            ? "Бухгалтер"
            : member.role === "VIEWER"
              ? "Просмотр"
              : "Неизвестная роль"}
      </p>
      {writable && (
        <>
          <Field htmlFor={`role-${member.userId}`} label="Новая роль">
            <Select
              id={`role-${member.userId}`}
              value={role}
              onValueChange={(value) => setRole(value as typeof role)}
              disabled={scope.busy || scope.locked || !scope.active}
              options={[
                { value: "ACCOUNTANT", label: "Бухгалтер" },
                { value: "VIEWER", label: "Просмотр" },
              ]}
            />
          </Field>
          <VersionedForm
            schema={z.object({}).strict()}
            defaults={{}}
            resource={member}
            queryKey={["member-version", scope.company.id, member.userId]}
            read={read}
            write={(_value, version) =>
              cashflowApi.updateMember(scope.company.id, member.userId, role, version)
            }
            active={scope.active && !scope.busy}
            recovery={scope.recovery}
            label="Сохранить роль"
            onSaved={onSaved}
          >
            {() => null}
          </VersionedForm>
          <details>
            <summary className="text-danger cursor-pointer text-sm">Удалить доступ участника</summary>
            <div className="mt-3">
              <VersionedForm
                schema={z.object({ confirmed: z.literal(true, { error: "Подтвердите удаление доступа" }) })}
                defaults={{ confirmed: true }}
                resource={member}
                queryKey={["member-remove", scope.company.id, member.userId]}
                read={read}
                write={async (_value, version) => {
                  await cashflowApi.removeMember(scope.company.id, member.userId, version);
                  return member;
                }}
                active={scope.active && !scope.busy}
                recovery={scope.recovery}
                label="Подтвердить удаление участника"
                onSaved={onSaved}
              >
                {() => (
                  <p className="text-muted-foreground text-sm">
                    Участник потеряет доступ; финансовая история не удаляется.
                  </p>
                )}
              </VersionedForm>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
function Members({ scope }: { scope: BusinessScope }) {
  const [page, setPage] = useState(0);
  const query = useCashflow(
    scope.company.id,
    scope.account.id,
    "members",
    (signal) => cashflowApi.members(scope.company.id, page, signal),
    scope.active && ["OWNER", "ACCOUNTANT"].includes(scope.company.role),
    [page],
  );
  const refresh = useRefresh(scope),
    profile = useProfile();
  if (!["OWNER", "ACCOUNTANT"].includes(scope.company.role))
    return (
      <p className="text-muted-foreground text-sm">Список участников доступен владельцу и бухгалтеру.</p>
    );
  return (
    <Section title="Участники бизнеса">
      <p className="text-muted-foreground text-sm">
        Добавление по ID уже зарегистрированного пользователя. Поиск и приглашения по email в этот API не
        входят.
      </p>
      {profile.data && <p className="text-sm break-all">Ваш ID: {profile.data.id}</p>}
      <QueryState query={query} recovery={scope.recovery} />
      {visible(query) && query.data && (
        <>
          {query.data.items.length === 0 ? (
            <NoRows title="Участники не загружены" />
          ) : (
            query.data.items.map((item) => (
              <MemberCard
                key={`${item.userId}/${item.version}`}
                scope={{ ...scope, writable: scope.writable && !query.isError }}
                member={item}
                onSaved={refresh}
              />
            ))
          )}
          <div className="flex flex-wrap gap-3">
            <Button
              size="sm"
              variant="secondary"
              disabled={page === 0}
              onClick={() => setPage((value) => value - 1)}
            >
              Предыдущие участники
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={!query.data.page.hasNext}
              onClick={() => setPage((value) => value + 1)}
            >
              Следующие участники
            </Button>
          </div>
        </>
      )}
      {scope.company.role === "OWNER" &&
        scope.company.permissions.canManageMembers &&
        scope.writable &&
        !query.isError && (
          <PostForm
            schema={memberDraftSchema}
            defaults={{ userId: "", role: "VIEWER" }}
            active={scope.active && !scope.busy}
            recovery={scope.recovery}
            label="Добавить участника"
            execute={(value, key) => cashflowApi.addMember(scope.company.id, value, key)}
            onSuccess={refresh}
          >
            {(form, disabled) => (
              <>
                <Field
                  htmlFor="member-id"
                  label="ID пользователя"
                  error={form.formState.errors.userId?.message}
                >
                  <Input id="member-id" {...form.register("userId")} disabled={disabled} />
                </Field>
                <Controller
                  name="role"
                  control={form.control}
                  render={({ field }) => (
                    <Field htmlFor="member-role" label="Роль участника">
                      <Select
                        id="member-role"
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={disabled}
                        options={[
                          { value: "VIEWER", label: "Просмотр" },
                          { value: "ACCOUNTANT", label: "Бухгалтер" },
                        ]}
                      />
                    </Field>
                  )}
                />
              </>
            )}
          </PostForm>
        )}
    </Section>
  );
}
function Completeness({ scope }: { scope: BusinessScope }) {
  const [page, setPage] = useState(0);
  const query = useCashflow(
    scope.company.id,
    scope.account.id,
    "completeness",
    (signal) => cashflowApi.completeness(scope.company.id, scope.account.id, page, signal),
    scope.active,
    [page],
  );
  const refresh = useRefresh(scope);
  return (
    <Section title="Полнота истории">
      <p className="text-muted-foreground text-sm">
        Подтверждение полного периода влияет на прогноз: день без строк становится подтверждённым нулевым
        потоком. Не подтверждайте неполную выписку.
      </p>
      <QueryState query={query} recovery={scope.recovery} />
      {visible(query) && query.data && (
        <>
          {query.data.items.map((item) => (
            <p key={item.id} className="text-sm">
              {item.fromDate} — {item.toDate} ·{" "}
              {item.completeness === "CONFIRMED_COMPLETE" ? "Полнота подтверждена" : "Полнота неизвестна"} ·{" "}
              {item.reason}
            </p>
          ))}
          {!query.data.items.length && (
            <p className="text-muted-foreground text-sm">Подтверждённых периодов пока нет.</p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button
              size="sm"
              variant="secondary"
              disabled={page === 0}
              onClick={() => setPage((value) => value - 1)}
            >
              Предыдущие периоды
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={!query.data.page.hasNext}
              onClick={() => setPage((value) => value + 1)}
            >
              Следующие периоды
            </Button>
          </div>
        </>
      )}
      {scope.writable && !query.isError && (
        <details>
          <summary className="cursor-pointer font-medium">Уточнить полноту периода</summary>
          <div className="mt-4">
            <PostForm
              schema={completenessDraftSchema}
              defaults={{
                fromDate: businessDate(),
                toDate: businessDate(),
                completeness: "UNKNOWN",
                reason: "",
              }}
              active={scope.active && !scope.busy}
              recovery={scope.recovery}
              label="Сохранить полноту периода"
              execute={(value, key) =>
                cashflowApi.setCompleteness(scope.company.id, scope.account.id, value, key)
              }
              onSuccess={refresh}
            >
              {(form, disabled) => (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {(["fromDate", "toDate"] as const).map((name) => (
                      <Controller
                        key={name}
                        name={name}
                        control={form.control}
                        render={({ field }) => (
                          <Field
                            htmlFor={`complete-${name}`}
                            label={name === "fromDate" ? "Начало периода" : "Конец периода"}
                            error={form.formState.errors[name]?.message}
                          >
                            <DatePicker
                              id={`complete-${name}`}
                              value={field.value}
                              onValueChange={(value) => field.onChange(value ?? "")}
                              disabled={disabled}
                            />
                          </Field>
                        )}
                      />
                    ))}
                  </div>
                  <Controller
                    name="completeness"
                    control={form.control}
                    render={({ field }) => (
                      <Field htmlFor="complete-value" label="Полнота">
                        <Select
                          id="complete-value"
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={disabled}
                          options={[
                            { value: "UNKNOWN", label: "Неизвестно" },
                            { value: "CONFIRMED_COMPLETE", label: "Все операции за период загружены" },
                          ]}
                        />
                      </Field>
                    )}
                  />
                  <Field
                    htmlFor="complete-reason"
                    label="Основание подтверждения"
                    error={form.formState.errors.reason?.message}
                  >
                    <Input id="complete-reason" {...form.register("reason")} disabled={disabled} />
                  </Field>
                </>
              )}
            </PostForm>
          </div>
        </details>
      )}
    </Section>
  );
}
function Settings({ scope }: { scope: BusinessScope }) {
  const query = useCashflow(
    scope.company.id,
    scope.account.id,
    "settings",
    (signal) => cashflowApi.settings(scope.company.id, scope.account.id, signal),
    scope.active,
  );
  return (
    <div className="space-y-6">
      <ReadOnly scope={scope} />
      <Section title="Параметры прогноза">
        <Button size="sm" variant="secondary" loading={query.isFetching} onClick={() => void query.refetch()}>
          Обновить настройки
        </Button>
        <QueryState query={query} recovery={scope.recovery} />
        {visible(query) &&
          query.data &&
          (scope.writable ? (
            <SettingsForm scope={{ ...scope, writable: !query.isError }} value={query.data} />
          ) : (
            <div className="text-sm">
              <p>Окно: {query.data.forecast.windowWeeks} недель</p>
              <p>Горизонт: 30 дней</p>
              <p>Минимальный запас: {query.data.forecast.bufferAmount} ₽</p>
              <p>Автопересчёт: {query.data.autoRecalculate ? "Включён" : "Выключен"}</p>
            </div>
          ))}
      </Section>
      <Completeness scope={scope} />
      <Members scope={scope} />
    </div>
  );
}
export function SettingsPage() {
  return (
    <BusinessWorkspace
      title="Настройки"
      description="Параметры выбранного счёта, полнота истории и доступ к бизнесу. Профиль человека настраивается отдельно."
    >
      {(scope) => <Settings scope={scope} />}
    </BusinessWorkspace>
  );
}
