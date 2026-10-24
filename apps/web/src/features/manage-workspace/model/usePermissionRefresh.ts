import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { BusinessIssue } from "@/shared/api/problem.ts";

export function usePermissionRefresh(issue: BusinessIssue | null) {
  const client = useQueryClient();
  useEffect(() => {
    if (issue?.kind === "forbidden" || issue?.kind === "not-found")
      void client.invalidateQueries({ queryKey: ["workspace"] });
  }, [client, issue?.kind]);
}
