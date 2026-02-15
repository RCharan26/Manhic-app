import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Convert USD to INR (1 USD = 50 INR for this app)
const USD_TO_INR_RATE = 50;

export function convertToINR(usdAmount: number | string | null | undefined): number {
  if (!usdAmount) return 0;
  const numAmount = typeof usdAmount === "string" ? parseFloat(usdAmount) : usdAmount;
  return isNaN(numAmount) ? 0 : Math.round(numAmount * USD_TO_INR_RATE);
}

export function formatINR(amount: number | string | null | undefined): string {
  const inrAmount = convertToINR(amount);
  return `₹${inrAmount.toLocaleString("en-IN")}`;
}
