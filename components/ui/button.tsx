import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition duration-200",
        variant === "primary" &&
          "bg-teal-600 text-white shadow-[0_20px_45px_rgba(13,148,136,0.24)] hover:-translate-y-0.5 hover:bg-teal-500",
        variant === "secondary" &&
          "border border-white/15 bg-white/10 text-white backdrop-blur hover:bg-white/15",
        variant === "ghost" && "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
        className
      )}
      {...props}
    />
  );
}
