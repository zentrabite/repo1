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
          // ─── Delivery routing (migration 013) ───────────────────────────
          delivery_fee:       number | null;   // customer-facing delivery fee
          delivery_job_id:    string | null;   // FK → delivery_jobs.id
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
      // ─── migration 011 ────────────────────────────────────────────────────
      business_members: {
        Row: {
          id:          string;
          business_id: string;
          user_id:     string;
          role:        string;
          invited_by:  string | null;
          accepted_at: string | null;
          created_at:  string;
        };
        Insert: Omit<Database["public"]["Tables"]["business_members"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["business_members"]["Insert"]>;
      };
      loyalty_events: {
        Row: {
          id:          string;
          business_id: string;
          customer_id: string;
          event_type:  string;
          points:      number;
          multiplier:  number;
          source:      string | null;
          created_at:  string;
        };
        Insert: Omit<Database["public"]["Tables"]["loyalty_events"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["loyalty_events"]["Insert"]>;
      };
      rewards_catalogue: {
        Row: {
          id:           string;
          business_id:  string;
          title:        string;
          description:  string | null;
          points_cost:  number;
          reward_type:  string;
          reward_value: number | null;
          is_active:    boolean;
          sort_order:   number;
          created_at:   string;
        };
        Insert: Omit<Database["public"]["Tables"]["rewards_catalogue"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["rewards_catalogue"]["Insert"]>;
      };
      reward_redemptions: {
        Row: {
          id:           string;
          business_id:  string;
          customer_id:  string;
          catalogue_id: string | null;
          points_spent: number;
          voucher_code: string | null;
          redeemed_at:  string | null;
          order_id:     string | null;
          status:       string;
          created_at:   string;
        };
        Insert: Omit<Database["public"]["Tables"]["reward_redemptions"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["reward_redemptions"]["Insert"]>;
      };
      drivers: {
        Row: {
          id:           string;
          business_id:  string;
          name:         string;
          phone:        string | null;
          email:        string | null;
          vehicle_type: string | null;
          status:       string;
          hourly_rate:  number | null;
          notes:        string | null;
          created_at:   string;
        };
        Insert: Omit<Database["public"]["Tables"]["drivers"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["drivers"]["Insert"]>;
      };
      reviews: {
        Row: {
          id:            string;
          business_id:   string;
          customer_id:   string | null;
          customer_name: string | null;
          source:        string;
          rating:        number;
          body:          string | null;
          sentiment:     string | null;
          reply:         string | null;
          reply_sent_at: string | null;
          status:        string;
          order_id:      string | null;
          created_at:    string;
        };
        Insert: Omit<Database["public"]["Tables"]["reviews"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["reviews"]["Insert"]>;
      };
      // ─── migration 012 ────────────────────────────────────────────────────
      delivery_jobs: {
        Row: {
          id:                          string;
          business_id:                 string;
          order_id:                    string | null;
          order_value:                 number;
          distance_km:                 number;
          pickup_address:              string;
          dropoff_address:             string;
          delivery_tier:               string;
          selected_provider:           string;
          provider_cost:               number;
          customer_fee:                number;
          service_fee:                 number;
          delivery_margin:             number;
          selection_reason:            string | null;
          estimated_pickup_eta_min:    number;
          estimated_delivery_eta_min:  number;
          status:                      string;
          provider_job_id:             string | null;
          created_at:                  string;
        };
        Insert: Omit<Database["public"]["Tables"]["delivery_jobs"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["delivery_jobs"]["Insert"]>;
      };
      delivery_quotes: {
        Row: {
          id:               string;
          job_id:           string;
          business_id:      string;
          provider:         string;
          cost:             number;
          pickup_eta_min:   number;
          delivery_eta_min: number;
          available:        boolean;
          error_message:    string | null;
          created_at:       string;
        };
        Insert: Omit<Database["public"]["Tables"]["delivery_quotes"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["delivery_quotes"]["Insert"]>;
      };
      // ─── migration 014 ────────────────────────────────────────────────────
      stock_items: {
        Row: {
          id:                string;
          business_id:       string;
          name:              string;
          sku:               string | null;
          unit:              string;
          supplier:          string | null;
          cost:              number;
          on_hand:           number;
          par_level:         number;
          reorder_to:        number;
          lead_time_days:    number;
          auto_reorder:      boolean;
          expiry_date:       string | null;
          last_counted_at:   string | null;
          last_delivered_at: string | null;
          created_at:        string;
        };
        Insert: Omit<Database["public"]["Tables"]["stock_items"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["stock_items"]["Insert"]>;
      };
      stock_counts: {
        Row: {
          id:            string;
          business_id:   string;
          stock_item_id: string;
          before_qty:    number;
          after_qty:     number;
          note:          string | null;
          counted_by:    string | null;
          created_at:    string;
        };
        Insert: Omit<Database["public"]["Tables"]["stock_counts"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["stock_counts"]["Insert"]>;
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
export type Driver             = Database["public"]["Tables"]["drivers"]["Row"];
export type Review             = Database["public"]["Tables"]["reviews"]["Row"];
export type RewardsCatalogue   = Database["public"]["Tables"]["rewards_catalogue"]["Row"];
export type RewardRedemption   = Database["public"]["Tables"]["reward_redemptions"]["Row"];
export type DeliveryJob        = Database["public"]["Tables"]["delivery_jobs"]["Row"];
export type DeliveryQuote      = Database["public"]["Tables"]["delivery_quotes"]["Row"];
export type StockItem          = Database["public"]["Tables"]["stock_items"]["Row"];
export type StockCount         = Database["public"]["Tables"]["stock_counts"]["Row"];
