import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Logo } from "@/components/layout/Logo";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import styles from "./Auth.module.css";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      showToast("Please enter your email address", "warning");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showToast("Please enter a valid email address", "error");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);

    if (error) {
      showToast(error.message, "error");
    } else {
      setSent(true);
      showToast("Password reset email sent", "success");
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.authCard}>
        <div className={styles.logoWrapper}>
          <Logo size="lg" />
        </div>

        <div className={styles.header}>
          <h1 className={styles.title}>Reset password</h1>
          <p className={styles.subtitle}>
            {sent
              ? "Check your email for a reset link"
              : "Enter your email and we'll send you a reset link"}
          </p>
        </div>

        {sent ? (
          <div className={styles.form}>
            <div style={{ textAlign: "center", padding: "var(--space-6) 0" }}>
              <CheckCircle size={48} style={{ color: "var(--color-success-500)", margin: "0 auto var(--space-4)" }} />
              <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginBottom: "var(--space-4)" }}>
                We've sent a password reset link to <strong>{email}</strong>. The link will expire in a few minutes.
              </p>
              <Button variant="secondary" fullWidth onClick={() => setSent(false)}>
                <Mail size={16} /> Try a different email
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Button type="submit" fullWidth isLoading={loading}>
              Send Reset Link
            </Button>
          </form>
        )}

        <div className={styles.footer}>
          <Link to="/login" className={styles.footerLink}>
            <ArrowLeft size={14} style={{ display: "inline", marginRight: "4px" }} />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
