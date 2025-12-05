export type Database = {
  public: {
    Tables: {
      matchmaking_queue: {
        Row: {
          id: string;
          user_id: number; // Changed from string (UUID) to number (fid)
          fid: number;
          bet_amount: number;
          status: "waiting" | "matched" | "cancelled";
          created_at: string;
          updated_at: string;
          expires_at: string;
          session_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: number; // Changed from string (UUID) to number (fid)
          fid: number;
          bet_amount: number;
          status?: "waiting" | "matched" | "cancelled";
          created_at?: string;
          updated_at?: string;
          expires_at?: string;
          session_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["matchmaking_queue"]["Row"]>;
        Relationships: [];
      };
      game_sessions: {
        Row: {
          id: string;
          player1_id: number; // Changed from string (UUID) to number (fid)
          player2_id: number; // Changed from string (UUID) to number (fid)
          player1_fid: number;
          player2_fid: number;
          bet_amount: number;
          chain_game_id: string | null;
          status: "pending_moves" | "pending_tx" | "finished" | "timeout" | "cancelled";
          created_at: string;
          expires_at: string;
          winner_id: number | null; // Changed from string (UUID) to number (fid)
          player1_move: "rock" | "paper" | "scissors" | null;
          player2_move: "rock" | "paper" | "scissors" | null;
          player1_signature: string | null;
          player2_signature: string | null;
          fee_snapshot: number | null;
          resolved_at: string | null;
          updated_at: string;
        };
        Insert: never;
        Update: Partial<Database["public"]["Tables"]["game_sessions"]["Row"]>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      rpc_submit_move: {
        Args: {
          p_session_id: string;
          p_move: "rock" | "paper" | "scissors";
          p_signature: string;
        };
        Returns: Database["public"]["Tables"]["game_sessions"]["Row"];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
