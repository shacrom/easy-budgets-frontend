import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { SupabaseService } from './supabase.service';
import { environment } from '../../environments/environment';

// Helper function to create mock objects with vi.fn()
function createVitestMock(methods: string[]): any {
  const mock: any = {};
  methods.forEach(method => {
    mock[method] = vi.fn();
  });
  return mock;
}

describe('SupabaseService', () => {
  let service: SupabaseService;
  let supabaseMock: any;
  let queryBuilderMock: any;
  let storageFileApiMock: any;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SupabaseService);

    // Mock Query Builder
    queryBuilderMock = {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
      limit: vi.fn(),
      or: vi.fn(),
      _mockResponse: { data: [], error: null },
      then: function(resolve: any, reject: any) {
        return Promise.resolve(this._mockResponse).then(resolve, reject);
      }
    };

    // Default behavior: return self for chaining
    queryBuilderMock.select.mockReturnValue(queryBuilderMock);
    queryBuilderMock.insert.mockReturnValue(queryBuilderMock);
    queryBuilderMock.update.mockReturnValue(queryBuilderMock);
    queryBuilderMock.delete.mockReturnValue(queryBuilderMock);
    queryBuilderMock.upsert.mockReturnValue(queryBuilderMock);
    queryBuilderMock.eq.mockReturnValue(queryBuilderMock);
    queryBuilderMock.order.mockReturnValue(queryBuilderMock);
    queryBuilderMock.limit.mockReturnValue(queryBuilderMock);
    queryBuilderMock.or.mockReturnValue(queryBuilderMock);
    queryBuilderMock.single.mockReturnValue(Promise.resolve({ data: {}, error: null }));
    queryBuilderMock.maybeSingle.mockReturnValue(Promise.resolve({ data: {}, error: null }));

    // Mock Storage
    storageFileApiMock = {
      upload: vi.fn(),
      getPublicUrl: vi.fn()
    };

    // Mock Supabase Client
    supabaseMock = {
      from: vi.fn().mockReturnValue(queryBuilderMock),
      storage: {
        from: vi.fn().mockReturnValue(storageFileApiMock)
      }
    };

    // Inject mock
    (service as any).supabase = supabaseMock;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Products', () => {
    it('should get products', async () => {
      const mockProducts = [
        { id: 1, reference: 'REF1', description: 'Desc 1', unitPrice: 100, isActive: true }
      ];
      queryBuilderMock._mockResponse = { data: mockProducts, error: null };

      const products = await service.getProducts();

      expect(supabaseMock.from).toHaveBeenCalledWith('Products');
      expect(queryBuilderMock.select).toHaveBeenCalledWith('*');
      expect(queryBuilderMock.eq).toHaveBeenCalledWith('isActive', true);
      expect(queryBuilderMock.order).toHaveBeenCalledWith('description');
      expect(products.length).toBe(1);
      expect(products[0].reference).toBe('REF1');
    });

    it('should get product by reference', async () => {
      const mockProduct = { id: 1, reference: 'REF1' };
      queryBuilderMock.single.mockReturnValue(Promise.resolve({ data: mockProduct, error: null }));

      const product = await service.getProductByReference('REF1');

      expect(supabaseMock.from).toHaveBeenCalledWith('Products');
      expect(queryBuilderMock.eq).toHaveBeenCalledWith('reference', 'REF1');
      expect(queryBuilderMock.single).toHaveBeenCalled();
      expect(product).toEqual(mockProduct);
    });

    it('should create product', async () => {
      const newProduct = { reference: 'REF2', basePrice: 200 };
      const createdProduct = { id: 2, reference: 'REF2', unitPrice: 200, vatRate: 21, isActive: true };
      queryBuilderMock.single.mockReturnValue(Promise.resolve({ data: createdProduct, error: null }));

      const result = await service.createProduct(newProduct);

      expect(supabaseMock.from).toHaveBeenCalledWith('Products');
      expect(queryBuilderMock.insert).toHaveBeenCalled();
      expect(result.basePrice).toBe(200);
    });

    it('should update product', async () => {
      const updates = { basePrice: 300 };
      const updatedProduct = { id: 1, unitPrice: 300 };
      queryBuilderMock.single.mockReturnValue(Promise.resolve({ data: updatedProduct, error: null }));

      const result = await service.updateProduct(1, updates);

      expect(supabaseMock.from).toHaveBeenCalledWith('Products');
      expect(queryBuilderMock.update).toHaveBeenCalled();
      expect(queryBuilderMock.eq).toHaveBeenCalledWith('id', 1);
      expect(result.basePrice).toBe(300);
    });

    it('should delete product', async () => {
      queryBuilderMock._mockResponse = { error: null };

      await service.deleteProduct(1);

      expect(supabaseMock.from).toHaveBeenCalledWith('Products');
      expect(queryBuilderMock.delete).toHaveBeenCalled();
      expect(queryBuilderMock.eq).toHaveBeenCalledWith('id', 1);
    });
  });

  describe('Customers', () => {
    it('should get customers', async () => {
      const mockCustomers = [{ id: 1, name: 'Customer 1' }];
      queryBuilderMock._mockResponse = { data: mockCustomers, error: null };

      const customers = await service.getCustomers();

      expect(supabaseMock.from).toHaveBeenCalledWith('Customers');
      expect(customers.length).toBe(1);
    });

    it('should search customers', async () => {
      const mockCustomers = [{ id: 1, name: 'John Doe' }];
      queryBuilderMock._mockResponse = { data: mockCustomers, error: null };

      const customers = await service.searchCustomers('John');

      expect(supabaseMock.from).toHaveBeenCalledWith('Customers');
      expect(queryBuilderMock.or).toHaveBeenCalled();
      expect(customers.length).toBe(1);
    });

    it('should create customer', async () => {
      const newCustomer = { name: 'New Customer' };
      const createdCustomer = { id: 2, name: 'New Customer' };
      queryBuilderMock.single.mockReturnValue(Promise.resolve({ data: createdCustomer, error: null }));

      const result = await service.createCustomer(newCustomer);

      expect(supabaseMock.from).toHaveBeenCalledWith('Customers');
      expect(queryBuilderMock.insert).toHaveBeenCalledWith([newCustomer]);
      expect(result).toEqual(createdCustomer as any);
    });

    it('should update customer', async () => {
      const updates = { name: 'Updated Name' };
      const updatedCustomer = { id: 1, name: 'Updated Name' };
      queryBuilderMock.single.mockReturnValue(Promise.resolve({ data: updatedCustomer, error: null }));

      const result = await service.updateCustomer(1, updates);

      expect(supabaseMock.from).toHaveBeenCalledWith('Customers');
      expect(queryBuilderMock.update).toHaveBeenCalledWith(updates);
      expect(queryBuilderMock.eq).toHaveBeenCalledWith('id', 1);
      expect(result).toEqual(updatedCustomer as any);
    });

    it('should delete customer', async () => {
      queryBuilderMock._mockResponse = { error: null };

      await service.deleteCustomer(1);

      expect(supabaseMock.from).toHaveBeenCalledWith('Customers');
      expect(queryBuilderMock.delete).toHaveBeenCalled();
      expect(queryBuilderMock.eq).toHaveBeenCalledWith('id', 1);
    });
  });

  describe('Budgets', () => {
    it('should get budgets', async () => {
      const mockBudgets = [{ id: 1, budgetNumber: 'B1', status: 'completed', total: 100 }];
      queryBuilderMock._mockResponse = { data: mockBudgets, error: null };

      const budgets = await service.getBudgets();

      expect(supabaseMock.from).toHaveBeenCalledWith('Budgets');
      expect(budgets.length).toBe(1);
      expect(budgets[0].status).toBe('completed');
    });

    it('should get budget details', async () => {
      const mockBudget = {
        id: 1,
        textBlocks: [],
        materialTables: [],
        additionalLines: [],
        simpleBlock: []
      };
      queryBuilderMock.single.mockReturnValue(Promise.resolve({ data: mockBudget, error: null }));

      const budget = await service.getBudget(1);

      expect(supabaseMock.from).toHaveBeenCalledWith('Budgets');
      expect(queryBuilderMock.eq).toHaveBeenCalledWith('id', 1);
      expect(budget.id).toBe(1);
    });

    it('should update budget totals', async () => {
      const summary = { taxableBase: 100, vatPercentage: 21, vat: 21, grandTotal: 121 };
      queryBuilderMock._mockResponse = { error: null };

      await service.updateBudgetTotals(1, summary as any);

      expect(supabaseMock.from).toHaveBeenCalledWith('Budgets');
      expect(queryBuilderMock.update).toHaveBeenCalledWith({
        taxableBase: 100,
        taxPercentage: 21,
        taxAmount: 21,
        total: 121
      });
    });

    it('should create budget', async () => {
      const newBudget = { title: 'New Budget' };
      const createdBudget = { id: 2, title: 'New Budget' };
      queryBuilderMock.single.mockReturnValue(Promise.resolve({ data: createdBudget, error: null }));

      const result = await service.createBudget(newBudget);

      expect(supabaseMock.from).toHaveBeenCalledWith('Budgets');
      expect(queryBuilderMock.insert).toHaveBeenCalledWith([newBudget]);
      expect(result).toEqual(createdBudget);
    });

    it('should update budget', async () => {
      const updates = { title: 'Updated Budget' };
      const updatedBudget = { id: 1, title: 'Updated Budget' };
      queryBuilderMock.single.mockReturnValue(Promise.resolve({ data: updatedBudget, error: null }));

      const result = await service.updateBudget(1, updates);

      expect(supabaseMock.from).toHaveBeenCalledWith('Budgets');
      expect(queryBuilderMock.update).toHaveBeenCalledWith(updates);
      expect(queryBuilderMock.eq).toHaveBeenCalledWith('id', 1);
      expect(result).toEqual(updatedBudget);
    });

    it('should delete budget', async () => {
      queryBuilderMock._mockResponse = { error: null };

      await service.deleteBudget(1);

      expect(supabaseMock.from).toHaveBeenCalledWith('Budgets');
      expect(queryBuilderMock.delete).toHaveBeenCalled();
      expect(queryBuilderMock.eq).toHaveBeenCalledWith('id', 1);
    });

    it('should duplicate budget', async () => {
      const originalBudget = {
        id: 1,
        budgetNumber: 'BUD-123',
        title: 'Original',
        textBlocks: [{ id: 10, heading: 'Block 1', descriptions: [{ id: 100, title: 'Sec 1' }] }],
        materialTables: [{ id: 20, title: 'Table 1', rows: [{ id: 200, reference: 'Ref 1' }] }],
        additionalLines: [{ id: 30, concept: 'Line 1' }],
        simpleBlock: { id: 40, material: 'Granite' },
        conditions: [],
        customer: { id: 50 }
      };

      // Mock getBudget
      const getBudgetSpy = vi.spyOn(service, 'getBudget').mockReturnValue(Promise.resolve(originalBudget));

      // Mock inserts
      const newBudget = { id: 2, budgetNumber: 'BUD-NEW', title: 'Original (Copia)' };
      const newTextBlock = { id: 11 };
      const newTable = { id: 21 };

      // We need to mock the sequence of Supabase calls
      // 1. insert budget -> returns newBudget
      // 2. insert text block -> returns newTextBlock
      // 3. insert sections -> returns null (error null)
      // 4. insert material tables -> returns newTable
      // 5. insert rows -> returns null
      // 6. insert additional lines -> returns null
      // 7. insert simpleBlock -> returns null

      // Since we use the same spy for all calls, we need to be careful.
      // We can use `callFake` on `insert` to return different values based on the table name?
      // But `insert` is called on the builder returned by `from(table)`.

      // Let's mock `from` to return different builders based on table name.
      const budgetBuilder = createVitestMock(['insert', 'select', 'single', 'then']);
      budgetBuilder.insert.mockReturnValue(budgetBuilder);
      budgetBuilder.select.mockReturnValue(budgetBuilder);
      budgetBuilder.single.mockReturnValue(Promise.resolve({ data: newBudget, error: null }));

      const textBlockBuilder = createVitestMock(['insert', 'select', 'single', 'then']);
      textBlockBuilder.insert.mockReturnValue(textBlockBuilder);
      textBlockBuilder.select.mockReturnValue(textBlockBuilder);
      textBlockBuilder.single.mockReturnValue(Promise.resolve({ data: newTextBlock, error: null }));

      const sectionBuilder = createVitestMock(['insert', 'then']);
      sectionBuilder.insert.mockReturnValue(Promise.resolve({ error: null }));

      const tableBuilder = createVitestMock(['insert', 'select', 'single', 'then']);
      tableBuilder.insert.mockReturnValue(tableBuilder);
      tableBuilder.select.mockReturnValue(tableBuilder);
      tableBuilder.single.mockReturnValue(Promise.resolve({ data: newTable, error: null }));

      const rowBuilder = createVitestMock(['insert', 'then']);
      rowBuilder.insert.mockReturnValue(Promise.resolve({ error: null }));

      const lineBuilder = createVitestMock(['insert', 'then']);
      lineBuilder.insert.mockReturnValue(Promise.resolve({ error: null }));

      const simpleBlockBuilder = createVitestMock(['insert', 'then']);
      simpleBlockBuilder.insert.mockReturnValue(Promise.resolve({ error: null }));

      supabaseMock.from.mockImplementation((table: string) => {
        switch (table) {
          case 'Budgets': return budgetBuilder;
          case 'BudgetTextBlocks': return textBlockBuilder;
          case 'BudgetTextBlockSections': return sectionBuilder;
          case 'BudgetMaterialTables': return tableBuilder;
          case 'BudgetMaterialTableRows': return rowBuilder;
          case 'BudgetAdditionalLines': return lineBuilder;
          case 'BudgetSimpleBlocks': return simpleBlockBuilder;
          default: return queryBuilderMock;
        }
      });

      const result = await service.duplicateBudget(1);

      expect(getBudgetSpy).toHaveBeenCalledWith(1);
      expect(supabaseMock.from).toHaveBeenCalledWith('Budgets');
      expect(budgetBuilder.insert).toHaveBeenCalled();
      expect(supabaseMock.from).toHaveBeenCalledWith('BudgetTextBlocks');
      expect(supabaseMock.from).toHaveBeenCalledWith('BudgetMaterialTables');
      expect(result).toEqual(newBudget);
    });

    it('should duplicate budget with conditions', async () => {
      const originalBudget = {
        id: 1,
        budgetNumber: 'BUD-123',
        title: 'Original',
        textBlocks: [],
        materialTables: [],
        additionalLines: [],
        simpleBlock: null,
        conditions: [
          { id: 1, title: 'Condición 1', text: 'Texto condición 1', orderIndex: 0 },
          { id: 2, title: 'Condición 2', text: 'Texto condición 2', orderIndex: 1 }
        ],
        customer: null
      };

      vi.spyOn(service, 'getBudget').mockReturnValue(Promise.resolve(originalBudget));

      const newBudget = { id: 2, budgetNumber: 'BUD-NEW', title: 'Original (Copia)' };

      const budgetBuilder = createVitestMock(['insert', 'select', 'single']);
      budgetBuilder.insert.mockReturnValue(budgetBuilder);
      budgetBuilder.select.mockReturnValue(budgetBuilder);
      budgetBuilder.single.mockReturnValue(Promise.resolve({ data: newBudget, error: null }));

      const conditionsBuilder = createVitestMock(['insert']);
      conditionsBuilder.insert.mockReturnValue(Promise.resolve({ error: null }));

      supabaseMock.from.mockImplementation((table: string) => {
        switch (table) {
          case 'Budgets': return budgetBuilder;
          case 'BudgetConditions': return conditionsBuilder;
          default: return queryBuilderMock;
        }
      });

      const result = await service.duplicateBudget(1);

      expect(supabaseMock.from).toHaveBeenCalledWith('Budgets');
      expect(supabaseMock.from).toHaveBeenCalledWith('BudgetConditions');
      expect(conditionsBuilder.insert).toHaveBeenCalledWith([
        { budgetId: 2, title: 'Condición 1', content: 'Texto condición 1', orderIndex: 0 },
        { budgetId: 2, title: 'Condición 2', content: 'Texto condición 2', orderIndex: 1 }
      ]);
      expect(result).toEqual(newBudget);
    });

    it('should duplicate budget without conditions when conditions array is empty', async () => {
      const originalBudget = {
        id: 1,
        budgetNumber: 'BUD-123',
        title: 'Original',
        textBlocks: [],
        materialTables: [],
        additionalLines: [],
        simpleBlock: null,
        conditions: [],
        customer: null
      };

      vi.spyOn(service, 'getBudget').mockReturnValue(Promise.resolve(originalBudget));

      const newBudget = { id: 2, budgetNumber: 'BUD-NEW', title: 'Original (Copia)' };

      const budgetBuilder = createVitestMock(['insert', 'select', 'single']);
      budgetBuilder.insert.mockReturnValue(budgetBuilder);
      budgetBuilder.select.mockReturnValue(budgetBuilder);
      budgetBuilder.single.mockReturnValue(Promise.resolve({ data: newBudget, error: null }));

      supabaseMock.from.mockImplementation((table: string) => {
        if (table === 'Budgets') return budgetBuilder;
        return queryBuilderMock;
      });

      const result = await service.duplicateBudget(1);

      expect(supabaseMock.from).toHaveBeenCalledWith('Budgets');
      expect(supabaseMock.from).not.toHaveBeenCalledWith('BudgetConditions');
      expect(result).toEqual(newBudget);
    });

    it('should duplicate budget with all related data', async () => {
      const originalBudget = {
        id: 1,
        budgetNumber: 'BUD-001',
        title: 'Presupuesto Completo',
        customerId: 10,
        status: 'completed',
        validUntil: '2025-12-31',
        showTextBlocks: true,
        showMaterials: true,
        showSimpleBlock: true,
        showConditions: true,
        materialsSectionTitle: 'Materiales',
        textBlocks: [
          { id: 10, heading: 'Bloque 1', orderIndex: 0, descriptions: [{ id: 100, title: 'Sección 1', text: 'Texto 1' }] }
        ],
        materialTables: [
          { id: 20, title: 'Tabla 1', orderIndex: 0, rows: [{ id: 200, reference: 'REF-001', quantity: 2 }] }
        ],
        additionalLines: [
          { id: 30, concept: 'Descuento', amount: -100, isSubtotal: false }
        ],
        simpleBlock: { id: 40, material: 'Mármol', sectionTitle: 'Encimera' },
        conditions: [
          { id: 50, title: 'Garantía', text: '2 años de garantía', orderIndex: 0 }
        ],
        customer: { id: 10, name: 'Cliente Test' }
      };

      vi.spyOn(service, 'getBudget').mockReturnValue(Promise.resolve(originalBudget));

      const newBudget = { id: 2 };
      const newTextBlock = { id: 11 };
      const newTable = { id: 21 };

      const budgetBuilder = createVitestMock(['insert', 'select', 'single']);
      budgetBuilder.insert.mockReturnValue(budgetBuilder);
      budgetBuilder.select.mockReturnValue(budgetBuilder);
      budgetBuilder.single.mockReturnValue(Promise.resolve({ data: newBudget, error: null }));

      const textBlockBuilder = createVitestMock(['insert', 'select', 'single']);
      textBlockBuilder.insert.mockReturnValue(textBlockBuilder);
      textBlockBuilder.select.mockReturnValue(textBlockBuilder);
      textBlockBuilder.single.mockReturnValue(Promise.resolve({ data: newTextBlock, error: null }));

      const sectionBuilder = createVitestMock(['insert']);
      sectionBuilder.insert.mockReturnValue(Promise.resolve({ error: null }));

      const tableBuilder = createVitestMock(['insert', 'select', 'single']);
      tableBuilder.insert.mockReturnValue(tableBuilder);
      tableBuilder.select.mockReturnValue(tableBuilder);
      tableBuilder.single.mockReturnValue(Promise.resolve({ data: newTable, error: null }));

      const rowBuilder = createVitestMock(['insert']);
      rowBuilder.insert.mockReturnValue(Promise.resolve({ error: null }));

      const lineBuilder = createVitestMock(['insert']);
      lineBuilder.insert.mockReturnValue(Promise.resolve({ error: null }));

      const simpleBlockBuilder = createVitestMock(['insert']);
      simpleBlockBuilder.insert.mockReturnValue(Promise.resolve({ error: null }));

      const conditionsBuilder = createVitestMock(['insert']);
      conditionsBuilder.insert.mockReturnValue(Promise.resolve({ error: null }));

      supabaseMock.from.mockImplementation((table: string) => {
        switch (table) {
          case 'Budgets': return budgetBuilder;
          case 'BudgetTextBlocks': return textBlockBuilder;
          case 'BudgetTextBlockSections': return sectionBuilder;
          case 'BudgetMaterialTables': return tableBuilder;
          case 'BudgetMaterialTableRows': return rowBuilder;
          case 'BudgetAdditionalLines': return lineBuilder;
          case 'BudgetSimpleBlocks': return simpleBlockBuilder;
          case 'BudgetConditions': return conditionsBuilder;
          default: return queryBuilderMock;
        }
      });

      const result = await service.duplicateBudget(1);

      // Verify all tables were called
      expect(supabaseMock.from).toHaveBeenCalledWith('Budgets');
      expect(supabaseMock.from).toHaveBeenCalledWith('BudgetTextBlocks');
      expect(supabaseMock.from).toHaveBeenCalledWith('BudgetTextBlockSections');
      expect(supabaseMock.from).toHaveBeenCalledWith('BudgetMaterialTables');
      expect(supabaseMock.from).toHaveBeenCalledWith('BudgetMaterialTableRows');
      expect(supabaseMock.from).toHaveBeenCalledWith('BudgetAdditionalLines');
      expect(supabaseMock.from).toHaveBeenCalledWith('BudgetSimpleBlocks');
      expect(supabaseMock.from).toHaveBeenCalledWith('BudgetConditions');

      // Verify budget insert doesn't include relation fields
      const budgetInsertCall = budgetBuilder.insert.mock.calls[budgetBuilder.insert.mock.calls.length - 1][0][0];
      expect(budgetInsertCall.conditions).toBeUndefined();
      expect(budgetInsertCall.textBlocks).toBeUndefined();
      expect(budgetInsertCall.materialTables).toBeUndefined();
      expect(budgetInsertCall.additionalLines).toBeUndefined();
      expect(budgetInsertCall.simpleBlock).toBeUndefined();
      expect(budgetInsertCall.customer).toBeUndefined();

      expect(result).toEqual(newBudget);
    });

    it('should not include conditions field in duplicated budget payload', async () => {
      const originalBudget = {
        id: 1,
        budgetNumber: 'BUD-123',
        title: 'Original',
        textBlocks: [],
        materialTables: [],
        additionalLines: [],
        simpleBlock: null,
        conditions: [{ id: 1, title: 'Test', text: 'Test text', orderIndex: 0 }],
        customer: null
      };

      vi.spyOn(service, 'getBudget').mockReturnValue(Promise.resolve(originalBudget));

      const newBudget = { id: 2 };

      const budgetBuilder = createVitestMock(['insert', 'select', 'single']);
      budgetBuilder.insert.mockReturnValue(budgetBuilder);
      budgetBuilder.select.mockReturnValue(budgetBuilder);
      budgetBuilder.single.mockReturnValue(Promise.resolve({ data: newBudget, error: null }));

      const conditionsBuilder = createVitestMock(['insert']);
      conditionsBuilder.insert.mockReturnValue(Promise.resolve({ error: null }));

      supabaseMock.from.mockImplementation((table: string) => {
        switch (table) {
          case 'Budgets': return budgetBuilder;
          case 'BudgetConditions': return conditionsBuilder;
          default: return queryBuilderMock;
        }
      });

      await service.duplicateBudget(1);

      // The crucial test: verify the budget insert payload does NOT contain 'conditions'
      const insertPayload = budgetBuilder.insert.mock.calls[budgetBuilder.insert.mock.calls.length - 1][0][0];
      expect(insertPayload.hasOwnProperty('conditions')).toBe(false);
    });
  });

  describe('Materials', () => {
    it('should save material tables', async () => {
      const tables = [{
        title: 'Table 1',
        rows: [{ reference: 'Ref 1', quantity: 1, unitPrice: 10 }]
      }];

      const tablesBuilder = createVitestMock(['delete', 'eq', 'insert', 'select', 'then']);
      tablesBuilder.delete.mockReturnValue(tablesBuilder);
      tablesBuilder.eq.mockReturnValue(tablesBuilder);
      tablesBuilder.insert.mockReturnValue(tablesBuilder);
      tablesBuilder.select.mockReturnValue(tablesBuilder);

      let tablesCallCount = 0;
      tablesBuilder.then = (resolve: any) => {
        tablesCallCount++;
        if (tablesCallCount === 1) {
           return Promise.resolve({ error: null }).then(resolve);
        } else {
           return Promise.resolve({ data: [{ id: 10 }], error: null }).then(resolve);
        }
      };

      const rowsBuilder = createVitestMock(['insert', 'select', 'then']);
      rowsBuilder.insert.mockReturnValue(rowsBuilder);
      rowsBuilder.select.mockReturnValue(rowsBuilder);
      rowsBuilder.then = (resolve: any) => Promise.resolve({ data: [{ id: 100 }], error: null }).then(resolve);

      supabaseMock.from.mockImplementation((table: string) => {
        if (table === 'BudgetMaterialTables') return tablesBuilder;
        if (table === 'BudgetMaterialTableRows') return rowsBuilder;
        return queryBuilderMock;
      });

      const result = await service.saveMaterialTables(1, tables as any);

      expect(supabaseMock.from).toHaveBeenCalledWith('BudgetMaterialTables');
      expect(tablesBuilder.delete).toHaveBeenCalled();
      expect(tablesBuilder.insert).toHaveBeenCalled();
      expect(supabaseMock.from).toHaveBeenCalledWith('BudgetMaterialTableRows');
      expect(rowsBuilder.insert).toHaveBeenCalled();
      expect(result).toEqual({ tables: [{ id: 10 }], rows: [{ id: 100 }] });
    });
  });

  describe('Text Blocks', () => {
    it('should get text blocks for budget', async () => {
      const mockBlocks = [{ id: 1, heading: 'Block 1', descriptions: [] }];
      queryBuilderMock._mockResponse = { data: mockBlocks, error: null };

      const blocks = await service.getTextBlocksForBudget(1);

      expect(supabaseMock.from).toHaveBeenCalledWith('BudgetTextBlocks');
      expect(queryBuilderMock.eq).toHaveBeenCalledWith('budgetId', 1);
      expect(blocks.length).toBe(1);
    });

    it('should add text block', async () => {
      const newBlock = { budgetId: 1, heading: 'New Block' };
      const createdBlock = { id: 2, ...newBlock };
      queryBuilderMock.single.mockReturnValue(Promise.resolve({ data: createdBlock, error: null }));

      const result = await service.addTextBlockToBudget(newBlock);

      expect(supabaseMock.from).toHaveBeenCalledWith('BudgetTextBlocks');
      expect(queryBuilderMock.insert).toHaveBeenCalled();
      expect(result).toEqual(createdBlock);
    });

    it('should update text block', async () => {
      const updates = { heading: 'Updated Block' };
      const updatedBlock = { id: 1, ...updates };
      queryBuilderMock.single.mockReturnValue(Promise.resolve({ data: updatedBlock, error: null }));

      const result = await service.updateBudgetTextBlock(1, updates);

      expect(supabaseMock.from).toHaveBeenCalledWith('BudgetTextBlocks');
      expect(queryBuilderMock.update).toHaveBeenCalled();
      expect(result).toEqual(updatedBlock);
    });

    it('should delete text block', async () => {
      queryBuilderMock._mockResponse = { error: null };

      await service.deleteBudgetTextBlock(1);

      expect(supabaseMock.from).toHaveBeenCalledWith('BudgetTextBlocks');
      expect(queryBuilderMock.delete).toHaveBeenCalled();
    });
  });

  describe('Text Block Sections', () => {
    it('should add section', async () => {
      const newSection = { textBlockId: 1, title: 'Section' };
      const createdSection = { id: 2, ...newSection };
      queryBuilderMock.single.mockReturnValue(Promise.resolve({ data: createdSection, error: null }));

      const result = await service.addSectionToTextBlock(newSection);

      expect(supabaseMock.from).toHaveBeenCalledWith('BudgetTextBlockSections');
      expect(queryBuilderMock.insert).toHaveBeenCalled();
      expect(result).toEqual(createdSection);
    });

    it('should update section', async () => {
      const updates = { title: 'Updated Section' };
      const updatedSection = { id: 1, ...updates };
      queryBuilderMock.single.mockReturnValue(Promise.resolve({ data: updatedSection, error: null }));

      const result = await service.updateTextBlockSection(1, updates);

      expect(supabaseMock.from).toHaveBeenCalledWith('BudgetTextBlockSections');
      expect(queryBuilderMock.update).toHaveBeenCalled();
      expect(result).toEqual(updatedSection);
    });

    it('should delete section', async () => {
      queryBuilderMock._mockResponse = { error: null };

      await service.deleteTextBlockSection(1);

      expect(supabaseMock.from).toHaveBeenCalledWith('BudgetTextBlockSections');
      expect(queryBuilderMock.delete).toHaveBeenCalled();
    });

    it('should reorder sections', async () => {
      const sectionIds = [1, 2, 3];
      queryBuilderMock.single.mockReturnValue(Promise.resolve({ data: {}, error: null }));

      await service.reorderTextBlockSections(1, sectionIds);

      expect(supabaseMock.from).toHaveBeenCalledWith('BudgetTextBlockSections');
      expect(queryBuilderMock.update).toHaveBeenCalledTimes(3);
    });
  });

  describe('Additional Lines', () => {
    it('should add additional line', async () => {
      const newLine = { budgetId: 1, concept: 'Line' };
      const createdLine = { id: 2, ...newLine };
      queryBuilderMock.single.mockReturnValue(Promise.resolve({ data: createdLine, error: null }));

      const result = await service.addAdditionalLineToBudget(newLine);

      expect(supabaseMock.from).toHaveBeenCalledWith('BudgetAdditionalLines');
      expect(queryBuilderMock.insert).toHaveBeenCalled();
      expect(result).toEqual(createdLine);
    });

    it('should update additional line', async () => {
      const updates = { concept: 'Updated Line' };
      const updatedLine = { id: 1, ...updates };
      queryBuilderMock.single.mockReturnValue(Promise.resolve({ data: updatedLine, error: null }));

      const result = await service.updateBudgetAdditionalLine(1, updates);

      expect(supabaseMock.from).toHaveBeenCalledWith('BudgetAdditionalLines');
      expect(queryBuilderMock.update).toHaveBeenCalled();
      expect(result).toEqual(updatedLine);
    });

    it('should delete additional line', async () => {
      queryBuilderMock._mockResponse = { error: null };

      await service.deleteBudgetAdditionalLine(1);

      expect(supabaseMock.from).toHaveBeenCalledWith('BudgetAdditionalLines');
      expect(queryBuilderMock.delete).toHaveBeenCalled();
    });

    it('should save additional lines', async () => {
      const lines = [{ concept: 'Line 1' }];

      // Mock delete
      const deleteBuilder = createVitestMock(['delete', 'eq', 'then']);
      deleteBuilder.delete.mockReturnValue(deleteBuilder);
      deleteBuilder.eq.mockReturnValue(deleteBuilder);
      deleteBuilder.then = (resolve: any) => Promise.resolve({ error: null }).then(resolve);

      // Mock insert
      const insertBuilder = createVitestMock(['insert', 'then']);
      insertBuilder.insert.mockReturnValue(Promise.resolve({ error: null }));

      supabaseMock.from.mockReturnValueOnce(deleteBuilder).mockReturnValueOnce(insertBuilder);

      await service.saveAdditionalLines(1, lines);

      expect(supabaseMock.from).toHaveBeenCalledWith('BudgetAdditionalLines');
      expect(deleteBuilder.delete).toHaveBeenCalled();
      expect(insertBuilder.insert).toHaveBeenCalled();
    });
  });

  describe('General Conditions', () => {
    it('should get general conditions', async () => {
      const mockConditions = [{ id: 1, title: 'Cond 1' }];
      queryBuilderMock._mockResponse = { data: mockConditions, error: null };

      const conditions = await service.getGeneralConditions();

      expect(supabaseMock.from).toHaveBeenCalledWith('GeneralConditions');
      expect(conditions.length).toBe(1);
    });

    it('should get default general conditions', async () => {
      const mockConditions = { id: 1, title: 'Default' };
      queryBuilderMock.single.mockReturnValue(Promise.resolve({ data: mockConditions, error: null }));

      const conditions = await service.getDefaultGeneralConditions();

      expect(supabaseMock.from).toHaveBeenCalledWith('GeneralConditions');
      expect(queryBuilderMock.single).toHaveBeenCalled();
      expect(conditions).toEqual(mockConditions);
    });

    it('should create general conditions', async () => {
      const newConditions = { title: 'New Cond' };
      const createdConditions = { id: 2, ...newConditions };
      queryBuilderMock.single.mockReturnValue(Promise.resolve({ data: createdConditions, error: null }));

      const result = await service.createGeneralConditions(newConditions);

      expect(supabaseMock.from).toHaveBeenCalledWith('GeneralConditions');
      expect(queryBuilderMock.insert).toHaveBeenCalled();
      expect(result).toEqual(createdConditions);
    });

    it('should update general conditions', async () => {
      const updates = { title: 'Updated Cond' };
      const updatedConditions = { id: 1, ...updates };
      queryBuilderMock.single.mockReturnValue(Promise.resolve({ data: updatedConditions, error: null }));

      const result = await service.updateGeneralConditions(1, updates);

      expect(supabaseMock.from).toHaveBeenCalledWith('GeneralConditions');
      expect(queryBuilderMock.update).toHaveBeenCalled();
      expect(result).toEqual(updatedConditions);
    });
  });

  describe('Simple Blocks', () => {
    it('should get simple block for budget', async () => {
      const mockSimpleBlock = { id: 1, material: 'Granite' };
      queryBuilderMock.maybeSingle.mockReturnValue(Promise.resolve({ data: mockSimpleBlock, error: null }));

      const result = await service.getSimpleBlockForBudget(1);

      expect(supabaseMock.from).toHaveBeenCalledWith('BudgetSimpleBlocks');
      expect(queryBuilderMock.eq).toHaveBeenCalledWith('budgetId', 1);
      expect(queryBuilderMock.maybeSingle).toHaveBeenCalled();
      expect(result).toEqual(mockSimpleBlock);
    });

    it('should upsert simple block', async () => {
      const simpleBlock = { budgetId: 1, material: 'Marble' };
      const upsertedSimpleBlock = { id: 1, ...simpleBlock };
      queryBuilderMock.single.mockReturnValue(Promise.resolve({ data: upsertedSimpleBlock, error: null }));

      const result = await service.upsertSimpleBlock(simpleBlock);

      expect(supabaseMock.from).toHaveBeenCalledWith('BudgetSimpleBlocks');
      expect(queryBuilderMock.upsert).toHaveBeenCalledWith(simpleBlock);
      expect(result).toEqual(upsertedSimpleBlock);
    });

    it('should delete simple block', async () => {
      queryBuilderMock._mockResponse = { error: null };

      await service.deleteSimpleBlock(1);

      expect(supabaseMock.from).toHaveBeenCalledWith('BudgetSimpleBlocks');
      expect(queryBuilderMock.delete).toHaveBeenCalled();
      expect(queryBuilderMock.eq).toHaveBeenCalledWith('budgetId', 1);
    });
  });

  describe('Storage', () => {
    it('should throw if bucket is not configured', async () => {
      (service as any).storageBucket = '';
      await expect(service.uploadPublicAsset(new Blob(['']), {})).rejects.toThrow('The Supabase storage bucket is not configured.');
    });

    it('should upload file and return public url', async () => {
      (service as any).storageBucket = 'test-bucket';
      const file = new File(['content'], 'test.png', { type: 'image/png' });
      const mockUrl = 'https://example.com/test.png';

      storageFileApiMock.upload.mockReturnValue(Promise.resolve({ data: { path: 'path/to/file' }, error: null }));
      storageFileApiMock.getPublicUrl.mockReturnValue({ data: { publicUrl: mockUrl } });

      const result = await service.uploadPublicAsset(file, { folder: 'uploads' });

      expect(supabaseMock.storage.from).toHaveBeenCalledWith('test-bucket');
      expect(storageFileApiMock.upload).toHaveBeenCalled();
      expect(storageFileApiMock.getPublicUrl).toHaveBeenCalled();
      expect(result.publicUrl).toBe(mockUrl);
    });

    it('should handle upload error', async () => {
      (service as any).storageBucket = 'test-bucket';
      const error = { message: 'Upload failed' };
      storageFileApiMock.upload.mockReturnValue(Promise.resolve({ data: null, error }));

      await expect(service.uploadPublicAsset(new Blob(['']))).rejects.toEqual(error);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when updating customer with invalid id', async () => {
      await expect(service.updateCustomer(NaN, {})).rejects.toThrow('Invalid customer id');
    });

    it('should throw error when updating budget totals without id', async () => {
      await expect(service.updateBudgetTotals(NaN, {} as any)).rejects.toThrow('Budget ID is required to update totals.');
    });

    it('should throw error when updating budget totals without summary', async () => {
      await expect(service.updateBudgetTotals(1, null as any)).rejects.toThrow('Budget summary is required to update totals.');
    });

    it('should throw error when getting budget with invalid id', async () => {
      await expect(service.getBudget(NaN)).rejects.toThrow('Budget ID is required');
    });

    it('should throw error when updating budget with invalid id', async () => {
      await expect(service.updateBudget(NaN, {})).rejects.toThrow('Invalid budget id');
    });

    it('should throw error when duplicating non-existent budget', async () => {
      vi.spyOn(service, 'getBudget').mockReturnValue(Promise.resolve(null));
      await expect(service.duplicateBudget(1)).rejects.toThrow('Presupuesto no encontrado');
    });

    it('should throw error when updating text block with invalid id', async () => {
      await expect(service.updateBudgetTextBlock(NaN, {})).rejects.toThrow('Invalid text block id');
    });

    it('should throw error when updating text block section with invalid id', async () => {
      await expect(service.updateTextBlockSection(NaN, {})).rejects.toThrow('Invalid section id');
    });

    it('should throw error when saving material tables without budget id', async () => {
      await expect(service.saveMaterialTables(NaN, [])).rejects.toThrow('Budget ID is required');
    });

    it('should throw error when saving additional lines without budget id', async () => {
      await expect(service.saveAdditionalLines(NaN, [])).rejects.toThrow('Budget ID is required to save additional lines.');
    });

    it('should throw error when updating general conditions with invalid id', async () => {
      await expect(service.updateGeneralConditions(NaN, {})).rejects.toThrow('Invalid conditions id');
    });
  });
});


