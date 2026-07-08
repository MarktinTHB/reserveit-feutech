export type UserRole = "student" | "officer" | "faculty" | "admin";

export type ReservationStatus = "pending" | "reviewed" | "processing" | "approved" | "rejected" | "revision_requested" | "cancelled" | "completed";

export interface Facility {
  id: string;
  name: string;
  department: string;
  type: string;
  capacity: number | null;
  location: string | null;
  description: string | null;
  amenities: string[] | null;
  images: string[] | null;
  is_active: boolean;
  requires_approval: boolean;
  min_notice_hours: number;
}

export interface Reservation {
  id: string;
  user_id: string;
  request_date: string;
  activity_date: string;
  activity_name: string;
  purpose: string;
  department: string;
  event_duration: number;
  internal_participants: number;
  external_participants: number;
  security_guards: number;
  service_crew: number;
  setup_instructions: string | null;
  ingress_date: string | null;
  egress_date: string | null;
  status: ReservationStatus;
  total_attendees: number;
  created_at: string;
  user?: { full_name: string; email: string };
  venues?: ReservationVenue[];
  equipment?: ReservationEquipment[];
  documents?: ReservationDocument[];
  approvals?: Approval[];
}

export interface ReservationVenue {
  id: string;
  reservation_id: string;
  facility_id: string;
  start_time: string;
  end_time: string;
  facility?: Facility;
}

export interface ReservationEquipment {
  id: string;
  reservation_id: string;
  equipment_name: string;
  quantity: number;
  notes: string | null;
}

export interface ReservationDocument {
  id: string;
  reservation_id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  file_type: string | null;
  uploaded_at: string;
}

export interface Approval {
  id: string;
  reservation_id: string;
  approver_id: string | null;
  action: string;
  comments: string | null;
  created_at: string;
  approver?: { full_name: string };
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  related_id: string | null;
  related_type: string | null;
  is_read: boolean;
  created_at: string;
}

export interface DashboardStats {
  totalReservations: number;
  pendingApprovals: number;
  approvedThisMonth: number;
  rejectedThisMonth: number;
  upcomingReservations: Reservation[];
  recentNotifications: Notification[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  status: ReservationStatus;
  facility: string;
  color: string;
}

export const DEPARTMENT_VENUES: Record<string, string[]> = {
  FO: [
    "18F Roofdeck",
    "17F MPR",
    "17F Gym",
    "8F Executive Lounge 1",
    "8F Executive Lounge 2",
    "8F Executive Lounge 3",
    "2F Student Plaza",
    "3F Swimming Pool",
    "Study Area",
    "Conference Room A",
    "Conference Room B",
    "Others",
  ],
  RO: ["Case Room 1604", "AVR 1603", "Classroom A", "Classroom B"],
  AERO: ["MPR 1502", "MPR 1503", "MPR 1504"],
};

export const EQUIPMENT_LIST = [
  "Chairs",
  "Tables",
  "Podium",
  "Microphones",
  "AUX Cable",
  "Sound System",
  "Extension Cords",
  "Stage",
  "Panel Boards",
  "White Screen",
  "Philippine Flag",
  "FEU Tech Flag",
  "LED Video Wall",
  "Other equipment",
];

export const DOCUMENT_TYPES = [
  "Activity Proposal",
  "Request Letter",
  "Internal Participants List",
  "External Participants List",
  "Other attachments",
];
