import { useId, useState } from "react";
import { useDropzone, type Accept, type FileRejection } from "react-dropzone";
import { FileSpreadsheet, Upload, X } from "../icons.ts";
import { cn } from "../lib/cn.ts";
import { Button } from "./Button.tsx";

export interface FileDropProps {
  id?: string;
  label: string;
  description?: string;
  value: File | null;
  onValueChange: (file: File | null) => void;
  /** Required: the caller uses the server's configured upload limit. */
  maxSize: number;
  accept?: Accept;
  disabled?: boolean;
  busy?: boolean;
  error?: string;
  onRejected?: (rejections: readonly FileRejection[]) => void;
}

const csv: Accept = { "text/csv": [".csv"] };
const reasons: Record<string, string> = {
  "file-invalid-type": "Неподдерживаемый тип файла.",
  "file-too-large": "Файл превышает допустимый размер.",
  "file-too-small": "Файл пуст.",
  "too-many-files": "Выберите один файл.",
};

/** Selection only. No upload, parsing or claim that client validation replaces the server. */
export function FileDrop({
  id,
  label,
  description,
  value,
  onValueChange,
  maxSize,
  accept = csv,
  disabled,
  busy,
  error,
  onRejected,
}: FileDropProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const titleId = `${inputId}-title`;
  const hintId = `${inputId}-hint`;
  const [rejection, setRejection] = useState("");
  const unavailable = Boolean(disabled || busy);
  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    accept,
    maxSize,
    minSize: 1,
    multiple: false,
    maxFiles: 1,
    disabled: unavailable,
    useFsAccessApi: false,
    onDrop: (files, rejected) => {
      if (rejected.length) {
        setRejection(
          [
            ...new Set(rejected.flatMap((r) => r.errors.map((e) => reasons[e.code] ?? "Файл не принят."))),
          ].join(" "),
        );
        onRejected?.(rejected);
        return;
      }
      if (files[0]) {
        setRejection("");
        onValueChange(files[0]);
      }
    },
  });
  const message = error ?? rejection;
  return (
    <div className="flex min-w-0 flex-col gap-3" aria-busy={busy || undefined}>
      <div
        {...getRootProps({
          role: "button",
          "aria-labelledby": titleId,
          "aria-disabled": unavailable,
          "aria-describedby": `${hintId} ${messageId}`,
          "aria-invalid": Boolean(message),
          className: cn(
            "border-input bg-card duration-fast focus-visible:border-ring focus-visible:shadow-glow flex min-h-32 cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center transition-colors outline-none",
            isDragActive && "border-ring bg-primary-soft",
            (message || isDragReject) && "border-danger",
            unavailable && "cursor-not-allowed opacity-50",
          ),
        })}
      >
        <input
          {...getInputProps({ id: inputId, "aria-label": label, hidden: true, style: { display: "none" } })}
        />
        <Upload aria-hidden className="text-muted-foreground size-6" />
        <span id={titleId} className="font-medium">
          {isDragActive ? "Отпустите файл здесь" : label}
        </span>
      </div>
      <p id={hintId} className="text-muted-foreground text-center text-sm">
        Перетащите файл или нажмите Enter для выбора
      </p>
      <p
        id={messageId}
        role={message ? "alert" : undefined}
        className={cn("text-sm", message ? "text-danger" : "text-muted-foreground")}
      >
        {message !== "" ? message : (description ?? `Один файл, до ${maxSize.toLocaleString("ru-RU")} байт`)}
      </p>
      {value && (
        <div
          className="border-border bg-card flex min-w-0 items-center gap-3 rounded-md border p-3"
          role="status"
        >
          <FileSpreadsheet aria-hidden className="text-muted-foreground size-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-medium break-all">{value.name}</p>
            <p className="text-muted-foreground text-sm">
              {value.size.toLocaleString("ru-RU")} байт · {value.type === "" ? "Тип не указан" : value.type}
            </p>
          </div>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Убрать файл"
            disabled={unavailable}
            onClick={() => {
              setRejection("");
              onValueChange(null);
            }}
          >
            <X aria-hidden />
          </Button>
        </div>
      )}
    </div>
  );
}
