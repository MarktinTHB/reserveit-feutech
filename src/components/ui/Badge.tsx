import { type HTMLAttributes } from "react";
import styles from "./Badge.module.css";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "error" | "info" | "accent";
}

export function Badge({ variant = "default", className, ...props }: BadgeProps) {
  return (
    <span
      className={[styles.badge, styles[variant], className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
