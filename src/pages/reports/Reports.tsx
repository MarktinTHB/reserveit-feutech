import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { BarChart3, Download, TrendingUp, Building2, Clock } from "lucide-react";
import styles from "./Reports.module.css";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const monthlyData = [
  { month: "Jan", reservations: 45, approved: 38, rejected: 7 },
  { month: "Feb", reservations: 52, approved: 45, rejected: 7 },
  { month: "Mar", reservations: 38, approved: 32, rejected: 6 },
  { month: "Apr", reservations: 65, approved: 55, rejected: 10 },
  { month: "May", reservations: 72, approved: 62, rejected: 10 },
  { month: "Jun", reservations: 58, approved: 50, rejected: 8 },
];

const venueData = [
  { name: "17F MPR", value: 28 },
  { name: "2F Student Plaza", value: 22 },
  { name: "18F Roofdeck", value: 18 },
  { name: "Case Room 1604", value: 15 },
  { name: "MPR 1502", value: 12 },
  { name: "Others", value: 5 },
];

const peakHoursData = [
  { hour: "8AM", bookings: 5 },
  { hour: "10AM", bookings: 12 },
  { hour: "12PM", bookings: 18 },
  { hour: "2PM", bookings: 25 },
  { hour: "4PM", bookings: 22 },
  { hour: "6PM", bookings: 15 },
  { hour: "8PM", bookings: 8 },
];

export function Reports() {
  const [period, setPeriod] = useState("6months");

  const stats = [
    { label: "Total Reservations", value: "330", icon: BarChart3, iconClass: styles.iconGreen },
    { label: "Approval Rate", value: "85.2%", icon: TrendingUp, iconClass: styles.iconBlue },
    { label: "Most Used Venue", value: "17F MPR", icon: Building2, iconClass: styles.iconAmber },
    { label: "Peak Hour", value: "2:00 PM", icon: Clock, iconClass: styles.iconPurple },
  ];

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
          <Button variant="outline" size="sm">
            <Download size={16} />
            Export
          </Button>
        </div>
      </div>

      <div className={styles.statsGrid}>
        {stats.map((stat) => {
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
                <YAxis stroke="var(--text-muted)" fontSize={12} />
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
          </div>
        </div>
      </div>

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
              <YAxis stroke="var(--text-muted)" fontSize={12} />
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
    </div>
  );
}
