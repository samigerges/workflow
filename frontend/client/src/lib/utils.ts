import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getOptionLabel(
  options: { value: string; label: string }[],
  value?: string | null,
) {
  if (!value) {
    return value ?? "";
  }

  const match = options.find((option) => option.value === value);
  return match?.label ?? value;
}
