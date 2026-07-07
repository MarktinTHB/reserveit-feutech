import { type ButtonHTMLAttributes, forwardRef, useState } from "react";
import styles from "./Button.module.css";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", isLoading, fullWidth, children, onClick, disabled, className, ...props }, ref) => {
    const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      const button = e.currentTarget;
      const rect = button.getBoundingClientRect();
      const id = Date.now();
      setRipples((prev) => [...prev, { x: e.clientX - rect.left, y: e.clientY - rect.top, id }]);
      setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 600);
      onClick?.(e);
    };

    const classes = [
      styles.button,
      styles[variant],
      styles[size],
      fullWidth && styles.fullWidth,
      className,
    ].filter(Boolean).join(" ");

    return (
      <button
        ref={ref}
        className={classes}
        onClick={handleClick}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <span className={styles.spinner} aria-hidden="true" />}
        {ripples.map((r) => (
          <span
            key={r.id}
            className={styles.ripple}
            style={{ left: r.x, top: r.y }}
            aria-hidden="true"
          />
        ))}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
