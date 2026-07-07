import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Logo } from "@/components/layout/Logo";
import { Eye, EyeOff } from "lucide-react";
import styles from "./Auth.module.css";

export function Register() {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    confirmPassword: "",
    student_id: "",
    department: "",
    role: "student",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }
    if (form.password.length < 6) {
      showToast("Password must be at least 6 characters", "error");
      return;
    }

    setLoading(true);
    const { error } = await signUp(form.email, form.password, {
      full_name: form.full_name,
      student_id: form.student_id,
      department: form.department,
      role: form.role as "student" | "officer" | "faculty" | "admin",
    });
    setLoading(false);

    if (error) {
      showToast(error.message, "error");
    } else {
      showToast("Account created successfully! Please sign in.", "success");
      navigate("/login");
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.authCard}>
        <div className={styles.logoWrapper}>
          <Logo size="lg" />
        </div>

        <div className={styles.header}>
          <h1 className={styles.title}>Create account</h1>
          <p className={styles.subtitle}>Join ReserveIt to manage facility reservations</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            label="Full Name"
            placeholder="John Doe"
            value={form.full_name}
            onChange={(e) => handleChange("full_name", e.target.value)}
            required
          />

          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
            required
          />

          <Input
            label="Student/Employee ID"
            placeholder="2021-XXXXX"
            value={form.student_id}
            onChange={(e) => handleChange("student_id", e.target.value)}
          />

          <Select
            label="Department"
            value={form.department}
            onChange={(e) => handleChange("department", e.target.value)}
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

          <Select
            label="Role"
            value={form.role}
            onChange={(e) => handleChange("role", e.target.value)}
            options={[
              { value: "student", label: "Student" },
              { value: "officer", label: "Organization Officer" },
              { value: "faculty", label: "Faculty / Approver" },
            ]}
          />

          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            placeholder="Min. 6 characters"
            value={form.password}
            onChange={(e) => handleChange("password", e.target.value)}
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
            type="password"
            placeholder="Confirm your password"
            value={form.confirmPassword}
            onChange={(e) => handleChange("confirmPassword", e.target.value)}
            required
          />

          <Button type="submit" fullWidth isLoading={loading}>
            Create Account
          </Button>
        </form>

        <div className={styles.footer}>
          <span className={styles.footerText}>Already have an account? </span>
          <Link to="/login" className={styles.footerLink}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
