import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { notify } from "@zapas/ui";
import { useCountdown } from "../lib/useCountdown.ts";
import { CommandAttempt } from "./attempt.ts";
import { businessIssue } from "./problem.ts";

export function usePostCommand<T, R>(
  execute: (value: T, key: string) => Promise<R>,
  onSuccess: (value: R) => void,
) {
  const [attempt] = useState(() => new CommandAttempt<T>());
  const [uncertain, setUncertain] = useState(false);
  const locked = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const mutation = useMutation({
    mutationKey: ["business-command"],
    retry: false,
    mutationFn: ({ value, key }: { value: T; key: string }) => execute(value, key),
  });
  const issue = mutation.isError ? businessIssue(mutation.error) : null;
  const retryLeft = useCountdown(issue?.retryAt ?? null);
  const send = async (value: T) => {
    if (locked.current || retryLeft > 0) return;
    locked.current = true;
    let result: R;
    try {
      result = await mutation.mutateAsync(attempt.begin(value));
    } catch (error) {
      const problem = businessIssue(error);
      // A later 429/403 cannot prove what happened to an earlier lost request.
      if (!problem.ambiguous && !uncertain) attempt.finish();
      if (mounted.current) {
        setUncertain(problem.ambiguous || uncertain);
        notify.error(problem.message);
      }
      locked.current = false;
      return;
    }
    attempt.finish();
    locked.current = false;
    if (mounted.current) {
      setUncertain(false);
      onSuccess(result);
    }
  };
  return {
    send,
    repeat: () => (mutation.variables ? send(mutation.variables.value) : Promise.resolve()),
    pending: mutation.isPending,
    uncertain,
    issue,
    retryLeft,
  };
}
