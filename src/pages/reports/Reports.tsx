import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { BarChart3, Download, TrendingUp, Building2, Clock, CalendarDays } from "lucide-react";
import styles from "./Reports.module.css";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

interface MonthlyDatum { month: string; reservations: number; approved: number; rejected: number; }
interface VenueDatum { name: string; value: number; }
interface HourDatum { hour: string; bookings: number; }

export function Reports() {
  const { user } = useAuth();
  const [period, setPeriod] = useState("6months");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0, approved: 0, pending: 0, rejected: 0, completed: 0,
    approvalRate: 0, mostUsedVenue: "—", peakHour: "—",
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyDatum[]>([]);
  const [venueData, setVenueData] = useState<VenueDatum[]>([]);
  const [peakHoursData, setPeakHoursData] = useState<HourDatum[]>([]);

  useEffect(() => {
    if (user?.role !== "admin") return;
    fetchAnalytics();
  }, [user, period]);

  const fetchAnalytics = async () => {
    setLoading(true);

    await supabase.rpc("mark_completed_reservations");

    const monthsBack = period === "1month" ? 1 : period === "3months" ? 3 : period === "6months" ? 6 : 12;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);
    const startDateStr = startDate.toISOString().split("T")[0];

    const { data: reservations } = await supabase
      .from("reservations")
      .select("id, status, activity_date, activity_name, department, created_at")
      .gte("created_at", startDateStr)
      .order("created_at", { ascending: false });

    const { data: venues } = await supabase
      .from("reservation_venues")
      .select("facility:facilities(name)")
      .gte("start_time", startDateStr);

    const allReservations = reservations || [];
    const total = allReservations.length;
    const approved = allReservations.filter((r) => r.status === "approved" || r.status === "completed").length;
    const pending = allReservations.filter((r) => r.status === "pending" || r.status === "reviewed" || r.status === "processing").length;
    const rejected = allReservations.filter((r) => r.status === "rejected").length;
    const completed = allReservations.filter((r) => r.status === "completed").length;
    const decided = approved + rejected;
    const approvalRate = decided > 0 ? Math.round((approved / decided) * 100) : 0;

    const venueCounts: Record<string, number> = {};
    (venues || []).forEach((v) => {
      const facility = v.facility as unknown as { name?: string } | null;
      const name = facility?.name || "Unknown";
      venueCounts[name] = (venueCounts[name] || 0) + 1;
    });
    const venueArr = Object.entries(venueCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
    const mostUsedVenue = venueArr.length > 0 ? venueArr[0].name : "—";

    const hourCounts: Record<string, number> = {};
    allReservations.forEach((r) => {
      const date = new Date(r.activity_date);
      const hour = date.getHours();
      const label = `${hour <= 12 ? hour : hour - 12}${hour < 12 ? "AM" : "PM"}`;
      hourCounts[label] = (hourCounts[label] || 0) + 1;
    });
    const hourArr = Object.entries(hourCounts)
      .map(([hour, bookings]) => ({ hour, bookings }))
      .sort((a, b) => b.bookings - a.bookings);
    const peakHour = hourArr.length > 0 ? hourArr[0].hour : "—";

    const monthLabels: MonthlyDatum[] = [];
    for (let i = monthsBack - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const label = d.toLocaleDateString("en-US", { month: "short" });
      const monthReservations = allReservations.filter((r) => {
        const rDate = new Date(r.created_at);
        return rDate.getMonth() === d.getMonth() && rDate.getFullYear() === d.getFullYear();
      });
      monthLabels.push({
        month: label,
        reservations: monthReservations.length,
        approved: monthReservations.filter((r) => r.status === "approved" || r.status === "completed").length,
        rejected: monthReservations.filter((r) => r.status === "rejected").length,
      });
    }

    setStats({ total, approved, pending, rejected, completed, approvalRate, mostUsedVenue, peakHour });
    setMonthlyData(monthLabels);
    setVenueData(venueArr);
    setPeakHoursData(hourArr);
    setLoading(false);
  };

  if (user?.role !== "admin") {
    return (
      <div className={styles.empty}>
        <BarChart3 size={48} className={styles.emptyIcon} />
        <p>Admin access required</p>
      </div>
    );
  }

  const statCards = [
    { label: "Total Reservations", value: String(stats.total), icon: BarChart3, iconClass: styles.iconGreen },
    { label: "Approval Rate", value: `${stats.approvalRate}%`, icon: TrendingUp, iconClass: styles.iconBlue },
    { label: "Most Used Venue", value: stats.mostUsedVenue, icon: Building2, iconClass: styles.iconAmber },
    { label: "Peak Hour", value: stats.peakHour, icon: Clock, iconClass: styles.iconPurple },
  ];

  const hasData = stats.total > 0;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Reports & Analytics</h1>
          <p className={styles.subtitle}>Facility usage and reservation trends</p>
        </div>
        <div className={styles.controls}>
          <Select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            options={[
              { value: "1month", label: "Last Month" },
              { value: "3months", label: "Last 3 Months" },
              { value: "6months", label: "Last 6 Months" },
              { value: "1year", label: "Last Year" },
            ]}
          />
          <Button variant="outline" size="sm" disabled={!hasData}>
            <Download size={16} />
            Export
          </Button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner size="xl" centered label="Loading analytics..." />
      ) : !hasData ? (
        <div className={styles.empty}>
          <CalendarDays size={48} className={styles.emptyIcon} />
          <p>No reservation data yet for this period</p>
          <p style={{ fontSize: "var(--text-sm)", marginTop: "var(--space-2)" }}>
            Analytics will appear once reservations are submitted and processed.
          </p>
        </div>
      ) : (
        <>
          <div className={styles.statsGrid}>
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className={styles.statCard}>
                  <div className={[styles.statIcon, stat.iconClass].join(" ")}>
                    <Icon size={24} />
                  </div>
                  <div>
                    <p className={styles.statLabel}>{stat.label}</p>
                    <p className={styles.statValue}>{stat.value}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={styles.chartsGrid}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>
                  <BarChart3 size={20} style={{ color: "var(--brand)" }} />
                  Monthly Reservations
                </h3>
              </div>
              <div className={styles.cardBody}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
                    <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} />
                    <YAxis stroke="var(--text-muted)" fontSize={12} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--bg-elevated)",
                        border: "1px solid var(--border-default)",
                        borderRadius: "var(--radius-md)",
                        color: "var(--text-primary)",
                      }}
                    />
                    <Bar dataKey="reservations" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="approved" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>
                  <Building2 size={20} style={{ color: "var(--brand)" }} />
                  Most Reserved Venues
                </h3>
              </div>
              <div className={styles.cardBody}>
                {venueData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={venueData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {venueData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--bg-elevated)",
                          border: "1px solid var(--border-default)",
                          borderRadius: "var(--radius-md)",
                          color: "var(--text-primary)",
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className={styles.chartEmpty}>No venue data available</div>
                )}
              </div>
            </div>
          </div>

          {peakHoursData.length > 0 && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>
                  <Clock size={20} style={{ color: "var(--brand)" }} />
                  Peak Hours
                </h3>
              </div>
              <div className={styles.cardBody}>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={peakHoursData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
                    <XAxis dataKey="hour" stroke="var(--text-muted)" fontSize={12} />
                    <YAxis stroke="var(--text-muted)" fontSize={12} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--bg-elevated)",
                        border: "1px solid var(--border-default)",
                        borderRadius: "var(--radius-md)",
                        color: "var(--text-primary)",
                      }}
                    />
                    <Bar dataKey="bookings" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
