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
import { StatusChip } from "@/components/ui/StatusChip";
import {
  Shield, Building2, Users, ClipboardList, Settings,
  Plus, Pencil, Trash2, Eye, Check, X, AlertCircle, Clock, FileText, Download, MapPin,
} from "lucide-react";
import type { Facility, Reservation } from "@/types";
import { formatDate, formatDateTime } from "@/lib/utils";
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
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [adminComments, setAdminComments] = useState("");
  const [adminProcessing, setAdminProcessing] = useState(false);

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
      const { data } = await supabase.from("reservations").select("*, profiles(full_name, email), venues:reservation_venues(*, facility:facilities(*)), equipment:reservation_equipment(*), documents:reservation_documents(*), approvals(*, approver:profiles(full_name))").order("created_at", { ascending: false });
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

  const handleAdminAction = async (action: string) => {
    if (!selectedReservation) return;
    setAdminProcessing(true);

    const statusMap: Record<string, string> = {
      reviewed: "reviewed",
      processing: "processing",
      approve: "approved",
      reject: "rejected",
      revision: "revision_requested",
      complete: "completed",
    };
    const newStatus = statusMap[action] || action;

    const { error: resError } = await supabase
      .from("reservations")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", selectedReservation.id);

    if (resError) {
      showToast(resError.message, "error");
      setAdminProcessing(false);
      return;
    }

    await supabase.from("approvals").insert({
      reservation_id: selectedReservation.id,
      approver_id: user?.id,
      action: newStatus,
      comments: adminComments || null,
    });

    const notifType = action === "approve" || action === "complete" ? "success" : action === "reject" ? "error" : action === "revision" ? "warning" : "info";
    const notifTitle = `Reservation ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`;
    await supabase.from("notifications").insert({
      user_id: selectedReservation.user_id,
      title: notifTitle,
      message: `Your reservation "${selectedReservation.activity_name}" has been updated to: ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}.${adminComments ? ` Comments: ${adminComments}` : ""}`,
      type: notifType,
      related_id: selectedReservation.id,
      related_type: "reservation",
    });

    showToast(`Reservation ${newStatus}`, "success");
    setSelectedReservation(null);
    setAdminComments("");
    setAdminProcessing(false);
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
                      <p className={styles.listItemEmail}>{profiles?.full_name || profiles?.email || "Unknown"} · {res.department as string} · {formatDate(res.activity_date as string)}</p>
                    </div>
                    <div className={styles.listItemActions}>
                      <StatusChip status={res.status as string} />
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedReservation(r as unknown as Reservation); setAdminComments(""); }}>
                        <Eye size={16} /> Review
                      </Button>
                    </div>
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

      <Modal
        isOpen={!!selectedReservation}
        onClose={() => { setSelectedReservation(null); setAdminComments(""); }}
        title="Review Reservation"
        size="lg"
      >
        {selectedReservation && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
              <h2 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-bold)", color: "var(--text-primary)" }}>
                {selectedReservation.activity_name}
              </h2>
              <StatusChip status={selectedReservation.status} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
              <div><p style={{ fontSize: "var(--text-sm)", color: "var(--text-tertiary)" }}>Activity Date</p><p style={{ fontWeight: "var(--font-medium)", color: "var(--text-primary)" }}>{formatDate(selectedReservation.activity_date)}</p></div>
              <div><p style={{ fontSize: "var(--text-sm)", color: "var(--text-tertiary)" }}>Department</p><p style={{ fontWeight: "var(--font-medium)", color: "var(--text-primary)" }}>{selectedReservation.department}</p></div>
              <div><p style={{ fontSize: "var(--text-sm)", color: "var(--text-tertiary)" }}>Duration</p><p style={{ fontWeight: "var(--font-medium)", color: "var(--text-primary)" }}>{selectedReservation.event_duration} hours</p></div>
              <div><p style={{ fontSize: "var(--text-sm)", color: "var(--text-tertiary)" }}>Participants</p><p style={{ fontWeight: "var(--font-medium)", color: "var(--text-primary)" }}>{selectedReservation.total_attendees} total</p></div>
            </div>

            <div style={{ marginBottom: "var(--space-4)" }}>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--text-tertiary)", marginBottom: "var(--space-1)" }}>Purpose</p>
              <p style={{ color: "var(--text-primary)" }}>{selectedReservation.purpose}</p>
            </div>

            {selectedReservation.setup_instructions && (
              <div style={{ marginBottom: "var(--space-4)" }}>
                <p style={{ fontSize: "var(--text-sm)", color: "var(--text-tertiary)", marginBottom: "var(--space-1)" }}>Setup Instructions</p>
                <p style={{ color: "var(--text-primary)" }}>{selectedReservation.setup_instructions}</p>
              </div>
            )}

            {selectedReservation.venues && selectedReservation.venues.length > 0 && (
              <div style={{ marginBottom: "var(--space-4)" }}>
                <p style={{ fontSize: "var(--text-sm)", color: "var(--text-tertiary)", marginBottom: "var(--space-2)" }}>Venues</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
                  {selectedReservation.venues.map((v) => (
                    <Badge key={v.id} variant="default"><MapPin size={12} style={{ marginRight: "4px" }} />{v.facility?.name || "Unknown"}</Badge>
                  ))}
                </div>
              </div>
            )}

            {selectedReservation.equipment && selectedReservation.equipment.length > 0 && (
              <div style={{ marginBottom: "var(--space-4)" }}>
                <p style={{ fontSize: "var(--text-sm)", color: "var(--text-tertiary)", marginBottom: "var(--space-2)" }}>Equipment</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
                  {selectedReservation.equipment.map((eq) => (
                    <Badge key={eq.id} variant="info">{eq.equipment_name} x{eq.quantity}</Badge>
                  ))}
                </div>
              </div>
            )}

            {selectedReservation.documents && selectedReservation.documents.length > 0 && (
              <div style={{ marginBottom: "var(--space-4)" }}>
                <p style={{ fontSize: "var(--text-sm)", color: "var(--text-tertiary)", marginBottom: "var(--space-2)" }}>Supporting Documents</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  {selectedReservation.documents.map((doc) => (
                    <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "var(--space-3)", borderRadius: "var(--radius-lg)", backgroundColor: "var(--bg-muted)", border: "1px solid var(--border-default)" }}>
                      <FileText size={20} style={{ color: "var(--brand)", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.file_name}</p>
                        <p style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>{doc.document_type}{doc.file_size ? ` · ${(doc.file_size / 1024).toFixed(1)} KB` : ""}</p>
                      </div>
                      {doc.file_url && doc.file_url !== "#" && (
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand)" }}><Download size={16} /></a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedReservation.approvals && selectedReservation.approvals.length > 0 && (
              <div style={{ marginBottom: "var(--space-4)" }}>
                <p style={{ fontSize: "var(--text-sm)", color: "var(--text-tertiary)", marginBottom: "var(--space-2)" }}>Approval History</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  {selectedReservation.approvals.map((ap) => (
                    <div key={ap.id} style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-2)", padding: "var(--space-2)", borderRadius: "var(--radius-md)", backgroundColor: "var(--bg-muted)" }}>
                      <Badge variant={ap.action === "approved" ? "success" : ap.action === "rejected" ? "error" : ap.action === "completed" ? "accent" : "info"}>{ap.action}</Badge>
                      <div style={{ flex: 1 }}>
                        {ap.comments && <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>{ap.comments}</p>}
                        <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>by {ap.approver?.full_name || "System"} · {formatDateTime(ap.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom: "var(--space-4)" }}>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--text-tertiary)", marginBottom: "var(--space-1)" }}>Comments</p>
              <Textarea placeholder="Add comments for the requester..." value={adminComments} onChange={(e) => setAdminComments(e.target.value)} />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)", flexWrap: "wrap" }}>
              {selectedReservation.status === "pending" && (
                <Button variant="secondary" onClick={() => handleAdminAction("reviewed")} isLoading={adminProcessing}><Check size={16} /> Mark Reviewed</Button>
              )}
              {selectedReservation.status === "reviewed" && (
                <Button variant="secondary" onClick={() => handleAdminAction("processing")} isLoading={adminProcessing}><Clock size={16} /> Start Processing</Button>
              )}
              {selectedReservation.status === "processing" && (
                <Button onClick={() => handleAdminAction("approve")} isLoading={adminProcessing}><Check size={16} /> Approve</Button>
              )}
              {selectedReservation.status === "approved" && (
                <Button onClick={() => handleAdminAction("complete")} isLoading={adminProcessing}><Check size={16} /> Mark Completed</Button>
              )}
              {(selectedReservation.status === "pending" || selectedReservation.status === "reviewed" || selectedReservation.status === "processing") && (
                <>
                  <Button variant="secondary" onClick={() => handleAdminAction("revision")} isLoading={adminProcessing}><AlertCircle size={16} /> Request Revision</Button>
                  <Button variant="danger" onClick={() => handleAdminAction("reject")} isLoading={adminProcessing}><X size={16} /> Deny</Button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
