import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "danger" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    const variantClass =
      variant === "primary"
        ? "btn-primary"
        : variant === "danger"
        ? "btn-danger"
        : variant === "outline"
        ? "btn-outline"
        : "btn-ghost";

    const sizeClass = size === "sm" ? "btn-sm" : size === "lg" ? "btn-lg" : "";

    return (
      <button
        ref={ref}
        className={cn("btn", variantClass, sizeClass, className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
