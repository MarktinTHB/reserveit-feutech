import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/Button";
import { Bell, Menu, Moon, Sun, User } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import styles from "./Navbar.module.css";

interface NavbarProps {
  onMenuClick?: () => void;
  notificationCount?: number;
}

export function Navbar({ onMenuClick, notificationCount = 0 }: NavbarProps) {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showProfile, setShowProfile] = useState(false);

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.left}>
          {onMenuClick && (
            <button onClick={onMenuClick} className={styles.menuButton} aria-label="Toggle menu">
              <Menu size={20} />
            </button>
          )}
          <Link to="/">
            <Logo size="md" />
          </Link>
        </div>

        <div className={styles.right}>
          <button
            onClick={toggleTheme}
            className={styles.iconButton}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {user && (
            <>
              <Link to="/notifications" className={styles.iconButton} aria-label="Notifications">
                <Bell size={20} />
                {notificationCount > 0 && (
                  <span className={styles.badge}>{notificationCount}</span>
                )}
              </Link>

              <div className={styles.profileWrapper}>
                <button
                  onClick={() => setShowProfile(!showProfile)}
                  className={styles.profileButton}
                >
                  <div className={styles.avatar}>
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.full_name || "avatar"} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                    ) : (
                      <User size={16} />
                    )}
                  </div>
                  <span className={styles.profileName}>
                    {user.full_name || user.email}
                  </span>
                </button>

                {showProfile && (
                  <div className={styles.dropdown}>
                    <div className={styles.dropdownHeader}>
                      <p className={styles.dropdownName}>{user.full_name || user.email}</p>
                      <p className={styles.dropdownRole}>{user.role}</p>
                    </div>
                    <Link
                      to="/settings"
                      className={styles.dropdownItem}
                      onClick={() => setShowProfile(false)}
                    >
                      Settings
                    </Link>
                    <div className={styles.dropdownDivider} />
                    <button
                      onClick={() => { setShowProfile(false); signOut(); }}
                      className={styles.signOut}
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {!user && (
            <div className={styles.authButtons}>
              <Link to="/login">
                <Button variant="ghost" size="sm">Sign In</Button>
              </Link>
              <Link to="/register">
                <Button size="sm">Get Started</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
