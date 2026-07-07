import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/Toast";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Users, Search, Shield, UserCheck, UserX } from "lucide-react";
import type { Database } from "@/lib/supabase";
import styles from "./Users.module.css";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<Profile[]>([]);
  const [filtered, setFiltered] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    let result = users;
    if (search) {
      result = result.filter(
        (u) =>
          u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (roleFilter) {
      result = result.filter((u) => u.role === roleFilter);
    }
    setFiltered(result);
  }, [search, roleFilter, users]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (data) {
      setUsers(data as Profile[]);
      setFiltered(data as Profile[]);
    }
    setLoading(false);
  };

  const updateRole = async (userId: string, newRole: string) => {
    const { error } = await supabase.rpc("set_user_role", {
      target_user_id: userId,
      new_role: newRole,
    });
    if (error) {
      showToast(error.message, "error");
    } else {
      showToast(`User role updated to ${newRole}`, "success");
    }
    fetchUsers();
  };

  const stats = [
    { label: "Total Users", value: users.length, icon: Users, iconClass: styles.iconBlue },
    { label: "Students", value: users.filter((u) => u.role === "student").length, icon: UserCheck, iconClass: styles.iconGreen },
    { label: "Faculty", value: users.filter((u) => u.role === "faculty").length, icon: Shield, iconClass: styles.iconAmber },
    { label: "Admins", value: users.filter((u) => u.role === "admin").length, icon: Shield, iconClass: styles.iconPurple },
  ];

  if (currentUser?.role !== "admin") {
    return (
      <div className={styles.empty}>
        <Shield size={48} className={styles.emptyIcon} />
        <p>Admin access required</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Users</h1>
          <p className={styles.subtitle}>Manage user accounts and roles</p>
        </div>
      </div>

      <div className={styles.stats}>
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

      <div className={styles.filters}>
        <div className={styles.search}>
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search size={16} />}
          />
        </div>
        <Select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          options={[
            { value: "", label: "All Roles" },
            { value: "student", label: "Students" },
            { value: "officer", label: "Officers" },
            { value: "faculty", label: "Faculty" },
            { value: "admin", label: "Admins" },
          ]}
        />
      </div>

      {loading ? (
        <div className={styles.skeletonList}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={[styles.skeletonCard, "skeleton"].join(" ")} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <UserX size={48} className={styles.emptyIcon} />
          <p>No users found</p>
        </div>
      ) : (
        <div className={styles.list}>
          {filtered.map((u) => (
            <div key={u.id} className={styles.listItem}>
              <div className={styles.userInfo}>
                <div className={styles.avatar}>
                  {(u.full_name || u.email).charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className={styles.userName}>{u.full_name || u.email}</p>
                  <p className={styles.userEmail}>{u.email}</p>
                </div>
                <Badge variant={u.role === "admin" ? "accent" : u.role === "faculty" ? "warning" : "default"}>
                  {u.role}
                </Badge>
              </div>
              <div className={styles.userActions}>
                <Select
                  className={styles.roleSelect}
                  value={u.role}
                  onChange={(e) => updateRole(u.id, e.target.value)}
                  options={[
                    { value: "student", label: "Student" },
                    { value: "officer", label: "Officer" },
                    { value: "faculty", label: "Faculty" },
                    { value: "admin", label: "Admin" },
                  ]}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
