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
  // PRODUCTOS
  // ============================================
  
  async getProducts() {
    const { data, error } = await this.supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('description');
    
    if (error) throw error;
    return data;
  }

  async getProductByReference(reference: string) {
    const { data, error } = await this.supabase
      .from('products')
      .select('*')
      .eq('reference', reference)
      .single();
    
    if (error) throw error;
    return data;
  }

  async createProduct(product: any) {
    const { data, error } = await this.supabase
      .from('products')
      .insert([product])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateProduct(id: string, updates: any) {
    const { data, error } = await this.supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // ============================================
  // CLIENTES
  // ============================================
  
  async getCustomers() {
    const { data, error } = await this.supabase
      .from('customers')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data;
  }

  async getCustomer(id: string) {
    const { data, error } = await this.supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  async createCustomer(customer: any) {
    const { data, error } = await this.supabase
      .from('customers')
      .insert([customer])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateCustomer(id: string, updates: any) {
    const { data, error } = await this.supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // ============================================
  // PRESUPUESTOS
  // ============================================
  
  async getBudgets() {
    const { data, error } = await this.supabase
      .from('budgets')
      .select(`
        *,
        customer:customers(*)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  async getBudget(id: string) {
    const { data, error } = await this.supabase
      .from('budgets')
      .select(`
        *,
        customer:customers(*),
        text_blocks:budget_text_blocks(*),
        materials:budget_materials(*),
        additional_lines:budget_additional_lines(*)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  async createBudget(budget: any) {
    const { data, error } = await this.supabase
      .from('budgets')
      .insert([budget])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateBudget(id: string, updates: any) {
    const { data, error } = await this.supabase
      .from('budgets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // ============================================
  // BLOQUES DE TEXTO DEL PRESUPUESTO
  // ============================================
  
  async addTextBlockToBudget(textBlock: any) {
    const { data, error } = await this.supabase
      .from('budget_text_blocks')
      .insert([textBlock])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateBudgetTextBlock(id: string, updates: any) {
    const { data, error } = await this.supabase
      .from('budget_text_blocks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteBudgetTextBlock(id: string) {
    const { error } = await this.supabase
      .from('budget_text_blocks')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // ============================================
  // MATERIALES DEL PRESUPUESTO
  // ============================================
  
  async addMaterialToBudget(material: any) {
    const { data, error } = await this.supabase
      .from('budget_materials')
      .insert([material])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateBudgetMaterial(id: string, updates: any) {
    const { data, error } = await this.supabase
      .from('budget_materials')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteBudgetMaterial(id: string) {
    const { error } = await this.supabase
      .from('budget_materials')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // ============================================
  // LÍNEAS ADICIONALES DEL PRESUPUESTO
  // ============================================
  
  async addAdditionalLineToBudget(line: any) {
    const { data, error } = await this.supabase
      .from('budget_additional_lines')
      .insert([line])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateBudgetAdditionalLine(id: string, updates: any) {
    const { data, error } = await this.supabase
      .from('budget_additional_lines')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteBudgetAdditionalLine(id: string) {
    const { error } = await this.supabase
      .from('budget_additional_lines')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // ============================================
  // CONDICIONES GENERALES
  // ============================================
  
  async getGeneralConditions() {
    const { data, error } = await this.supabase
      .from('general_conditions')
      .select('*')
      .order('is_default', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  async getDefaultGeneralConditions() {
    const { data, error } = await this.supabase
      .from('general_conditions')
      .select('*')
      .eq('is_default', true)
      .single();
    
    if (error) throw error;
    return data;
  }

  async createGeneralConditions(conditions: any) {
    const { data, error } = await this.supabase
      .from('general_conditions')
      .insert([conditions])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateGeneralConditions(id: string, updates: any) {
    const { data, error } = await this.supabase
      .from('general_conditions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}
