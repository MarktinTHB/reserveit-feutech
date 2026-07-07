import styles from "./StatusChip.module.css";

type StatusVariant = "pending" | "reviewed" | "processing" | "approved" | "rejected" | "revision" | "cancelled" | "completed";

interface StatusChipProps {
  status: string;
  label?: string;
}

const statusMap: Record<string, { variant: StatusVariant; label: string }> = {
  pending: { variant: "pending", label: "Pending" },
  reviewed: { variant: "reviewed", label: "Reviewed" },
  processing: { variant: "processing", label: "Processing" },
  approved: { variant: "approved", label: "Approved" },
  rejected: { variant: "rejected", label: "Denied" },
  revision_requested: { variant: "revision", label: "Revision" },
  cancelled: { variant: "cancelled", label: "Cancelled" },
  completed: { variant: "completed", label: "Completed" },
};

export function StatusChip({ status, label }: StatusChipProps) {
  const config = statusMap[status] || statusMap.pending;
  return (
    <span className={[styles.chip, styles[config.variant]].join(" ")}>
      <span className={styles.dot} />
      {label || config.label}
    </span>
  );
}
