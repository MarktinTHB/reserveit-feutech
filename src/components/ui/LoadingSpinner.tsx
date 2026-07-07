import styles from "./LoadingSpinner.module.css";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  label?: string;
  centered?: boolean;
}

export function LoadingSpinner({ size = "md", label, centered }: LoadingSpinnerProps) {
  const spinner = <span className={[styles.spinner, styles[size]].join(" ")} role="status" aria-label="Loading" />;
  if (centered) {
    return (
      <div className={styles.container}>
        {spinner}
        {label && <span className={styles.label}>{label}</span>}
      </div>
    );
  }
  return (
    <>
      {spinner}
      {label && <span className={styles.label}>{label}</span>}
    </>
  );
}
