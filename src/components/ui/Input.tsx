import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import styles from "./Input.module.css";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightButton?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, rightButton, className, ...props }, ref) => {
    const inputClasses = [
      styles.input,
      error && styles.error,
      leftIcon && styles.hasLeftIcon,
      className,
    ].filter(Boolean).join(" ");

    return (
      <div className={styles.wrapper}>
        {label && <label className={styles.label}>{label}</label>}
        <div className={styles.inputWrapper}>
          {leftIcon && <span className={styles.leftIcon}>{leftIcon}</span>}
          <input ref={ref} className={inputClasses} {...props} />
          {rightButton && <span className={styles.rightButton}>{rightButton}</span>}
        </div>
        {error && <p className={styles.errorMessage}>{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
