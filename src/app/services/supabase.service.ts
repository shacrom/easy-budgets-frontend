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
      .eq('Id', id)
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
      .eq('Id', id)
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
        textBlocks:BudgetTextBlocks(*),
        materials:BudgetMaterials(*),
        additionalLines:BudgetAdditionalLines(*)
      `)
      .eq('Id', id)
      .single();

    if (error) throw error;
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
      .eq('Id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ============================================
  // TEXT BLOCKS
  // ============================================

  async addTextBlockToBudget(textBlock: any) {
    const { data, error } = await this.supabase
      .from('BudgetTextBlocks')
      .insert([textBlock])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateBudgetTextBlock(id: string, updates: any) {
    const { data, error } = await this.supabase
      .from('BudgetTextBlocks')
      .update(updates)
      .eq('Id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteBudgetTextBlock(id: string) {
    const { error } = await this.supabase
      .from('BudgetTextBlocks')
      .delete()
      .eq('Id', id);

    if (error) throw error;
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
      .eq('Id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteBudgetMaterial(id: string) {
    const { error } = await this.supabase
      .from('BudgetMaterials')
      .delete()
      .eq('Id', id);

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
      .eq('Id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteBudgetAdditionalLine(id: string) {
    const { error } = await this.supabase
      .from('BudgetAdditionalLines')
      .delete()
      .eq('Id', id);

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
      .eq('Id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
