import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Customer } from '../models/customer.model';
import { BudgetSummary } from '../models/budget-summary.model';
import { BudgetStatus } from '../models/budget.model';
import { MaterialTable } from '../models/material.model';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private readonly storageBucket = environment.supabaseStorageBucket;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseAnonKey
    );
  }

  // NOTE: IDs are now numeric autoincrement integers in the database.
  // All service methods should accept and use numeric IDs only.

  get client() {
    return this.supabase;
  }

  async uploadPublicAsset(file: File | Blob, options?: { folder?: string; fileName?: string }) {
    if (!this.storageBucket) {
      throw new Error('The Supabase storage bucket is not configured.');
    }

    const folder = options?.folder?.replace(/^\/+|\/+$/g, '') ?? '';
    const originalName = options?.fileName || (file instanceof File ? file.name : 'asset');
    const extension = originalName.includes('.') ? originalName.split('.').pop() : undefined;
    const uniqueId = typeof crypto?.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const generatedName = extension ? `${uniqueId}.${extension}` : uniqueId;
    const storagePath = folder ? `${folder}/${generatedName}` : generatedName;

    const { error: uploadError } = await this.supabase
      .storage
      .from(this.storageBucket)
      .upload(storagePath, file, {
        upsert: true,
        cacheControl: '3600',
        contentType: file instanceof File ? file.type : undefined
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = this.supabase
      .storage
      .from(this.storageBucket)
      .getPublicUrl(storagePath);

    if (!data?.publicUrl) {
      throw new Error('No se pudo obtener la URL pública de la imagen subida.');
    }

    return {
      publicUrl: data.publicUrl,
      path: storagePath
    };
  }

  // ============================================
  // PRODUCTS
  // ============================================

  async getProducts() {
    const { data, error } = await this.supabase
      .from('Products')
      .select('*')
      .eq('isActive', true)
      .order('description');

    if (error) throw error;

    // Mapear de PascalCase a camelCase
    return data.map((product: any) => ({
      id: product.id,
      reference: product.reference,
      description: product.description,
      manufacturer: product.manufacturer,
      basePrice: product.unitPrice,
      vatRate: product.vatRate ?? 0,
      category: product.category,
      active: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    }));
  }

  async getProductByReference(reference: string) {
    const { data, error } = await this.supabase
      .from('Products')
      .select('*')
      .eq('reference', reference)
      .single();

    if (error) throw error;
    return data;
  }

  async createProduct(product: any) {
    const { data, error } = await this.supabase
      .from('Products')
      .insert([{
        reference: product.reference,
        description: product.description,
        manufacturer: product.manufacturer,
        unitPrice: product.basePrice,
        vatRate: product.vatRate, // Guardar IVA
        category: product.category,
        isActive: product.active ?? true
      }])
      .select()
      .single();

    if (error) throw error;

    // Mapear respuesta a camelCase
    return {
      id: data.id,
      reference: data.reference,
      description: data.description,
      manufacturer: data.manufacturer,
      basePrice: data.unitPrice,
      vatRate: data.vatRate ?? 21,
      category: data.category,
      active: data.isActive,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    };
  }

  async updateProduct(id: number, updates: any) {
    const { data, error } = await this.supabase
      .from('Products')
      .update({
        reference: updates.reference,
        description: updates.description,
        manufacturer: updates.manufacturer,
        unitPrice: updates.basePrice,
        vatRate: updates.vatRate, // Actualizar IVA
        category: updates.category,
        isActive: updates.active
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Mapear respuesta a camelCase
    return {
      id: data.id,
      reference: data.reference,
      description: data.description,
      manufacturer: data.manufacturer,
      basePrice: data.unitPrice,
      vatRate: data.vatRate ?? 21,
      category: data.category,
      active: data.isActive,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    };
  }

  async deleteProduct(id: number) {
    const { error } = await this.supabase
      .from('Products')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ============================================
  // CUSTOMERS
  // ============================================

  async getCustomers(): Promise<Customer[]> {
    const { data, error } = await this.supabase
      .from('Customers')
      .select('*')
      .order('name');

    if (error) throw error;
    return (data ?? []) as Customer[];
  }

  async getCustomer(id: number): Promise<Customer | null> {
    if (!Number.isFinite(id)) return null;
    const { data, error } = await this.supabase
      .from('Customers')
        .select('*')
          .eq('id', id)
      .single();

    if (error) throw error;
    return data as Customer;
  }

  async searchCustomers(term: string, limit = 10): Promise<Customer[]> {
    const value = term.trim();
    if (!value) {
      const { data, error } = await this.supabase
        .from('Customers')
        .select('*')
        .order('name')
        .limit(limit);

      if (error) throw error;
      return (data ?? []) as Customer[];
    }

    const pattern = `%${value}%`;
    const filters = [
      `name.ilike.${pattern}`,
      `email.ilike.${pattern}`,
      `phone.ilike.${pattern}`,
      `city.ilike.${pattern}`,
      `dni.ilike.${pattern}`
    ].join(',');

    const { data, error } = await this.supabase
      .from('Customers')
      .select('*')
      .or(filters)
      .order('name')
      .limit(limit);

    if (error) throw error;
    return (data ?? []) as Customer[];
  }

  async createCustomer(customer: Partial<Customer>) {
    const { data, error } = await this.supabase
      .from('Customers')
      .insert([customer])
      .select()
      .single();

    if (error) throw error;
    return data as Customer;
  }

  async updateCustomer(id: number, updates: Partial<Customer>) {
    if (!Number.isFinite(id)) throw new Error('Invalid customer id');
    const { data, error } = await this.supabase
      .from('Customers')
      .update(updates)
        .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Customer;
  }

  async deleteCustomer(id: number) {
    if (!Number.isFinite(id)) return;
    const { error } = await this.supabase
      .from('Customers')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ============================================
  // BUDGETS
  // ============================================

  async getBudgets() {
    const { data, error } = await this.supabase
      .from('Budgets')
      .select(`
        *,
        customer:Customers(*)
      `)
      .order('createdAt', { ascending: false });

    if (error) throw error;

    const parseNumber = (value: unknown) => {
      if (typeof value === 'number') {
        return Number.isFinite(value) ? value : 0;
      }

      const parsed = Number(value ?? 0);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const parseStatus = (value: unknown): BudgetStatus => {
      return value === 'completed' ? 'completed' : 'not_completed';
    };

    return (data ?? []).map((budget: any) => ({
      id: budget.id,
      budgetNumber: budget.budgetNumber,
      title: budget.title,
      status: parseStatus(budget.status),
      total: parseNumber(budget.total),
      taxableBase: parseNumber(budget.taxableBase),
      taxPercentage: parseNumber(budget.taxPercentage),
      taxAmount: parseNumber(budget.taxAmount),
      customer: budget.customer ?? null,
      createdAt: budget.createdAt,
      updatedAt: budget.updatedAt
    }));
  }

  async updateBudgetTotals(budgetId: number, summary: BudgetSummary) {
    if (!Number.isFinite(budgetId)) {
      throw new Error('Budget ID is required to update totals.');
    }

    if (!summary) {
      throw new Error('Budget summary is required to update totals.');
    }

    const normalizeCurrency = (value: number) => Number((value ?? 0).toFixed(2));

    const payload = {
      taxableBase: normalizeCurrency(summary.taxableBase ?? 0),
      taxPercentage: normalizeCurrency(summary.vatPercentage ?? 0),
      taxAmount: normalizeCurrency(summary.vat ?? 0),
      total: normalizeCurrency(summary.grandTotal ?? 0)
    };

    const { error } = await this.supabase
      .from('Budgets')
      .update(payload)
      .eq('id', budgetId);

    if (error) throw error;
  }

  async getBudget(id: number) {
    if (!Number.isFinite(id)) {
      throw new Error('Budget ID is required');
    }
    const { data, error } = await this.supabase
      .from('Budgets')
      .select(`
        *,
        customer:Customers(*),
        textBlocks:BudgetTextBlocks(
          *,
          descriptions:BudgetTextBlockSections(*)
        ),
        materialTables:BudgetMaterialTables(
          *,
          rows:BudgetMaterialTableRows(*)
        ),
        additionalLines:BudgetAdditionalLines(*),
        conditions:BudgetConditions(*),
        simpleBlock:BudgetCountertops(*)
      `)
        .eq('id', id)
      .single();

    if (error) throw error;

    // Ordenar los bloques de texto y sus secciones
    if (data.textBlocks) {
      data.textBlocks = data.textBlocks
        .sort((a: any, b: any) => a.orderIndex - b.orderIndex)
        .map((block: any) => ({
          ...block,
          descriptions: block.descriptions?.sort((a: any, b: any) => a.orderIndex - b.orderIndex) || []
        }));
    }

    if (data.conditions) {
      data.conditions = data.conditions
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((condition: any) => ({
          id: condition.id,
          title: condition.title,
          text: condition.content,
          orderIndex: condition.order_index
        }));
    } else {
      data.conditions = [];
    }

    if (data.materialTables) {
      data.materialTables = data.materialTables
        .sort((a: any, b: any) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
        .map((table: any) => ({
          ...table,
          rows: (table.rows ?? [])
            .sort((a: any, b: any) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
        }));
    } else {
      data.materialTables = [];
    }

    // SimpleBlock viene como array de 0 o 1 elementos, convertirlo a objeto único o null
    if (data.simpleBlock && Array.isArray(data.simpleBlock)) {
      data.simpleBlock = data.simpleBlock.length > 0 ? data.simpleBlock[0] : null;
    }

    return data;
  }

  async createBudget(budget: any) {
    const { data, error } = await this.supabase
      .from('Budgets')
      .insert([budget])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateBudget(id: number, updates: any) {
    if (!Number.isFinite(id)) throw new Error('Invalid budget id');
    const { data, error } = await this.supabase
      .from('Budgets')
      .update(updates)
        .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteBudget(id: number) {
    if (!Number.isFinite(id)) return;
    const { error } = await this.supabase
      .from('Budgets')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async duplicateBudget(budgetId: number) {
    const original = await this.getBudget(budgetId);

    if (!original) {
      throw new Error('Presupuesto no encontrado');
    }

    const {
      textBlocks = [],
      materialTables = [],
      additionalLines = [],
      simpleBlock,
      customer,
      id: _originalId,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      ...budgetData
    } = original;

    const numberPrefix = (budgetData.budgetNumber ?? 'BUD').split('-')[0];
    const newBudgetNumber = `${numberPrefix}-${Date.now()}`;
    const newBudgetPayload: Record<string, any> = {
      ...budgetData,
      budgetNumber: newBudgetNumber,
      title: `${budgetData.title ?? 'Presupuesto'} (Copia)`
    };

    const { data: newBudget, error: insertBudgetError } = await this.supabase
      .from('Budgets')
      .insert([newBudgetPayload])
      .select()
      .single();

    if (insertBudgetError || !newBudget) {
      throw insertBudgetError ?? new Error('No se pudo crear la copia del presupuesto');
    }

    const newBudgetId = newBudget.id;

    for (const block of textBlocks ?? []) {
      const blockPayload: Record<string, any> = {
        budgetId: newBudgetId,
        orderIndex: block.orderIndex,
        heading: block.heading,
        link: block.link,
        imageUrl: block.imageUrl,
        subtotal: block.subtotal ?? 0
      };

      const { data: newBlock, error: blockError } = await this.supabase
        .from('BudgetTextBlocks')
        .insert([blockPayload])
        .select()
        .single();

      if (blockError || !newBlock) {
        throw blockError ?? new Error('No se pudo clonar un bloque de texto');
      }

      if (block.descriptions?.length) {
        const sectionPayloads = block.descriptions.map((section: any) => ({
          textBlockId: newBlock.id,
          orderIndex: section.orderIndex,
          title: section.title,
          text: section.text
        }));

        const { error: sectionsError } = await this.supabase
          .from('BudgetTextBlockSections')
          .insert(sectionPayloads);

        if (sectionsError) {
          throw sectionsError;
        }
      }
    }

    if (materialTables?.length) {
      await this.cloneMaterialTables(newBudgetId, materialTables);
    }

    if (additionalLines?.length) {
      const additionalPayloads = additionalLines.map((line: any) => {
        const { id, budgetId: _oldBudgetId, createdAt, updatedAt, ...rest } = line;
        return {
          ...rest,
          budgetId: newBudgetId
        };
      });

      const { error: additionalError } = await this.supabase
        .from('BudgetAdditionalLines')
        .insert(additionalPayloads);

      if (additionalError) {
        throw additionalError;
      }
    }

    if (simpleBlock) {
      const { id: _simpleBlockId, budgetId: _oldBudgetId, createdAt: _sbCreatedAt, updatedAt: _sbUpdatedAt, ...simpleBlockData } = simpleBlock;
      const simpleBlockPayload = {
        ...simpleBlockData,
        budgetId: newBudgetId
      };

      const { error: simpleBlockError } = await this.supabase
        .from('BudgetCountertops')
        .insert([simpleBlockPayload]);

      if (simpleBlockError) {
        throw simpleBlockError;
      }
    }

    return newBudget;
  }

  // ============================================
  // TEXT BLOCKS
  // ============================================

  async getTextBlocksForBudget(budgetId: number) {
    if (!Number.isFinite(budgetId)) return [];
    const { data, error } = await this.supabase
      .from('BudgetTextBlocks')
      .select(`
        *,
        descriptions:BudgetTextBlockSections(*)
      `)
      .eq('budgetId', budgetId)
      .order('orderIndex');

    if (error) throw error;

    // Ordenar las secciones dentro de cada bloque
    return data.map((block: any) => ({
      ...block,
      descriptions: block.descriptions?.sort((a: any, b: any) => a.orderIndex - b.orderIndex) || []
    }));
  }

  async addTextBlockToBudget(textBlock: any) {
    const { data, error } = await this.supabase
      .from('BudgetTextBlocks')
      .insert([{
        budgetId: textBlock.budgetId,
        orderIndex: textBlock.orderIndex,
        heading: textBlock.heading,
        link: textBlock.link,
        imageUrl: textBlock.imageUrl,
        subtotal: textBlock.subtotal || 0
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateBudgetTextBlock(id: number, updates: any) {
    if (!Number.isFinite(id)) throw new Error('Invalid text block id');

    // Build update object conditionally to handle cases where sectionTitle column doesn't exist
    const updateData: any = {
      orderIndex: updates.orderIndex,
      heading: updates.heading,
      link: updates.link,
      imageUrl: updates.imageUrl,
      subtotal: updates.subtotal
    };

    // Only include sectionTitle if it's provided
    if (updates.sectionTitle !== undefined) {
      updateData.sectionTitle = updates.sectionTitle;
    }

    const { data, error } = await this.supabase
      .from('BudgetTextBlocks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteBudgetTextBlock(id: number) {
    if (!Number.isFinite(id)) return;
    // Las secciones se eliminan automáticamente por CASCADE
    const { error } = await this.supabase
      .from('BudgetTextBlocks')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ============================================
  // TEXT BLOCK SECTIONS
  // ============================================

  async addSectionToTextBlock(section: any) {
    const { data, error } = await this.supabase
      .from('BudgetTextBlockSections')
      .insert([{
        textBlockId: section.textBlockId,
        orderIndex: section.orderIndex,
        title: section.title,
        text: section.text
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateTextBlockSection(id: number, updates: any) {
    if (!Number.isFinite(id)) throw new Error('Invalid section id');
    const { data, error } = await this.supabase
      .from('BudgetTextBlockSections')
      .update({
        orderIndex: updates.orderIndex,
        title: updates.title,
        text: updates.text
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteTextBlockSection(id: number) {
    if (!Number.isFinite(id)) return;
    const { error } = await this.supabase
      .from('BudgetTextBlockSections')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async reorderTextBlockSections(textBlockId: number, sectionIds: number[]) {
    if (!Number.isFinite(textBlockId)) return;
    // Actualizar el orderIndex de todas las secciones
    const updates = sectionIds.map((id: number, index: number) =>
      this.updateTextBlockSection(id, { orderIndex: index })
    );

    await Promise.all(updates);
  }

  // ============================================
  // MATERIALS
  // ============================================

  async saveMaterialTables(budgetId: number, tables: MaterialTable[]): Promise<{ tables: any[]; rows: any[] } | void> {
    if (!Number.isFinite(budgetId)) throw new Error('Budget ID is required');
    const normalizedBudgetId = budgetId;
    const { error: deleteError } = await this.supabase
      .from('BudgetMaterialTables')
      .delete()
      .eq('budgetId', normalizedBudgetId);

    if (deleteError) throw deleteError;

    if (!tables.length) {
      return;
    }

    const tablePayloads = tables.map(table => ({
      budgetId: normalizedBudgetId,
      title: table.title ?? '',
      orderIndex: table.orderIndex ?? 0,
      // Column visibility for PDF export
      showReference: table.showReference ?? true,
      showDescription: table.showDescription ?? true,
      showManufacturer: table.showManufacturer ?? true,
      showQuantity: table.showQuantity ?? true,
      showUnitPrice: table.showUnitPrice ?? true,
      showTotalPrice: table.showTotalPrice ?? true
    }));

    // Insert tables and get the generated DB ids
    const { data: insertedTablesData, error: insertTablesError } = await this.supabase
      .from('BudgetMaterialTables')
      .insert(tablePayloads)
      .select();

    if (insertTablesError) throw insertTablesError;

    // Map rows to inserted table ids. We assume insert returned tables in the same order.
    const insertedTables = insertedTablesData ?? [] as any[];
    const rowsPayload = tables.flatMap((table, tableIndex) =>
      (table.rows ?? []).map(row => ({
        tableId: (insertedTables[tableIndex] && insertedTables[tableIndex].id) || table.id,
        productId: row.productId ?? null,
        reference: row.reference ?? '',
        description: row.description ?? '',
        manufacturer: row.manufacturer ?? '',
        quantity: row.quantity ?? 0,
        unitPrice: row.unitPrice ?? 0,
        totalPrice: row.totalPrice ?? ((row.unitPrice ?? 0) * (row.quantity ?? 0)),
        orderIndex: row.orderIndex ?? 0
      }))
    );

    if (!rowsPayload.length) {
      return;
    }

    const { data: insertedRowsData, error: insertRowsError } = await this.supabase
      .from('BudgetMaterialTableRows')
      .insert(rowsPayload)
      .select();

    if (insertRowsError) throw insertRowsError;

    // Return inserted tables and rows so the caller can update local state with real ids
    return {
      tables: insertedTables,
      rows: insertedRowsData ?? []
    };
  }

  private async cloneMaterialTables(budgetId: number, tables: MaterialTable[]) {
    for (const [index, table] of tables.entries()) {
      const { data: insertedTable, error: tableError } = await this.supabase
        .from('BudgetMaterialTables')
        .insert([{
          budgetId,
          title: table.title ?? '',
          orderIndex: table.orderIndex ?? index,
          // Clone column visibility settings
          showReference: table.showReference ?? true,
          showDescription: table.showDescription ?? true,
          showManufacturer: table.showManufacturer ?? true,
          showQuantity: table.showQuantity ?? true,
          showUnitPrice: table.showUnitPrice ?? true,
          showTotalPrice: table.showTotalPrice ?? true
        }])
        .select()
        .single();

      if (tableError || !insertedTable) {
        throw tableError ?? new Error('No se pudo clonar una tabla de materiales');
      }

      if (table.rows?.length) {
        const rowsPayload = table.rows.map((row, rowIndex) => ({
          tableId: insertedTable.id,
          productId: row.productId ?? null,
          reference: row.reference ?? '',
          description: row.description ?? '',
          manufacturer: row.manufacturer ?? '',
          quantity: row.quantity ?? 0,
          unitPrice: row.unitPrice ?? 0,
          totalPrice: row.totalPrice ?? ((row.unitPrice ?? 0) * (row.quantity ?? 0)),
          orderIndex: row.orderIndex ?? rowIndex
        }));

        const { error: rowsError } = await this.supabase
          .from('BudgetMaterialTableRows')
          .insert(rowsPayload);

        if (rowsError) {
          throw rowsError;
        }
      }
    }
  }

  private generateClientUuid(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  // ============================================
  // ADDITIONAL LINES
  // ============================================

  async addAdditionalLineToBudget(line: any) {
    const payload = {
      ...line,
      conceptType: line?.conceptType ?? 'adjustment'
    };

    const { data, error } = await this.supabase
      .from('BudgetAdditionalLines')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateBudgetAdditionalLine(id: number, updates: any) {
    if (!Number.isFinite(id)) throw new Error('Invalid line id');
    const payload = {
      ...updates,
      conceptType: updates?.conceptType ?? 'adjustment'
    };

    const { data, error } = await this.supabase
      .from('BudgetAdditionalLines')
      .update(payload)
        .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteBudgetAdditionalLine(id: number) {
    if (!Number.isFinite(id)) return;
    const { error } = await this.supabase
      .from('BudgetAdditionalLines')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async saveAdditionalLines(budgetId: number, lines: any[]) {
    if (!Number.isFinite(budgetId)) {
      throw new Error('Budget ID is required to save additional lines.');
    }

    // Delete existing additional lines for this budget
    const { error: deleteError } = await this.supabase
      .from('BudgetAdditionalLines')
      .delete()
      .eq('budgetId', budgetId);

    if (deleteError) throw deleteError;

    if (!lines || !lines.length) {
      return;
    }

    const payloads = lines.map((line, index) => ({
      budgetId: budgetId,
      concept: line.concept ?? '',
      amount: line.amount ?? 0,
      orderIndex: line.orderIndex ?? index,
      conceptType: line.conceptType ?? 'adjustment',
      validUntil: line.validUntil ?? null
    }));

    const { error: insertError } = await this.supabase
      .from('BudgetAdditionalLines')
      .insert(payloads);

    if (insertError) throw insertError;
  }

  // ============================================
  // GENERAL CONDITIONS
  // ============================================

  async getGeneralConditions() {
    const { data, error } = await this.supabase
      .from('GeneralConditions')
      .select('*')
      .order('isDefault', { ascending: false });

    if (error) throw error;
    return data;
  }

  async getDefaultGeneralConditions() {
    const { data, error } = await this.supabase
      .from('GeneralConditions')
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async createGeneralConditions(conditions: any) {
    const { data, error } = await this.supabase
      .from('GeneralConditions')
      .insert([conditions])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateGeneralConditions(id: number, updates: any) {
    if (!Number.isFinite(id)) throw new Error('Invalid conditions id');
    const { data, error } = await this.supabase
      .from('GeneralConditions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ============================================
  // CONDITION TEMPLATES
  // ============================================

  async getConditionTemplates() {
    const { data, error } = await this.supabase
      .from('ConditionTemplates')
      .select('*')
      .order('name');

    if (error) throw error;
    return data;
  }

  async getConditionTemplateSections(templateId: number) {
    const { data, error } = await this.supabase
      .from('ConditionTemplateSections')
      .select('*')
      .eq('template_id', templateId)
      .order('order_index');

    if (error) throw error;

    return data.map((section: any) => ({
      id: section.id,
      title: section.title,
      text: section.content,
      orderIndex: section.order_index
    }));
  }

  async createConditionTemplate(name: string, conditions: any[]) {
    // 1. Create template
    const { data: template, error: templateError } = await this.supabase
      .from('ConditionTemplates')
      .insert([{ name }])
      .select()
      .single();

    if (templateError) throw templateError;

    if (!conditions.length) return template;

    // 2. Create sections
    const sectionsPayload = conditions.map((cond, index) => ({
      template_id: template.id,
      title: cond.title,
      content: cond.text,
      order_index: index
    }));

    const { error: sectionsError } = await this.supabase
      .from('ConditionTemplateSections')
      .insert(sectionsPayload);

    if (sectionsError) throw sectionsError;

    return template;
  }

  async deleteConditionTemplate(id: number) {
    if (!Number.isFinite(id)) return;
    const { error } = await this.supabase
      .from('ConditionTemplates')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ============================================
  // BUDGET CONDITIONS
  // ============================================

  async getBudgetConditions(budgetId: number) {
    const { data, error } = await this.supabase
      .from('BudgetConditions')
      .select('*')
      .eq('budget_id', budgetId)
      .order('order_index');

    if (error) throw error;

    return data.map((condition: any) => ({
      id: condition.id,
      title: condition.title,
      text: condition.content,
      orderIndex: condition.order_index
    }));
  }

  async saveBudgetConditions(budgetId: number, conditions: any[]) {
    if (!Number.isFinite(budgetId)) throw new Error('Invalid budget id');

    // 1. Delete existing conditions
    const { error: deleteError } = await this.supabase
      .from('BudgetConditions')
      .delete()
      .eq('budget_id', budgetId);

    if (deleteError) throw deleteError;

    if (!conditions.length) return;

    // 2. Insert new conditions
    const payload = conditions.map((cond, index) => ({
      budget_id: budgetId,
      title: cond.title,
      content: cond.text,
      order_index: index
    }));

    const { error: insertError } = await this.supabase
      .from('BudgetConditions')
      .insert(payload);

    if (insertError) throw insertError;
  }

  // ============================================
  // SIMPLE BLOCKS (formerly Countertops)
  // ============================================

  async getSimpleBlockForBudget(budgetId: number) {
    if (!Number.isFinite(budgetId)) return null;
    const { data, error } = await this.supabase
      .from('BudgetCountertops')
      .select('*')
      .eq('budgetId', budgetId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async upsertSimpleBlock(simpleBlock: any) {
    const { data, error } = await this.supabase
      .from('BudgetCountertops')
      .upsert(simpleBlock)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteSimpleBlock(budgetId: number) {
    if (!Number.isFinite(budgetId)) return;
    const { error } = await this.supabase
      .from('BudgetCountertops')
      .delete()
      .eq('budgetId', budgetId);

    if (error) throw error;
  }

  // ============================================
  // TEXT BLOCK TEMPLATES
  // ============================================

  async getTextBlockTemplates() {
    const { data, error } = await this.supabase
      .from('TextBlockTemplates')
      .select('*')
      .order('name');

    if (error) throw error;
    return data;
  }

  async getTextBlockTemplateSections(templateId: number) {
    const { data, error } = await this.supabase
      .from('TextBlockTemplateSections')
      .select('*')
      .eq('template_id', templateId)
      .order('order_index');

    if (error) throw error;

    return data.map((section: any) => ({
      id: section.id,
      title: section.title,
      text: section.content,
      orderIndex: section.order_index
    }));
  }

  async getTextBlockTemplateWithSections(templateId: number) {
    // Get template info
    const { data: template, error: templateError } = await this.supabase
      .from('TextBlockTemplates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError) throw templateError;

    // Get sections
    const sections = await this.getTextBlockTemplateSections(templateId);

    return {
      id: template.id,
      name: template.name,
      provider: template.provider,
      heading: template.heading,
      sections
    };
  }

  async createTextBlockTemplate(name: string, heading: string | null, provider: string | null, sections: Array<{ title: string; text: string }>) {
    // 1. Create template
    const { data: template, error: templateError } = await this.supabase
      .from('TextBlockTemplates')
      .insert([{ name, heading, provider }])
      .select()
      .single();

    if (templateError) throw templateError;

    if (!sections.length) return template;

    // 2. Create sections
    const sectionsPayload = sections.map((section, index) => ({
      template_id: template.id,
      title: section.title,
      content: section.text,
      order_index: index
    }));

    const { error: sectionsError } = await this.supabase
      .from('TextBlockTemplateSections')
      .insert(sectionsPayload);

    if (sectionsError) throw sectionsError;

    return template;
  }

  async deleteTextBlockTemplate(id: number) {
    if (!Number.isFinite(id)) return;
    const { error } = await this.supabase
      .from('TextBlockTemplates')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}

