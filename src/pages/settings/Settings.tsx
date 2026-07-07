import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Sun, Moon, User, Bell } from "lucide-react";
import styles from "./Settings.module.css";

export function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();
  const [profileForm, setProfileForm] = useState({
    full_name: user?.full_name || "",
    phone: user?.phone || "",
    department: user?.department || "",
  });
  const [saving, setSaving] = useState(false);

  const handleUpdateProfile = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profileForm.full_name,
        phone: profileForm.phone,
        department: profileForm.department,
      })
      .eq("id", user?.id);
    setSaving(false);

    if (error) {
      showToast(error.message, "error");
    } else {
      showToast("Profile updated successfully", "success");
      refreshUser();
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Settings</h1>
          <p className={styles.subtitle}>Manage your account and preferences</p>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>
            <User size={20} style={{ color: "var(--brand)" }} />
            Profile Information
          </h3>
        </div>
        <div className={styles.cardBody}>
          <Input
            label="Full Name"
            value={profileForm.full_name}
            onChange={(e) => setProfileForm((prev) => ({ ...prev, full_name: e.target.value }))}
          />
          <Input
            label="Phone"
            value={profileForm.phone}
            onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
          />
          <Select
            label="Department"
            value={profileForm.department}
            onChange={(e) => setProfileForm((prev) => ({ ...prev, department: e.target.value }))}
            options={[
              { value: "", label: "Select department" },
              { value: "FO", label: "Facilities Office (FO)" },
              { value: "RO", label: "Registrar's Office (RO)" },
              { value: "AERO", label: "Aero Department (AERO)" },
              { value: "IT", label: "IT Department" },
              { value: "CS", label: "Computer Science" },
              { value: "ENG", label: "Engineering" },
              { value: "BUS", label: "Business" },
              { value: "ART", label: "Arts & Sciences" },
            ]}
          />
          <Button onClick={handleUpdateProfile} isLoading={saving}>
            Save Changes
          </Button>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>
            <Sun size={20} style={{ color: "var(--brand)" }} />
            Appearance
          </h3>
        </div>
        <div className={styles.cardBody}>
          <div className={styles.themeRow}>
            <div>
              <p className={styles.themeLabel}>Theme</p>
              <p className={styles.themeDesc}>Choose your preferred theme</p>
            </div>
            <div className={styles.themeButtons}>
              <button
                onClick={() => setTheme("light")}
                className={[styles.themeButton, theme === "light" ? styles.themeButtonActive : styles.themeButtonInactive].join(" ")}
              >
                <Sun size={16} />
                Light
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={[styles.themeButton, theme === "dark" ? styles.themeButtonActive : styles.themeButtonInactive].join(" ")}
              >
                <Moon size={16} />
                Dark
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>
            <Bell size={20} style={{ color: "var(--brand)" }} />
            Notifications
          </h3>
        </div>
        <div className={styles.cardBody}>
          {[
            "Reservation status updates",
            "Approval requests",
            "System announcements",
            "Facility maintenance alerts",
          ].map((item) => (
            <div key={item} className={styles.notifRow}>
              <span className={styles.notifLabel}>{item}</span>
              <input type="checkbox" defaultChecked className={styles.checkbox} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
