import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CustomerSelectorComponent } from './customer-selector.component';
import { Customer } from '../../../models/customer.model';

describe('CustomerSelectorComponent', () => {
  let component: CustomerSelectorComponent;
  let fixture: ComponentFixture<CustomerSelectorComponent>;

  const mockCustomers: Customer[] = [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomerSelectorComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CustomerSelectorComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('customers', mockCustomers);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should compute hasCustomers correctly', () => {
    expect(component['hasCustomers']()).toBe(true);

    fixture.componentRef.setInput('customers', []);
    fixture.detectChanges();
    expect(component['hasCustomers']()).toBe(false);
  });

  it('should compute meetsSearchThreshold correctly', () => {
    fixture.componentRef.setInput('searchTerm', 'a');
    fixture.detectChanges();
    expect(component['meetsSearchThreshold']()).toBe(false);

    fixture.componentRef.setInput('searchTerm', 'ab');
    fixture.detectChanges();
    expect(component['meetsSearchThreshold']()).toBe(true);
  });

  it('should emit searchChanged on updateSearch', () => {
    let emittedValue: string | undefined;
    component.searchChanged.subscribe(val => emittedValue = val);

    const event = { target: { value: 'test' } } as any;
    component['updateSearch'](event);

    expect(emittedValue).toBe('test');
  });

  it('should emit refreshRequested on retrySearch', () => {
    let emitted = false;
    component.refreshRequested.subscribe(() => emitted = true);

    component['retrySearch']();

    expect(emitted).toBe(true);
  });

  it('should emit searchChanged with empty string on clearSearch', () => {
    let emittedValue: string | undefined;
    component.searchChanged.subscribe(val => emittedValue = val);

    component['clearSearch']();

    expect(emittedValue).toBe('');
  });

  it('should NOT emit clearSearch if loading', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    let emitted = false;
    component.searchChanged.subscribe(() => emitted = true);

    component['clearSearch']();

    expect(emitted).toBe(false);
  });

  it('should emit customerSelected on selectCustomer', () => {
    let emittedId: number | null | undefined;
    component.customerSelected.subscribe(id => emittedId = id);

    component['selectCustomer'](1);

    expect(emittedId).toBe(1);
  });

  it('should NOT emit customerSelected if already selected', () => {
    fixture.componentRef.setInput('selectedCustomerId', 1);
    fixture.detectChanges();

    let emitted = false;
    component.customerSelected.subscribe(() => emitted = true);

    component['selectCustomer'](1);

    expect(emitted).toBe(false);
  });

  it('should emit null on clearSelection', () => {
    let emittedId: number | null | undefined;
    component.customerSelected.subscribe(id => emittedId = id);

    component['clearSelection']();

    expect(emittedId).toBeNull();
  });
});
