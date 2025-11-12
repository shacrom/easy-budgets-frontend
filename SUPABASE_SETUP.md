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

## Estructura de la Base de Datos

### Tablas Necesarias

#### 1. **`products`** - Catálogo de Productos/Materiales
Almacena todos los productos/materiales disponibles con sus referencias y precios.

| Columna | Tipo | Descripción | Restricciones |
|---------|------|-------------|---------------|
| `id` | UUID | Identificador único | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `reference` | VARCHAR(100) | Referencia del producto | UNIQUE, NOT NULL |
| `description` | TEXT | Descripción del producto | NOT NULL |
| `manufacturer` | VARCHAR(200) | Fabricante | |
| `unit_price` | DECIMAL(10,2) | Precio unitario | NOT NULL, CHECK (unit_price >= 0) |
| `category` | VARCHAR(100) | Categoría (cocina, baño, etc.) | |
| `image_url` | TEXT | URL de la imagen del producto | |
| `link` | TEXT | Link a más información | |
| `is_active` | BOOLEAN | Si está activo en el catálogo | DEFAULT true |
| `created_at` | TIMESTAMP | Fecha de creación | DEFAULT NOW() |
| `updated_at` | TIMESTAMP | Fecha de actualización | DEFAULT NOW() |

---

#### 2. **`customers`** - Clientes
Almacena la información de los clientes para no tenerla que introducir manualmente cada vez.

| Columna | Tipo | Descripción | Restricciones |
|---------|------|-------------|---------------|
| `id` | UUID | Identificador único | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `name` | VARCHAR(200) | Nombre completo o empresa | NOT NULL |
| `email` | VARCHAR(255) | Email de contacto | UNIQUE |
| `phone` | VARCHAR(50) | Teléfono | |
| `address` | TEXT | Dirección completa | |
| `city` | VARCHAR(100) | Ciudad | |
| `postal_code` | VARCHAR(20) | Código postal | |
| `tax_id` | VARCHAR(50) | NIF/CIF | |
| `notes` | TEXT | Notas adicionales del cliente | |
| `created_at` | TIMESTAMP | Fecha de creación | DEFAULT NOW() |
| `updated_at` | TIMESTAMP | Fecha de actualización | DEFAULT NOW() |

---

#### 3. **`budgets`** - Presupuestos
Almacena los presupuestos generados.

| Columna | Tipo | Descripción | Restricciones |
|---------|------|-------------|---------------|
| `id` | UUID | Identificador único | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `budget_number` | VARCHAR(50) | Número de presupuesto | UNIQUE, NOT NULL |
| `customer_id` | UUID | Referencia al cliente | FOREIGN KEY → customers(id) |
| `title` | VARCHAR(255) | Título del presupuesto | NOT NULL |
| `status` | VARCHAR(50) | Estado (draft, sent, accepted, rejected) | DEFAULT 'draft' |
| `subtotal` | DECIMAL(10,2) | Subtotal sin IVA | NOT NULL, DEFAULT 0 |
| `tax_percentage` | DECIMAL(5,2) | Porcentaje de IVA | DEFAULT 21.00 |
| `tax_amount` | DECIMAL(10,2) | Cantidad de IVA | NOT NULL, DEFAULT 0 |
| `total` | DECIMAL(10,2) | Total con IVA | NOT NULL, DEFAULT 0 |
| `valid_until` | DATE | Válido hasta | |
| `notes` | TEXT | Notas adicionales | |
| `pdf_url` | TEXT | URL del PDF generado | |
| `created_at` | TIMESTAMP | Fecha de creación | DEFAULT NOW() |
| `updated_at` | TIMESTAMP | Fecha de actualización | DEFAULT NOW() |

---

#### 4. **`budget_text_blocks`** - Bloques de Texto del Presupuesto
Almacena los bloques de texto personalizados de cada presupuesto.

| Columna | Tipo | Descripción | Restricciones |
|---------|------|-------------|---------------|
| `id` | UUID | Identificador único | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `budget_id` | UUID | Referencia al presupuesto | FOREIGN KEY → budgets(id) ON DELETE CASCADE |
| `order_index` | INTEGER | Orden del bloque | NOT NULL |
| `heading` | VARCHAR(255) | Encabezado del bloque | |
| `content` | TEXT | Contenido en formato JSON | |
| `link` | TEXT | Link asociado | |
| `image_url` | TEXT | URL de imagen | |
| `subtotal` | DECIMAL(10,2) | Subtotal del bloque | DEFAULT 0 |
| `created_at` | TIMESTAMP | Fecha de creación | DEFAULT NOW() |

---

#### 5. **`budget_materials`** - Materiales/Items del Presupuesto
Almacena los materiales/productos incluidos en cada presupuesto.

| Columna | Tipo | Descripción | Restricciones |
|---------|------|-------------|---------------|
| `id` | UUID | Identificador único | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `budget_id` | UUID | Referencia al presupuesto | FOREIGN KEY → budgets(id) ON DELETE CASCADE |
| `product_id` | UUID | Referencia al producto (opcional) | FOREIGN KEY → products(id) ON DELETE SET NULL |
| `order_index` | INTEGER | Orden del material | NOT NULL |
| `description` | TEXT | Descripción | NOT NULL |
| `manufacturer` | VARCHAR(200) | Fabricante | |
| `quantity` | DECIMAL(10,2) | Cantidad | NOT NULL, CHECK (quantity > 0) |
| `unit_price` | DECIMAL(10,2) | Precio unitario | NOT NULL, CHECK (unit_price >= 0) |
| `total_price` | DECIMAL(10,2) | Precio total (quantity × unit_price) | NOT NULL |
| `created_at` | TIMESTAMP | Fecha de creación | DEFAULT NOW() |

---

#### 6. **`budget_additional_lines`** - Líneas Adicionales (Descuentos, Extras)
Almacena descuentos, gastos adicionales, etc.

| Columna | Tipo | Descripción | Restricciones |
|---------|------|-------------|---------------|
| `id` | UUID | Identificador único | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `budget_id` | UUID | Referencia al presupuesto | FOREIGN KEY → budgets(id) ON DELETE CASCADE |
| `concept` | VARCHAR(255) | Concepto (Descuento, Extra, etc.) | NOT NULL |
| `amount` | DECIMAL(10,2) | Importe (puede ser negativo) | NOT NULL |
| `order_index` | INTEGER | Orden de visualización | NOT NULL |
| `created_at` | TIMESTAMP | Fecha de creación | DEFAULT NOW() |

---

#### 7. **`general_conditions`** - Condiciones Generales
Almacena plantillas de condiciones generales reutilizables.

| Columna | Tipo | Descripción | Restricciones |
|---------|------|-------------|---------------|
| `id` | UUID | Identificador único | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `name` | VARCHAR(100) | Nombre de la plantilla | NOT NULL |
| `content` | TEXT | Contenido de las condiciones | NOT NULL |
| `is_default` | BOOLEAN | Si es la plantilla por defecto | DEFAULT false |
| `created_at` | TIMESTAMP | Fecha de creación | DEFAULT NOW() |
| `updated_at` | TIMESTAMP | Fecha de actualización | DEFAULT NOW() |

---

## Configuración Inicial de Supabase

### Paso 1: Crear Cuenta en Supabase

1. Ve a [supabase.com](https://supabase.com)
2. Haz clic en "Start your project"
3. Regístrate con tu cuenta de GitHub, Google o email
4. Verifica tu email si es necesario

### Paso 2: Crear un Nuevo Proyecto

1. En el dashboard, haz clic en "New Project"
2. Selecciona tu organización (o crea una nueva)
3. Completa la información:
   - **Name**: `easy-budgets` (o el nombre que prefieras)
   - **Database Password**: Genera una contraseña segura (¡guárdala!)
   - **Region**: Selecciona la más cercana a España (ej: `West EU (London)`)
   - **Pricing Plan**: Free (suficiente para empezar)
4. Haz clic en "Create new project"
5. Espera 1-2 minutos mientras se crea el proyecto

### Paso 3: Obtener las Credenciales

Una vez creado el proyecto:

1. Ve a **Settings** (⚙️) → **API**
2. Copia y guarda estos valores:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

---

## Creación de Tablas

### Opción 1: Usando el Editor SQL de Supabase (Recomendado)

1. Ve a **SQL Editor** en el menú lateral
2. Haz clic en "New Query"
3. Copia y pega el siguiente script SQL:

```sql
-- Habilitar la extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. TABLA: Products
-- ============================================
CREATE TABLE Products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference VARCHAR(100) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    manufacturer VARCHAR(200),
    unitPrice DECIMAL(10,2) NOT NULL CHECK (unitPrice >= 0),
    category VARCHAR(100),
    imageUrl TEXT,
    link TEXT,
    isActive BOOLEAN DEFAULT true,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_Products_reference ON Products(reference);
CREATE INDEX idx_Products_category ON Products(category);
CREATE INDEX idx_Products_isActive ON Products(isActive);

-- ============================================
-- 2. TABLA: Customers
-- ============================================
CREATE TABLE Customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    postalCode VARCHAR(20),
    taxId VARCHAR(50),
    notes TEXT,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_Customers_name ON Customers(name);
CREATE INDEX idx_Customers_email ON Customers(email);

-- ============================================
-- 3. TABLA: Budgets
-- ============================================
CREATE TABLE Budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    budgetNumber VARCHAR(50) UNIQUE NOT NULL,
    customerId UUID REFERENCES Customers(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'archived')),
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    taxPercentage DECIMAL(5,2) DEFAULT 21.00,
    taxAmount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    validUntil DATE,
    notes TEXT,
    pdfUrl TEXT,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_Budgets_customerId ON Budgets(customerId);
CREATE INDEX idx_Budgets_status ON Budgets(status);
CREATE INDEX idx_Budgets_budgetNumber ON Budgets(budgetNumber);
CREATE INDEX idx_Budgets_createdAt ON Budgets(createdAt DESC);

-- ============================================
-- 4. TABLA: BudgetTextBlocks
-- ============================================
CREATE TABLE BudgetTextBlocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    budgetId UUID NOT NULL REFERENCES Budgets(id) ON DELETE CASCADE,
    orderIndex INTEGER NOT NULL,
    heading VARCHAR(255),
    content JSONB,
    link TEXT,
    imageUrl TEXT,
    subtotal DECIMAL(10,2) DEFAULT 0,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_BudgetTextBlocks_budgetId ON BudgetTextBlocks(budgetId);
CREATE INDEX idx_BudgetTextBlocks_orderIndex ON BudgetTextBlocks(budgetId, orderIndex);

-- ============================================
-- 5. TABLA: BudgetMaterials
-- ============================================
CREATE TABLE BudgetMaterials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    budgetId UUID NOT NULL REFERENCES Budgets(id) ON DELETE CASCADE,
    productId UUID REFERENCES Products(id) ON DELETE SET NULL,
    orderIndex INTEGER NOT NULL,
    description TEXT NOT NULL,
    manufacturer VARCHAR(200),
    quantity DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
    unitPrice DECIMAL(10,2) NOT NULL CHECK (unitPrice >= 0),
    totalPrice DECIMAL(10,2) NOT NULL,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_BudgetMaterials_budgetId ON BudgetMaterials(budgetId);
CREATE INDEX idx_BudgetMaterials_productId ON BudgetMaterials(productId);
CREATE INDEX idx_BudgetMaterials_orderIndex ON BudgetMaterials(budgetId, orderIndex);

-- ============================================
-- 6. TABLA: BudgetAdditionalLines
-- ============================================
CREATE TABLE BudgetAdditionalLines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    budgetId UUID NOT NULL REFERENCES Budgets(id) ON DELETE CASCADE,
    concept VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    orderIndex INTEGER NOT NULL,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_BudgetAdditionalLines_budgetId ON BudgetAdditionalLines(budgetId);

-- ============================================
-- 7. TABLA: GeneralConditions
-- ============================================
CREATE TABLE GeneralConditions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    isDefault BOOLEAN DEFAULT false,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TRIGGERS para updatedAt automático
-- ============================================
CREATE OR REPLACE FUNCTION updateUpdatedAtColumn()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updatedAt = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_Products_updatedAt BEFORE UPDATE ON Products
    FOR EACH ROW EXECUTE FUNCTION updateUpdatedAtColumn();

CREATE TRIGGER update_Customers_updatedAt BEFORE UPDATE ON Customers
    FOR EACH ROW EXECUTE FUNCTION updateUpdatedAtColumn();

CREATE TRIGGER update_Budgets_updatedAt BEFORE UPDATE ON Budgets
    FOR EACH ROW EXECUTE FUNCTION updateUpdatedAtColumn();

CREATE TRIGGER update_GeneralConditions_updatedAt BEFORE UPDATE ON GeneralConditions
    FOR EACH ROW EXECUTE FUNCTION updateUpdatedAtColumn();

-- ============================================
-- DATOS DE EJEMPLO (Opcional)
-- ============================================

-- Insertar algunas condiciones generales por defecto
INSERT INTO GeneralConditions (name, content, isDefault) VALUES
('Condiciones Estándar', 
'1. Los precios incluyen IVA.
2. El presupuesto es válido por 30 días.
3. Forma de pago: 50% al inicio, 50% a la finalización.
4. Los materiales especificados pueden variar según disponibilidad.', 
true);

-- Insertar algunos productos de ejemplo
INSERT INTO Products (reference, description, manufacturer, unitPrice, category) VALUES
('REF-001', 'Mueble de cocina bajo 80cm', 'Fabricante A', 250.00, 'Cocina'),
('REF-002', 'Encimera granito 200x60cm', 'Fabricante B', 450.00, 'Cocina'),
('REF-003', 'Lavabo porcelana 60cm', 'Fabricante C', 180.00, 'Baño'),
('REF-004', 'Grifo monomando cromo', 'Fabricante A', 95.00, 'Baño');
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
