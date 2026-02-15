export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      customer_details: {
        Row: {
          created_at: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          id: string
          license_plate: string | null
          updated_at: string
          user_id: string
          vehicle_color: string | null
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_year: number | null
        }
        Insert: {
          created_at?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          id?: string
          license_plate?: string | null
          updated_at?: string
          user_id: string
          vehicle_color?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_year?: number | null
        }
        Update: {
          created_at?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          id?: string
          license_plate?: string | null
          updated_at?: string
          user_id?: string
          vehicle_color?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_year?: number | null
        }
        Relationships: []
      }
      customer_vehicles: {
        Row: {
          created_at: string
          fuel_type: string
          id: string
          is_primary: boolean | null
          license_plate: string | null
          transmission_type: string
          updated_at: string
          user_id: string
          vehicle_color: string | null
          vehicle_make: string
          vehicle_model: string
          vehicle_year: number
        }
        Insert: {
          created_at?: string
          fuel_type: string
          id?: string
          is_primary?: boolean | null
          license_plate?: string | null
          transmission_type: string
          updated_at?: string
          user_id: string
          vehicle_color?: string | null
          vehicle_make: string
          vehicle_model: string
          vehicle_year: number
        }
        Update: {
          created_at?: string
          fuel_type?: string
          id?: string
          is_primary?: boolean | null
          license_plate?: string | null
          transmission_type?: string
          updated_at?: string
          user_id?: string
          vehicle_color?: string | null
          vehicle_make?: string
          vehicle_model?: string
          vehicle_year?: number
        }
        Relationships: []
      }
      mechanic_details: {
        Row: {
          business_name: string | null
          created_at: string
          current_lat: number | null
          current_lng: number | null
          id: string
          is_available: boolean | null
          is_verified: boolean | null
          last_location_update: string | null
          license_number: string | null
          rating: number | null
          service_radius_km: number | null
          specializations: string[] | null
          total_reviews: number | null
          updated_at: string
          user_id: string
          years_experience: number | null
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          id?: string
          is_available?: boolean | null
          is_verified?: boolean | null
          last_location_update?: string | null
          license_number?: string | null
          rating?: number | null
          service_radius_km?: number | null
          specializations?: string[] | null
          total_reviews?: number | null
          updated_at?: string
          user_id: string
          years_experience?: number | null
        }
        Update: {
          business_name?: string | null
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          id?: string
          is_available?: boolean | null
          is_verified?: boolean | null
          last_location_update?: string | null
          license_number?: string | null
          rating?: number | null
          service_radius_km?: number | null
          specializations?: string[] | null
          total_reviews?: number | null
          updated_at?: string
          user_id?: string
          years_experience?: number | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          message_type: string
          receiver_id: string
          request_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          message_type?: string
          receiver_id: string
          request_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message_type?: string
          receiver_id?: string
          request_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          customer_id: string
          id: string
          mechanic_id: string
          mechanic_payout: number
          paid_at: string | null
          payment_method: string | null
          payment_status: string
          platform_fee: number | null
          request_id: string
          stripe_payment_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          customer_id: string
          id?: string
          mechanic_id: string
          mechanic_payout: number
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string
          platform_fee?: number | null
          request_id: string
          stripe_payment_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string
          id?: string
          mechanic_id?: string
          mechanic_payout?: number
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string
          platform_fee?: number | null
          request_id?: string
          stripe_payment_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      service_ratings: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          mechanic_id: string
          rating: number
          request_id: string
          review: string | null
          tags: string[] | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          mechanic_id: string
          rating: number
          request_id: string
          review?: string | null
          tags?: string[] | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          mechanic_id?: string
          rating?: number
          request_id?: string
          review?: string | null
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "service_ratings_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          customer_address: string | null
          customer_id: string
          customer_lat: number
          customer_lng: number
          description: string | null
          estimated_cost: number | null
          eta_minutes: number | null
          final_cost: number | null
          id: string
          mechanic_id: string | null
          mechanic_lat: number | null
          mechanic_lng: number | null
          photo_urls: string[] | null
          service_type: Database["public"]["Enums"]["service_type"]
          started_at: string | null
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          customer_address?: string | null
          customer_id: string
          customer_lat: number
          customer_lng: number
          description?: string | null
          estimated_cost?: number | null
          eta_minutes?: number | null
          final_cost?: number | null
          id?: string
          mechanic_id?: string | null
          mechanic_lat?: number | null
          mechanic_lng?: number | null
          photo_urls?: string[] | null
          service_type: Database["public"]["Enums"]["service_type"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          customer_address?: string | null
          customer_id?: string
          customer_lat?: number
          customer_lng?: number
          description?: string | null
          estimated_cost?: number | null
          eta_minutes?: number | null
          final_cost?: number | null
          id?: string
          mechanic_id?: string | null
          mechanic_lat?: number | null
          mechanic_lng?: number | null
          photo_urls?: string[] | null
          service_type?: Database["public"]["Enums"]["service_type"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      mechanic_public_profiles: {
        Row: {
          business_name: string | null
          id: string | null
          is_available: boolean | null
          is_verified: boolean | null
          rating: number | null
          specializations: string[] | null
          total_reviews: number | null
          user_id: string | null
          years_experience: number | null
        }
        Insert: {
          business_name?: string | null
          id?: string | null
          is_available?: boolean | null
          is_verified?: boolean | null
          rating?: number | null
          specializations?: string[] | null
          total_reviews?: number | null
          user_id?: string | null
          years_experience?: number | null
        }
        Update: {
          business_name?: string | null
          id?: string | null
          is_available?: boolean | null
          is_verified?: boolean | null
          rating?: number | null
          specializations?: string[] | null
          total_reviews?: number | null
          user_id?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      public_mechanic_ratings: {
        Row: {
          created_at: string | null
          mechanic_id: string | null
          rating: number | null
          review: string | null
          tags: string[] | null
        }
        Insert: {
          created_at?: string | null
          mechanic_id?: string | null
          rating?: number | null
          review?: string | null
          tags?: string[] | null
        }
        Update: {
          created_at?: string | null
          mechanic_id?: string | null
          rating?: number | null
          review?: string | null
          tags?: string[] | null
        }
        Relationships: []
      }
    }
    Functions: {
      assign_mechanic_to_request: {
        Args: { mechanic_user_id: string; request_id: string }
        Returns: boolean
      }
      calculate_distance_km: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      find_nearby_mechanics: {
        Args: {
          customer_lat: number
          customer_lng: number
          max_distance_km?: number
        }
        Returns: {
          business_name: string
          current_lat: number
          current_lng: number
          distance_km: number
          mechanic_id: string
          rating: number
          specializations: string[]
          total_reviews: number
          user_id: string
        }[]
      }
      has_role:
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
    }
    Enums: {
      app_role: "customer" | "mechanic" | "admin"
      request_status:
        | "pending"
        | "accepted"
        | "en_route"
        | "arrived"
        | "in_progress"
        | "completed"
        | "cancelled"
      service_type: "battery" | "tire" | "fuel" | "lockout" | "towing" | "other"
      user_role: "customer" | "mechanic"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["customer", "mechanic", "admin"],
      request_status: [
        "pending",
        "accepted",
        "en_route",
        "arrived",
        "in_progress",
        "completed",
        "cancelled",
      ],
      service_type: ["battery", "tire", "fuel", "lockout", "towing", "other"],
      user_role: ["customer", "mechanic"],
    },
  },
} as const
