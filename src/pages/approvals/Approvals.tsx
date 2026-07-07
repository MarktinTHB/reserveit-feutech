import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { StatusChip } from "@/components/ui/StatusChip";
import { CheckSquare, Check, X, AlertCircle } from "lucide-react";
import type { Reservation } from "@/types";
import { formatDate } from "@/lib/utils";
import styles from "./Approvals.module.css";

export function Approvals() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [pending, setPending] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | "revision" | null>(null);
  const [comments, setComments] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPending();
  }, [user]);

  const fetchPending = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("reservations")
      .select("*, profiles(full_name, email)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (data) setPending(data as unknown as Reservation[]);
    setLoading(false);
  };

  const handleAction = async () => {
    if (!selected || !action) return;
    setProcessing(true);

    const statusMap = {
      approve: "approved",
      reject: "rejected",
      revision: "revision_requested",
    };

    const { error: resError } = await supabase
      .from("reservations")
      .update({ status: statusMap[action] })
      .eq("id", selected.id);

    if (resError) {
      showToast(resError.message, "error");
      setProcessing(false);
      return;
    }

    await supabase.from("approvals").insert({
      reservation_id: selected.id,
      approver_id: user?.id,
      action: statusMap[action],
      comments: comments || null,
    });

    await supabase.from("notifications").insert({
      user_id: selected.user_id,
      title: `Reservation ${statusMap[action]}`,
      message: `Your reservation "${selected.activity_name}" has been ${statusMap[action]}.`,
      type: action === "approve" ? "success" : action === "reject" ? "error" : "warning",
      related_id: selected.id,
      related_type: "reservation",
    });

    showToast(`Reservation ${statusMap[action]}`, "success");
    setSelected(null);
    setAction(null);
    setComments("");
    setProcessing(false);
    fetchPending();
  };

  if (user?.role !== "admin" && user?.role !== "faculty") {
    return (
      <div className={styles.empty}>
        <AlertCircle size={48} className={styles.emptyIcon} />
        <p>Approver access required</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Approvals</h1>
          <p className={styles.subtitle}>Review and manage pending reservations</p>
        </div>
      </div>

      {loading ? (
        <div className={styles.skeletonList}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={[styles.skeletonCard, "skeleton"].join(" ")} />
          ))}
        </div>
      ) : pending.length === 0 ? (
        <div className={styles.empty}>
          <CheckSquare size={48} className={styles.emptyIcon} />
          <p>No pending approvals</p>
        </div>
      ) : (
        <div className={styles.list}>
          {pending.map((res) => (
            <div key={res.id} className={styles.card}>
              <div className={styles.cardInner}>
                <div className={styles.cardInfo}>
                  <h3 className={styles.cardTitle}>{res.activity_name}</h3>
                  <p className={styles.cardMeta}>
                    {formatDate(res.activity_date)} · {res.department} · {res.event_duration}h
                  </p>
                  {res.profiles && (
                    <p className={styles.cardMeta}>
                      By {res.profiles.full_name || res.profiles.email}
                    </p>
                  )}
                </div>
                <div className={styles.cardActions}>
                  <Button variant="ghost" size="sm" onClick={() => setSelected(res)}>
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
        onClose={() => { setSelected(null); setAction(null); setComments(""); }}
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
            </div>

            <div className={styles.detailSection}>
              <p className={styles.detailSectionLabel}>Purpose</p>
              <p className={styles.detailSectionValue}>{selected.purpose}</p>
            </div>

            <div className={styles.detailSection}>
              <p className={styles.detailSectionLabel}>Comments</p>
              <Textarea
                placeholder="Add comments for the requester..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
              />
            </div>

            <div className={styles.modalActions}>
              <Button variant="danger" onClick={() => { setAction("reject"); handleAction(); }} isLoading={processing && action === "reject"}>
                <X size={16} /> Reject
              </Button>
              <Button variant="secondary" onClick={() => { setAction("revision"); handleAction(); }} isLoading={processing && action === "revision"}>
                <AlertCircle size={16} /> Request Revision
              </Button>
              <Button onClick={() => { setAction("approve"); handleAction(); }} isLoading={processing && action === "approve"}>
                <Check size={16} /> Approve
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
