
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Debounce function to limit the rate at which a function can fire.
export function debounce(func: (...args: any[]) => void, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: any[]): void => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };
}
