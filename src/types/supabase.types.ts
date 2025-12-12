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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      BudgetAdditionalLines: {
        Row: {
          amount: number
          budgetId: number
          concept: string
          conceptType: Database["public"]["Enums"]["BudgetAdditionalLineType"]
          createdAt: string | null
          id: number
          orderIndex: number
          validUntil: string | null
        }
        Insert: {
          amount: number
          budgetId: number
          concept: string
          conceptType?: Database["public"]["Enums"]["BudgetAdditionalLineType"]
          createdAt?: string | null
          id?: number
          orderIndex: number
          validUntil?: string | null
        }
        Update: {
          amount?: number
          budgetId?: number
          concept?: string
          conceptType?: Database["public"]["Enums"]["BudgetAdditionalLineType"]
          createdAt?: string | null
          id?: number
          orderIndex?: number
          validUntil?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "BudgetAdditionalLines_budgetId_fkey"
            columns: ["budgetId"]
            isOneToOne: false
            referencedRelation: "Budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      BudgetCompositeBlocks: {
        Row: {
          budgetId: number
          createdAt: string | null
          heading: string | null
          id: number
          imageUrl: string | null
          link: string | null
          orderIndex: number
          sectionTitle: string | null
          subtotal: number | null
          supplier: string | null
          supplierLogoUrl: string | null
          updatedAt: string | null
        }
        Insert: {
          budgetId: number
          createdAt?: string | null
          heading?: string | null
          id?: number
          imageUrl?: string | null
          link?: string | null
          orderIndex: number
          sectionTitle?: string | null
          subtotal?: number | null
          supplier?: string | null
          supplierLogoUrl?: string | null
          updatedAt?: string | null
        }
        Update: {
          budgetId?: number
          createdAt?: string | null
          heading?: string | null
          id?: number
          imageUrl?: string | null
          link?: string | null
          orderIndex?: number
          sectionTitle?: string | null
          subtotal?: number | null
          supplier?: string | null
          supplierLogoUrl?: string | null
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "BudgetTextBlocks_budgetId_fkey"
            columns: ["budgetId"]
            isOneToOne: false
            referencedRelation: "Budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      BudgetCompositeBlockSections: {
        Row: {
          compositeBlockId: number
          createdAt: string | null
          id: number
          orderIndex: number
          text: string | null
          title: string
          updatedAt: string | null
        }
        Insert: {
          compositeBlockId: number
          createdAt?: string | null
          id?: number
          orderIndex: number
          text?: string | null
          title: string
          updatedAt?: string | null
        }
        Update: {
          compositeBlockId?: number
          createdAt?: string | null
          id?: number
          orderIndex?: number
          text?: string | null
          title?: string
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "BudgetTextBlockSections_textBlockId_fkey"
            columns: ["compositeBlockId"]
            isOneToOne: false
            referencedRelation: "BudgetCompositeBlocks"
            referencedColumns: ["id"]
          },
        ]
      }
      BudgetConditions: {
        Row: {
          budgetId: number
          content: string
          createdAt: string
          id: number
          orderIndex: number
          title: string
        }
        Insert: {
          budgetId: number
          content: string
          createdAt?: string
          id?: number
          orderIndex?: number
          title: string
        }
        Update: {
          budgetId?: number
          content?: string
          createdAt?: string
          id?: number
          orderIndex?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "BudgetConditions_budget_id_fkey"
            columns: ["budgetId"]
            isOneToOne: false
            referencedRelation: "Budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      BudgetItemTableRows: {
        Row: {
          createdAt: string | null
          description: string
          id: number
          supplierId: number | null
          orderIndex: number
          productId: number | null
          quantity: number
          reference: string | null
          tableId: number
          totalPrice: number
          unitPrice: number
        }
        Insert: {
          createdAt?: string | null
          description?: string
          id?: number
          supplierId?: number | null
          orderIndex?: number
          productId?: number | null
          quantity?: number
          reference?: string | null
          tableId: number
          totalPrice?: number
          unitPrice?: number
        }
        Update: {
          createdAt?: string | null
          description?: string
          id?: number
          supplierId?: number | null
          orderIndex?: number
          productId?: number | null
          quantity?: number
          reference?: string | null
          tableId?: number
          totalPrice?: number
          unitPrice?: number
        }
        Relationships: [
          {
            foreignKeyName: "BudgetMaterialTableRows_productId_fkey"
            columns: ["productId"]
            isOneToOne: false
            referencedRelation: "Products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "BudgetMaterialTableRows_tableId_fkey"
            columns: ["tableId"]
            isOneToOne: false
            referencedRelation: "BudgetItemTables"
            referencedColumns: ["id"]
          },
        ]
      }
      BudgetItemTables: {
        Row: {
          budgetId: number
          createdAt: string | null
          id: number
          orderIndex: number
          showDescription: boolean
          showSupplier: boolean
          showQuantity: boolean
          showReference: boolean
          showTotalPrice: boolean
          showUnitPrice: boolean
          title: string
        }
        Insert: {
          budgetId: number
          createdAt?: string | null
          id?: number
          orderIndex?: number
          showDescription?: boolean
          showSupplier?: boolean
          showQuantity?: boolean
          showReference?: boolean
          showTotalPrice?: boolean
          showUnitPrice?: boolean
          title?: string
        }
        Update: {
          budgetId?: number
          createdAt?: string | null
          id?: number
          orderIndex?: number
          showDescription?: boolean
          showSupplier?: boolean
          showQuantity?: boolean
          showReference?: boolean
          showTotalPrice?: boolean
          showUnitPrice?: boolean
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "BudgetMaterialTables_budgetId_fkey"
            columns: ["budgetId"]
            isOneToOne: false
            referencedRelation: "Budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      Budgets: {
        Row: {
          budgetNumber: string
          companyLogoUrl: string | null
          conditionsTitle: string | null
          createdAt: string | null
          customerId: number | null
          id: number
          itemTablesSectionTitle: string | null
          notes: string | null
          pdfUrl: string | null
          sectionOrder: string[] | null
          showCompositeBlocks: boolean | null
          showConditions: boolean | null
          showItemTables: boolean | null
          showSignature: boolean | null
          showSimpleBlock: boolean | null
          showSummary: boolean | null
          status: Database["public"]["Enums"]["BudgetStatus"] | null
          supplierLogoUrl: string | null
          taxableBase: number
          taxAmount: number
          taxPercentage: number | null
          title: string
          total: number
          updatedAt: string | null
          validUntil: string | null
        }
        Insert: {
          budgetNumber: string
          companyLogoUrl?: string | null
          conditionsTitle?: string | null
          createdAt?: string | null
          customerId?: number | null
          id?: number
          itemTablesSectionTitle?: string | null
          notes?: string | null
          pdfUrl?: string | null
          sectionOrder?: string[] | null
          showCompositeBlocks?: boolean | null
          showConditions?: boolean | null
          showItemTables?: boolean | null
          showSignature?: boolean | null
          showSimpleBlock?: boolean | null
          showSummary?: boolean | null
          status?: Database["public"]["Enums"]["BudgetStatus"] | null
          supplierLogoUrl?: string | null
          taxableBase?: number
          taxAmount?: number
          taxPercentage?: number | null
          title: string
          total?: number
          updatedAt?: string | null
          validUntil?: string | null
        }
        Update: {
          budgetNumber?: string
          companyLogoUrl?: string | null
          conditionsTitle?: string | null
          createdAt?: string | null
          customerId?: number | null
          id?: number
          itemTablesSectionTitle?: string | null
          notes?: string | null
          pdfUrl?: string | null
          sectionOrder?: string[] | null
          showCompositeBlocks?: boolean | null
          showConditions?: boolean | null
          showItemTables?: boolean | null
          showSignature?: boolean | null
          showSimpleBlock?: boolean | null
          showSummary?: boolean | null
          status?: Database["public"]["Enums"]["BudgetStatus"] | null
          supplierLogoUrl?: string | null
          taxableBase?: number
          taxAmount?: number
          taxPercentage?: number | null
          title?: string
          total?: number
          updatedAt?: string | null
          validUntil?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Budgets_customerId_fkey"
            columns: ["customerId"]
            isOneToOne: false
            referencedRelation: "Customers"
            referencedColumns: ["id"]
          },
        ]
      }
      BudgetSimpleBlocks: {
        Row: {
          budgetId: number
          createdAt: string | null
          description: string
          id: number
          imageUrl: string | null
          model: string
          price: number
          sectionTitle: string | null
          updatedAt: string | null
        }
        Insert: {
          budgetId: number
          createdAt?: string | null
          description?: string
          id?: number
          imageUrl?: string | null
          model?: string
          price?: number
          sectionTitle?: string | null
          updatedAt?: string | null
        }
        Update: {
          budgetId?: number
          createdAt?: string | null
          description?: string
          id?: number
          imageUrl?: string | null
          model?: string
          price?: number
          sectionTitle?: string | null
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "BudgetSimpleBlocks_budgetId_fkey"
            columns: ["budgetId"]
            isOneToOne: false
            referencedRelation: "Budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      CompositeBlockTemplates: {
        Row: {
          createdAt: string | null
          heading: string | null
          id: number
          name: string
          provider: string | null
          updatedAt: string | null
        }
        Insert: {
          createdAt?: string | null
          heading?: string | null
          id?: number
          name: string
          provider?: string | null
          updatedAt?: string | null
        }
        Update: {
          createdAt?: string | null
          heading?: string | null
          id?: number
          name?: string
          provider?: string | null
          updatedAt?: string | null
        }
        Relationships: []
      }
      CompositeBlockTemplateSections: {
        Row: {
          content: string | null
          createdAt: string | null
          id: number
          orderIndex: number
          templateId: number
          title: string
          updatedAt: string | null
        }
        Insert: {
          content?: string | null
          createdAt?: string | null
          id?: number
          orderIndex?: number
          templateId: number
          title: string
          updatedAt?: string | null
        }
        Update: {
          content?: string | null
          createdAt?: string | null
          id?: number
          orderIndex?: number
          templateId?: number
          title?: string
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "textblocktemplatesections_templateid_fkey"
            columns: ["templateId"]
            isOneToOne: false
            referencedRelation: "CompositeBlockTemplates"
            referencedColumns: ["id"]
          },
        ]
      }
      ConditionTemplates: {
        Row: {
          createdAt: string
          id: number
          name: string
        }
        Insert: {
          createdAt?: string
          id?: number
          name: string
        }
        Update: {
          createdAt?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      ConditionTemplateSections: {
        Row: {
          content: string
          id: number
          orderIndex: number
          templateId: number
          title: string
        }
        Insert: {
          content: string
          id?: number
          orderIndex?: number
          templateId: number
          title: string
        }
        Update: {
          content?: string
          id?: number
          orderIndex?: number
          templateId?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ConditionTemplateSections_template_id_fkey"
            columns: ["templateId"]
            isOneToOne: false
            referencedRelation: "ConditionTemplates"
            referencedColumns: ["id"]
          },
        ]
      }
      Customers: {
        Row: {
          address: string | null
          city: string | null
          createdAt: string | null
          dni: string | null
          email: string | null
          id: number
          name: string
          notes: string | null
          phone: string | null
          postalCode: string | null
          updatedAt: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          createdAt?: string | null
          dni?: string | null
          email?: string | null
          id?: number
          name: string
          notes?: string | null
          phone?: string | null
          postalCode?: string | null
          updatedAt?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          createdAt?: string | null
          dni?: string | null
          email?: string | null
          id?: number
          name?: string
          notes?: string | null
          phone?: string | null
          postalCode?: string | null
          updatedAt?: string | null
        }
        Relationships: []
      }
      EmailLogs: {
        Row: {
          bodyText: string
          budgetId: number | null
          createdAt: string | null
          errorMessage: string | null
          id: number
          recipientEmail: string
          recipientName: string | null
          sentAt: string | null
          status: Database["public"]["Enums"]["EmailStatus"]
          subject: string
        }
        Insert: {
          bodyText: string
          budgetId?: number | null
          createdAt?: string | null
          errorMessage?: string | null
          id?: never
          recipientEmail: string
          recipientName?: string | null
          sentAt?: string | null
          status?: Database["public"]["Enums"]["EmailStatus"]
          subject: string
        }
        Update: {
          bodyText?: string
          budgetId?: number | null
          createdAt?: string | null
          errorMessage?: string | null
          id?: never
          recipientEmail?: string
          recipientName?: string | null
          sentAt?: string | null
          status?: Database["public"]["Enums"]["EmailStatus"]
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "EmailLogs_budgetId_fkey"
            columns: ["budgetId"]
            isOneToOne: false
            referencedRelation: "Budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      Products: {
        Row: {
          category: string | null
          createdAt: string | null
          description: string
          id: number
          imageUrl: string | null
          isActive: boolean | null
          link: string | null
          supplierId: number | null
          reference: string
          unitPrice: number
          updatedAt: string | null
          vatRate: number
        }
        Insert: {
          category?: string | null
          createdAt?: string | null
          description: string
          id?: number
          imageUrl?: string | null
          isActive?: boolean | null
          link?: string | null
          supplierId?: number | null
          reference: string
          unitPrice: number
          updatedAt?: string | null
          vatRate?: number
        }
        Update: {
          category?: string | null
          createdAt?: string | null
          description?: string
          id?: number
          imageUrl?: string | null
          isActive?: boolean | null
          link?: string | null
          supplierId?: number | null
          reference?: string
          unitPrice?: number
          updatedAt?: string | null
          vatRate?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      BudgetAdditionalLineType: "adjustment" | "discount" | "optional" | "note"
      BudgetStatus: "completed" | "not_completed" | "contract"
      EmailStatus: "pending" | "sent" | "failed"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      BudgetAdditionalLineType: ["adjustment", "discount", "optional", "note"],
      BudgetStatus: ["completed", "not_completed", "contract"],
      EmailStatus: ["pending", "sent", "failed"],
    },
  },
} as const
