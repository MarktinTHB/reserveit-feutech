import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Logo } from "@/components/layout/Logo";
import { Eye, EyeOff, CheckCircle } from "lucide-react";
import styles from "./Auth.module.css";

export function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event) => {
      if (event === "PASSWORD_RECOVERY") {
        showToast("Please set your new password", "info");
      }
    });
  }, [showToast]);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(pwd)) return "Password must contain at least one uppercase letter";
    if (!/[a-z]/.test(pwd)) return "Password must contain at least one lowercase letter";
    if (!/[0-9]/.test(pwd)) return "Password must contain at least one number";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      showToast("Please fill in all fields", "warning");
      return;
    }

    if (password !== confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }

    const validationError = validatePassword(password);
    if (validationError) {
      showToast(validationError, "error");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      showToast(error.message, "error");
    } else {
      setSuccess(true);
      showToast("Password updated successfully", "success");
      setTimeout(() => navigate("/login"), 2000);
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.authCard}>
        <div className={styles.logoWrapper}>
          <Logo size="lg" />
        </div>

        <div className={styles.header}>
          <h1 className={styles.title}>New password</h1>
          <p className={styles.subtitle}>Set a new password for your account</p>
        </div>

        {success ? (
          <div className={styles.form}>
            <div style={{ textAlign: "center", padding: "var(--space-6) 0" }}>
              <CheckCircle size={48} style={{ color: "var(--color-success-500)", margin: "0 auto var(--space-4)" }} />
              <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                Your password has been updated. Redirecting to sign in...
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <Input
              label="New Password"
              type={showPassword ? "text" : "password"}
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              rightButton={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />

            <Input
              label="Confirm Password"
              type={showPassword ? "text" : "password"}
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", lineHeight: 1.5 }}>
              Password must be at least 8 characters with one uppercase letter, one lowercase letter, and one number.
            </div>

            <Button type="submit" fullWidth isLoading={loading}>
              Update Password
            </Button>
          </form>
        )}

        <div className={styles.footer}>
          <Link to="/login" className={styles.footerLink}>
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
