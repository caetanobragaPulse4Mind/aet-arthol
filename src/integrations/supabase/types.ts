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
      aet_percurso: {
        Row: {
          aet_id: string
          br: number | null
          created_at: string
          estado: string | null
          id: string
          km_fim: number | null
          km_ini: number | null
          local_fim: string | null
          local_inicio: string | null
          ordem: number
        }
        Insert: {
          aet_id: string
          br?: number | null
          created_at?: string
          estado?: string | null
          id?: string
          km_fim?: number | null
          km_ini?: number | null
          local_fim?: string | null
          local_inicio?: string | null
          ordem?: number
        }
        Update: {
          aet_id?: string
          br?: number | null
          created_at?: string
          estado?: string | null
          id?: string
          km_fim?: number | null
          km_ini?: number | null
          local_fim?: string | null
          local_inicio?: string | null
          ordem?: number
        }
        Relationships: [
          {
            foreignKeyName: "aet_percurso_aet_id_fkey"
            columns: ["aet_id"]
            isOneToOne: false
            referencedRelation: "aets"
            referencedColumns: ["id"]
          },
        ]
      }
      aets: {
        Row: {
          composicao_id: string | null
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          destino_carga: string | null
          id: string
          numero_aet: string | null
          origem_carga: string | null
          pdf_url: string | null
          portal_origem: string
          resolucao: string | null
          situacao: string
          updated_at: string
        }
        Insert: {
          composicao_id?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          destino_carga?: string | null
          id?: string
          numero_aet?: string | null
          origem_carga?: string | null
          pdf_url?: string | null
          portal_origem?: string
          resolucao?: string | null
          situacao?: string
          updated_at?: string
        }
        Update: {
          composicao_id?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          destino_carga?: string | null
          id?: string
          numero_aet?: string | null
          origem_carga?: string | null
          pdf_url?: string | null
          portal_origem?: string
          resolucao?: string | null
          situacao?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aets_composicao_id_fkey"
            columns: ["composicao_id"]
            isOneToOne: false
            referencedRelation: "composicoes"
            referencedColumns: ["id"]
          },
        ]
      }
      boletos: {
        Row: {
          aet_id: string
          created_at: string
          data_pagamento: string | null
          data_vencimento: string | null
          id: string
          status: string
          updated_at: string
          url: string | null
          valor: number
        }
        Insert: {
          aet_id: string
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          id?: string
          status?: string
          updated_at?: string
          url?: string | null
          valor?: number
        }
        Update: {
          aet_id?: string
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          id?: string
          status?: string
          updated_at?: string
          url?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "boletos_aet_id_fkey"
            columns: ["aet_id"]
            isOneToOne: false
            referencedRelation: "aets"
            referencedColumns: ["id"]
          },
        ]
      }
      composicoes: {
        Row: {
          altura_total: number | null
          ativo: boolean
          comprimento_total: number | null
          created_at: string
          dist_b: number | null
          dist_c: number | null
          dist_d: number | null
          eixos_cavalo: Json
          eixos_reboque: Json
          excesso_direito: number | null
          excesso_esquerdo: number | null
          id: string
          largura_total: number | null
          largura_veiculo: number | null
          reboque_id: string
          updated_at: string
          veiculo_id: string
        }
        Insert: {
          altura_total?: number | null
          ativo?: boolean
          comprimento_total?: number | null
          created_at?: string
          dist_b?: number | null
          dist_c?: number | null
          dist_d?: number | null
          eixos_cavalo?: Json
          eixos_reboque?: Json
          excesso_direito?: number | null
          excesso_esquerdo?: number | null
          id?: string
          largura_total?: number | null
          largura_veiculo?: number | null
          reboque_id: string
          updated_at?: string
          veiculo_id: string
        }
        Update: {
          altura_total?: number | null
          ativo?: boolean
          comprimento_total?: number | null
          created_at?: string
          dist_b?: number | null
          dist_c?: number | null
          dist_d?: number | null
          eixos_cavalo?: Json
          eixos_reboque?: Json
          excesso_direito?: number | null
          excesso_esquerdo?: number | null
          id?: string
          largura_total?: number | null
          largura_veiculo?: number | null
          reboque_id?: string
          updated_at?: string
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "composicoes_reboque_id_fkey"
            columns: ["reboque_id"]
            isOneToOne: false
            referencedRelation: "reboques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "composicoes_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      importacoes_trechos: {
        Row: {
          arquivo: string
          atualizados: number
          created_at: string
          desativados: number
          id: string
          inseridos: number
          status: string
          user_id: string | null
        }
        Insert: {
          arquivo: string
          atualizados?: number
          created_at?: string
          desativados?: number
          id?: string
          inseridos?: number
          status?: string
          user_id?: string | null
        }
        Update: {
          arquivo?: string
          atualizados?: number
          created_at?: string
          desativados?: number
          id?: string
          inseridos?: number
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          nome: string
          role: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          nome: string
          role?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          nome?: string
          role?: string
        }
        Relationships: []
      }
      reboques: {
        Row: {
          ano_fabricacao: number | null
          ativo: boolean
          chassi: string | null
          created_at: string
          id: string
          marca: string | null
          modelo: string | null
          num_eixos: number | null
          placa: string
          renavam: string | null
          rntrc: string | null
          tara: number | null
          tipo_carroceria: string | null
          tipo_eixos: string | null
          tipo_engate: string | null
          updated_at: string
        }
        Insert: {
          ano_fabricacao?: number | null
          ativo?: boolean
          chassi?: string | null
          created_at?: string
          id?: string
          marca?: string | null
          modelo?: string | null
          num_eixos?: number | null
          placa: string
          renavam?: string | null
          rntrc?: string | null
          tara?: number | null
          tipo_carroceria?: string | null
          tipo_eixos?: string | null
          tipo_engate?: string | null
          updated_at?: string
        }
        Update: {
          ano_fabricacao?: number | null
          ativo?: boolean
          chassi?: string | null
          created_at?: string
          id?: string
          marca?: string | null
          modelo?: string | null
          num_eixos?: number | null
          placa?: string
          renavam?: string | null
          rntrc?: string | null
          tara?: number | null
          tipo_carroceria?: string | null
          tipo_eixos?: string | null
          tipo_engate?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      trechos: {
        Row: {
          ativo: boolean
          br: number
          created_at: string
          estado: string
          fonte: string
          id: string
          km_fim: number
          km_ini: number
          linha: number | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          br: number
          created_at?: string
          estado: string
          fonte?: string
          id?: string
          km_fim: number
          km_ini: number
          linha?: number | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          br?: number
          created_at?: string
          estado?: string
          fonte?: string
          id?: string
          km_fim?: number
          km_ini?: number
          linha?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      veiculos: {
        Row: {
          ano_fabricacao: number | null
          ativo: boolean
          bidirecional: boolean
          chassi: string | null
          cmt: number | null
          created_at: string
          direcao: string | null
          id: string
          marca: string | null
          modelo: string | null
          num_eixos: number | null
          placa: string
          potencia: number | null
          renavam: string | null
          rntrc: string | null
          tara: number | null
          tipo_carroceria: string | null
          tracao: string | null
          updated_at: string
        }
        Insert: {
          ano_fabricacao?: number | null
          ativo?: boolean
          bidirecional?: boolean
          chassi?: string | null
          cmt?: number | null
          created_at?: string
          direcao?: string | null
          id?: string
          marca?: string | null
          modelo?: string | null
          num_eixos?: number | null
          placa: string
          potencia?: number | null
          renavam?: string | null
          rntrc?: string | null
          tara?: number | null
          tipo_carroceria?: string | null
          tracao?: string | null
          updated_at?: string
        }
        Update: {
          ano_fabricacao?: number | null
          ativo?: boolean
          bidirecional?: boolean
          chassi?: string | null
          cmt?: number | null
          created_at?: string
          direcao?: string | null
          id?: string
          marca?: string | null
          modelo?: string | null
          num_eixos?: number | null
          placa?: string
          potencia?: number | null
          renavam?: string | null
          rntrc?: string | null
          tara?: number | null
          tipo_carroceria?: string | null
          tracao?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: { _uid: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
