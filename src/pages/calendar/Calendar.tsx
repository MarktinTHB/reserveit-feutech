import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { StatusChip } from "@/components/ui/StatusChip";
import { ChevronLeft, ChevronRight, CalendarDays, Clock, MapPin, Users } from "lucide-react";
import type { Reservation } from "@/types";
import { formatDate } from "@/lib/utils";
import styles from "./Calendar.module.css";

type ViewMode = "month" | "week" | "day";

export function CalendarPage() {
  const { user } = useAuth();
  const [view, setView] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Reservation[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, [user, currentDate, view]);

  const fetchEvents = async () => {
    if (!user) return;
    setLoading(true);
    const isAdminOrFaculty = user.role === "admin" || user.role === "faculty";
    let query = supabase
      .from("reservations")
      .select("*, profiles(full_name, email), venues:reservation_venues(*, facility:facilities(*))")
      .order("activity_date", { ascending: true });
    if (!isAdminOrFaculty) query = query.eq("user_id", user.id);
    const start = getViewStart();
    const end = getViewEnd();
    query = query.gte("activity_date", start.toISOString().split("T")[0]).lte("activity_date", end.toISOString().split("T")[0]);
    const { data } = await query;
    if (data) setEvents(data as unknown as Reservation[]);
    setLoading(false);
  };

  const getViewStart = () => {
    const d = new Date(currentDate);
    if (view === "month") { d.setDate(1); return d; }
    if (view === "week") { const day = d.getDay(); d.setDate(d.getDate() - day); return d; }
    return d;
  };

  const getViewEnd = () => {
    const d = new Date(currentDate);
    if (view === "month") { d.setMonth(d.getMonth() + 1); d.setDate(0); return d; }
    if (view === "week") { const day = d.getDay(); d.setDate(d.getDate() + (6 - day)); return d; }
    return d;
  };

  const navigateDate = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (view === "month") d.setMonth(d.getMonth() + (direction === "next" ? 1 : -1));
      else if (view === "week") d.setDate(d.getDate() + (direction === "next" ? 7 : -7));
      else d.setDate(d.getDate() + (direction === "next" ? 1 : -1));
      return d;
    });
  };

  const statusClassMap: Record<string, string> = {
    pending: styles.eventPending,
    reviewed: styles.eventReviewed,
    processing: styles.eventProcessing,
    approved: styles.eventApproved,
    rejected: styles.eventRejected,
    revision_requested: styles.eventRevision,
    cancelled: styles.eventCancelled,
    completed: styles.eventCompleted,
  };

  const renderMonthView = () => {
    const start = getViewStart();
    const end = getViewEnd();
    const days: Date[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(new Date(d));
    const firstDayOfWeek = start.getDay();
    const blanks = Array.from({ length: firstDayOfWeek }, () => null);
    return (
      <div className={styles.monthGrid}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className={styles.dayHeader}>{d}</div>
        ))}
        {blanks.map((_, i) => <div key={`blank-${i}`} />)}
        {days.map((day) => {
          const dayEvents = events.filter((e) => new Date(e.activity_date).toDateString() === day.toDateString());
          const isToday = day.toDateString() === new Date().toDateString();
          return (
            <div key={day.toISOString()} className={[styles.dayCell, isToday && styles.dayCellToday].filter(Boolean).join(" ")}>
              <div className={[styles.dayNumber, isToday && styles.dayNumberToday].filter(Boolean).join(" ")}>{day.getDate()}</div>
              {dayEvents.slice(0, 3).map((event) => (
                <button key={event.id} onClick={() => setSelectedEvent(event)} className={[styles.eventButton, statusClassMap[event.status]].join(" ")}>
                  {event.activity_name}
                </button>
              ))}
              {dayEvents.length > 3 && <div className={styles.moreLabel}>+{dayEvents.length - 3} more</div>}
            </div>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const start = getViewStart();
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; });
    return (
      <div className={styles.monthGrid}>
        {days.map((day) => {
          const dayEvents = events.filter((e) => new Date(e.activity_date).toDateString() === day.toDateString());
          const isToday = day.toDateString() === new Date().toDateString();
          return (
            <div key={day.toISOString()} className={[styles.weekCell, isToday && styles.weekCellToday].filter(Boolean).join(" ")}>
              <div className={[styles.weekDayLabel, isToday && styles.weekDayLabelToday].filter(Boolean).join(" ")}>
                {day.toLocaleDateString("en-US", { weekday: "short", day: "numeric" })}
              </div>
              {dayEvents.map((event) => (
                <button key={event.id} onClick={() => setSelectedEvent(event)} className={[styles.weekEvent, statusClassMap[event.status]].join(" ")}>
                  <div className={styles.weekEventName}>{event.activity_name}</div>
                  <div className={styles.weekEventDept}>{event.department}</div>
                </button>
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  const renderDayView = () => {
    const dayEvents = events.filter((e) => new Date(e.activity_date).toDateString() === currentDate.toDateString());
    if (dayEvents.length === 0) {
      return (
        <div className={styles.empty}>
          <CalendarDays size={48} className={styles.emptyIcon} />
          <p>No events scheduled for this day</p>
        </div>
      );
    }
    return (
      <div className={styles.dayList}>
        {dayEvents.map((event) => (
          <div key={event.id} className={styles.dayCard}>
            <div className={styles.dayCardInfo}>
              <div className={styles.dayCardTitleRow}>
                <h3 className={styles.dayCardTitle}>{event.activity_name}</h3>
                <StatusChip status={event.status} />
              </div>
              <div className={styles.dayCardMeta}>
                <span className={styles.metaItem}><Clock size={14} />{event.event_duration}h</span>
                <span className={styles.metaItem}><MapPin size={14} />{event.department}</span>
                <span className={styles.metaItem}><Users size={14} />{event.total_attendees}</span>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedEvent(event)}>View</Button>
          </div>
        ))}
      </div>
    );
  };

  const getTitle = () => {
    if (view === "month") return currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (view === "week") {
      const start = getViewStart();
      const end = getViewEnd();
      return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  };

  const legendItems = [
    { label: "Pending", color: "var(--color-warning-300)" },
    { label: "Approved", color: "var(--color-success-300)" },
    { label: "Rejected", color: "var(--color-error-300)" },
    { label: "Revision", color: "var(--color-info-300)" },
    { label: "Completed", color: "var(--color-accent-300)" },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Calendar</h1>
          <p className={styles.subtitle}>View all reservations and events</p>
        </div>
        <div className={styles.controls}>
          <Button variant="secondary" size="sm" onClick={() => setCurrentDate(new Date())}>Today</Button>
          <div className={styles.navGroup}>
            <button onClick={() => navigateDate("prev")} className={styles.navButton}><ChevronLeft size={16} /></button>
            <span className={styles.navLabel}>{getTitle()}</span>
            <button onClick={() => navigateDate("next")} className={styles.navButton}><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      <div className={styles.viewTabs}>
        {(["month", "week", "day"] as ViewMode[]).map((v) => (
          <button key={v} onClick={() => setView(v)} className={[styles.viewTab, view === v && styles.viewTabActive].filter(Boolean).join(" ")}>
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      <div className={styles.calendarCard}>
        {loading ? (
          <div className={styles.loading} />
        ) : (
          <>
            {view === "month" && renderMonthView()}
            {view === "week" && renderWeekView()}
            {view === "day" && renderDayView()}
          </>
        )}
      </div>

      <div className={styles.legend}>
        {legendItems.map((item) => (
          <div key={item.label} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ backgroundColor: item.color }} />
            {item.label}
          </div>
        ))}
      </div>

      <Modal isOpen={!!selectedEvent} onClose={() => setSelectedEvent(null)} title="Event Details" size="md">
        {selectedEvent && (
          <div>
            <div className={styles.modalTitle}>
              <h2 className={styles.modalName}>{selectedEvent.activity_name}</h2>
              <StatusChip status={selectedEvent.status} />
            </div>
            <div className={styles.modalGrid}>
              <div className={styles.modalItem}><p className={styles.modalLabel}>Date</p><p className={styles.modalValue}>{formatDate(selectedEvent.activity_date)}</p></div>
              <div className={styles.modalItem}><p className={styles.modalLabel}>Duration</p><p className={styles.modalValue}>{selectedEvent.event_duration}h</p></div>
              <div className={styles.modalItem}><p className={styles.modalLabel}>Department</p><p className={styles.modalValue}>{selectedEvent.department}</p></div>
              <div className={styles.modalItem}><p className={styles.modalLabel}>Participants</p><p className={styles.modalValue}>{selectedEvent.total_attendees}</p></div>
            </div>
            <div className={styles.modalSection}>
              <p className={styles.modalSectionLabel}>Purpose</p>
              <p className={styles.modalSectionValue}>{selectedEvent.purpose}</p>
            </div>
            {selectedEvent.venues && selectedEvent.venues.length > 0 && (
              <div className={styles.modalSection}>
                <p className={styles.modalSectionLabel}>Venues</p>
                <div className={styles.badgeRow}>
                  {selectedEvent.venues.map((v) => <Badge key={v.id} variant="default">{v.facility?.name || "Unknown"}</Badge>)}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
