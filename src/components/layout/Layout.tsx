import { useState } from "react";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import styles from "./Layout.module.css";

interface LayoutProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export function Layout({ children, requireAuth = true }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const { unreadCount } = useNotifications();

  if (requireAuth && !user) {
    return (
      <div className={styles.noAuth}>
        <Navbar />
        <main className={styles.main}>{children}</main>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <Navbar onMenuClick={() => setSidebarOpen(true)} notificationCount={unreadCount} />
      <div className={styles.body}>
        {user && <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />}
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
