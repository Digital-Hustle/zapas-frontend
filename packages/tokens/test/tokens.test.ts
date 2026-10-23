import { describe, expect, it } from "vitest";
import {
  radius,
  radiusSquircle,
  semantic,
  spacingSteps,
  motion,
} from "../src/tokens.ts";

describe("tokens", () => {
  it("светлая и тёмная темы содержат одинаковые ключи", () => {
    expect(Object.keys(semantic.dark).sort()).toEqual(
      Object.keys(semantic.light).sort(),
    );
  });

  it("шкала squircle строго крупнее обычной на каждой ступени", () => {
    for (const key of Object.keys(radius) as (keyof typeof radius)[]) {
      expect(radiusSquircle[key]).toBeGreaterThan(radius[key]);
    }
  });

  it("шаги отступов возрастают", () => {
    const sorted = [...spacingSteps].sort((a, b) => a - b);
    expect([...spacingSteps]).toEqual(sorted);
  });

  it("ошибки показываются дольше успеха", () => {
    expect(motion.toast.error).toBeGreaterThan(motion.toast.success);
  });
});
