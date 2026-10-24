import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, type QueryKey } from "@tanstack/react-query";
import { notify } from "@zapas/ui";
import { businessIssue } from "./problem.ts";
import { useCountdown } from "../lib/useCountdown.ts";

export function useVersionedEdit<T, R extends { version: number }>({
  resource,
  queryKey,
  read,
  write,
  onSaved,
  active,
}: {
  resource: R;
  queryKey: QueryKey;
  read: (signal: AbortSignal) => Promise<R>;
  write: (value: T, version: number) => Promise<R>;
  onSaved: (value: R) => void;
  active: boolean;
}) {
  const [version, setVersion] = useState(resource.version);
  const [blocked, setBlocked] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const locked = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const current = useQuery({ queryKey, queryFn: ({ signal }) => read(signal), enabled: false, retry: false });
  const mutation = useMutation({
    mutationKey: ["business-command", "edit"],
    retry: false,
    mutationFn: (value: T) => write(value, version),
  });
  const issue = mutation.isError ? businessIssue(mutation.error) : null;
  const retryLeft = useCountdown(issue?.retryAt ?? null);
  const submit = async (value: T) => {
    if (locked.current || blocked || retryLeft > 0 || !active) return;
    locked.current = true;
    setMessage(null);
    try {
      const saved = await mutation.mutateAsync(value);
      if (mounted.current) {
        setVersion(saved.version);
        onSaved(saved);
        notify.success("Изменения сохранены");
      }
    } catch (error) {
      if (!mounted.current) return;
      const problem = businessIssue(error);
      notify.error(problem.message);
      if (problem.kind === "version-conflict" || problem.kind === "conflict" || problem.ambiguous) {
        setBlocked(true);
        await current.refetch();
      }
    } finally {
      locked.current = false;
    }
  };
  const choose = () => {
    if (!active || !current.data || current.isFetching || current.isError) return null;
    setVersion(current.data.version);
    setBlocked(false);
    mutation.reset();
    setMessage("Проверьте форму. Для записи нажмите «Сохранить изменения».");
    return current.data;
  };
  return { submit, choose, current, blocked, message, issue, retryLeft, pending: mutation.isPending };
}
