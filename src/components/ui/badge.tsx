import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "success" | "danger" | "warning" | "primary" | "muted" | "default" | "outline";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variantClass =
    variant === "success"
      ? "badge-success"
      : variant === "danger"
      ? "badge-danger"
      : variant === "warning"
      ? "badge-warning"
      : variant === "primary"
      ? "badge-primary"
      : variant === "muted"
      ? "badge-muted"
      : "bg-blue-100 text-blue-800";

  return (
    <div
      className={cn("badge", variantClass, className)}
      {...props}
    />
  );
}
