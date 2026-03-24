export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          purchased_tiers: string[];
          start_date: string;
          current_week: number;
          brain_score: number;
          onboarding_complete: boolean;
          brain_fog_baseline: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string;
          email?: string;
          purchased_tiers?: string[];
          start_date?: string;
          current_week?: number;
          brain_score?: number;
          onboarding_complete?: boolean;
          brain_fog_baseline?: number | null;
        };
        Update: {
          full_name?: string;
          email?: string;
          purchased_tiers?: string[];
          start_date?: string;
          current_week?: number;
          brain_score?: number;
          onboarding_complete?: boolean;
          brain_fog_baseline?: number | null;
        };
        Relationships: [];
      };
      completed_tasks: {
        Row: {
          id: string;
          user_id: string;
          task_id: string;
          completed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          task_id: string;
        };
        Update: {
          task_id?: string;
        };
        Relationships: [];
      };
      prepared_recipes: {
        Row: {
          id: string;
          user_id: string;
          recipe_id: string;
          prepared_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          recipe_id: string;
        };
        Update: {
          recipe_id?: string;
        };
        Relationships: [];
      };
      daily_checkins: {
        Row: {
          id: string;
          user_id: string;
          checkin_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          checkin_date: string;
        };
        Update: {
          checkin_date?: string;
        };
        Relationships: [];
      };
      assessments: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          score: number;
          answers: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          score: number;
          answers?: Record<string, unknown> | null;
        };
        Update: {
          type?: string;
          score?: number;
          answers?: Record<string, unknown> | null;
        };
        Relationships: [];
      };
      family_members: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          email: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          email?: string | null;
        };
        Update: {
          name?: string;
          email?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
