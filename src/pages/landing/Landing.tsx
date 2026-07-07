import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/layout/Logo";
import { Footer } from "@/components/layout/Footer";
import {
  CalendarDays, CheckCircle, Clock, Building2, Users, BarChart3, ArrowRight,
} from "lucide-react";
import styles from "./Landing.module.css";

export function Landing() {
  const features = [
    { icon: CalendarDays, title: "Easy Reservations", description: "Book school facilities online with a comprehensive multi-step form." },
    { icon: CheckCircle, title: "Approval Workflow", description: "Streamlined approval process with real-time status tracking." },
    { icon: Clock, title: "Real-time Availability", description: "Check venue availability instantly and avoid scheduling conflicts." },
    { icon: Building2, title: "Venue Management", description: "Browse all facilities with detailed information and amenities." },
    { icon: Users, title: "Role-based Access", description: "Different dashboards for students, officers, faculty, and administrators." },
    { icon: BarChart3, title: "Reports & Analytics", description: "Generate insights on facility usage and reservation trends." },
  ];

  const stats = [
    { label: "Facilities", value: "18+" },
    { label: "Departments", value: "3" },
    { label: "Equipment Types", value: "14" },
    { label: "User Roles", value: "4" },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroBg} />
        <div className={styles.heroContent}>
          <div className={styles.heroInner}>
            <div className={styles.logoCenter}>
              <Logo size="xl" />
            </div>
            <h1 className={styles.heroTitle}>
              Reserve School Facilities<br />
              <span className={styles.heroAccent}>With Ease</span>
            </h1>
            <p className={styles.heroSubtitle}>
              A centralized reservation management system for universities and colleges.
              Book venues, track approvals, and manage events all in one place.
            </p>
            <div className={styles.heroActions}>
              <Link to="/register">
                <Button size="lg">Get Started <ArrowRight size={20} /></Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg">Sign In</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.stats}>
        <div className={styles.statsInner}>
          {stats.map((stat) => (
            <div key={stat.label} className={styles.stat}>
              <p className={styles.statValue}>{stat.value}</p>
              <p className={styles.statLabel}>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.features}>
        <div className={styles.featuresHeader}>
          <h2 className={styles.featuresTitle}>Everything You Need</h2>
          <p className={styles.featuresSubtitle}>A complete suite of tools for facility reservation management</p>
        </div>
        <div className={styles.featuresGrid}>
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className={styles.featureCard}>
                <div className={styles.featureIcon}>
                  <Icon size={24} />
                </div>
                <h3 className={styles.featureTitle}>{feature.title}</h3>
                <p className={styles.featureDesc}>{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.cta}>
        <div className={styles.ctaInner}>
          <h2 className={styles.ctaTitle}>Ready to Get Started?</h2>
          <p className={styles.ctaSubtitle}>
            Join thousands of students and faculty members using ReserveIt to manage school facilities efficiently.
          </p>
          <div className={styles.ctaActions}>
            <Link to="/register"><Button size="lg">Create Account</Button></Link>
            <Link to="/login"><Button variant="outline" size="lg">Sign In</Button></Link>
          </div>
        </div>
      </div>

      <Footer showLinks={false} />
    </div>
  );
}
