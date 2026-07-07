import { Logo } from "./Logo";
import styles from "./Footer.module.css";

interface FooterProps {
  showLinks?: boolean;
}

export function Footer({ showLinks = true }: FooterProps) {
  return (
    <footer className={styles.footer}>
      <div className={styles.content}>
        <Logo size="sm" />
        <p className={styles.text}>
          ReserveIt — School Facility &amp; Venue Reservation Management System
        </p>
        {showLinks && (
          <div className={styles.links}>
            <a href="#" className={styles.link}>Privacy</a>
            <a href="#" className={styles.link}>Terms</a>
            <a href="#" className={styles.link}>Support</a>
          </div>
        )}
      </div>
    </footer>
  );
}
