import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Event = {
  id: string;
  name: string;
  allocated_budget: number;
  venue: string | null;
  start_date: string | null;
  end_date: string | null;
  status: "Active" | "Completed" | "On Hold" | "Cancelled";
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  event_id: string;
  name: string;
  type: "Income" | "Expense";
  created_at: string;
};

export type BudgetEntry = {
  id: string;
  event_id: string;
  category_id: string;
  item_name: string;
  amount: number;
  payment_method: string | null;
  receipt_photo_url: string | null;
  receipt_filename: string | null;
  to_be_reimbursed: boolean;
  reimbursement_source: string | null;
  reimbursement_status: "pending" | "completed";
  entry_date: string;
  created_at: string;
  updated_at: string;
};
