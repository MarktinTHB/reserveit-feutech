import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { StatusChip } from "@/components/ui/StatusChip";
import { Badge } from "@/components/ui/Badge";
import { CheckSquare, Check, X, AlertCircle, FileText, Download, Clock, MapPin, RotateCcw } from "lucide-react";
import type { Reservation } from "@/types";
import { formatDate, formatDateTime } from "@/lib/utils";
import styles from "./Approvals.module.css";

type ActionType = "pending" | "reviewed" | "processing" | "approve" | "reject" | "revision";

const actionConfig: Record<ActionType, { label: string; status: string; notifType: "success" | "error" | "warning" | "info"; notifTitle: string; variant: "primary" | "secondary" | "danger" | "ghost" }> = {
  pending: { label: "Reset to Pending", status: "pending", notifType: "info", notifTitle: "Reservation Reopened", variant: "ghost" },
  reviewed: { label: "Mark Reviewed", status: "reviewed", notifType: "info", notifTitle: "Reservation Reviewed", variant: "secondary" },
  processing: { label: "Start Processing", status: "processing", notifType: "info", notifTitle: "Reservation Processing", variant: "secondary" },
  approve: { label: "Approve", status: "approved", notifType: "success", notifTitle: "Reservation Approved", variant: "primary" },
  reject: { label: "Deny", status: "rejected", notifType: "error", notifTitle: "Reservation Denied", variant: "danger" },
  revision: { label: "Request Revision", status: "revision_requested", notifType: "warning", notifTitle: "Revision Requested", variant: "secondary" },
};

export function Approvals() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [comments, setComments] = useState("");
  const [processing, setProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("pending");

  useEffect(() => {
    fetchReservations();
  }, [user, statusFilter]);

  const fetchReservations = async () => {
    setLoading(true);
    const selectQuery = "*, user:profiles!reservations_user_id_profiles_fkey(full_name, email), venues:reservation_venues(*, facility:facilities(*)), equipment:reservation_equipment(*), documents:reservation_documents(*), approvals(*, approver:profiles!approvals_approver_id_profiles_fkey(full_name))";
    let query = supabase
      .from("reservations")
      .select(selectQuery)
      .order("created_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[Approvals] Query failed:", error);
      setReservations([]);
      setLoading(false);
      return;
    }
    if (data) setReservations(data as unknown as Reservation[]);
    setLoading(false);
  };

  const handleAction = async (action: ActionType) => {
    if (!selected) return;
    setProcessing(true);

    const config = actionConfig[action];
    const newStatus = config.status;

    const { error: resError } = await supabase
      .from("reservations")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", selected.id);

    if (resError) {
      showToast(resError.message, "error");
      setProcessing(false);
      return;
    }

    await supabase.from("approvals").insert({
      reservation_id: selected.id,
      approver_id: user?.id,
      action: newStatus,
      comments: comments || null,
    });

    await supabase.from("notifications").insert({
      user_id: selected.user_id,
      title: config.notifTitle,
      message: `Your reservation "${selected.activity_name}" has been updated to: ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}.${comments ? ` Comments: ${comments}` : ""}`,
      type: config.notifType,
      related_id: selected.id,
      related_type: "reservation",
    });

    showToast(`Reservation ${newStatus}`, "success");
    setSelected(null);
    setComments("");
    setProcessing(false);
    fetchReservations();
  };

  if (user?.role !== "admin" && user?.role !== "faculty") {
    return (
      <div className={styles.empty}>
        <AlertCircle size={48} className={styles.emptyIcon} />
        <p>Approver access required</p>
      </div>
    );
  }

  const workflowSteps = [
    { status: "pending", label: "Pending" },
    { status: "reviewed", label: "Reviewed" },
    { status: "processing", label: "Processing" },
    { status: "approved", label: "Approved" },
  ];

  const renderTimeline = (currentStatus: string) => {
    const isDenied = currentStatus === "rejected";
    const isRevision = currentStatus === "revision_requested";
    const steps = isDenied
      ? [{ status: "pending", label: "Pending" }, { status: "reviewed", label: "Reviewed" }, { status: "rejected", label: "Denied" }]
      : isRevision
        ? [{ status: "pending", label: "Pending" }, { status: "reviewed", label: "Reviewed" }, { status: "revision_requested", label: "Revision" }]
        : workflowSteps;

    return (
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
        {steps.map((step, i) => {
          const currentIndex = steps.findIndex((s) => s.status === currentStatus);
          const isComplete = i <= currentIndex;
          const isCurrent = i === currentIndex;
          return (
            <div key={step.status} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "1.5rem",
                height: "1.5rem",
                borderRadius: "var(--radius-full)",
                fontSize: "var(--text-xs)",
                fontWeight: "var(--font-semibold)",
                backgroundColor: isComplete ? (step.status === "rejected" ? "var(--color-error-500)" : step.status === "revision_requested" ? "var(--color-warning-500)" : "var(--brand)") : "var(--bg-muted)",
                color: isComplete ? "#fff" : "var(--text-muted)",
              }}>
                {isComplete ? "✓" : i + 1}
              </div>
              <span style={{
                fontSize: "var(--text-sm)",
                fontWeight: isCurrent ? "var(--font-semibold)" : "var(--font-normal)",
                color: isComplete ? "var(--text-primary)" : "var(--text-muted)",
              }}>
                {step.label}
              </span>
              {i < steps.length - 1 && (
                <div style={{
                  width: "2rem",
                  height: "2px",
                  backgroundColor: i < currentIndex ? "var(--brand)" : "var(--border-default)",
                }} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Approvals</h1>
          <p className={styles.subtitle}>Review and manage reservation requests</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
        {[
          { value: "pending", label: "Pending" },
          { value: "reviewed", label: "Reviewed" },
          { value: "processing", label: "Processing" },
          { value: "approved", label: "Approved" },
          { value: "rejected", label: "Denied" },
          { value: "all", label: "All" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            style={{
              padding: "var(--space-2) var(--space-4)",
              borderRadius: "var(--radius-md)",
              fontSize: "var(--text-sm)",
              fontWeight: "var(--font-medium)",
              transition: "all var(--transition-fast)",
              backgroundColor: statusFilter === f.value ? "var(--brand)" : "var(--bg-muted)",
              color: statusFilter === f.value ? "var(--brand-foreground)" : "var(--text-secondary)",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.skeletonList}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={[styles.skeletonCard, "skeleton"].join(" ")} />
          ))}
        </div>
      ) : reservations.length === 0 ? (
        <div className={styles.empty}>
          <CheckSquare size={48} className={styles.emptyIcon} />
          <p>No reservations in this category</p>
        </div>
      ) : (
        <div className={styles.list}>
          {reservations.map((res) => (
            <div key={res.id} className={styles.card}>
              <div className={styles.cardInner}>
                <div className={styles.cardInfo}>
                  <div className={styles.cardTitleRow}>
                    <h3 className={styles.cardTitle}>{res.activity_name}</h3>
                    <StatusChip status={res.status} />
                  </div>
                  <p className={styles.cardMeta}>
                    {formatDate(res.activity_date)} · {res.department} · {res.event_duration}h
                  </p>
                  {res.user && (
                    <p className={styles.cardMeta}>
                      By {res.user.full_name || res.user.email}
                    </p>
                  )}
                </div>
                <div className={styles.cardActions}>
                  <Button variant="ghost" size="sm" onClick={() => { setSelected(res); setComments(""); }}>
                    Review
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={!!selected}
        onClose={() => { setSelected(null); setComments(""); }}
        title="Review Reservation"
        size="lg"
      >
        {selected && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
              <h2 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-bold)", color: "var(--text-primary)" }}>
                {selected.activity_name}
              </h2>
              <StatusChip status={selected.status} />
            </div>

            <div style={{ marginBottom: "var(--space-6)" }}>
              {renderTimeline(selected.status)}
            </div>

            <div className={styles.detailGrid}>
              <div className={styles.detailItem}>
                <p className={styles.detailLabel}>Activity Date</p>
                <p className={styles.detailValue}>{formatDate(selected.activity_date)}</p>
              </div>
              <div className={styles.detailItem}>
                <p className={styles.detailLabel}>Department</p>
                <p className={styles.detailValue}>{selected.department}</p>
              </div>
              <div className={styles.detailItem}>
                <p className={styles.detailLabel}>Duration</p>
                <p className={styles.detailValue}>{selected.event_duration} hours</p>
              </div>
              <div className={styles.detailItem}>
                <p className={styles.detailLabel}>Participants</p>
                <p className={styles.detailValue}>{selected.total_attendees} total</p>
              </div>
              <div className={styles.detailItem}>
                <p className={styles.detailLabel}>Security Guards</p>
                <p className={styles.detailValue}>{selected.security_guards}</p>
              </div>
              <div className={styles.detailItem}>
                <p className={styles.detailLabel}>Service Crew</p>
                <p className={styles.detailValue}>{selected.service_crew}</p>
              </div>
            </div>

            <div className={styles.detailSection}>
              <p className={styles.detailSectionLabel}>Purpose</p>
              <p className={styles.detailSectionValue}>{selected.purpose}</p>
            </div>

            {selected.setup_instructions && (
              <div className={styles.detailSection}>
                <p className={styles.detailSectionLabel}>Setup Instructions</p>
                <p className={styles.detailSectionValue}>{selected.setup_instructions}</p>
              </div>
            )}

            {selected.ingress_date && (
              <div className={styles.detailSection}>
                <p className={styles.detailSectionLabel}>Ingress / Egress</p>
                <p className={styles.detailSectionValue}>
                  {formatDateTime(selected.ingress_date)} → {selected.egress_date ? formatDateTime(selected.egress_date) : "N/A"}
                </p>
              </div>
            )}

            {selected.venues && selected.venues.length > 0 && (
              <div className={styles.detailSection}>
                <p className={styles.detailSectionLabel}>Venues</p>
                <div className={styles.badgeRow}>
                  {selected.venues.map((v) => (
                    <Badge key={v.id} variant="default">
                      <MapPin size={12} style={{ marginRight: "4px" }} />
                      {v.facility?.name || "Unknown"}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {selected.equipment && selected.equipment.length > 0 && (
              <div className={styles.detailSection}>
                <p className={styles.detailSectionLabel}>Equipment</p>
                <div className={styles.badgeRow}>
                  {selected.equipment.map((eq) => (
                    <Badge key={eq.id} variant="info">{eq.equipment_name} x{eq.quantity}</Badge>
                  ))}
                </div>
              </div>
            )}

            {selected.documents && selected.documents.length > 0 && (
              <div className={styles.detailSection}>
                <p className={styles.detailSectionLabel}>Supporting Documents</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  {selected.documents.map((doc) => (
                    <div key={doc.id} style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-3)",
                      padding: "var(--space-3)",
                      borderRadius: "var(--radius-lg)",
                      backgroundColor: "var(--bg-muted)",
                      border: "1px solid var(--border-default)",
                    }}>
                      <FileText size={20} style={{ color: "var(--brand)", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {doc.file_name}
                        </p>
                        <p style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>
                          {doc.document_type}{doc.file_size ? ` · ${(doc.file_size / 1024).toFixed(1)} KB` : ""}
                        </p>
                      </div>
                      {doc.file_url && doc.file_url !== "#" && (
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand)", display: "flex", alignItems: "center" }}>
                          <Download size={16} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selected.approvals && selected.approvals.length > 0 && (
              <div className={styles.detailSection}>
                <p className={styles.detailSectionLabel}>Approval History</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  {selected.approvals.map((ap) => (
                    <div key={ap.id} style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "var(--space-2)",
                      padding: "var(--space-2)",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--bg-muted)",
                    }}>
                      <Badge variant={ap.action === "approved" ? "success" : ap.action === "rejected" ? "error" : ap.action === "completed" ? "accent" : "info"}>
                        {ap.action}
                      </Badge>
                      <div style={{ flex: 1 }}>
                        {ap.comments && <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>{ap.comments}</p>}
                        <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                          by {ap.approver?.full_name || "System"} · {formatDateTime(ap.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.detailSection}>
              <p className={styles.detailSectionLabel}>Comments</p>
              <Textarea
                placeholder="Add comments for the requester..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
              />
            </div>

            <div className={styles.modalActions}>
              <Button
                variant="ghost"
                onClick={() => handleAction("pending")}
                isLoading={processing}
                disabled={selected.status === "pending"}
              >
                <RotateCcw size={16} /> Reset to Pending
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleAction("reviewed")}
                isLoading={processing}
                disabled={selected.status === "reviewed"}
              >
                <Check size={16} /> Mark Reviewed
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleAction("processing")}
                isLoading={processing}
                disabled={selected.status === "processing"}
              >
                <Clock size={16} /> Start Processing
              </Button>
              <Button
                onClick={() => handleAction("approve")}
                isLoading={processing}
                disabled={selected.status === "approved" || selected.status === "completed"}
              >
                <Check size={16} /> Approve
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleAction("revision")}
                isLoading={processing}
                disabled={selected.status === "revision_requested"}
              >
                <AlertCircle size={16} /> Request Revision
              </Button>
              <Button
                variant="danger"
                onClick={() => handleAction("reject")}
                isLoading={processing}
                disabled={selected.status === "rejected"}
              >
                <X size={16} /> Deny
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
