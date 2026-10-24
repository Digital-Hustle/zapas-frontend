import { useState, type ReactNode } from "react";
import { useIsMutating } from "@tanstack/react-query";
import { Button } from "@zapas/ui";
import { usePrivateQueries } from "@/entities/auth-profile";
import { canWriteAccounts, type Company, type Account } from "@/entities/workspace";
import { ArchiveForm, BalanceForm, EditAccountForm, EditCompanyForm } from "@/features/manage-workspace";

export function CompanyActions({
  company,
  stale,
  recovery,
}: {
  company: Company;
  stale: boolean;
  recovery: ReactNode;
}) {
  const [action, setAction] = useState<"edit" | "archive" | null>(null);
  const busy = useIsMutating() > 0;
  const { privateQueries } = usePrivateQueries();
  const writable =
    privateQueries &&
    !stale &&
    !company.archived &&
    company.role === "OWNER" &&
    company.permissions.canEditCompany;
  return (
    <section
      aria-label="Реквизиты выбранной организации"
      className="border-border bg-card space-y-4 rounded-lg border p-5 sm:p-6"
    >
      <h2 className="text-xl font-semibold break-words">Реквизиты: {company.name}</h2>
      <div className="text-muted-foreground grid gap-2 text-sm sm:grid-cols-2">
        <p className="break-all">ИНН: {company.inn ?? "Не указан"}</p>
        <p className="break-all">КПП: {company.kpp ?? "Не указан"}</p>
      </div>
      {writable && (
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => setAction("edit")}>
            Редактировать организацию
          </Button>
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => setAction("archive")}>
            Архивировать организацию
          </Button>
        </div>
      )}
      {writable && action === "edit" && (
        <EditCompanyForm company={company} onClose={() => setAction(null)} recovery={recovery} />
      )}
      {writable && action === "archive" && (
        <ArchiveForm company={company} onClose={() => setAction(null)} recovery={recovery} />
      )}
    </section>
  );
}
export function AccountActions({
  company,
  account,
  stale,
  recovery,
}: {
  company: Company;
  account: Account;
  stale: boolean;
  recovery: ReactNode;
}) {
  const [action, setAction] = useState<"edit" | "archive" | "balance" | null>(null);
  const busy = useIsMutating() > 0;
  const { privateQueries } = usePrivateQueries();
  const writable = privateQueries && !stale && !account.archived && canWriteAccounts(company);
  return (
    <div className="mt-5 flex flex-wrap gap-3">
      {writable && (
        <>
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => setAction("edit")}>
            Редактировать счёт
          </Button>
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => setAction("balance")}>
            Указать остаток
          </Button>
          {company.role === "OWNER" && (
            <Button variant="secondary" size="sm" disabled={busy} onClick={() => setAction("archive")}>
              Архивировать счёт
            </Button>
          )}
        </>
      )}
      {writable && action === "edit" && (
        <EditAccountForm
          company={company}
          account={account}
          onClose={() => setAction(null)}
          recovery={recovery}
        />
      )}
      {writable && action === "balance" && (
        <BalanceForm
          company={company}
          account={account}
          onClose={() => setAction(null)}
          recovery={recovery}
        />
      )}
      {writable && action === "archive" && company.role === "OWNER" && (
        <ArchiveForm
          company={company}
          account={account}
          onClose={() => setAction(null)}
          recovery={recovery}
        />
      )}
    </div>
  );
}
