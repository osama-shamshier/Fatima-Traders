import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "Rs 0.00";
  const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
  if (isNaN(num)) return "Rs 0.00";

  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 2,
  }).format(num);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  try {
    return new Intl.DateTimeFormat("en-PK", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(date));
  } catch (e) {
    return "-";
  }
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  try {
    return new Intl.DateTimeFormat("en-PK", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  } catch (e) {
    return "-";
  }
}

export function generateInvoiceNumber(): string {
  const date = new Date();
  const prefix = "INV";
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `${prefix}-${year}${month}-${random}`;
}

export function translateExpenseCategory(name: string | null | undefined, isUrdu: boolean): string {
  if (!name) return "-";
  if (!isUrdu) return name;

  const map: Record<string, string> = {
    "Rent & Lease": "دکان / گودام کرایہ",
    "Utilities (Electricity, Water, Gas)": "بجلی، پانی، گیس (یوٹیلیٹیز)",
    "Salaries & Wages": "ملازمین تنخواہیں و اجرت",
    "Transport & Freight": "ٹرانسپورٹ و مال کرایہ",
    "Packaging Supplies": "پیکنگ میٹریل و سامان",
    "Repairs & Maintenance": "مرمت و دیکھ بھال",
    "Office Supplies": "اسٹیشنری و دفتری سامان",
    "Miscellaneous Overhead": "متفرق اخراجات",
    "Rent": "کرایہ",
    "Utilities": "یوٹیلیٹی بلز",
    "Salaries": "تنخواہیں",
    "Transport": "ٹرانسپورٹ",
    "Packaging": "پیکنگ میٹریل",
    "Maintenance": "مرمت و دیکھ بھال",
    "General": "عام اخراجات",
  };

  return map[name] || name;
}
