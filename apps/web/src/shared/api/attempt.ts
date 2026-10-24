/** One explicit POST attempt. Keep its exact request/key until the outcome is known. */
export class CommandAttempt<T> {
  private current: { key: string; value: T } | null = null;
  constructor(private readonly uuid: () => string = () => crypto.randomUUID()) {}
  begin(value: T) {
    this.current ??= { key: this.uuid(), value: structuredClone(value) };
    return this.current;
  }
  finish() {
    this.current = null;
  }
}
