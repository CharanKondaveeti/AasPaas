import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Place } from "./types";

// Only the public read-only RPC is called from browser code.
// PostgreSQL enforces approved-only visibility through RLS.
type PublicDatabase = {
  public: {
    Tables: {};
    Views: {};
    Functions: {
      explore_places: {
        Args: {
          west: number;
          south: number;
          east: number;
          north: number;
          search_text?: string;
          filter_category?: string;
          filter_dish?: string;
        };
        Returns: Place[];
      };
      explore_famous_food: { Args:{west:number;south:number;east:number;north:number;search_text?:string;filter_dish?:string;filter_budget?:number|null;filter_hours?:string;filter_diet?:string;filter_style?:string;only_hidden_gems?:boolean};Returns:Place[]; };
      famous_food_details: { Args:{place_uuid:string};Returns:unknown; };
      explore_discoveries: {
        Args: {
          west: number;
          south: number;
          east: number;
          north: number;
          search_text?: string;
          filter_category?: string;
          filter_dish?: string;
          filter_group?: string;
          only_hidden_gems?: boolean;
        };
        Returns: Place[];
      };
    };
    Enums: {};
    CompositeTypes: {};
  };
};

let client: SupabaseClient<PublicDatabase> | undefined;
export function browserDb() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase browser credentials are missing.");
  return client ??= createClient<PublicDatabase>(url, key, {
    auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false },
  });
}
