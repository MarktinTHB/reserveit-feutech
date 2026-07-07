import styles from "./Logo.module.css";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
}

export function Logo({ className, size = "md", showText = true }: LogoProps) {
  return (
    <div className={[styles.logo, className].filter(Boolean).join(" ")}>
      <img
        src="/r__1_-removebg-preview.png"
        alt="ReserveIt Logo"
        className={[styles.image, styles[size]].join(" ")}
      />
      {showText && (
        <span className={styles.text}>
          Reserve<span className={styles.accent}>It</span>
        </span>
      )}
    </div>
  );
}
