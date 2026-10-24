export function pollingDelay(status: string, elapsed: number): number | false {
  if (status !== "QUEUED" && status !== "RUNNING") return false;
  return elapsed < 10000 ? 1000 : elapsed < 30000 ? 2000 : 5000;
}
