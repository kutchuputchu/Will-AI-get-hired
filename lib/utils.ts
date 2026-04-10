import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatSalary(min: number | null, max: number | null) {
  if (!min && !max) {
    return "Salary not listed";
  }

  const format = (value: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(value);

  if (min && max) {
    return `${format(min)} - ${format(max)}`;
  }

  return format(min ?? max ?? 0);
}

export function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
