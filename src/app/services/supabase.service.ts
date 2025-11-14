import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseAnonKey
    );
  }

  get client() {
    return this.supabase;
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
      vatRate: 21, // Por defecto 21% si no existe
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
      vatRate: 21,
      category: data.category,
      active: data.isActive,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    };
  }

  async updateProduct(id: string, updates: any) {
    const { data, error } = await this.supabase
      .from('Products')
      .update({
        reference: updates.reference,
        description: updates.description,
        manufacturer: updates.manufacturer,
        unitPrice: updates.basePrice,
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
      vatRate: 21,
      category: data.category,
      active: data.isActive,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    };
  }

  async deleteProduct(id: string) {
    const { error } = await this.supabase
      .from('Products')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ============================================
  // CUSTOMERS
  // ============================================

  async getCustomers() {
    const { data, error } = await this.supabase
      .from('Customers')
      .select('*')
      .order('name');

    if (error) throw error;
    return data;
  }

  async getCustomer(id: string) {
    const { data, error } = await this.supabase
      .from('Customers')
      .select('*')
        .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async createCustomer(customer: any) {
    const { data, error } = await this.supabase
      .from('Customers')
      .insert([customer])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateCustomer(id: string, updates: any) {
    const { data, error } = await this.supabase
      .from('Customers')
      .update(updates)
        .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
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
    return data;
  }

  async getBudget(id: string) {
    const { data, error } = await this.supabase
      .from('Budgets')
      .select(`
        *,
        customer:Customers(*),
        textBlocks:BudgetTextBlocks(
          *,
          descriptions:BudgetTextBlockSections(*)
        ),
        materials:BudgetMaterials(*),
        additionalLines:BudgetAdditionalLines(*)
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

  async updateBudget(id: string, updates: any) {
    const { data, error } = await this.supabase
      .from('Budgets')
      .update(updates)
        .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteBudget(id: string) {
    const { error } = await this.supabase
      .from('Budgets')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ============================================
  // TEXT BLOCKS
  // ============================================

  async getTextBlocksForBudget(budgetId: string) {
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

  async updateBudgetTextBlock(id: string, updates: any) {
    const { data, error } = await this.supabase
      .from('BudgetTextBlocks')
      .update({
        orderIndex: updates.orderIndex,
        heading: updates.heading,
        link: updates.link,
        imageUrl: updates.imageUrl,
        subtotal: updates.subtotal
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteBudgetTextBlock(id: string) {
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

  async updateTextBlockSection(id: string, updates: any) {
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

  async deleteTextBlockSection(id: string) {
    const { error } = await this.supabase
      .from('BudgetTextBlockSections')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async reorderTextBlockSections(textBlockId: string, sectionIds: string[]) {
    // Actualizar el orderIndex de todas las secciones
    const updates = sectionIds.map((id, index) =>
      this.updateTextBlockSection(id, { orderIndex: index })
    );

    await Promise.all(updates);
  }

  // ============================================
  // MATERIALS
  // ============================================

  async addMaterialToBudget(material: any) {
    const { data, error } = await this.supabase
      .from('BudgetMaterials')
      .insert([material])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateBudgetMaterial(id: string, updates: any) {
    const { data, error } = await this.supabase
      .from('BudgetMaterials')
      .update(updates)
        .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteBudgetMaterial(id: string) {
    const { error } = await this.supabase
      .from('BudgetMaterials')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ============================================
  // ADDITIONAL LINES
  // ============================================

  async addAdditionalLineToBudget(line: any) {
    const { data, error } = await this.supabase
      .from('BudgetAdditionalLines')
      .insert([line])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateBudgetAdditionalLine(id: string, updates: any) {
    const { data, error } = await this.supabase
      .from('BudgetAdditionalLines')
      .update(updates)
        .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteBudgetAdditionalLine(id: string) {
    const { error } = await this.supabase
      .from('BudgetAdditionalLines')
      .delete()
      .eq('id', id);

    if (error) throw error;
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
      .eq('isDefault', true)
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

  async updateGeneralConditions(id: string, updates: any) {
    const { data, error } = await this.supabase
      .from('GeneralConditions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
