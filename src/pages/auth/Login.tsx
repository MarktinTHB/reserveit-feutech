import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Logo } from "@/components/layout/Logo";
import { Eye, EyeOff } from "lucide-react";
import styles from "./Auth.module.css";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signInSuccess, setSignInSuccess] = useState(false);
  const { user, signIn } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // After successful sign-in, wait for the auth context to update with the user
  // before navigating. This prevents the redirect loop where ProtectedRoute
  // sees user === null and bounces back to /login.
  useEffect(() => {
    if (signInSuccess && user) {
      showToast("Welcome back!", "success");
      navigate("/dashboard");
    }
  }, [signInSuccess, user, navigate, showToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast("Please fill in all fields", "warning");
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      showToast(error.message, "error");
      setSignInSuccess(false);
    } else {
      setSignInSuccess(true);
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.authCard}>
        <div className={styles.logoWrapper}>
          <Logo size="lg" />
        </div>

        <div className={styles.header}>
          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.subtitle}>Sign in to your ReserveIt account</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
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

          <div className={styles.options}>
            <label className={styles.remember}>
              <input type="checkbox" className={styles.checkbox} />
              Remember me
            </label>
            <Link to="/forgot-password" className={styles.forgotLink}>
              Forgot password?
            </Link>
          </div>

          <Button type="submit" fullWidth isLoading={loading}>
            Sign In
          </Button>
        </form>

        <div className={styles.footer}>
          <span className={styles.footerText}>Don&apos;t have an account? </span>
          <Link to="/register" className={styles.footerLink}>
            Get Started
          </Link>
        </div>
      </div>
    </div>
  );
}
