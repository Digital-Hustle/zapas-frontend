export function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="border-border bg-card min-w-0 rounded-lg border p-4">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="mt-2 text-xl font-semibold break-words tabular-nums">{value}</dd>
      {note && <dd className="text-muted-foreground mt-2 text-sm">{note}</dd>}
    </div>
  );
}
