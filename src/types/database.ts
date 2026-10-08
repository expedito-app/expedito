// PROVISÓRIO: escrito à mão espelhando supabase/migrations até podermos rodar
// `npx supabase gen types typescript --project-id <id> > src/types/database.ts`.
// Depois de gerado, não editar à mão.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type UserRole = "manager" | "field";
type TaskUrgency = "low" | "medium" | "high";
type TaskStatus = "pending" | "in_progress" | "done" | "problem";
type OccurrenceType = "agency_closed" | "missing_document" | "other";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: UserRole;
          full_name: string;
          manager_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          role?: UserRole;
          full_name: string;
          manager_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          role?: UserRole;
          full_name?: string;
          manager_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      agencies: {
        Row: {
          id: string;
          manager_id: string;
          name: string;
          address: string | null;
          opens_at: string | null;
          closes_at: string | null;
          requirements: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          manager_id: string;
          name: string;
          address?: string | null;
          opens_at?: string | null;
          closes_at?: string | null;
          requirements?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          manager_id?: string;
          name?: string;
          address?: string | null;
          opens_at?: string | null;
          closes_at?: string | null;
          requirements?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          manager_id: string;
          agency_id: string;
          assigned_to: string | null;
          document_ref: string;
          description: string | null;
          urgency: TaskUrgency;
          due_at: string;
          status: TaskStatus;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          manager_id: string;
          agency_id: string;
          assigned_to?: string | null;
          document_ref: string;
          description?: string | null;
          urgency?: TaskUrgency;
          due_at: string;
          status?: TaskStatus;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          manager_id?: string;
          agency_id?: string;
          assigned_to?: string | null;
          document_ref?: string;
          description?: string | null;
          urgency?: TaskUrgency;
          due_at?: string;
          status?: TaskStatus;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      task_occurrences: {
        Row: {
          id: string;
          task_id: string;
          manager_id: string;
          author_id: string;
          type: OccurrenceType;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          manager_id: string;
          author_id: string;
          type: OccurrenceType;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          manager_id?: string;
          author_id?: string;
          type?: OccurrenceType;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      task_signatures: {
        Row: {
          task_id: string;
          manager_id: string;
          author_id: string;
          signer_name: string;
          image: string;
          signed_at: string;
        };
        // Gravação só por field_complete_task_with_signature (sem política de escrita).
        Insert: {
          task_id: string;
          manager_id: string;
          author_id: string;
          signer_name: string;
          image: string;
          signed_at?: string;
        };
        Update: {
          task_id?: string;
          manager_id?: string;
          author_id?: string;
          signer_name?: string;
          image?: string;
          signed_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      tasks_with_risk: {
        Row: {
          id: string;
          manager_id: string;
          agency_id: string;
          assigned_to: string | null;
          document_ref: string;
          description: string | null;
          urgency: TaskUrgency;
          due_at: string;
          status: TaskStatus;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
          agency_name: string;
          agency_closes_at: string | null;
          risk_level: "ok" | "at_risk" | "overdue" | "none";
        };
        Relationships: [];
      };
    };
    Functions: {
      current_owner_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      field_update_task_status: {
        Args: { p_task_id: string; p_status: TaskStatus };
        Returns: undefined;
      };
      field_complete_task_with_signature: {
        Args: { p_task_id: string; p_signer_name: string; p_image: string };
        Returns: undefined;
      };
    };
    Enums: {
      user_role: UserRole;
      task_urgency: TaskUrgency;
      task_status: TaskStatus;
      occurrence_type: OccurrenceType;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];
