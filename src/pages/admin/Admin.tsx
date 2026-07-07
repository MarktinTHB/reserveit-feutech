import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import {
  Shield, Building2, Users, ClipboardList, Settings,
  Plus, Pencil, Trash2,
} from "lucide-react";
import type { Facility } from "@/types";
import styles from "./Admin.module.css";

export function AdminPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"facilities" | "users" | "reservations" | "settings">("facilities");
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [users, setUsers] = useState<unknown[]>([]);
  const [reservations, setReservations] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFacilityModal, setShowFacilityModal] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);

  const [facilityForm, setFacilityForm] = useState({
    name: "", department: "", type: "indoor", capacity: "",
    location: "", description: "", requires_approval: true, min_notice_hours: 24,
  });

  useEffect(() => {
    if (user?.role === "admin") fetchData();
  }, [user, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    if (activeTab === "facilities") {
      const { data } = await supabase.from("facilities").select("*").order("name");
      if (data) setFacilities(data as Facility[]);
    } else if (activeTab === "users") {
      const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (data) setUsers(data);
    } else if (activeTab === "reservations") {
      const { data } = await supabase.from("reservations").select("*, profiles(full_name, email)").order("created_at", { ascending: false });
      if (data) setReservations(data);
    }
    setLoading(false);
  };

  const handleSaveFacility = async () => {
    if (!facilityForm.name || !facilityForm.department) return;
    const payload = {
      name: facilityForm.name, department: facilityForm.department, type: facilityForm.type,
      capacity: facilityForm.capacity ? parseInt(facilityForm.capacity) : null,
      location: facilityForm.location || null, description: facilityForm.description || null,
      requires_approval: facilityForm.requires_approval, min_notice_hours: facilityForm.min_notice_hours,
    };
    if (editingFacility) {
      await supabase.from("facilities").update(payload).eq("id", editingFacility.id);
    } else {
      await supabase.from("facilities").insert(payload);
    }
    setShowFacilityModal(false);
    setEditingFacility(null);
    setFacilityForm({ name: "", department: "", type: "indoor", capacity: "", location: "", description: "", requires_approval: true, min_notice_hours: 24 });
    fetchData();
  };

  const handleDeleteFacility = async (id: string) => {
    if (!confirm("Delete this facility?")) return;
    await supabase.from("facilities").delete().eq("id", id);
    fetchData();
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
    fetchData();
  };

  const openEditFacility = (facility: Facility) => {
    setEditingFacility(facility);
    setFacilityForm({
      name: facility.name, department: facility.department, type: facility.type,
      capacity: facility.capacity?.toString() || "", location: facility.location || "",
      description: facility.description || "", requires_approval: facility.requires_approval,
      min_notice_hours: facility.min_notice_hours,
    });
    setShowFacilityModal(true);
  };

  if (user?.role !== "admin") {
    return (
      <div className={styles.empty}>
        <Shield size={48} className={styles.emptyIcon} />
        <p>Admin access required</p>
      </div>
    );
  }

  const tabs = [
    { id: "facilities" as const, label: "Facilities", icon: Building2 },
    { id: "users" as const, label: "Users", icon: Users },
    { id: "reservations" as const, label: "Reservations", icon: ClipboardList },
    { id: "settings" as const, label: "Settings", icon: Settings },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Administration</h1>
          <p className={styles.subtitle}>Manage facilities, users, reservations, and system settings</p>
        </div>
      </div>

      <div className={styles.tabs}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[styles.tab, activeTab === tab.id && styles.tabActive].filter(Boolean).join(" ")}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "facilities" && (
        <div>
          <div className={styles.toolbar}>
            <Button onClick={() => { setEditingFacility(null); setFacilityForm({ name: "", department: "", type: "indoor", capacity: "", location: "", description: "", requires_approval: true, min_notice_hours: 24 }); setShowFacilityModal(true); }}>
              <Plus size={16} /> Add Facility
            </Button>
          </div>

          {loading ? (
            <div className={styles.skeletonGrid}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={[styles.skeletonFacility, "skeleton"].join(" ")} />
              ))}
            </div>
          ) : (
            <div className={styles.grid}>
              {facilities.map((facility) => (
                <div key={facility.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>{facility.name}</h3>
                    <div className={styles.cardActions}>
                      <button onClick={() => openEditFacility(facility)} className={styles.iconButton} aria-label="Edit">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => handleDeleteFacility(facility.id)} className={[styles.iconButton, styles.iconButtonDanger].join(" ")} aria-label="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className={styles.badges}>
                    <Badge variant="info">{facility.department}</Badge>
                    <Badge variant="default">{facility.type}</Badge>
                    <Badge variant={facility.is_active ? "success" : "error"}>{facility.is_active ? "Active" : "Inactive"}</Badge>
                  </div>
                  <p className={styles.cardMeta}>
                    Capacity: {facility.capacity || "N/A"} · {facility.requires_approval ? "Requires Approval" : "No Approval"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "users" && (
        <div>
          {loading ? (
            <div className={styles.skeletonList}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={[styles.skeletonCard, "skeleton"].join(" ")} />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className={styles.empty}>
              <Users size={48} className={styles.emptyIcon} />
              <p>No users found</p>
            </div>
          ) : (
            <div className={styles.list}>
              {users.filter((u: unknown) => (u as Record<string, unknown>).id !== user.id).map((u: unknown) => {
                const usr = u as Record<string, unknown>;
                return (
                  <div key={usr.id as string} className={styles.listItem}>
                    <div className={styles.listItemInfo}>
                      <p className={styles.listItemName}>{usr.full_name as string || usr.email as string}</p>
                      <p className={styles.listItemEmail}>{usr.email as string}</p>
                    </div>
                    <div className={styles.listItemActions}>
                      <Select
                        className={styles.roleSelect}
                        value={usr.role as string}
                        onChange={(e) => updateRole(usr.id as string, e.target.value)}
                        options={[
                          { value: "student", label: "Student" },
                          { value: "officer", label: "Officer" },
                          { value: "faculty", label: "Faculty" },
                          { value: "admin", label: "Admin" },
                        ]}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "reservations" && (
        <div>
          {loading ? (
            <div className={styles.skeletonList}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={[styles.skeletonCard, "skeleton"].join(" ")} />
              ))}
            </div>
          ) : reservations.length === 0 ? (
            <div className={styles.empty}>
              <ClipboardList size={48} className={styles.emptyIcon} />
              <p>No reservations found</p>
            </div>
          ) : (
            <div className={styles.list}>
              {reservations.map((r: unknown) => {
                const res = r as Record<string, unknown>;
                const profiles = res.profiles as Record<string, string> | undefined;
                return (
                  <div key={res.id as string} className={styles.listItem}>
                    <div className={styles.listItemInfo}>
                      <p className={styles.listItemName}>{res.activity_name as string}</p>
                      <p className={styles.listItemEmail}>{profiles?.full_name || profiles?.email || "Unknown"} · {res.department as string}</p>
                    </div>
                    <Badge variant={res.status === "approved" ? "success" : res.status === "rejected" ? "error" : "warning"}>
                      {res.status as string}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "settings" && (
        <div className={styles.card}>
          <h3 className={styles.cardTitle} style={{ marginBottom: "var(--space-4)" }}>System Settings</h3>
          <div className={styles.settingsGrid}>
            <div className={styles.settingItem}>
              <label className={styles.settingLabel}>Max Reservation Days in Advance</label>
              <Input type="number" defaultValue={30} />
            </div>
            <div className={styles.settingItem}>
              <label className={styles.settingLabel}>Default Notice Hours</label>
              <Input type="number" defaultValue={24} />
            </div>
          </div>
          <div style={{ marginTop: "var(--space-4)" }}>
            <Button>Save Settings</Button>
          </div>
        </div>
      )}

      <Modal isOpen={showFacilityModal} onClose={() => setShowFacilityModal(false)} title={editingFacility ? "Edit Facility" : "Add Facility"} size="md">
        <div className={styles.formFields}>
          <Input label="Name *" value={facilityForm.name} onChange={(e) => setFacilityForm((prev) => ({ ...prev, name: e.target.value }))} />
          <Select label="Department *" value={facilityForm.department} onChange={(e) => setFacilityForm((prev) => ({ ...prev, department: e.target.value }))} options={[{ value: "", label: "Select department" }, { value: "FO", label: "Facilities Office (FO)" }, { value: "RO", label: "Registrar's Office (RO)" }, { value: "AERO", label: "Aero Department (AERO)" }, { value: "IT", label: "IT Department" }, { value: "CS", label: "Computer Science" }, { value: "ENG", label: "Engineering" }, { value: "BUS", label: "Business" }, { value: "ART", label: "Arts & Sciences" }]} />
          <Select label="Type *" value={facilityForm.type} onChange={(e) => setFacilityForm((prev) => ({ ...prev, type: e.target.value }))} options={[{ value: "indoor", label: "Indoor" }, { value: "outdoor", label: "Outdoor" }, { value: "sports", label: "Sports" }, { value: "study", label: "Study" }, { value: "conference", label: "Conference" }]} />
          <Input label="Capacity" type="number" value={facilityForm.capacity} onChange={(e) => setFacilityForm((prev) => ({ ...prev, capacity: e.target.value }))} />
          <Input label="Location" value={facilityForm.location} onChange={(e) => setFacilityForm((prev) => ({ ...prev, location: e.target.value }))} />
          <Textarea label="Description" value={facilityForm.description} onChange={(e) => setFacilityForm((prev) => ({ ...prev, description: e.target.value }))} />
          <div className={styles.formRow}>
            <input type="checkbox" id="requires_approval" checked={facilityForm.requires_approval} onChange={(e) => setFacilityForm((prev) => ({ ...prev, requires_approval: e.target.checked }))} />
            <label htmlFor="requires_approval" className={styles.checkboxLabel}>Requires Approval</label>
          </div>
          <Input label="Min Notice Hours" type="number" value={facilityForm.min_notice_hours} onChange={(e) => setFacilityForm((prev) => ({ ...prev, min_notice_hours: parseInt(e.target.value) || 0 }))} />
          <div className={styles.formActions}>
            <Button variant="secondary" onClick={() => setShowFacilityModal(false)}>Cancel</Button>
            <Button onClick={handleSaveFacility}>{editingFacility ? "Update" : "Create"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
