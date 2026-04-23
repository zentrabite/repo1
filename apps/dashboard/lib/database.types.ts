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
          // Stripe Connect onboarding state (written by /api/stripe/webhook)
          stripe_charges_enabled:   boolean | null;
          stripe_payouts_enabled:   boolean | null;
          stripe_details_submitted: boolean | null;
          subdomain:          string | null;
          logo_url:           string | null;
          // Super-admin "About" fields (populated at onboarding, editable from
          // /admin/businesses/[id]).
          description:        string | null;
          contact_phone:      string | null;
          contact_email:      string | null;
          website:            string | null;
          abn:                string | null;
          address:            string | null;
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
          // ─── Fulfillment tracking (migration 010) ───────────────────────
          fulfillment_type:   string | null;  // dine_in | takeaway | delivery | shipping
          placed_at:          string | null;
          picked_at:          string | null;
          packed_at:          string | null;
          shipped_at:         string | null;
          delivered_at:       string | null;
          carrier:            string | null;
          tracking_number:    string | null;
          tracking_url:       string | null;
          ship_to:            Json | null;
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
          channel:      string | null;
          rule_id:      string | null;
          recipient:    string | null;
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
      winback_rules: {
        Row: {
          id:             string;
          business_id:    string;
          name:           string;
          inactive_days:  number;
          offer_type:     string;         // percent | dollar | free_delivery | free_item
          offer_value:    number;
          channel:        string;         // sms | email | push
          template:       string;
          cooldown_days:  number;
          is_active:      boolean;
          redemptions:    number;
          revenue:        number;
          created_at:     string;
        };
        Insert: Omit<Database["public"]["Tables"]["winback_rules"]["Row"], "id" | "created_at" | "redemptions" | "revenue">;
        Update: Partial<Database["public"]["Tables"]["winback_rules"]["Row"]>;
      };
      ai_call_profiles: {
        Row: {
          id:                 string;
          business_id:        string;
          enabled:            boolean;
          answer_mode:        string;   // after_hours | always | overflow
          voice:              string;
          personality:        string;
          greeting:           string;
          faq_context:        string | null;
          escalation_phone:   string | null;
          take_orders:        boolean;
          take_bookings:      boolean;
          send_followup_sms:  boolean;
          created_at:         string;
          updated_at:         string;
        };
        Insert: Omit<Database["public"]["Tables"]["ai_call_profiles"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["ai_call_profiles"]["Row"]>;
      };
      roster_shifts: {
        Row: {
          id:            string;
          business_id:   string;
          employee_id:   string | null;
          employee_name: string;
          role:          string | null;
          shift_start:   string;
          shift_end:     string;
          hourly_rate:   number | null;
          status:        string;
          notes:         string | null;
          created_at:    string;
        };
        Insert: Omit<Database["public"]["Tables"]["roster_shifts"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["roster_shifts"]["Row"]>;
      };
      ai_recommendations: {
        Row: {
          id:            string;
          business_id:   string;
          kind:          string;      // stock | retention | staffing | menu | delivery | finance
          priority:      string;      // urgent | high | normal | low
          title:         string;
          body:          string;
          action_label:  string | null;
          action_url:    string | null;
          status:        string;      // open | dismissed | actioned
          created_at:    string;
        };
        Insert: Omit<Database["public"]["Tables"]["ai_recommendations"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["ai_recommendations"]["Row"]>;
      };
      campaign_events: {
        Row: {
          id:                  string;
          business_id:         string;
          campaign_id:         string | null;
          winback_rule_id:     string | null;
          customer_id:         string | null;
          order_id:            string | null;
          event_type:          string;      // sent | delivered | clicked | redeemed
          revenue_attributed:  number;
          coupon_code:         string | null;
          created_at:          string;
        };
        Insert: Omit<Database["public"]["Tables"]["campaign_events"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["campaign_events"]["Row"]>;
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
export type WinbackRule     = Database["public"]["Tables"]["winback_rules"]["Row"];
export type AiCallProfile   = Database["public"]["Tables"]["ai_call_profiles"]["Row"];
export type RosterShift     = Database["public"]["Tables"]["roster_shifts"]["Row"];
export type AiRecommendation = Database["public"]["Tables"]["ai_recommendations"]["Row"];
export type CampaignEvent   = Database["public"]["Tables"]["campaign_events"]["Row"];
