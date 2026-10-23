import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
import { text } from "@zapas/tokens";

// tailwind-merge не знает нашу шкалу text-* и путает её с цветом — объявляем явно.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: Object.keys(text) }],
    },
  },
});

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
