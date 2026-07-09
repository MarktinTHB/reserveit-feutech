import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { StatusChip } from "@/components/ui/StatusChip";
import { Link, useNavigate } from "react-router-dom";
import { CalendarDays, Eye, Plus, Search, FileText, Download, Edit3 } from "lucide-react";
import type { Reservation } from "@/types";
import { formatDate } from "@/lib/utils";
import styles from "./Reservations.module.css";

export function Reservations() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filtered, setFiltered] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

  useEffect(() => {
    fetchReservations();
  }, [user]);

  useEffect(() => {
    let result = reservations;
    if (search) {
      result = result.filter(
        (r) =>
          r.activity_name.toLowerCase().includes(search.toLowerCase()) ||
          r.department.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (statusFilter) {
      result = result.filter((r) => r.status === statusFilter);
    }
    setFiltered(result);
  }, [search, statusFilter, reservations]);

  const fetchReservations = async () => {
    if (!user) return;
    setLoading(true);

    await supabase.rpc("mark_completed_reservations");

    const isAdminOrFaculty = user.role === "admin" || user.role === "faculty";
    const selectQuery = "*, user:profiles!reservations_user_id_profiles_fkey(full_name, email), venues:reservation_venues(*, facility:facilities(*)), equipment:reservation_equipment(*), documents:reservation_documents(*), approvals(*, approver:profiles!approvals_approver_id_profiles_fkey(full_name))";
    const query = isAdminOrFaculty
      ? supabase.from("reservations").select(selectQuery).order("created_at", { ascending: false })
      : supabase.from("reservations").select(selectQuery).eq("user_id", user.id).order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) {
      console.error("[Reservations] Query failed:", error);
      setReservations([]);
      setFiltered([]);
      setLoading(false);
      return;
    }
    if (data) {
      setReservations(data as unknown as Reservation[]);
      setFiltered(data as unknown as Reservation[]);
    }
    setLoading(false);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Reservations</h1>
          <p className={styles.subtitle}>Manage and track all reservations</p>
        </div>
        <Link to="/reservations/new">
          <Button><Plus size={16} /> New Reservation</Button>
        </Link>
      </div>

      <div className={styles.filters}>
        <div className={styles.search}>
          <Input
            placeholder="Search reservations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search size={16} />}
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: "", label: "All Statuses" },
            { value: "pending", label: "Pending" },
            { value: "reviewed", label: "Reviewed" },
            { value: "processing", label: "Processing" },
            { value: "approved", label: "Approved" },
            { value: "rejected", label: "Denied" },
            { value: "revision_requested", label: "Revision Requested" },
            { value: "cancelled", label: "Cancelled" },
            { value: "completed", label: "Completed" },
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
          <CalendarDays size={48} className={styles.emptyIcon} />
          <p>No reservations found</p>
          <Link to="/reservations/new" style={{ marginTop: "var(--space-4)", display: "inline-block" }}>
            <Button variant="outline">Create your first reservation</Button>
          </Link>
        </div>
      ) : (
        <div className={styles.list}>
          {filtered.map((res) => (
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
                    <p className={styles.cardAuthor}>
                      By {res.user.full_name || res.user.email}
                    </p>
                  )}
                </div>
                <div className={styles.cardActions}>
                  {(res.status === "pending" || res.status === "revision_requested") && (
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/reservations/${res.id}/edit`)}>
                      <Edit3 size={16} /> Edit
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setSelectedReservation(res)}>
                    <Eye size={16} /> View
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={!!selectedReservation}
        onClose={() => setSelectedReservation(null)}
        title="Reservation Details"
        size="lg"
      >
        {selectedReservation && (
          <div>
            <div className={styles.detailTitle}>
              <h2 className={styles.detailName}>{selectedReservation.activity_name}</h2>
              <StatusChip status={selectedReservation.status} />
            </div>

            {/* Progress Timeline */}
            <div style={{ marginBottom: "var(--space-6)" }}>
              {(() => {
                const isDenied = selectedReservation.status === "rejected";
                const isRevision = selectedReservation.status === "revision_requested";
                const steps = isDenied
                  ? [{ status: "pending", label: "Pending" }, { status: "reviewed", label: "Reviewed" }, { status: "rejected", label: "Denied" }]
                  : isRevision
                    ? [{ status: "pending", label: "Pending" }, { status: "reviewed", label: "Reviewed" }, { status: "revision_requested", label: "Revision" }]
                    : [{ status: "pending", label: "Pending" }, { status: "reviewed", label: "Reviewed" }, { status: "processing", label: "Processing" }, { status: "approved", label: "Approved" }, { status: "completed", label: "Completed" }];
                const currentIndex = steps.findIndex((s) => s.status === selectedReservation.status);
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
                    {steps.map((step, i) => {
                      const isComplete = i <= currentIndex;
                      const isCurrent = i === currentIndex;
                      return (
                        <div key={step.status} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                          <div style={{
                            display: "flex", alignItems: "center", justifyContent: "center",
                            width: "1.5rem", height: "1.5rem", borderRadius: "var(--radius-full)",
                            fontSize: "var(--text-xs)", fontWeight: "var(--font-semibold)",
                            backgroundColor: isComplete ? (step.status === "rejected" ? "var(--color-error-500)" : step.status === "revision_requested" ? "var(--color-warning-500)" : "var(--brand)") : "var(--bg-muted)",
                            color: isComplete ? "#fff" : "var(--text-muted)",
                          }}>
                            {isComplete ? "✓" : i + 1}
                          </div>
                          <span style={{ fontSize: "var(--text-sm)", fontWeight: isCurrent ? "var(--font-semibold)" : "var(--font-normal)", color: isComplete ? "var(--text-primary)" : "var(--text-muted)" }}>
                            {step.label}
                          </span>
                          {i < steps.length - 1 && (
                            <div style={{ width: "1.5rem", height: "2px", backgroundColor: i < currentIndex ? "var(--brand)" : "var(--border-default)" }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            <div className={styles.detailGrid}>
              <div className={styles.detailItem}>
                <p className={styles.detailLabel}>Activity Date</p>
                <p className={styles.detailValue}>{formatDate(selectedReservation.activity_date)}</p>
              </div>
              <div className={styles.detailItem}>
                <p className={styles.detailLabel}>Department</p>
                <p className={styles.detailValue}>{selectedReservation.department}</p>
              </div>
              <div className={styles.detailItem}>
                <p className={styles.detailLabel}>Duration</p>
                <p className={styles.detailValue}>{selectedReservation.event_duration} hours</p>
              </div>
              <div className={styles.detailItem}>
                <p className={styles.detailLabel}>Participants</p>
                <p className={styles.detailValue}>{selectedReservation.total_attendees} total</p>
              </div>
            </div>

            <div className={styles.detailSection}>
              <p className={styles.detailSectionLabel}>Purpose</p>
              <p className={styles.detailSectionValue}>{selectedReservation.purpose}</p>
            </div>

            {selectedReservation.venues && selectedReservation.venues.length > 0 && (
              <div className={styles.detailSection}>
                <p className={styles.detailSectionLabel}>Venues</p>
                <div className={styles.badgeRow}>
                  {selectedReservation.venues.map((v) => (
                    <Badge key={v.id} variant="default">{v.facility?.name || "Unknown"}</Badge>
                  ))}
                </div>
              </div>
            )}

            {selectedReservation.equipment && selectedReservation.equipment.length > 0 && (
              <div className={styles.detailSection}>
                <p className={styles.detailSectionLabel}>Equipment</p>
                <div className={styles.badgeRow}>
                  {selectedReservation.equipment.map((eq) => (
                    <Badge key={eq.id} variant="info">{eq.equipment_name} x{eq.quantity}</Badge>
                  ))}
                </div>
              </div>
            )}

            {selectedReservation.documents && selectedReservation.documents.length > 0 && (
              <div className={styles.detailSection}>
                <p className={styles.detailSectionLabel}>Supporting Documents</p>
                <div className={styles.documentList}>
                  {selectedReservation.documents.map((doc) => (
                    <div key={doc.id} className={styles.documentItem}>
                      <FileText size={20} style={{ color: "var(--brand)", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p className={styles.documentName}>{doc.file_name}</p>
                        <p className={styles.documentMeta}>{doc.document_type}{doc.file_size ? ` · ${(doc.file_size / 1024).toFixed(1)} KB` : ""}</p>
                      </div>
                      {doc.file_url && doc.file_url !== "#" && (
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand)", display: "flex", alignItems: "center", gap: "4px", fontSize: "var(--text-sm)", flexShrink: 0 }}>
                          <Download size={16} /> View
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedReservation.approvals && selectedReservation.approvals.length > 0 && (
              <div className={styles.detailSection}>
                <p className={styles.detailSectionLabel}>Approval History</p>
                <div>
                  {selectedReservation.approvals.map((ap) => (
                    <div key={ap.id} className={styles.approvalItem}>
                      <Badge variant={ap.action === "approved" ? "success" : ap.action === "rejected" ? "error" : ap.action === "completed" ? "accent" : "info"}>
                        {ap.action}
                      </Badge>
                      <span className={styles.approvalComment}>{ap.comments}</span>
                      <span className={styles.approvalAuthor}>by {ap.approver?.full_name || "System"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
