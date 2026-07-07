import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard, Building2, CalendarDays, ClipboardList,
  CheckSquare, Bell, BarChart3, Users, Settings, Shield, X,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const studentLinks = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/facilities", icon: Building2, label: "Facilities" },
  { to: "/reservations/new", icon: ClipboardList, label: "New Reservation" },
  { to: "/reservations", icon: CalendarDays, label: "My Reservations" },
  { to: "/calendar", icon: CalendarDays, label: "Calendar" },
  { to: "/notifications", icon: Bell, label: "Notifications" },
];

const facultyLinks = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/facilities", icon: Building2, label: "Facilities" },
  { to: "/approvals", icon: CheckSquare, label: "Approvals" },
  { to: "/reservations", icon: CalendarDays, label: "Reservations" },
  { to: "/calendar", icon: CalendarDays, label: "Calendar" },
  { to: "/notifications", icon: Bell, label: "Notifications" },
];

const adminLinks = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/facilities", icon: Building2, label: "Facilities" },
  { to: "/reservations", icon: CalendarDays, label: "Reservations" },
  { to: "/approvals", icon: CheckSquare, label: "Approvals" },
  { to: "/calendar", icon: CalendarDays, label: "Calendar" },
  { to: "/reports", icon: BarChart3, label: "Reports" },
  { to: "/users", icon: Users, label: "Users" },
  { to: "/notifications", icon: Bell, label: "Notifications" },
  { to: "/settings", icon: Settings, label: "Settings" },
  { to: "/admin", icon: Shield, label: "Administration" },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const links =
    user.role === "admin" ? adminLinks :
    user.role === "faculty" ? facultyLinks :
    studentLinks;

  return (
    <>
      {isOpen && <div className={styles.overlay} onClick={onClose} />}
      <aside className={[styles.sidebar, isOpen ? styles.open : styles.closed].join(" ")}>
        <div className={styles.mobileHeader}>
          <span className={styles.mobileLabel}>Menu</span>
          <button onClick={onClose} className={styles.closeButton} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <nav className={styles.nav}>
          {links.map((link) => {
            const isActive = location.pathname === link.to || location.pathname.startsWith(link.to + "/");
            const Icon = link.icon;
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={onClose}
                className={[styles.link, isActive && styles.active].filter(Boolean).join(" ")}
              >
                <Icon size={20} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className={styles.profile}>
          <div className={styles.avatar}>
            {(user.full_name || user.email || "U").charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className={styles.profileName}>{user.full_name || user.email}</p>
            <p className={styles.profileRole}>{user.role}</p>
          </div>
        </div>
      </aside>
    </>
  );
}
