import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CustomersPageComponent } from './customers-page.component';
import { SupabaseService } from '../../../services/supabase.service';
import { Customer } from '../../../models/customer.model';

describe('CustomersPageComponent', () => {
  let component: CustomersPageComponent;
  let fixture: ComponentFixture<CustomersPageComponent>;
  let supabaseServiceSpy: jasmine.SpyObj<SupabaseService>;

  const mockCustomers: Customer[] = [
    { id: 1, name: 'John Doe', email: 'john@example.com', city: 'New York', createdAt: '2023-01-01T00:00:00Z' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', city: 'London', createdAt: '2023-01-02T00:00:00Z' },
    { id: 3, name: 'Bob Jones', email: 'bob@example.com', city: 'New York', createdAt: '2023-01-03T00:00:00Z' },
    { id: 4, name: 'Alice Brown', email: 'alice@example.com', city: 'Paris', createdAt: '2023-01-04T00:00:00Z' },
    { id: 5, name: 'Charlie Black', email: 'charlie@example.com', city: 'London', createdAt: '2023-01-05T00:00:00Z' },
    { id: 6, name: 'David White', email: 'david@example.com', city: 'Berlin', createdAt: '2023-01-06T00:00:00Z' }
  ];

  beforeEach(async () => {
    supabaseServiceSpy = jasmine.createSpyObj('SupabaseService', [
      'getCustomers',
      'createCustomer',
      'updateCustomer',
      'deleteCustomer'
    ]);

    supabaseServiceSpy.getCustomers.and.returnValue(Promise.resolve(mockCustomers));

    await TestBed.configureTestingModule({
      imports: [CustomersPageComponent],
      providers: [
        { provide: SupabaseService, useValue: supabaseServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CustomersPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load customers on init', async () => {
    await fixture.whenStable();
    expect(supabaseServiceSpy.getCustomers).toHaveBeenCalled();
    expect(component['customers']().length).toBe(6);
    expect(component['isLoading']()).toBeFalse();
  });

  it('should handle error loading customers', async () => {
    supabaseServiceSpy.getCustomers.and.returnValue(Promise.reject('Error'));
    component.ngOnInit(); // Re-trigger init to hit the error
    await fixture.whenStable();

    expect(component['errorMessage']()).toBe('No se pudieron cargar los clientes.');
    expect(component['isLoading']()).toBeFalse();
  });

  describe('Filtering and Pagination', () => {
    it('should filter customers by search term', () => {
      component['searchTerm'].set('john');
      fixture.detectChanges();
      expect(component['filteredCustomers']().length).toBe(1);
      expect(component['filteredCustomers']()[0].name).toBe('John Doe');
    });

    it('should reset page when searching', () => {
      component['currentPage'].set(1);
      const event = { target: { value: 'john' } } as any;
      component['onSearch'](event);
      expect(component['currentPage']()).toBe(0);
    });

    it('should paginate customers', () => {
      component['pageSize'].set(2);
      component['currentPage'].set(0);
      fixture.detectChanges();

      expect(component['paginatedCustomers']().length).toBe(2);
      expect(component['paginatedCustomers']()[0].id).toBe(1);
      expect(component['paginatedCustomers']()[1].id).toBe(2);

      component['currentPage'].set(1);
      fixture.detectChanges();
      expect(component['paginatedCustomers']()[0].id).toBe(3);
    });

    it('should calculate total pages correctly', () => {
      component['pageSize'].set(2);
      fixture.detectChanges();
      expect(component['totalPages']()).toBe(3); // 6 items / 2 per page
    });

    it('should handle page navigation', () => {
      component['pageSize'].set(2);
      component['currentPage'].set(0);

      component['goToNextPage']();
      expect(component['currentPage']()).toBe(1);

      component['goToLastPage']();
      expect(component['currentPage']()).toBe(2);

      component['goToNextPage'](); // Should stay on last page
      expect(component['currentPage']()).toBe(2);

      component['goToPreviousPage']();
      expect(component['currentPage']()).toBe(1);

      component['goToFirstPage']();
      expect(component['currentPage']()).toBe(0);
    });
  });

  describe('Computed Properties', () => {
    it('should calculate unique cities', () => {
      // New York, London, Paris, Berlin -> 4 unique
      expect(component['uniqueCities']()).toBe(4);
    });

    it('should find last updated date', () => {
      // Latest is 2023-01-06
      expect(component['lastUpdated']()).toBe('2023-01-06T00:00:00Z');
    });
  });

  describe('Form Management', () => {
    it('should open create form', () => {
      component['openCreateForm']();
      expect(component['showForm']()).toBeTrue();
      expect(component['editingCustomer']()).toBeNull();
      expect(component['formData']().name).toBe('');
    });

    it('should open edit form with customer data', () => {
      const customer = mockCustomers[0];
      component['openEditForm'](customer);

      expect(component['showForm']()).toBeTrue();
      expect(component['editingCustomer']()).toBe(customer);
      expect(component['formData']().name).toBe(customer.name);
    });

    it('should cancel form', () => {
      component['openCreateForm']();
      component['cancelForm']();

      expect(component['showForm']()).toBeFalse();
      expect(component['editingCustomer']()).toBeNull();
    });

    it('should update form field', () => {
      component['openCreateForm']();
      const event = { target: { value: 'New Name' } } as any;
      component['updateFormField']('name', event);

      expect(component['formData']().name).toBe('New Name');
    });
  });

  describe('CRUD Operations', () => {
    it('should create a new customer', async () => {
      const newCustomer = { id: 7, name: 'New Guy' };
      supabaseServiceSpy.createCustomer.and.returnValue(Promise.resolve(newCustomer as Customer));

      component['openCreateForm']();
      component['formData'].set({ name: 'New Guy' });

      await component['saveCustomer']();

      expect(supabaseServiceSpy.createCustomer).toHaveBeenCalled();
      expect(component['customers']().length).toBe(7);
      expect(component['customers']()[0]).toEqual(newCustomer as Customer);
      expect(component['showForm']()).toBeFalse();
      expect(component['successMessage']()).toBe('Cliente creado correctamente.');
    });

    it('should update an existing customer', async () => {
      const updatedCustomer = { ...mockCustomers[0], name: 'Updated Name' };
      supabaseServiceSpy.updateCustomer.and.returnValue(Promise.resolve(updatedCustomer));

      component['openEditForm'](mockCustomers[0]);
      component['formData'].set({ name: 'Updated Name' });

      await component['saveCustomer']();

      expect(supabaseServiceSpy.updateCustomer).toHaveBeenCalled();
      expect(component['customers']().find(c => c.id === 1)?.name).toBe('Updated Name');
      expect(component['showForm']()).toBeFalse();
      expect(component['successMessage']()).toBe('Cliente actualizado correctamente.');
    });

    it('should validate required fields before saving', async () => {
      component['openCreateForm']();
      component['formData'].set({ name: '' }); // Empty name

      await component['saveCustomer']();

      expect(supabaseServiceSpy.createCustomer).not.toHaveBeenCalled();
      expect(component['errorMessage']()).toBe('El nombre es obligatorio.');
    });

    it('should handle error saving customer', async () => {
      supabaseServiceSpy.createCustomer.and.returnValue(Promise.reject('Error'));

      component['openCreateForm']();
      component['formData'].set({ name: 'Fail Guy' });

      await component['saveCustomer']();

      expect(component['errorMessage']()).toBe('No se pudo guardar el cliente.');
      expect(component['isLoading']()).toBeFalse();
    });

    it('should delete a customer', async () => {
      spyOn(window, 'confirm').and.returnValue(true);
      supabaseServiceSpy.deleteCustomer.and.returnValue(Promise.resolve());

      const customerToDelete = mockCustomers[0];
      await component['deleteCustomer'](customerToDelete);

      expect(supabaseServiceSpy.deleteCustomer).toHaveBeenCalledWith(customerToDelete.id);
      expect(component['customers']().find(c => c.id === customerToDelete.id)).toBeUndefined();
      expect(component['successMessage']()).toBe('Cliente eliminado.');
    });

    it('should not delete if not confirmed', async () => {
      spyOn(window, 'confirm').and.returnValue(false);

      await component['deleteCustomer'](mockCustomers[0]);

      expect(supabaseServiceSpy.deleteCustomer).not.toHaveBeenCalled();
    });

    it('should handle foreign key error when deleting', async () => {
      spyOn(window, 'confirm').and.returnValue(true);
      supabaseServiceSpy.deleteCustomer.and.returnValue(Promise.reject({ code: '23503' }));

      await component['deleteCustomer'](mockCustomers[0]);

      expect(component['errorMessage']()).toContain('tiene presupuestos asociados');
    });
  });
});
