import { forwardRef, type TextareaHTMLAttributes } from "react";
import styles from "./Textarea.module.css";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className={styles.wrapper}>
      {label && <label className={styles.label}>{label}</label>}
      <textarea
        ref={ref}
        className={[styles.textarea, error && styles.error, className].filter(Boolean).join(" ")}
        {...props}
      />
      {error && <p className={styles.errorMessage}>{error}</p>}
    </div>
  )
);

Textarea.displayName = "Textarea";

export { Textarea };
