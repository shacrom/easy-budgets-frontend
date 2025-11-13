# Tutorial de Configuración de Supabase para Easy Budgets

## 📋 Índice
1. [Introducción](#introducción)
2. [Estructura de la Base de Datos](#estructura-de-la-base-de-datos)
3. [Configuración Inicial de Supabase](#configuración-inicial-de-supabase)
4. [Creación de Tablas](#creación-de-tablas)
5. [Conexión con Angular](#conexión-con-angular)
6. [Ejemplos de Uso](#ejemplos-de-uso)

---

## Introducción

Esta aplicación necesita una base de datos para:
- ✅ Almacenar un catálogo de productos/materiales con referencias
- ✅ Guardar información de clientes para no tenerla que introducir cada vez
- ✅ Guardar presupuestos generados para consultarlos posteriormente
- ✅ Mantener un historial de PDFs generados

---


```sql
-- Habilitar la extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. TABLA: Products
-- ============================================
CREATE TABLE "Products" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "reference" VARCHAR(100) UNIQUE NOT NULL,
  "description" TEXT NOT NULL,
  "manufacturer" VARCHAR(200),
  "unitPrice" DECIMAL(10,2) NOT NULL CHECK ("unitPrice" >= 0),
  "category" VARCHAR(100),
  "imageUrl" TEXT,
  "link" TEXT,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX "idx_Products_reference" ON "Products"("reference");
CREATE INDEX "idx_Products_category" ON "Products"("category");
CREATE INDEX "idx_Products_isActive" ON "Products"("isActive");

-- ============================================
-- 2. TABLA: Customers
-- ============================================
CREATE TABLE "Customers" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" VARCHAR(200) NOT NULL,
  "email" VARCHAR(255) UNIQUE,
  "phone" VARCHAR(50),
  "address" TEXT,
  "city" VARCHAR(100),
  "postalCode" VARCHAR(20),
  "taxId" VARCHAR(50),
  "notes" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX "idx_Customers_name" ON "Customers"("name");
CREATE INDEX "idx_Customers_email" ON "Customers"("email");

-- ============================================
-- 3. TABLA: Budgets
-- ============================================
CREATE TABLE "Budgets" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "budgetNumber" VARCHAR(50) UNIQUE NOT NULL,
  "customerId" UUID REFERENCES "Customers"("id") ON DELETE SET NULL,
  "title" VARCHAR(255) NOT NULL,
  "status" VARCHAR(50) DEFAULT 'draft' CHECK ("status" IN ('draft', 'sent', 'accepted', 'rejected', 'archived')),
  "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "taxPercentage" DECIMAL(5,2) DEFAULT 21.00,
  "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "validUntil" DATE,
  "notes" TEXT,
  "pdfUrl" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX "idx_Budgets_customerId" ON "Budgets"("customerId");
CREATE INDEX "idx_Budgets_status" ON "Budgets"("status");
CREATE INDEX "idx_Budgets_budgetNumber" ON "Budgets"("budgetNumber");
CREATE INDEX "idx_Budgets_createdAt" ON "Budgets"("createdAt" DESC);

-- ============================================
-- 4. TABLA: BudgetTextBlocks
-- ============================================
CREATE TABLE "BudgetTextBlocks" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "budgetId" UUID NOT NULL REFERENCES "Budgets"("id") ON DELETE CASCADE,
  "orderIndex" INTEGER NOT NULL,
  "heading" VARCHAR(255),
  "content" JSONB,
  "link" TEXT,
  "imageUrl" TEXT,
  "subtotal" DECIMAL(10,2) DEFAULT 0,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX "idx_BudgetTextBlocks_budgetId" ON "BudgetTextBlocks"("budgetId");
CREATE INDEX "idx_BudgetTextBlocks_orderIndex" ON "BudgetTextBlocks"("budgetId", "orderIndex");

-- ============================================
-- 5. TABLA: BudgetMaterials
-- ============================================
CREATE TABLE "BudgetMaterials" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "budgetId" UUID NOT NULL REFERENCES "Budgets"("id") ON DELETE CASCADE,
  "productId" UUID REFERENCES "Products"("id") ON DELETE SET NULL,
  "orderIndex" INTEGER NOT NULL,
  "description" TEXT NOT NULL,
  "manufacturer" VARCHAR(200),
  "quantity" DECIMAL(10,2) NOT NULL CHECK ("quantity" > 0),
  "unitPrice" DECIMAL(10,2) NOT NULL CHECK ("unitPrice" >= 0),
  "totalPrice" DECIMAL(10,2) NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX "idx_BudgetMaterials_budgetId" ON "BudgetMaterials"("budgetId");
CREATE INDEX "idx_BudgetMaterials_productId" ON "BudgetMaterials"("productId");
CREATE INDEX "idx_BudgetMaterials_orderIndex" ON "BudgetMaterials"("budgetId", "orderIndex");

-- ============================================
-- 6. TABLA: BudgetAdditionalLines
-- ============================================
CREATE TABLE "BudgetAdditionalLines" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "budgetId" UUID NOT NULL REFERENCES "Budgets"("id") ON DELETE CASCADE,
  "concept" VARCHAR(255) NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "orderIndex" INTEGER NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX "idx_BudgetAdditionalLines_budgetId" ON "BudgetAdditionalLines"("budgetId");

-- ============================================
-- 7. TABLA: GeneralConditions
-- ============================================
CREATE TABLE "GeneralConditions" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" VARCHAR(100) NOT NULL,
  "content" TEXT NOT NULL,
  "isDefault" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TRIGGERS para updatedAt automático
-- ============================================
CREATE OR REPLACE FUNCTION "updateUpdatedAtColumn"()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "update_Products_updatedAt" BEFORE UPDATE ON "Products"
  FOR EACH ROW EXECUTE FUNCTION "updateUpdatedAtColumn"();

CREATE TRIGGER "update_Customers_updatedAt" BEFORE UPDATE ON "Customers"
  FOR EACH ROW EXECUTE FUNCTION "updateUpdatedAtColumn"();

CREATE TRIGGER "update_Budgets_updatedAt" BEFORE UPDATE ON "Budgets"
  FOR EACH ROW EXECUTE FUNCTION "updateUpdatedAtColumn"();

CREATE TRIGGER "update_GeneralConditions_updatedAt" BEFORE UPDATE ON "GeneralConditions"
  FOR EACH ROW EXECUTE FUNCTION "updateUpdatedAtColumn"();

-- ============================================
-- DATOS DE EJEMPLO (Opcional)
-- ============================================

-- Insertar algunas condiciones generales por defecto
INSERT INTO "GeneralConditions" ("name", "content", "isDefault") VALUES
('Condiciones Estándar', 
'1. Los precios incluyen IVA.
2. El presupuesto es válido por 30 días.
3. Forma de pago: 50% al inicio, 50% a la finalización.
4. Los materiales especificados pueden variar según disponibilidad.', 
true);

-- Insertar algunos productos de ejemplo
INSERT INTO "Products" ("reference", "description", "manufacturer", "unitPrice", "category") VALUES
('REF-001', 'Mueble de cocina bajo 80cm', 'Fabricante A', 250.00, 'Cocina'),
('REF-002', 'Encimera granito 200x60cm', 'Fabricante B', 450.00, 'Cocina'),
('REF-003', 'Lavabo porcelana 60cm', 'Fabricante C', 180.00, 'Baño'),
('REF-004', 'Grifo monomando cromo', 'Fabricante A', 95.00, 'Baño'),
('REF-005', 'Campana extractora acero', 'Fabricante D', 210.00, 'Cocina'),
('REF-006', 'Fregadero acero inoxidable', 'Fabricante E', 120.00, 'Cocina'),
('REF-007', 'Placa inducción 3 fuegos', 'Fabricante F', 390.00, 'Cocina'),
('REF-008', 'Horno multifunción 60cm', 'Fabricante G', 320.00, 'Cocina'),
('REF-009', 'Microondas integrable', 'Fabricante H', 180.00, 'Cocina'),
('REF-010', 'Lavavajillas 45cm', 'Fabricante I', 350.00, 'Cocina'),
('REF-011', 'Mueble alto 60cm', 'Fabricante A', 110.00, 'Cocina'),
('REF-012', 'Mueble columna horno', 'Fabricante A', 180.00, 'Cocina'),
('REF-013', 'Tirador aluminio', 'Fabricante J', 8.00, 'Cocina'),
('REF-014', 'Bisagra cierre suave', 'Fabricante K', 5.00, 'Cocina'),
('REF-015', 'Encimera laminada 300x60cm', 'Fabricante B', 220.00, 'Cocina'),
('REF-016', 'Panel trasero cristal', 'Fabricante L', 90.00, 'Cocina'),
('REF-017', 'Cajón extraíble 60cm', 'Fabricante M', 45.00, 'Cocina'),
('REF-018', 'Cubo basura extraíble', 'Fabricante N', 35.00, 'Cocina'),
('REF-019', 'Iluminación LED bajo mueble', 'Fabricante O', 60.00, 'Cocina'),
('REF-020', 'Mesa comedor extensible', 'Fabricante P', 210.00, 'Cocina'),
('REF-021', 'Silla madera tapizada', 'Fabricante Q', 75.00, 'Cocina'),
('REF-022', 'Taburete alto', 'Fabricante Q', 55.00, 'Cocina'),
('REF-023', 'Vinilo suelo cocina', 'Fabricante R', 95.00, 'Cocina'),
('REF-024', 'Azulejo pared blanco', 'Fabricante S', 30.00, 'Cocina'),
('REF-025', 'Pintura antihumedad', 'Fabricante T', 25.00, 'Cocina'),
('REF-026', 'Lavabo sobre encimera', 'Fabricante C', 140.00, 'Baño'),
('REF-027', 'Mueble baño 80cm', 'Fabricante U', 210.00, 'Baño'),
('REF-028', 'Espejo LED 80x60cm', 'Fabricante V', 95.00, 'Baño'),
('REF-029', 'Inodoro compacto', 'Fabricante W', 180.00, 'Baño'),
('REF-030', 'Plato ducha resina 120x70', 'Fabricante X', 210.00, 'Baño'),
('REF-031', 'Mampara ducha corredera', 'Fabricante Y', 320.00, 'Baño'),
('REF-032', 'Grifo lavabo monomando', 'Fabricante Z', 65.00, 'Baño'),
('REF-033', 'Grifo ducha termostático', 'Fabricante Z', 120.00, 'Baño'),
('REF-034', 'Toallero calefactable', 'Fabricante AA', 110.00, 'Baño'),
('REF-035', 'Portarrollos acero', 'Fabricante AB', 18.00, 'Baño'),
('REF-036', 'Columna hidromasaje', 'Fabricante AC', 250.00, 'Baño'),
('REF-037', 'Mueble auxiliar baño', 'Fabricante U', 95.00, 'Baño'),
('REF-038', 'Estante cristal baño', 'Fabricante AD', 22.00, 'Baño'),
('REF-039', 'Perchero pared baño', 'Fabricante AE', 12.00, 'Baño'),
('REF-040', 'Cortina ducha textil', 'Fabricante AF', 20.00, 'Baño'),
('REF-041', 'Azulejo pared baño', 'Fabricante S', 28.00, 'Baño'),
('REF-042', 'Vinilo suelo baño', 'Fabricante R', 65.00, 'Baño'),
('REF-043', 'Pintura antimoho', 'Fabricante T', 22.00, 'Baño'),
('REF-044', 'Espejo aumento', 'Fabricante V', 18.00, 'Baño'),
('REF-045', 'Cesta ropa sucia', 'Fabricante AG', 25.00, 'Baño'),
('REF-046', 'Mueble recibidor', 'Fabricante AH', 130.00, 'Salón'),
('REF-047', 'Zapatero madera', 'Fabricante AI', 95.00, 'Salón'),
('REF-048', 'Sofá 3 plazas', 'Fabricante AJ', 650.00, 'Salón'),
('REF-049', 'Mesa centro elevable', 'Fabricante P', 120.00, 'Salón'),
('REF-050', 'Estantería modular', 'Fabricante AK', 180.00, 'Salón'),
('REF-051', 'Lámpara pie LED', 'Fabricante AL', 85.00, 'Salón'),
('REF-052', 'Alfombra salón 200x140', 'Fabricante AM', 75.00, 'Salón'),
('REF-053', 'Cortina opaca', 'Fabricante AN', 40.00, 'Salón'),
('REF-054', 'Cuadro decorativo grande', 'Fabricante AO', 60.00, 'Salón'),
('REF-055', 'Mueble TV 150cm', 'Fabricante AP', 210.00, 'Salón'),
('REF-056', 'Silla escritorio', 'Fabricante AQ', 65.00, 'Oficina'),
('REF-057', 'Mesa escritorio 120cm', 'Fabricante AR', 110.00, 'Oficina'),
('REF-058', 'Lámpara flexo LED', 'Fabricante AS', 28.00, 'Oficina'),
('REF-059', 'Estantería oficina', 'Fabricante AT', 95.00, 'Oficina'),
('REF-060', 'Archivador metálico', 'Fabricante AU', 80.00, 'Oficina'),
('REF-061', 'Panel corcho pared', 'Fabricante AV', 18.00, 'Oficina'),
('REF-062', 'Silla gaming', 'Fabricante AQ', 140.00, 'Oficina'),
('REF-063', 'Reposapiés ergonómico', 'Fabricante AW', 22.00, 'Oficina'),
('REF-064', 'Cajonera ruedas', 'Fabricante AX', 55.00, 'Oficina'),
('REF-065', 'Papelera oficina', 'Fabricante AY', 12.00, 'Oficina'),
('REF-066', 'Cama matrimonio 150cm', 'Fabricante AZ', 320.00, 'Dormitorio'),
('REF-067', 'Colchón viscoelástico', 'Fabricante BA', 210.00, 'Dormitorio'),
('REF-068', 'Mesita noche 2 cajones', 'Fabricante BB', 65.00, 'Dormitorio'),
('REF-069', 'Armario puertas correderas', 'Fabricante BC', 420.00, 'Dormitorio'),
('REF-070', 'Lámpara techo dormitorio', 'Fabricante BD', 38.00, 'Dormitorio'),
('REF-071', 'Cortina blackout', 'Fabricante AN', 45.00, 'Dormitorio'),
('REF-072', 'Alfombra dormitorio', 'Fabricante AM', 35.00, 'Dormitorio'),
('REF-073', 'Espejo cuerpo entero', 'Fabricante V', 55.00, 'Dormitorio'),
('REF-074', 'Cómoda 4 cajones', 'Fabricante BE', 120.00, 'Dormitorio'),
('REF-075', 'Perchero pie madera', 'Fabricante AE', 30.00, 'Dormitorio'),
('REF-076', 'Cama nido juvenil', 'Fabricante AZ', 260.00, 'Dormitorio'),
('REF-077', 'Colchón espuma', 'Fabricante BA', 95.00, 'Dormitorio'),
('REF-078', 'Escritorio juvenil', 'Fabricante AR', 85.00, 'Dormitorio'),
('REF-079', 'Silla juvenil', 'Fabricante AQ', 45.00, 'Dormitorio'),
('REF-080', 'Estantería pared', 'Fabricante AK', 38.00, 'Dormitorio'),
('REF-081', 'Cuna madera', 'Fabricante BF', 140.00, 'Infantil'),
('REF-082', 'Cómoda cambiador', 'Fabricante BE', 110.00, 'Infantil'),
('REF-083', 'Silla mecedora lactancia', 'Fabricante BG', 120.00, 'Infantil'),
('REF-084', 'Lámpara infantil nube', 'Fabricante BH', 28.00, 'Infantil'),
('REF-085', 'Alfombra infantil', 'Fabricante AM', 25.00, 'Infantil'),
('REF-086', 'Vinilo pared infantil', 'Fabricante BI', 18.00, 'Infantil'),
('REF-087', 'Cama Montessori', 'Fabricante AZ', 180.00, 'Infantil'),
('REF-088', 'Estantería baja infantil', 'Fabricante AK', 32.00, 'Infantil'),
('REF-089', 'Cajonera colores', 'Fabricante AX', 38.00, 'Infantil'),
('REF-090', 'Cesto juguetes', 'Fabricante AG', 15.00, 'Infantil'),
('REF-091', 'Mueble terraza resina', 'Fabricante BJ', 95.00, 'Exterior'),
('REF-092', 'Mesa jardín aluminio', 'Fabricante BK', 140.00, 'Exterior'),
('REF-093', 'Silla jardín apilable', 'Fabricante Q', 32.00, 'Exterior'),
('REF-094', 'Tumbona aluminio', 'Fabricante BL', 110.00, 'Exterior'),
('REF-095', 'Sombrilla jardín 2m', 'Fabricante BM', 60.00, 'Exterior'),
('REF-096', 'Césped artificial', 'Fabricante BN', 75.00, 'Exterior'),
('REF-097', 'Macetero grande', 'Fabricante BO', 22.00, 'Exterior'),
('REF-098', 'Guirnalda LED solar', 'Fabricante BP', 18.00, 'Exterior'),
('REF-099', 'Barbacoa carbón', 'Fabricante BQ', 120.00, 'Exterior'),
('REF-100', 'Caseta jardín resina', 'Fabricante BR', 390.00, 'Exterior');
```
  

4. Haz clic en "Run" (o presiona Ctrl+Enter)
5. Verifica que aparezca "Success. No rows returned"

### Opción 2: Usando la Interfaz de Table Editor

Si prefieres usar la interfaz gráfica:

1. Ve a **Table Editor**
2. Haz clic en "Create a new table"
3. Crea cada tabla una por una según las especificaciones anteriores

---

## Conexión con Angular

### Paso 1: Instalar Supabase Client

```powershell
npm install @supabase/supabase-js
```

### Paso 2: Crear Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

**⚠️ IMPORTANTE**: Añade `.env` a tu `.gitignore` para no subir las credenciales.

### Paso 3: Crear el Servicio de Supabase

Crea `src/app/services/supabase.service.ts`:

```typescript
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
}
```

### Paso 4: Configurar Environment

Actualiza `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  supabaseUrl: 'https://tu-proyecto.supabase.co',
  supabaseAnonKey: 'tu-anon-key-aqui'
};
```

Y `src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  supabaseUrl: 'https://tu-proyecto.supabase.co',
  supabaseAnonKey: 'tu-anon-key-aqui'
};
```

---

## Ejemplos de Uso

### Ejemplo 1: Listar Productos en un Componente

```typescript
import { Component, OnInit, signal } from '@angular/core';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-products-list',
  template: `
    <div>
      <h2>Catálogo de Productos</h2>
      @for (product of products(); track product.id) {
        <div class="product-card">
          <strong>{{ product.reference }}</strong>
          <p>{{ product.description }}</p>
          <span>{{ product.unit_price | currency:'EUR' }}</span>
        </div>
      }
    </div>
  `
})
export class ProductsListComponent implements OnInit {
  products = signal<any[]>([]);

  constructor(private supabase: SupabaseService) {}

  async ngOnInit() {
    try {
      const data = await this.supabase.getProducts();
      this.products.set(data);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  }
}
```

### Ejemplo 2: Autocompletar Cliente

```typescript
async searchCustomer(email: string) {
  try {
    const { data } = await this.supabase.client
      .from('customers')
      .select('*')
      .eq('email', email)
      .single();
    
    if (data) {
      // Rellenar automáticamente los campos del formulario
      this.customerForm.patchValue({
        name: data.name,
        phone: data.phone,
        address: data.address,
        // ... otros campos
      });
    }
  } catch (error) {
    console.log('Cliente no encontrado');
  }
}
```

### Ejemplo 3: Guardar Presupuesto Completo

```typescript
async saveBudget() {
  try {
    // 1. Crear el presupuesto principal
    const budget = await this.supabase.createBudget({
      budget_number: this.generateBudgetNumber(),
      customer_id: this.selectedCustomerId,
      title: this.budgetTitle,
      subtotal: this.calculateSubtotal(),
      tax_percentage: 21,
      tax_amount: this.calculateTax(),
      total: this.calculateTotal()
    });

    // 2. Guardar bloques de texto
    for (const block of this.textBlocks) {
      await this.supabase.client
        .from('budget_text_blocks')
        .insert({
          budget_id: budget.id,
          order_index: block.order,
          heading: block.heading,
          content: block.content,
          subtotal: block.total
        });
    }

    // 3. Guardar materiales
    for (const material of this.materials) {
      await this.supabase.addMaterialToBudget({
        budget_id: budget.id,
        product_id: material.productId, // Si viene del catálogo
        description: material.description,
        manufacturer: material.manufacturer,
        quantity: material.quantity,
        unit_price: material.unitPrice,
        total_price: material.totalPrice,
        order_index: material.order
      });
    }

    console.log('Presupuesto guardado correctamente');
  } catch (error) {
    console.error('Error guardando presupuesto:', error);
  }
}
```

---

## Configuración de Políticas de Seguridad (RLS)

Por defecto, Supabase tiene Row Level Security (RLS) habilitado. Para desarrollo, puedes desactivarlo temporalmente o configurar políticas:

### Opción 1: Desactivar RLS (Solo para desarrollo)

```sql
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE budgets DISABLE ROW LEVEL SECURITY;
ALTER TABLE budget_text_blocks DISABLE ROW LEVEL SECURITY;
ALTER TABLE budget_materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE budget_additional_lines DISABLE ROW LEVEL SECURITY;
ALTER TABLE general_conditions DISABLE ROW LEVEL SECURITY;
```

### Opción 2: Crear Políticas Permisivas (Recomendado)

```sql
-- Permitir todo a usuarios autenticados (ajustar según necesidades)
CREATE POLICY "Enable all for authenticated users" ON products
    FOR ALL USING (true);

CREATE POLICY "Enable all for authenticated users" ON customers
    FOR ALL USING (true);

CREATE POLICY "Enable all for authenticated users" ON budgets
    FOR ALL USING (true);

-- Repetir para las demás tablas...
```

---

## Próximos Pasos

1. ✅ Crear cuenta en Supabase
2. ✅ Crear proyecto
3. ✅ Ejecutar script SQL para crear tablas
4. ✅ Instalar `@supabase/supabase-js`
5. ✅ Configurar credenciales en environment
6. ✅ Crear SupabaseService
7. ✅ Integrar con tus componentes existentes
8. 🔄 Configurar políticas de seguridad
9. 🔄 Implementar búsqueda/autocompletado de productos
10. 🔄 Implementar autocompletado de clientes
11. 🔄 Guardar presupuestos generados
12. 🔄 Generar y almacenar PDFs

---

## Recursos Adicionales

- 📚 [Documentación oficial de Supabase](https://supabase.com/docs)
- 📚 [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- 📚 [PostgreSQL Docs](https://www.postgresql.org/docs/)

---

¿Necesitas ayuda con algún paso específico? ¡Pregúntame!
