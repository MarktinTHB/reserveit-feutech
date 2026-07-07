import { useEffect } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CheckCircle, XCircle, AlertCircle, Info, Bell, CheckCheck } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import styles from "./Notifications.module.css";

export function NotificationsPage() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, refresh } = useNotifications();

  useEffect(() => {
    refresh();
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle size={20} style={{ color: "var(--color-success-600)" }} />;
      case "error":
        return <XCircle size={20} style={{ color: "var(--color-error-600)" }} />;
      case "warning":
        return <AlertCircle size={20} style={{ color: "var(--color-warning-600)" }} />;
      default:
        return <Info size={20} style={{ color: "var(--color-info-600)" }} />;
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Notifications</h1>
          <p className={styles.subtitle}>
            {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            <CheckCheck size={16} />
            Mark all as read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className={styles.empty}>
          <Bell size={48} className={styles.emptyIcon} />
          <p>No notifications yet</p>
        </div>
      ) : (
        <div className={styles.list}>
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={[styles.card, !notif.is_read && styles.cardUnread].filter(Boolean).join(" ")}
            >
              <div className={styles.cardInner}>
                <div className={styles.iconWrapper}>{getIcon(notif.type)}</div>
                <div className={styles.content}>
                  <div className={styles.titleRow}>
                    <h3 className={styles.notifTitle}>{notif.title}</h3>
                    {!notif.is_read && <Badge variant="success">New</Badge>}
                  </div>
                  <p className={styles.notifMessage}>{notif.message}</p>
                  <p className={styles.notifTime}>{formatDateTime(notif.created_at)}</p>
                </div>
                {!notif.is_read && (
                  <div className={styles.markRead}>
                    <Button variant="ghost" size="sm" onClick={() => markAsRead(notif.id)}>
                      <CheckCheck size={16} />
                      Mark read
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
