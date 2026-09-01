/**
 * MODEL — Tipagem do banco (espelha supabase/schema.sql).
 * Substituivel por `supabase gen types typescript --project-id <id>`.
 */

export type UserRole = 'user' | 'admin';
export type UserStatus = 'pending_approval' | 'approved' | 'rejected';
export type TransactionType = 'deposit' | 'withdrawal';
export type ReceiptStatus = 'pending' | 'approved' | 'rejected';

export type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  status: UserStatus;
  legal_name: string | null;
  cpf: string | null;
  identity_confirmed_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

export type BookmakerRow = {
  id: string;
  slug: string;
  name: string;
  affiliate_url: string | null;
  brand_color: string | null;
  min_deposit: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type TransactionRow = {
  id: string;
  user_id: string;
  bookmaker_id: string;
  type: TransactionType;
  amount: number;
  occurred_at: string;
  receipt_path: string | null;
  receipt_status: ReceiptStatus;
  notes: string | null;
  commission_amount: number;
  commission_note: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ProfileInsert = {
  id: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  role?: UserRole;
  status?: UserStatus;
  legal_name?: string | null;
  cpf?: string | null;
  identity_confirmed_at?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type BookmakerInsert = {
  id?: string;
  slug: string;
  name: string;
  affiliate_url?: string | null;
  brand_color?: string | null;
  min_deposit?: number;
  sort_order?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type TransactionInsert = {
  id?: string;
  user_id: string;
  bookmaker_id: string;
  type: TransactionType;
  amount: number;
  occurred_at?: string;
  receipt_path?: string | null;
  receipt_status?: ReceiptStatus;
  notes?: string | null;
  commission_amount?: number;
  commission_note?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Database = {
  // Versão do PostgREST usada pela tipagem (igual ao output do `supabase gen types`).
  __InternalSupabase: { PostgrestVersion: '12' };
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      bookmakers: {
        Row: BookmakerRow;
        Insert: BookmakerInsert;
        Update: Partial<BookmakerRow>;
        Relationships: [];
      };
      transactions: {
        Row: TransactionRow;
        Insert: TransactionInsert;
        Update: Partial<TransactionRow>;
        Relationships: [
          {
            foreignKeyName: 'transactions_bookmaker_id_fkey';
            columns: ['bookmaker_id'];
            isOneToOne: false;
            referencedRelation: 'bookmakers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: {
      is_admin: { Args: Record<string, unknown>; Returns: boolean };
      is_approved: { Args: Record<string, unknown>; Returns: boolean };
    };
    Enums: {
      user_role: UserRole;
      user_status: UserStatus;
      transaction_type: TransactionType;
      receipt_status: ReceiptStatus;
    };
    CompositeTypes: Record<never, never>;
  };
};
