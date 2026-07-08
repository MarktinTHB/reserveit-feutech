import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Link } from "react-router-dom";
import {
  CalendarDays, ClipboardList, Clock, CheckCircle, XCircle,
  Users, Building2, TrendingUp, ArrowRight, AlertCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Reservation, Notification } from "@/types";
import { formatDate } from "@/lib/utils";
import styles from "./Dashboard.module.css";

export function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [upcoming, setUpcoming] = useState<Reservation[]>([]);
  const [recentNotifications, setRecentNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminStats, setAdminStats] = useState({ users: 0, facilities: 0, thisMonth: 0 });

  useEffect(() => {
    if (!user) return;
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;
    setLoading(true);
    const isAdminOrFaculty = user.role === "admin" || user.role === "faculty";

    const { count } = await (isAdminOrFaculty
      ? supabase.from("reservations").select("*", { count: "exact" })
      : supabase.from("reservations").select("*", { count: "exact" }).eq("user_id", user.id));

    const { data: pendingData } = await (isAdminOrFaculty
      ? supabase.from("reservations").select("*").in("status", ["pending", "reviewed", "processing"])
      : supabase.from("reservations").select("*").eq("user_id", user.id).in("status", ["pending", "reviewed", "processing"]));

    const { data: approvedData } = await (isAdminOrFaculty
      ? supabase.from("reservations").select("*").in("status", ["approved", "completed"])
      : supabase.from("reservations").select("*").eq("user_id", user.id).in("status", ["approved", "completed"]));

    const { data: rejectedData } = await (isAdminOrFaculty
      ? supabase.from("reservations").select("*").eq("status", "rejected")
      : supabase.from("reservations").select("*").eq("user_id", user.id).eq("status", "rejected"));

    setStats({
      total: count || 0,
      pending: pendingData?.length || 0,
      approved: approvedData?.length || 0,
      rejected: rejectedData?.length || 0,
    });

    const { data: upcomingData } = await (isAdminOrFaculty
      ? supabase.from("reservations").select("*, user:profiles!reservations_user_id_profiles_fkey(full_name, email)")
          .gte("activity_date", new Date().toISOString().split("T")[0])
          .order("activity_date", { ascending: true }).limit(5)
      : supabase.from("reservations").select("*, user:profiles!reservations_user_id_profiles_fkey(full_name, email)")
          .eq("user_id", user.id)
          .gte("activity_date", new Date().toISOString().split("T")[0])
          .order("activity_date", { ascending: true }).limit(5));

    if (upcomingData) setUpcoming(upcomingData as unknown as Reservation[]);

    const { data: notifData } = await supabase
      .from("notifications").select("*").eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(5);

    if (notifData) setRecentNotifications(notifData as Notification[]);

    // Fetch admin mini-stats
    if (isAdminOrFaculty) {
      const { count: userCount } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      const { count: facilityCount } = await supabase.from("facilities").select("*", { count: "exact", head: true });
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const { count: monthCount } = await supabase.from("reservations").select("*", { count: "exact", head: true }).gte("created_at", monthStart);
      setAdminStats({ users: userCount || 0, facilities: facilityCount || 0, thisMonth: monthCount || 0 });
    }

    setLoading(false);
  };

  const statCards = [
    { title: "Total Reservations", value: stats.total, icon: ClipboardList, iconClass: styles.iconBlue },
    { title: "Pending", value: stats.pending, icon: Clock, iconClass: styles.iconAmber },
    { title: "Approved", value: stats.approved, icon: CheckCircle, iconClass: styles.iconGreen },
    { title: "Rejected", value: stats.rejected, icon: XCircle, iconClass: styles.iconRed },
  ];

  if (loading) return <LoadingSpinner size="xl" centered label="Loading dashboard..." />;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>Welcome back, {user?.full_name || user?.email}</p>
        </div>
        <Link to="/reservations/new">
          <Button><CalendarDays size={16} /> New Reservation</Button>
        </Link>
      </div>

      <div className={styles.statsGrid}>
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className={styles.statCard}>
              <div className={styles.statInner}>
                <div>
                  <p className={styles.statLabel}>{card.title}</p>
                  <p className={styles.statValue}>{card.value}</p>
                </div>
                <div className={[styles.statIcon, card.iconClass].join(" ")}>
                  <Icon size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.grid2}>
        <div>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>
              <CalendarDays size={20} style={{ color: "var(--brand)" }} />
              Upcoming Reservations
            </h3>
            <Link to="/reservations" className={styles.cardLink}>
              View all <ArrowRight size={16} />
            </Link>
          </div>
          <div className={styles.cardBody}>
            {upcoming.length === 0 ? (
              <div className={styles.empty}>
                <CalendarDays size={48} className={styles.emptyIcon} />
                <p>No upcoming reservations</p>
              </div>
            ) : (
              upcoming.map((res) => (
                <div key={res.id} className={styles.listItem}>
                  <div>
                    <p className={styles.itemTitle}>{res.activity_name}</p>
                    <p className={styles.itemSubtitle}>
                      {formatDate(res.activity_date)} · {res.department}
                    </p>
                  </div>
                  <StatusChip status={res.status} />
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>
              <AlertCircle size={20} style={{ color: "var(--brand)" }} />
              Recent Notifications
            </h3>
            <Link to="/notifications" className={styles.cardLink}>
              View all <ArrowRight size={16} />
            </Link>
          </div>
          <div className={styles.cardBody}>
            {recentNotifications.length === 0 ? (
              <div className={styles.empty}>
                <AlertCircle size={48} className={styles.emptyIcon} />
                <p>No notifications yet</p>
              </div>
            ) : (
              recentNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={[styles.notifItem, notif.is_read ? styles.notifRead : styles.notifUnread].join(" ")}
                >
                  <div style={{ marginTop: "2px" }}>
                    {notif.type === "success" && <CheckCircle size={16} style={{ color: "var(--color-success-600)" }} />}
                    {notif.type === "error" && <XCircle size={16} style={{ color: "var(--color-error-600)" }} />}
                    {notif.type === "warning" && <AlertCircle size={16} style={{ color: "var(--color-warning-600)" }} />}
                    {notif.type === "info" && <AlertCircle size={16} style={{ color: "var(--color-info-600)" }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className={styles.notifTitle}>{notif.title}</p>
                    <p className={styles.notifMessage}>{notif.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {(user?.role === "admin" || user?.role === "faculty") && (
        <div className={styles.grid3}>
          <div className={styles.miniStat}>
            <div className={[styles.miniIcon, styles.iconGreen].join(" ")}>
              <Users size={24} />
            </div>
            <div>
              <p className={styles.miniLabel}>Total Users</p>
              <p className={styles.miniValue}>{adminStats.users}</p>
            </div>
          </div>
          <div className={styles.miniStat}>
            <div className={[styles.miniIcon, styles.iconBlue].join(" ")}>
              <Building2 size={24} />
            </div>
            <div>
              <p className={styles.miniLabel}>Facilities</p>
              <p className={styles.miniValue}>{adminStats.facilities}</p>
            </div>
          </div>
          <div className={styles.miniStat}>
            <div className={[styles.miniIcon, styles.iconAmber].join(" ")}>
              <TrendingUp size={24} />
            </div>
            <div>
              <p className={styles.miniLabel}>This Month</p>
              <p className={styles.miniValue}>{adminStats.thisMonth}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
