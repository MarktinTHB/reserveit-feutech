import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          student_id: string | null;
          department: string | null;
          role: string;
          phone: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          student_id?: string | null;
          department?: string | null;
          role?: string;
          phone?: string | null;
          avatar_url?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      facilities: {
        Row: {
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
          created_at: string;
          updated_at: string;
        };
      };
      reservations: {
        Row: {
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
          status: string;
          total_attendees: number;
          created_at: string;
          updated_at: string;
        };
      };
      reservation_venues: {
        Row: {
          id: string;
          reservation_id: string;
          facility_id: string;
          start_time: string;
          end_time: string;
        };
      };
      reservation_equipment: {
        Row: {
          id: string;
          reservation_id: string;
          equipment_name: string;
          quantity: number;
          notes: string | null;
        };
      };
      reservation_documents: {
        Row: {
          id: string;
          reservation_id: string;
          document_type: string;
          file_name: string;
          file_url: string;
          file_size: number | null;
          file_type: string | null;
          uploaded_at: string;
        };
      };
      approvals: {
        Row: {
          id: string;
          reservation_id: string;
          approver_id: string | null;
          action: string;
          comments: string | null;
          created_at: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: string;
          related_id: string | null;
          related_type: string | null;
          is_read: boolean;
          created_at: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          table_name: string | null;
          record_id: string | null;
          old_data: Record<string, unknown> | null;
          new_data: Record<string, unknown> | null;
          ip_address: string | null;
          created_at: string;
        };
      };
      system_settings: {
        Row: {
          id: string;
          key: string;
          value: Record<string, unknown>;
          description: string | null;
          updated_at: string;
        };
      };
    };
  };
};
