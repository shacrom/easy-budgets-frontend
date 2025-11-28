import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CustomersPageComponent } from './customers-page.component';
import { SupabaseService } from '../../../services/supabase.service';

describe('CustomersPageComponent', () => {
  let component: CustomersPageComponent;
  let fixture: ComponentFixture<CustomersPageComponent>;
  let supabaseServiceSpy: jasmine.SpyObj<SupabaseService>;

  beforeEach(async () => {
    supabaseServiceSpy = jasmine.createSpyObj('SupabaseService', ['getCustomers', 'createCustomer', 'updateCustomer', 'deleteCustomer']);
    supabaseServiceSpy.getCustomers.and.returnValue(Promise.resolve([]));

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
  });
});
