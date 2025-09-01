import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(cents: number): string {
  // Handle invalid inputs
  if (cents === undefined || cents === null || isNaN(cents)) {
    return '$0.00';
  }
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}