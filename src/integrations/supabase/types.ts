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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_activity_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string | null
          details: Json | null
          id: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          created_at: string | null
          distance_remaining: number | null
          driver_current_lat: number | null
          driver_current_lng: number | null
          drop_address: string
          drop_lat: number
          drop_lng: number
          estimated_arrival_time: number | null
          fare_amount: number
          id: string
          otp: string | null
          otp_verified: boolean | null
          pickup_address: string
          pickup_lat: number
          pickup_lng: number
          ride_id: string
          rider_current_lat: number | null
          rider_current_lng: number | null
          rider_id: string
          status: Database["public"]["Enums"]["booking_status"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          distance_remaining?: number | null
          driver_current_lat?: number | null
          driver_current_lng?: number | null
          drop_address: string
          drop_lat: number
          drop_lng: number
          estimated_arrival_time?: number | null
          fare_amount: number
          id?: string
          otp?: string | null
          otp_verified?: boolean | null
          pickup_address: string
          pickup_lat: number
          pickup_lng: number
          ride_id: string
          rider_current_lat?: number | null
          rider_current_lng?: number | null
          rider_id: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          distance_remaining?: number | null
          driver_current_lat?: number | null
          driver_current_lng?: number | null
          drop_address?: string
          drop_lat?: number
          drop_lng?: number
          estimated_arrival_time?: number | null
          fare_amount?: number
          id?: string
          otp?: string | null
          otp_verified?: boolean | null
          pickup_address?: string
          pickup_lat?: number
          pickup_lng?: number
          ride_id?: string
          rider_current_lat?: number | null
          rider_current_lng?: number | null
          rider_id?: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_contacts: {
        Row: {
          created_at: string | null
          id: string
          name: string
          phone: string
          relationship: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          phone: string
          relationship?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          phone?: string
          relationship?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string | null
          driver_id: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          platform_fee: number | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          rider_id: string
          status: Database["public"]["Enums"]["payment_status"] | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string | null
          driver_id: string
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          platform_fee?: number | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          rider_id: string
          status?: Database["public"]["Enums"]["payment_status"] | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string | null
          driver_id?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          platform_fee?: number | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          rider_id?: string
          status?: Database["public"]["Enums"]["payment_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      preferences: {
        Row: {
          created_at: string | null
          gender_preference: Database["public"]["Enums"]["gender"] | null
          id: string
          luggage_allowed: boolean | null
          max_passengers: number | null
          music_preference: string | null
          smoking_allowed: boolean | null
          updated_at: string | null
          user_id: string
          women_only_mode: boolean | null
        }
        Insert: {
          created_at?: string | null
          gender_preference?: Database["public"]["Enums"]["gender"] | null
          id?: string
          luggage_allowed?: boolean | null
          max_passengers?: number | null
          music_preference?: string | null
          smoking_allowed?: boolean | null
          updated_at?: string | null
          user_id: string
          women_only_mode?: boolean | null
        }
        Update: {
          created_at?: string | null
          gender_preference?: Database["public"]["Enums"]["gender"] | null
          id?: string
          luggage_allowed?: boolean | null
          max_passengers?: number | null
          music_preference?: string | null
          smoking_allowed?: boolean | null
          updated_at?: string | null
          user_id?: string
          women_only_mode?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          aadhaar_number: string | null
          aadhaar_verified: boolean | null
          avatar_url: string | null
          created_at: string | null
          date_of_birth: string | null
          driving_license_number: string | null
          driving_license_photo_url: string | null
          driving_license_verified: boolean | null
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          kyc_document_url: string | null
          kyc_status: Database["public"]["Enums"]["kyc_status"] | null
          name: string
          permanent_address: string | null
          phone: string
          role: Database["public"]["Enums"]["app_role"]
          selfie_url: string | null
          updated_at: string | null
        }
        Insert: {
          aadhaar_number?: string | null
          aadhaar_verified?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          driving_license_number?: string | null
          driving_license_photo_url?: string | null
          driving_license_verified?: boolean | null
          gender?: Database["public"]["Enums"]["gender"] | null
          id: string
          kyc_document_url?: string | null
          kyc_status?: Database["public"]["Enums"]["kyc_status"] | null
          name: string
          permanent_address?: string | null
          phone: string
          role?: Database["public"]["Enums"]["app_role"]
          selfie_url?: string | null
          updated_at?: string | null
        }
        Update: {
          aadhaar_number?: string | null
          aadhaar_verified?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          driving_license_number?: string | null
          driving_license_photo_url?: string | null
          driving_license_verified?: boolean | null
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          kyc_document_url?: string | null
          kyc_status?: Database["public"]["Enums"]["kyc_status"] | null
          name?: string
          permanent_address?: string | null
          phone?: string
          role?: Database["public"]["Enums"]["app_role"]
          selfie_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ratings: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          rating: number
          reviewee_id: string
          reviewer_id: string
          ride_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          rating: number
          reviewee_id: string
          reviewer_id: string
          ride_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          rating?: number
          reviewee_id?: string
          reviewer_id?: string
          ride_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      rides: {
        Row: {
          created_at: string | null
          destination_address: string
          destination_lat: number
          destination_lng: number
          driver_id: string
          id: string
          origin_address: string
          origin_lat: number
          origin_lng: number
          price_per_km: number
          route_polyline: string | null
          seats_available: number
          start_time: string
          status: Database["public"]["Enums"]["ride_status"] | null
          total_distance_km: number | null
          updated_at: string | null
          vehicle_id: string
        }
        Insert: {
          created_at?: string | null
          destination_address: string
          destination_lat: number
          destination_lng: number
          driver_id: string
          id?: string
          origin_address: string
          origin_lat: number
          origin_lng: number
          price_per_km: number
          route_polyline?: string | null
          seats_available: number
          start_time: string
          status?: Database["public"]["Enums"]["ride_status"] | null
          total_distance_km?: number | null
          updated_at?: string | null
          vehicle_id: string
        }
        Update: {
          created_at?: string | null
          destination_address?: string
          destination_lat?: number
          destination_lng?: number
          driver_id?: string
          id?: string
          origin_address?: string
          origin_lat?: number
          origin_lng?: number
          price_per_km?: number
          route_polyline?: string | null
          seats_available?: number
          start_time?: string
          status?: Database["public"]["Enums"]["ride_status"] | null
          total_distance_km?: number | null
          updated_at?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rides_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rides_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          admin_response: string | null
          created_at: string | null
          description: string
          id: string
          issue_type: string
          ride_id: string | null
          status: Database["public"]["Enums"]["ticket_status"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          created_at?: string | null
          description: string
          id?: string
          issue_type: string
          ride_id?: string | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_response?: string | null
          created_at?: string | null
          description?: string
          id?: string
          issue_type?: string
          ride_id?: string | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          brand: string
          created_at: string | null
          id: string
          insurance_expiry: string
          model: string
          registration_no: string
          type: Database["public"]["Enums"]["vehicle_type"]
          updated_at: string | null
          user_id: string
          vehicle_image_url: string | null
          verified: boolean | null
        }
        Insert: {
          brand: string
          created_at?: string | null
          id?: string
          insurance_expiry: string
          model: string
          registration_no: string
          type: Database["public"]["Enums"]["vehicle_type"]
          updated_at?: string | null
          user_id: string
          vehicle_image_url?: string | null
          verified?: boolean | null
        }
        Update: {
          brand?: string
          created_at?: string | null
          id?: string
          insurance_expiry?: string
          model?: string
          registration_no?: string
          type?: Database["public"]["Enums"]["vehicle_type"]
          updated_at?: string | null
          user_id?: string
          vehicle_image_url?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_booking_otp: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_ride_participant: {
        Args: { _ride_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "user" | "driver" | "admin"
      booking_status:
        | "pending"
        | "confirmed"
        | "started"
        | "completed"
        | "cancelled"
        | "accepted"
        | "driver_arriving"
        | "driver_arrived"
        | "in_progress"
      gender: "male" | "female" | "other"
      kyc_status: "pending" | "verified" | "rejected"
      payment_method: "upi" | "card" | "wallet" | "cash"
      payment_status: "pending" | "completed" | "failed" | "refunded"
      ride_status: "scheduled" | "active" | "completed" | "cancelled"
      ticket_status: "open" | "in_progress" | "resolved" | "closed"
      vehicle_type: "2wheeler" | "4wheeler"
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
      app_role: ["user", "driver", "admin"],
      booking_status: [
        "pending",
        "confirmed",
        "started",
        "completed",
        "cancelled",
        "accepted",
        "driver_arriving",
        "driver_arrived",
        "in_progress",
      ],
      gender: ["male", "female", "other"],
      kyc_status: ["pending", "verified", "rejected"],
      payment_method: ["upi", "card", "wallet", "cash"],
      payment_status: ["pending", "completed", "failed", "refunded"],
      ride_status: ["scheduled", "active", "completed", "cancelled"],
      ticket_status: ["open", "in_progress", "resolved", "closed"],
      vehicle_type: ["2wheeler", "4wheeler"],
    },
  },
} as const
