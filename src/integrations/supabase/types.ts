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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_actions: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          notes: string | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          notes?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      artisans: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          country: string | null
          cover_url: string | null
          created_at: string
          display_name: string
          featured_until: string | null
          headline: string | null
          id: string
          is_featured: boolean
          owner_id: string
          plan: string
          plan_expires_at: string | null
          portfolio_urls: string[] | null
          profession: string | null
          rating_avg: number
          rating_count: number
          slug: string
          updated_at: string
          verification: Database["public"]["Enums"]["verification_status"]
          years_experience: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          display_name: string
          featured_until?: string | null
          headline?: string | null
          id?: string
          is_featured?: boolean
          owner_id: string
          plan?: string
          plan_expires_at?: string | null
          portfolio_urls?: string[] | null
          profession?: string | null
          rating_avg?: number
          rating_count?: number
          slug: string
          updated_at?: string
          verification?: Database["public"]["Enums"]["verification_status"]
          years_experience?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          display_name?: string
          featured_until?: string | null
          headline?: string | null
          id?: string
          is_featured?: boolean
          owner_id?: string
          plan?: string
          plan_expires_at?: string | null
          portfolio_urls?: string[] | null
          profession?: string | null
          rating_avg?: number
          rating_count?: number
          slug?: string
          updated_at?: string
          verification?: Database["public"]["Enums"]["verification_status"]
          years_experience?: number | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          meta: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          meta?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          meta?: Json
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          kind: string
          name: string
          name_ha: string | null
          name_yo: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          kind: string
          name: string
          name_ha?: string | null
          name_yo?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          kind?: string
          name?: string
          name_ha?: string | null
          name_yo?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          updated_at: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          updated_at?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          updated_at?: string
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      disputes: {
        Row: {
          admin_notes: string | null
          created_at: string
          evidence_urls: string[] | null
          id: string
          opened_by: string
          order_id: string
          reason: string
          resolution: string | null
          resolved_at: string | null
          seller_response: string | null
          status: Database["public"]["Enums"]["dispute_status"]
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          evidence_urls?: string[] | null
          id?: string
          opened_by: string
          order_id: string
          reason: string
          resolution?: string | null
          resolved_at?: string | null
          seller_response?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          evidence_urls?: string[] | null
          id?: string
          opened_by?: string
          order_id?: string
          reason?: string
          resolution?: string | null
          resolved_at?: string | null
          seller_response?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      escrow_transactions: {
        Row: {
          amount_kobo: number
          commission_kobo: number
          created_at: string
          customer_id: string
          escrow_ref: string
          id: string
          order_id: string
          refunded_kobo: number
          released_at: string | null
          released_kobo: number
          seller_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_kobo: number
          commission_kobo?: number
          created_at?: string
          customer_id: string
          escrow_ref: string
          id?: string
          order_id: string
          refunded_kobo?: number
          released_at?: string | null
          released_kobo?: number
          seller_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_kobo?: number
          commission_kobo?: number
          created_at?: string
          customer_id?: string
          escrow_ref?: string
          id?: string
          order_id?: string
          refunded_kobo?: number
          released_at?: string | null
          released_kobo?: number
          seller_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escrow_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          artisan_id: string | null
          created_at: string
          id: string
          product_id: string | null
          user_id: string
          vendor_id: string | null
        }
        Insert: {
          artisan_id?: string | null
          created_at?: string
          id?: string
          product_id?: string | null
          user_id: string
          vendor_id?: string | null
        }
        Update: {
          artisan_id?: string | null
          created_at?: string
          id?: string
          product_id?: string | null
          user_id?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "favorites_artisan_id_fkey"
            columns: ["artisan_id"]
            isOneToOne: false
            referencedRelation: "artisans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          image_snapshot: string | null
          line_total_kobo: number
          order_id: string
          product_id: string | null
          quantity: number
          title_snapshot: string
          unit_price_kobo: number
        }
        Insert: {
          id?: string
          image_snapshot?: string | null
          line_total_kobo: number
          order_id: string
          product_id?: string | null
          quantity: number
          title_snapshot: string
          unit_price_kobo: number
        }
        Update: {
          id?: string
          image_snapshot?: string | null
          line_total_kobo?: number
          order_id?: string
          product_id?: string | null
          quantity?: number
          title_snapshot?: string
          unit_price_kobo?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          accepted_at: string | null
          artisan_id: string | null
          cancelled_at: string | null
          commission_kobo: number
          completed_at: string | null
          created_at: string
          currency: string
          customer_id: string
          delivery_deadline_at: string | null
          id: string
          kind: string
          notes: string | null
          scheduled_at: string | null
          service_id: string | null
          shipped_at: string | null
          shipping_address: Json | null
          stage: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal_kobo: number
          total_kobo: number
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          artisan_id?: string | null
          cancelled_at?: string | null
          commission_kobo?: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          customer_id: string
          delivery_deadline_at?: string | null
          id?: string
          kind: string
          notes?: string | null
          scheduled_at?: string | null
          service_id?: string | null
          shipped_at?: string | null
          shipping_address?: Json | null
          stage?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_kobo: number
          total_kobo: number
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          artisan_id?: string | null
          cancelled_at?: string | null
          commission_kobo?: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          customer_id?: string
          delivery_deadline_at?: string | null
          id?: string
          kind?: string
          notes?: string | null
          scheduled_at?: string | null
          service_id?: string | null
          shipped_at?: string | null
          shipping_address?: Json | null
          stage?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_kobo?: number
          total_kobo?: number
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_artisan_id_fkey"
            columns: ["artisan_id"]
            isOneToOne: false
            referencedRelation: "artisans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_kobo: number
          created_at: string
          currency: string
          id: string
          meta: Json
          method: string
          provider: string
          reference: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_kobo: number
          created_at?: string
          currency?: string
          id?: string
          meta?: Json
          method?: string
          provider?: string
          reference: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_kobo?: number
          created_at?: string
          currency?: string
          id?: string
          meta?: Json
          method?: string
          provider?: string
          reference?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      plan_purchases: {
        Row: {
          amount_kobo: number
          created_at: string
          duration_days: number
          expires_at: string
          id: string
          plan_code: string
          scope: string
          starts_at: string
          target_id: string
          user_id: string
        }
        Insert: {
          amount_kobo: number
          created_at?: string
          duration_days: number
          expires_at: string
          id?: string
          plan_code: string
          scope: string
          starts_at?: string
          target_id: string
          user_id: string
        }
        Update: {
          amount_kobo?: number
          created_at?: string
          duration_days?: number
          expires_at?: string
          id?: string
          plan_code?: string
          scope?: string
          starts_at?: string
          target_id?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category_id: string | null
          compare_at_kobo: number | null
          created_at: string
          description: string | null
          featured_until: string | null
          id: string
          images: string[] | null
          is_active: boolean
          is_featured: boolean
          price_kobo: number
          rating_avg: number
          rating_count: number
          slug: string
          stock: number
          tags: string[] | null
          title: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          category_id?: string | null
          compare_at_kobo?: number | null
          created_at?: string
          description?: string | null
          featured_until?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean
          is_featured?: boolean
          price_kobo: number
          rating_avg?: number
          rating_count?: number
          slug: string
          stock?: number
          tags?: string[] | null
          title: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          category_id?: string | null
          compare_at_kobo?: number | null
          created_at?: string
          description?: string | null
          featured_until?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean
          is_featured?: boolean
          price_kobo?: number
          rating_avg?: number
          rating_count?: number
          slug?: string
          stock?: number
          tags?: string[] | null
          title?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          country: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          suspended_at: string | null
          suspension_reason: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          suspended_at?: string | null
          suspension_reason?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          suspended_at?: string | null
          suspension_reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      receipts: {
        Row: {
          amount_kobo: number
          created_at: string
          id: string
          kind: string
          meta: Json
          order_id: string | null
          payment_id: string | null
          receipt_no: string
          user_id: string
        }
        Insert: {
          amount_kobo: number
          created_at?: string
          id?: string
          kind: string
          meta?: Json
          order_id?: string | null
          payment_id?: string | null
          receipt_no?: string
          user_id: string
        }
        Update: {
          amount_kobo?: number
          created_at?: string
          id?: string
          kind?: string
          meta?: Json
          order_id?: string | null
          payment_id?: string | null
          receipt_no?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount_kobo: number
          created_at: string
          id: string
          order_id: string | null
          reason: string | null
          user_id: string
        }
        Insert: {
          amount_kobo: number
          created_at?: string
          id?: string
          order_id?: string | null
          reason?: string | null
          user_id: string
        }
        Update: {
          amount_kobo?: number
          created_at?: string
          id?: string
          order_id?: string | null
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          artisan_id: string | null
          comment: string | null
          created_at: string
          customer_id: string
          id: string
          order_id: string | null
          product_id: string | null
          rating: number
          vendor_id: string | null
        }
        Insert: {
          artisan_id?: string | null
          comment?: string | null
          created_at?: string
          customer_id: string
          id?: string
          order_id?: string | null
          product_id?: string | null
          rating: number
          vendor_id?: string | null
        }
        Update: {
          artisan_id?: string | null
          comment?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          order_id?: string | null
          product_id?: string | null
          rating?: number
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_artisan_id_fkey"
            columns: ["artisan_id"]
            isOneToOne: false
            referencedRelation: "artisans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          artisan_id: string
          category_id: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          images: string[] | null
          is_active: boolean
          price_from_kobo: number
          title: string
          updated_at: string
        }
        Insert: {
          artisan_id: string
          category_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          images?: string[] | null
          is_active?: boolean
          price_from_kobo: number
          title: string
          updated_at?: string
        }
        Update: {
          artisan_id?: string
          category_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          images?: string[] | null
          is_active?: boolean
          price_from_kobo?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_artisan_id_fkey"
            columns: ["artisan_id"]
            isOneToOne: false
            referencedRelation: "artisans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
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
      vendors: {
        Row: {
          banner_url: string | null
          city: string | null
          country: string | null
          created_at: string
          description: string | null
          featured_until: string | null
          id: string
          is_featured: boolean
          logo_url: string | null
          owner_id: string
          plan: string
          plan_expires_at: string | null
          rating_avg: number
          rating_count: number
          slug: string
          store_name: string
          tagline: string | null
          updated_at: string
          verification: Database["public"]["Enums"]["verification_status"]
        }
        Insert: {
          banner_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          featured_until?: string | null
          id?: string
          is_featured?: boolean
          logo_url?: string | null
          owner_id: string
          plan?: string
          plan_expires_at?: string | null
          rating_avg?: number
          rating_count?: number
          slug: string
          store_name: string
          tagline?: string | null
          updated_at?: string
          verification?: Database["public"]["Enums"]["verification_status"]
        }
        Update: {
          banner_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          featured_until?: string | null
          id?: string
          is_featured?: boolean
          logo_url?: string | null
          owner_id?: string
          plan?: string
          plan_expires_at?: string | null
          rating_avg?: number
          rating_count?: number
          slug?: string
          store_name?: string
          tagline?: string | null
          updated_at?: string
          verification?: Database["public"]["Enums"]["verification_status"]
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount_kobo: number
          balance_after_kobo: number | null
          created_at: string
          description: string | null
          id: string
          order_id: string | null
          reference: string | null
          type: Database["public"]["Enums"]["txn_type"]
          user_id: string
        }
        Insert: {
          amount_kobo: number
          balance_after_kobo?: number | null
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          reference?: string | null
          type: Database["public"]["Enums"]["txn_type"]
          user_id: string
        }
        Update: {
          amount_kobo?: number
          balance_after_kobo?: number | null
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          reference?: string | null
          type?: Database["public"]["Enums"]["txn_type"]
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance_kobo: number
          created_at: string
          currency: string
          escrow_kobo: number
          pending_kobo: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_kobo?: number
          created_at?: string
          currency?: string
          escrow_kobo?: number
          pending_kobo?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_kobo?: number
          created_at?: string
          currency?: string
          escrow_kobo?: number
          pending_kobo?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          admin_notes: string | null
          amount_kobo: number
          created_at: string
          destination: Json
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount_kobo: number
          created_at?: string
          destination?: Json
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount_kobo?: number
          created_at?: string
          destination?: Json
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      escrow_hold: {
        Args: {
          _amount_kobo: number
          _commission_kobo: number
          _customer_id: string
          _order_id: string
          _seller_id: string
        }
        Returns: Json
      }
      escrow_settle: {
        Args: {
          _actor_id: string
          _order_id: string
          _reason: string
          _refund_kobo: number
          _release_kobo: number
        }
        Returns: Json
      }
      escrow_sweep_overdue: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      wallet_fund: {
        Args: {
          _amount_kobo: number
          _description: string
          _method: string
          _reference: string
          _user_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "customer"
        | "vendor"
        | "artisan"
        | "logistics"
        | "admin"
        | "super_admin"
      dispute_status:
        | "open"
        | "investigating"
        | "resolved_refund"
        | "resolved_release"
      order_status:
        | "pending_payment"
        | "paid_escrow"
        | "fulfilled"
        | "completed"
        | "released"
        | "disputed"
        | "resolved_refund"
        | "resolved_release"
        | "cancelled"
      txn_type:
        | "fund"
        | "hold"
        | "release"
        | "refund"
        | "commission"
        | "withdrawal"
        | "adjustment"
      verification_status: "unverified" | "pending" | "verified" | "rejected"
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
      app_role: [
        "customer",
        "vendor",
        "artisan",
        "logistics",
        "admin",
        "super_admin",
      ],
      dispute_status: [
        "open",
        "investigating",
        "resolved_refund",
        "resolved_release",
      ],
      order_status: [
        "pending_payment",
        "paid_escrow",
        "fulfilled",
        "completed",
        "released",
        "disputed",
        "resolved_refund",
        "resolved_release",
        "cancelled",
      ],
      txn_type: [
        "fund",
        "hold",
        "release",
        "refund",
        "commission",
        "withdrawal",
        "adjustment",
      ],
      verification_status: ["unverified", "pending", "verified", "rejected"],
    },
  },
} as const
