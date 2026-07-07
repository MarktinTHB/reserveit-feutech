import { forwardRef, type SelectHTMLAttributes } from "react";
import styles from "./Select.module.css";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, ...props }, ref) => (
    <div className={styles.wrapper}>
      {label && <label className={styles.label}>{label}</label>}
      <select
        ref={ref}
        className={[styles.select, error && styles.error, className].filter(Boolean).join(" ")}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className={styles.errorMessage}>{error}</p>}
    </div>
  )
);

Select.displayName = "Select";

export { Select };
