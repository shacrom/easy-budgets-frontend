import { TestBed } from '@angular/core/testing';
import { SupabaseService } from './supabase.service';
import { environment } from '../../environments/environment';

describe('SupabaseService', () => {
  let service: SupabaseService;
  let supabaseSpy: any;
  let queryBuilderSpy: any;
  let storageFileApiSpy: any;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SupabaseService);

    // Mock Query Builder
    queryBuilderSpy = jasmine.createSpyObj('PostgrestQueryBuilder', [
      'select', 'insert', 'update', 'delete', 'upsert', 'eq', 'order', 'single', 'maybeSingle', 'limit', 'or'
    ]);

    // Default behavior: return self for chaining
    queryBuilderSpy.select.and.returnValue(queryBuilderSpy);
    queryBuilderSpy.insert.and.returnValue(queryBuilderSpy);
    queryBuilderSpy.update.and.returnValue(queryBuilderSpy);
    queryBuilderSpy.delete.and.returnValue(queryBuilderSpy);
    queryBuilderSpy.upsert.and.returnValue(queryBuilderSpy);
    queryBuilderSpy.eq.and.returnValue(queryBuilderSpy);
    queryBuilderSpy.order.and.returnValue(queryBuilderSpy);
    queryBuilderSpy.limit.and.returnValue(queryBuilderSpy);
    queryBuilderSpy.or.and.returnValue(queryBuilderSpy);
    queryBuilderSpy.single.and.returnValue(Promise.resolve({ data: {}, error: null }));
    queryBuilderSpy.maybeSingle.and.returnValue(Promise.resolve({ data: {}, error: null }));

    // Make the builder thenable to simulate await
    // We'll use a property to store the resolved value so we can change it in tests
    (queryBuilderSpy as any)._mockResponse = { data: [], error: null };
    (queryBuilderSpy as any).then = function(resolve: any, reject: any) {
      return Promise.resolve(this._mockResponse).then(resolve, reject);
    };

    // Mock Storage
    storageFileApiSpy = jasmine.createSpyObj('StorageFileApi', ['upload', 'getPublicUrl']);
    const storageBucketSpy = {
      upload: storageFileApiSpy.upload,
      getPublicUrl: storageFileApiSpy.getPublicUrl
    };

    // Mock Supabase Client
    supabaseSpy = jasmine.createSpyObj('SupabaseClient', ['from', 'storage']);
    supabaseSpy.from.and.returnValue(queryBuilderSpy);
    supabaseSpy.storage = {
      from: jasmine.createSpy('from').and.returnValue(storageFileApiSpy)
    };

    // Inject spy
    (service as any).supabase = supabaseSpy;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Products', () => {
    it('should get products', async () => {
      const mockProducts = [
        { id: 1, reference: 'REF1', description: 'Desc 1', unitPrice: 100, isActive: true }
      ];
      queryBuilderSpy._mockResponse = { data: mockProducts, error: null };

      const products = await service.getProducts();

      expect(supabaseSpy.from).toHaveBeenCalledWith('Products');
      expect(queryBuilderSpy.select).toHaveBeenCalledWith('*');
      expect(queryBuilderSpy.eq).toHaveBeenCalledWith('isActive', true);
      expect(queryBuilderSpy.order).toHaveBeenCalledWith('description');
      expect(products.length).toBe(1);
      expect(products[0].reference).toBe('REF1');
    });

    it('should get product by reference', async () => {
      const mockProduct = { id: 1, reference: 'REF1' };
      queryBuilderSpy.single.and.returnValue(Promise.resolve({ data: mockProduct, error: null }));

      const product = await service.getProductByReference('REF1');

      expect(supabaseSpy.from).toHaveBeenCalledWith('Products');
      expect(queryBuilderSpy.eq).toHaveBeenCalledWith('reference', 'REF1');
      expect(queryBuilderSpy.single).toHaveBeenCalled();
      expect(product).toEqual(mockProduct);
    });

    it('should create product', async () => {
      const newProduct = { reference: 'REF2', basePrice: 200 };
      const createdProduct = { id: 2, reference: 'REF2', unitPrice: 200, vatRate: 21, isActive: true };
      queryBuilderSpy.single.and.returnValue(Promise.resolve({ data: createdProduct, error: null }));

      const result = await service.createProduct(newProduct);

      expect(supabaseSpy.from).toHaveBeenCalledWith('Products');
      expect(queryBuilderSpy.insert).toHaveBeenCalled();
      expect(result.basePrice).toBe(200);
    });

    it('should update product', async () => {
      const updates = { basePrice: 300 };
      const updatedProduct = { id: 1, unitPrice: 300 };
      queryBuilderSpy.single.and.returnValue(Promise.resolve({ data: updatedProduct, error: null }));

      const result = await service.updateProduct(1, updates);

      expect(supabaseSpy.from).toHaveBeenCalledWith('Products');
      expect(queryBuilderSpy.update).toHaveBeenCalled();
      expect(queryBuilderSpy.eq).toHaveBeenCalledWith('id', 1);
      expect(result.basePrice).toBe(300);
    });

    it('should delete product', async () => {
      queryBuilderSpy._mockResponse = { error: null };

      await service.deleteProduct(1);

      expect(supabaseSpy.from).toHaveBeenCalledWith('Products');
      expect(queryBuilderSpy.delete).toHaveBeenCalled();
      expect(queryBuilderSpy.eq).toHaveBeenCalledWith('id', 1);
    });
  });

  describe('Customers', () => {
    it('should get customers', async () => {
      const mockCustomers = [{ id: 1, name: 'Customer 1' }];
      queryBuilderSpy._mockResponse = { data: mockCustomers, error: null };

      const customers = await service.getCustomers();

      expect(supabaseSpy.from).toHaveBeenCalledWith('Customers');
      expect(customers.length).toBe(1);
    });

    it('should search customers', async () => {
      const mockCustomers = [{ id: 1, name: 'John Doe' }];
      queryBuilderSpy._mockResponse = { data: mockCustomers, error: null };

      const customers = await service.searchCustomers('John');

      expect(supabaseSpy.from).toHaveBeenCalledWith('Customers');
      expect(queryBuilderSpy.or).toHaveBeenCalled();
      expect(customers.length).toBe(1);
    });

    it('should create customer', async () => {
      const newCustomer = { name: 'New Customer' };
      const createdCustomer = { id: 2, name: 'New Customer' };
      queryBuilderSpy.single.and.returnValue(Promise.resolve({ data: createdCustomer, error: null }));

      const result = await service.createCustomer(newCustomer);

      expect(supabaseSpy.from).toHaveBeenCalledWith('Customers');
      expect(queryBuilderSpy.insert).toHaveBeenCalledWith([newCustomer]);
      expect(result).toEqual(createdCustomer as any);
    });

    it('should update customer', async () => {
      const updates = { name: 'Updated Name' };
      const updatedCustomer = { id: 1, name: 'Updated Name' };
      queryBuilderSpy.single.and.returnValue(Promise.resolve({ data: updatedCustomer, error: null }));

      const result = await service.updateCustomer(1, updates);

      expect(supabaseSpy.from).toHaveBeenCalledWith('Customers');
      expect(queryBuilderSpy.update).toHaveBeenCalledWith(updates);
      expect(queryBuilderSpy.eq).toHaveBeenCalledWith('id', 1);
      expect(result).toEqual(updatedCustomer as any);
    });

    it('should delete customer', async () => {
      queryBuilderSpy._mockResponse = { error: null };

      await service.deleteCustomer(1);

      expect(supabaseSpy.from).toHaveBeenCalledWith('Customers');
      expect(queryBuilderSpy.delete).toHaveBeenCalled();
      expect(queryBuilderSpy.eq).toHaveBeenCalledWith('id', 1);
    });
  });

  describe('Budgets', () => {
    it('should get budgets', async () => {
      const mockBudgets = [{ id: 1, budgetNumber: 'B1', status: 'completed', total: 100 }];
      queryBuilderSpy._mockResponse = { data: mockBudgets, error: null };

      const budgets = await service.getBudgets();

      expect(supabaseSpy.from).toHaveBeenCalledWith('Budgets');
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
      queryBuilderSpy.single.and.returnValue(Promise.resolve({ data: mockBudget, error: null }));

      const budget = await service.getBudget(1);

      expect(supabaseSpy.from).toHaveBeenCalledWith('Budgets');
      expect(queryBuilderSpy.eq).toHaveBeenCalledWith('id', 1);
      expect(budget.id).toBe(1);
    });

    it('should update budget totals', async () => {
      const summary = { taxableBase: 100, vatPercentage: 21, vat: 21, grandTotal: 121 };
      queryBuilderSpy._mockResponse = { error: null };

      await service.updateBudgetTotals(1, summary as any);

      expect(supabaseSpy.from).toHaveBeenCalledWith('Budgets');
      expect(queryBuilderSpy.update).toHaveBeenCalledWith({
        taxableBase: 100,
        taxPercentage: 21,
        taxAmount: 21,
        total: 121
      });
    });

    it('should create budget', async () => {
      const newBudget = { title: 'New Budget' };
      const createdBudget = { id: 2, title: 'New Budget' };
      queryBuilderSpy.single.and.returnValue(Promise.resolve({ data: createdBudget, error: null }));

      const result = await service.createBudget(newBudget);

      expect(supabaseSpy.from).toHaveBeenCalledWith('Budgets');
      expect(queryBuilderSpy.insert).toHaveBeenCalledWith([newBudget]);
      expect(result).toEqual(createdBudget);
    });

    it('should update budget', async () => {
      const updates = { title: 'Updated Budget' };
      const updatedBudget = { id: 1, title: 'Updated Budget' };
      queryBuilderSpy.single.and.returnValue(Promise.resolve({ data: updatedBudget, error: null }));

      const result = await service.updateBudget(1, updates);

      expect(supabaseSpy.from).toHaveBeenCalledWith('Budgets');
      expect(queryBuilderSpy.update).toHaveBeenCalledWith(updates);
      expect(queryBuilderSpy.eq).toHaveBeenCalledWith('id', 1);
      expect(result).toEqual(updatedBudget);
    });

    it('should delete budget', async () => {
      queryBuilderSpy._mockResponse = { error: null };

      await service.deleteBudget(1);

      expect(supabaseSpy.from).toHaveBeenCalledWith('Budgets');
      expect(queryBuilderSpy.delete).toHaveBeenCalled();
      expect(queryBuilderSpy.eq).toHaveBeenCalledWith('id', 1);
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
        customer: { id: 50 }
      };

      // Mock getBudget
      const getBudgetSpy = spyOn(service, 'getBudget').and.returnValue(Promise.resolve(originalBudget));

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
      const budgetBuilder = jasmine.createSpyObj('BudgetBuilder', ['insert', 'select', 'single', 'then']);
      budgetBuilder.insert.and.returnValue(budgetBuilder);
      budgetBuilder.select.and.returnValue(budgetBuilder);
      budgetBuilder.single.and.returnValue(Promise.resolve({ data: newBudget, error: null }));

      const textBlockBuilder = jasmine.createSpyObj('TextBlockBuilder', ['insert', 'select', 'single', 'then']);
      textBlockBuilder.insert.and.returnValue(textBlockBuilder);
      textBlockBuilder.select.and.returnValue(textBlockBuilder);
      textBlockBuilder.single.and.returnValue(Promise.resolve({ data: newTextBlock, error: null }));

      const sectionBuilder = jasmine.createSpyObj('SectionBuilder', ['insert', 'then']);
      sectionBuilder.insert.and.returnValue(Promise.resolve({ error: null }));

      const tableBuilder = jasmine.createSpyObj('TableBuilder', ['insert', 'select', 'single', 'then']);
      tableBuilder.insert.and.returnValue(tableBuilder);
      tableBuilder.select.and.returnValue(tableBuilder);
      tableBuilder.single.and.returnValue(Promise.resolve({ data: newTable, error: null }));

      const rowBuilder = jasmine.createSpyObj('RowBuilder', ['insert', 'then']);
      rowBuilder.insert.and.returnValue(Promise.resolve({ error: null }));

      const lineBuilder = jasmine.createSpyObj('LineBuilder', ['insert', 'then']);
      lineBuilder.insert.and.returnValue(Promise.resolve({ error: null }));

      const simpleBlockBuilder = jasmine.createSpyObj('SimpleBlockBuilder', ['insert', 'then']);
      simpleBlockBuilder.insert.and.returnValue(Promise.resolve({ error: null }));

      supabaseSpy.from.and.callFake((table: string) => {
        switch (table) {
          case 'Budgets': return budgetBuilder;
          case 'BudgetTextBlocks': return textBlockBuilder;
          case 'BudgetTextBlockSections': return sectionBuilder;
          case 'BudgetMaterialTables': return tableBuilder;
          case 'BudgetMaterialTableRows': return rowBuilder;
          case 'BudgetAdditionalLines': return lineBuilder;
          case 'BudgetSimpleBlocks': return simpleBlockBuilder;
          default: return queryBuilderSpy;
        }
      });

      const result = await service.duplicateBudget(1);

      expect(getBudgetSpy).toHaveBeenCalledWith(1);
      expect(supabaseSpy.from).toHaveBeenCalledWith('Budgets');
      expect(budgetBuilder.insert).toHaveBeenCalled();
      expect(supabaseSpy.from).toHaveBeenCalledWith('BudgetTextBlocks');
      expect(supabaseSpy.from).toHaveBeenCalledWith('BudgetMaterialTables');
      expect(result).toEqual(newBudget);
    });
  });

  describe('Materials', () => {
    it('should save material tables', async () => {
      const tables = [{
        title: 'Table 1',
        rows: [{ reference: 'Ref 1', quantity: 1, unitPrice: 10 }]
      }];

      const tablesBuilder = jasmine.createSpyObj('TablesBuilder', ['delete', 'eq', 'insert', 'select', 'then']);
      tablesBuilder.delete.and.returnValue(tablesBuilder);
      tablesBuilder.eq.and.returnValue(tablesBuilder);
      tablesBuilder.insert.and.returnValue(tablesBuilder);
      tablesBuilder.select.and.returnValue(tablesBuilder);

      let tablesCallCount = 0;
      tablesBuilder.then = (resolve: any) => {
        tablesCallCount++;
        if (tablesCallCount === 1) {
           return Promise.resolve({ error: null }).then(resolve);
        } else {
           return Promise.resolve({ data: [{ id: 10 }], error: null }).then(resolve);
        }
      };

      const rowsBuilder = jasmine.createSpyObj('RowsBuilder', ['insert', 'select', 'then']);
      rowsBuilder.insert.and.returnValue(rowsBuilder);
      rowsBuilder.select.and.returnValue(rowsBuilder);
      rowsBuilder.then = (resolve: any) => Promise.resolve({ data: [{ id: 100 }], error: null }).then(resolve);

      supabaseSpy.from.and.callFake((table: string) => {
        if (table === 'BudgetMaterialTables') return tablesBuilder;
        if (table === 'BudgetMaterialTableRows') return rowsBuilder;
        return queryBuilderSpy;
      });

      const result = await service.saveMaterialTables(1, tables as any);

      expect(supabaseSpy.from).toHaveBeenCalledWith('BudgetMaterialTables');
      expect(tablesBuilder.delete).toHaveBeenCalled();
      expect(tablesBuilder.insert).toHaveBeenCalled();
      expect(supabaseSpy.from).toHaveBeenCalledWith('BudgetMaterialTableRows');
      expect(rowsBuilder.insert).toHaveBeenCalled();
      expect(result).toEqual({ tables: [{ id: 10 }], rows: [{ id: 100 }] });
    });
  });

  describe('Text Blocks', () => {
    it('should get text blocks for budget', async () => {
      const mockBlocks = [{ id: 1, heading: 'Block 1', descriptions: [] }];
      queryBuilderSpy._mockResponse = { data: mockBlocks, error: null };

      const blocks = await service.getTextBlocksForBudget(1);

      expect(supabaseSpy.from).toHaveBeenCalledWith('BudgetTextBlocks');
      expect(queryBuilderSpy.eq).toHaveBeenCalledWith('budgetId', 1);
      expect(blocks.length).toBe(1);
    });

    it('should add text block', async () => {
      const newBlock = { budgetId: 1, heading: 'New Block' };
      const createdBlock = { id: 2, ...newBlock };
      queryBuilderSpy.single.and.returnValue(Promise.resolve({ data: createdBlock, error: null }));

      const result = await service.addTextBlockToBudget(newBlock);

      expect(supabaseSpy.from).toHaveBeenCalledWith('BudgetTextBlocks');
      expect(queryBuilderSpy.insert).toHaveBeenCalled();
      expect(result).toEqual(createdBlock);
    });

    it('should update text block', async () => {
      const updates = { heading: 'Updated Block' };
      const updatedBlock = { id: 1, ...updates };
      queryBuilderSpy.single.and.returnValue(Promise.resolve({ data: updatedBlock, error: null }));

      const result = await service.updateBudgetTextBlock(1, updates);

      expect(supabaseSpy.from).toHaveBeenCalledWith('BudgetTextBlocks');
      expect(queryBuilderSpy.update).toHaveBeenCalled();
      expect(result).toEqual(updatedBlock);
    });

    it('should delete text block', async () => {
      queryBuilderSpy._mockResponse = { error: null };

      await service.deleteBudgetTextBlock(1);

      expect(supabaseSpy.from).toHaveBeenCalledWith('BudgetTextBlocks');
      expect(queryBuilderSpy.delete).toHaveBeenCalled();
    });
  });

  describe('Text Block Sections', () => {
    it('should add section', async () => {
      const newSection = { textBlockId: 1, title: 'Section' };
      const createdSection = { id: 2, ...newSection };
      queryBuilderSpy.single.and.returnValue(Promise.resolve({ data: createdSection, error: null }));

      const result = await service.addSectionToTextBlock(newSection);

      expect(supabaseSpy.from).toHaveBeenCalledWith('BudgetTextBlockSections');
      expect(queryBuilderSpy.insert).toHaveBeenCalled();
      expect(result).toEqual(createdSection);
    });

    it('should update section', async () => {
      const updates = { title: 'Updated Section' };
      const updatedSection = { id: 1, ...updates };
      queryBuilderSpy.single.and.returnValue(Promise.resolve({ data: updatedSection, error: null }));

      const result = await service.updateTextBlockSection(1, updates);

      expect(supabaseSpy.from).toHaveBeenCalledWith('BudgetTextBlockSections');
      expect(queryBuilderSpy.update).toHaveBeenCalled();
      expect(result).toEqual(updatedSection);
    });

    it('should delete section', async () => {
      queryBuilderSpy._mockResponse = { error: null };

      await service.deleteTextBlockSection(1);

      expect(supabaseSpy.from).toHaveBeenCalledWith('BudgetTextBlockSections');
      expect(queryBuilderSpy.delete).toHaveBeenCalled();
    });

    it('should reorder sections', async () => {
      const sectionIds = [1, 2, 3];
      queryBuilderSpy.single.and.returnValue(Promise.resolve({ data: {}, error: null }));

      await service.reorderTextBlockSections(1, sectionIds);

      expect(supabaseSpy.from).toHaveBeenCalledWith('BudgetTextBlockSections');
      expect(queryBuilderSpy.update).toHaveBeenCalledTimes(3);
    });
  });

  describe('Additional Lines', () => {
    it('should add additional line', async () => {
      const newLine = { budgetId: 1, concept: 'Line' };
      const createdLine = { id: 2, ...newLine };
      queryBuilderSpy.single.and.returnValue(Promise.resolve({ data: createdLine, error: null }));

      const result = await service.addAdditionalLineToBudget(newLine);

      expect(supabaseSpy.from).toHaveBeenCalledWith('BudgetAdditionalLines');
      expect(queryBuilderSpy.insert).toHaveBeenCalled();
      expect(result).toEqual(createdLine);
    });

    it('should update additional line', async () => {
      const updates = { concept: 'Updated Line' };
      const updatedLine = { id: 1, ...updates };
      queryBuilderSpy.single.and.returnValue(Promise.resolve({ data: updatedLine, error: null }));

      const result = await service.updateBudgetAdditionalLine(1, updates);

      expect(supabaseSpy.from).toHaveBeenCalledWith('BudgetAdditionalLines');
      expect(queryBuilderSpy.update).toHaveBeenCalled();
      expect(result).toEqual(updatedLine);
    });

    it('should delete additional line', async () => {
      queryBuilderSpy._mockResponse = { error: null };

      await service.deleteBudgetAdditionalLine(1);

      expect(supabaseSpy.from).toHaveBeenCalledWith('BudgetAdditionalLines');
      expect(queryBuilderSpy.delete).toHaveBeenCalled();
    });

    it('should save additional lines', async () => {
      const lines = [{ concept: 'Line 1' }];

      // Mock delete
      const deleteBuilder = jasmine.createSpyObj('DeleteBuilder', ['delete', 'eq', 'then']);
      deleteBuilder.delete.and.returnValue(deleteBuilder);
      deleteBuilder.eq.and.returnValue(deleteBuilder);
      deleteBuilder.then = (resolve: any) => Promise.resolve({ error: null }).then(resolve);

      // Mock insert
      const insertBuilder = jasmine.createSpyObj('InsertBuilder', ['insert', 'then']);
      insertBuilder.insert.and.returnValue(Promise.resolve({ error: null }));

      supabaseSpy.from.and.returnValues(deleteBuilder, insertBuilder);

      await service.saveAdditionalLines(1, lines);

      expect(supabaseSpy.from).toHaveBeenCalledWith('BudgetAdditionalLines');
      expect(deleteBuilder.delete).toHaveBeenCalled();
      expect(insertBuilder.insert).toHaveBeenCalled();
    });
  });

  describe('General Conditions', () => {
    it('should get general conditions', async () => {
      const mockConditions = [{ id: 1, title: 'Cond 1' }];
      queryBuilderSpy._mockResponse = { data: mockConditions, error: null };

      const conditions = await service.getGeneralConditions();

      expect(supabaseSpy.from).toHaveBeenCalledWith('GeneralConditions');
      expect(conditions.length).toBe(1);
    });

    it('should get default general conditions', async () => {
      const mockConditions = { id: 1, title: 'Default' };
      queryBuilderSpy.single.and.returnValue(Promise.resolve({ data: mockConditions, error: null }));

      const conditions = await service.getDefaultGeneralConditions();

      expect(supabaseSpy.from).toHaveBeenCalledWith('GeneralConditions');
      expect(queryBuilderSpy.single).toHaveBeenCalled();
      expect(conditions).toEqual(mockConditions);
    });

    it('should create general conditions', async () => {
      const newConditions = { title: 'New Cond' };
      const createdConditions = { id: 2, ...newConditions };
      queryBuilderSpy.single.and.returnValue(Promise.resolve({ data: createdConditions, error: null }));

      const result = await service.createGeneralConditions(newConditions);

      expect(supabaseSpy.from).toHaveBeenCalledWith('GeneralConditions');
      expect(queryBuilderSpy.insert).toHaveBeenCalled();
      expect(result).toEqual(createdConditions);
    });

    it('should update general conditions', async () => {
      const updates = { title: 'Updated Cond' };
      const updatedConditions = { id: 1, ...updates };
      queryBuilderSpy.single.and.returnValue(Promise.resolve({ data: updatedConditions, error: null }));

      const result = await service.updateGeneralConditions(1, updates);

      expect(supabaseSpy.from).toHaveBeenCalledWith('GeneralConditions');
      expect(queryBuilderSpy.update).toHaveBeenCalled();
      expect(result).toEqual(updatedConditions);
    });
  });

  describe('Simple Blocks', () => {
    it('should get simple block for budget', async () => {
      const mockSimpleBlock = { id: 1, material: 'Granite' };
      queryBuilderSpy.maybeSingle.and.returnValue(Promise.resolve({ data: mockSimpleBlock, error: null }));

      const result = await service.getSimpleBlockForBudget(1);

      expect(supabaseSpy.from).toHaveBeenCalledWith('BudgetCountertops');
      expect(queryBuilderSpy.eq).toHaveBeenCalledWith('budgetId', 1);
      expect(queryBuilderSpy.maybeSingle).toHaveBeenCalled();
      expect(result).toEqual(mockSimpleBlock);
    });

    it('should upsert simple block', async () => {
      const simpleBlock = { budgetId: 1, material: 'Marble' };
      const upsertedSimpleBlock = { id: 1, ...simpleBlock };
      queryBuilderSpy.single.and.returnValue(Promise.resolve({ data: upsertedSimpleBlock, error: null }));

      const result = await service.upsertSimpleBlock(simpleBlock);

      expect(supabaseSpy.from).toHaveBeenCalledWith('BudgetCountertops');
      expect(queryBuilderSpy.upsert).toHaveBeenCalledWith(simpleBlock);
      expect(result).toEqual(upsertedSimpleBlock);
    });

    it('should delete simple block', async () => {
      queryBuilderSpy._mockResponse = { error: null };

      await service.deleteSimpleBlock(1);

      expect(supabaseSpy.from).toHaveBeenCalledWith('BudgetCountertops');
      expect(queryBuilderSpy.delete).toHaveBeenCalled();
      expect(queryBuilderSpy.eq).toHaveBeenCalledWith('budgetId', 1);
    });
  });

  describe('Storage', () => {
    it('should throw if bucket is not configured', async () => {
      (service as any).storageBucket = '';
      await expectAsync(service.uploadPublicAsset(new Blob(['']), {})).toBeRejectedWithError('The Supabase storage bucket is not configured.');
    });

    it('should upload file and return public url', async () => {
      (service as any).storageBucket = 'test-bucket';
      const file = new File(['content'], 'test.png', { type: 'image/png' });
      const mockUrl = 'https://example.com/test.png';

      storageFileApiSpy.upload.and.returnValue(Promise.resolve({ data: { path: 'path/to/file' }, error: null }));
      storageFileApiSpy.getPublicUrl.and.returnValue({ data: { publicUrl: mockUrl } });

      const result = await service.uploadPublicAsset(file, { folder: 'uploads' });

      expect(supabaseSpy.storage.from).toHaveBeenCalledWith('test-bucket');
      expect(storageFileApiSpy.upload).toHaveBeenCalled();
      expect(storageFileApiSpy.getPublicUrl).toHaveBeenCalled();
      expect(result.publicUrl).toBe(mockUrl);
    });

    it('should handle upload error', async () => {
      (service as any).storageBucket = 'test-bucket';
      const error = { message: 'Upload failed' };
      storageFileApiSpy.upload.and.returnValue(Promise.resolve({ data: null, error }));

      await expectAsync(service.uploadPublicAsset(new Blob(['']))).toBeRejectedWith(error);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when updating customer with invalid id', async () => {
      await expectAsync(service.updateCustomer(NaN, {})).toBeRejectedWithError('Invalid customer id');
    });

    it('should throw error when updating budget totals without id', async () => {
      await expectAsync(service.updateBudgetTotals(NaN, {} as any)).toBeRejectedWithError('Budget ID is required to update totals.');
    });

    it('should throw error when updating budget totals without summary', async () => {
      await expectAsync(service.updateBudgetTotals(1, null as any)).toBeRejectedWithError('Budget summary is required to update totals.');
    });

    it('should throw error when getting budget with invalid id', async () => {
      await expectAsync(service.getBudget(NaN)).toBeRejectedWithError('Budget ID is required');
    });

    it('should throw error when updating budget with invalid id', async () => {
      await expectAsync(service.updateBudget(NaN, {})).toBeRejectedWithError('Invalid budget id');
    });

    it('should throw error when duplicating non-existent budget', async () => {
      spyOn(service, 'getBudget').and.returnValue(Promise.resolve(null));
      await expectAsync(service.duplicateBudget(1)).toBeRejectedWithError('Presupuesto no encontrado');
    });

    it('should throw error when updating text block with invalid id', async () => {
      await expectAsync(service.updateBudgetTextBlock(NaN, {})).toBeRejectedWithError('Invalid text block id');
    });

    it('should throw error when updating text block section with invalid id', async () => {
      await expectAsync(service.updateTextBlockSection(NaN, {})).toBeRejectedWithError('Invalid section id');
    });

    it('should throw error when saving material tables without budget id', async () => {
      await expectAsync(service.saveMaterialTables(NaN, [])).toBeRejectedWithError('Budget ID is required');
    });

    it('should throw error when saving additional lines without budget id', async () => {
      await expectAsync(service.saveAdditionalLines(NaN, [])).toBeRejectedWithError('Budget ID is required to save additional lines.');
    });

    it('should throw error when updating general conditions with invalid id', async () => {
      await expectAsync(service.updateGeneralConditions(NaN, {})).toBeRejectedWithError('Invalid conditions id');
    });
  });
});
