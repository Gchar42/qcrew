export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          avatar_url: string | null;
          username: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          username?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          username?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      crews: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          owner_id: string;
          invite_code: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          owner_id: string;
          invite_code: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          description?: string | null;
          owner_id?: string;
          invite_code?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      crew_members: {
        Row: {
          id: string;
          crew_id: string;
          user_id: string;
          role: "owner" | "member";
          joined_at: string;
        };
        Insert: {
          id?: string;
          crew_id: string;
          user_id: string;
          role?: "owner" | "member";
          joined_at?: string;
        };
        Update: {
          crew_id?: string;
          user_id?: string;
          role?: "owner" | "member";
          joined_at?: string;
        };
      };
      matches: {
        Row: {
          id: string;
          crew_id: string;
          champion_placeholder: string;
          role: string;
          kills: number;
          deaths: number;
          assists: number;
          cs_per_min: number;
          carry_score: number;
          grief_index: number;
          label: string | null;
          played_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          crew_id: string;
          champion_placeholder: string;
          role: string;
          kills: number;
          deaths: number;
          assists: number;
          cs_per_min: number;
          carry_score: number;
          grief_index: number;
          label?: string | null;
          played_at?: string;
          created_at?: string;
        };
        Update: {
          crew_id?: string;
          champion_placeholder?: string;
          role?: string;
          kills?: number;
          deaths?: number;
          assists?: number;
          cs_per_min?: number;
          carry_score?: number;
          grief_index?: number;
          label?: string | null;
          played_at?: string;
          created_at?: string;
        };
      };
      reactions: {
        Row: {
          id: string;
          match_id: string;
          user_id: string;
          type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          user_id: string;
          type: string;
          created_at?: string;
        };
        Update: {
          match_id?: string;
          user_id?: string;
          type?: string;
          created_at?: string;
        };
      };
      comments: {
        Row: {
          id: string;
          match_id: string;
          user_id: string;
          body: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          user_id: string;
          body: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          match_id?: string;
          user_id?: string;
          body?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Crew = Database["public"]["Tables"]["crews"]["Row"];
export type CrewMember = Database["public"]["Tables"]["crew_members"]["Row"];
export type Match = Database["public"]["Tables"]["matches"]["Row"];
export type Reaction = Database["public"]["Tables"]["reactions"]["Row"];
export type Comment = Database["public"]["Tables"]["comments"]["Row"];
