// ─── Database type definitions ────────────────────────────────────────────────
// These match the Supabase schema exactly.
// Run `npx supabase gen types typescript` to auto-regenerate after schema changes.

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      businesses: {
        Row: {
          id:                 string;
          name:               string;
          type:               string;
          suburb:             string | null;
          stripe_account_id:  string | null;
          stripe_customer_id: string | null;
          subdomain:          string | null;
          logo_url:           string | null;
          settings:           Json;
          created_at:         string;
        };
        Insert: Omit<Database["public"]["Tables"]["businesses"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["businesses"]["Insert"]>;
      };
      customers: {
        Row: {
          id:               string;
          business_id:      string;
          name:             string;
          phone:            string | null;
          email:            string | null;
          source:           string;
          segment:          string;
          first_order:      string | null;
          last_order_date:  string | null;
          total_spent:      number;
          total_orders:     number;
          points_balance:   number;
          opted_out:        boolean;
          created_at:       string;
        };
        Insert: Omit<Database["public"]["Tables"]["customers"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["customers"]["Insert"]>;
      };
      orders: {
        Row: {
          id:                 string;
          business_id:        string;
          customer_id:        string | null;
          items:              Json;
          total:              number;
          status:             string;
          source:             string;
          stripe_payment_id:  string | null;
          created_at:         string;
        };
        Insert: Omit<Database["public"]["Tables"]["orders"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
      };
      campaigns: {
        Row: {
          id:               string;
          business_id:      string;
          type:             string;
          name:             string | null;
          template:         string | null;
          active:           boolean;
          discount_amount:  number;
          cooldown_days:    number;
          trigger_days:     number;
          created_at:       string;
        };
        Insert: Omit<Database["public"]["Tables"]["campaigns"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["campaigns"]["Insert"]>;
      };
      sms_logs: {
        Row: {
          id:           string;
          business_id:  string;
          customer_id:  string | null;
          campaign_id:  string | null;
          message:      string | null;
          status:       string;
          converted:    boolean;
          twilio_sid:   string | null;
          sent_at:      string;
        };
        Insert: Omit<Database["public"]["Tables"]["sms_logs"]["Row"], "id" | "sent_at">;
        Update: Partial<Database["public"]["Tables"]["sms_logs"]["Insert"]>;
      };
      menu_categories: {
        Row: {
          id:           string;
          business_id:  string;
          name:         string;
          sort_order:   number;
        };
        Insert: Omit<Database["public"]["Tables"]["menu_categories"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["menu_categories"]["Insert"]>;
      };
      menu_items: {
        Row: {
          id:            string;
          business_id:   string;
          category_id:   string | null;
          name:          string;
          description:   string | null;
          price:         number;
          image_url:     string | null;
          available:     boolean;
          dietary_tags:  string[];
          sort_order:    number;
        };
        Insert: Omit<Database["public"]["Tables"]["menu_items"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["menu_items"]["Insert"]>;
      };
      analytics_daily: {
        Row: {
          id:              string;
          business_id:     string;
          date:            string;
          total_orders:    number;
          total_revenue:   number;
          direct_orders:   number;
          agg_orders:      number;
          new_customers:   number;
          sms_sent:        number;
          sms_converted:   number;
        };
        Insert: Omit<Database["public"]["Tables"]["analytics_daily"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["analytics_daily"]["Insert"]>;
      };
    };
  };
}

// Convenience row types
export type Business        = Database["public"]["Tables"]["businesses"]["Row"];
export type Customer        = Database["public"]["Tables"]["customers"]["Row"];
export type Order           = Database["public"]["Tables"]["orders"]["Row"];
export type Campaign        = Database["public"]["Tables"]["campaigns"]["Row"];
export type SmsLog          = Database["public"]["Tables"]["sms_logs"]["Row"];
export type MenuCategory    = Database["public"]["Tables"]["menu_categories"]["Row"];
export type MenuItem        = Database["public"]["Tables"]["menu_items"]["Row"];
export type AnalyticsDaily  = Database["public"]["Tables"]["analytics_daily"]["Row"];
