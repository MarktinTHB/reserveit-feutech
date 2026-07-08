import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Sun, Moon, User, Bell, Camera, Trash2 } from "lucide-react";
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
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please select an image file", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("Image must be less than 5MB", "error");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleAvatarUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file || !user) return;

    setAvatarUploading(true);
    const filePath = `${user.id}/avatar-${Date.now()}`;

    if (user.avatar_url) {
      const oldPath = user.avatar_url.split("/avatars/")[1];
      if (oldPath) await supabase.storage.from("avatars").remove([oldPath]);
    }

    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });

    if (uploadError) {
      setAvatarUploading(false);
      showToast(uploadError.message, "error");
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl + `?t=${Date.now()}`;

    const { error: updateError } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);

    setAvatarUploading(false);
    setAvatarPreview(null);

    if (updateError) {
      showToast(updateError.message, "error");
    } else {
      showToast("Avatar updated successfully", "success");
      refreshUser();
    }
  };

  const handleAvatarRemove = async () => {
    if (!user || !user.avatar_url) return;

    setAvatarUploading(true);
    const oldPath = user.avatar_url.split("/avatars/")[1]?.split("?")[0];
    if (oldPath) await supabase.storage.from("avatars").remove([oldPath]);

    const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);

    setAvatarUploading(false);

    if (error) {
      showToast(error.message, "error");
    } else {
      showToast("Avatar removed", "success");
      refreshUser();
    }
  };

  const currentAvatar = avatarPreview || user?.avatar_url;

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
            Profile Picture
          </h3>
        </div>
        <div className={styles.cardBody}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", flexWrap: "wrap" }}>
            <div style={{
              width: "80px", height: "80px", borderRadius: "50%", overflow: "hidden",
              backgroundColor: "var(--bg-muted)", display: "flex", alignItems: "center", justifyContent: "center",
              border: "2px solid var(--border-default)", flexShrink: 0,
            }}>
              {currentAvatar ? (
                <img src={currentAvatar} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <User size={32} style={{ color: "var(--text-tertiary)" }} />
              )}
            </div>
            <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarSelect} />
              <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Camera size={16} /> {user?.avatar_url ? "Change" : "Upload"}
              </Button>
              {avatarPreview && (
                <Button size="sm" onClick={handleAvatarUpload} isLoading={avatarUploading}>
                  Save Avatar
                </Button>
              )}
              {user?.avatar_url && !avatarPreview && (
                <Button variant="ghost" size="sm" onClick={handleAvatarRemove} isLoading={avatarUploading}>
                  <Trash2 size={16} /> Remove
                </Button>
              )}
            </div>
          </div>
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
