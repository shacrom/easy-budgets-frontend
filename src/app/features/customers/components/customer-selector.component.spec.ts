import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CustomerSelectorComponent } from './customer-selector.component';
import { SupabaseService } from '../../../services/supabase.service';

describe('CustomerSelectorComponent', () => {
  let component: CustomerSelectorComponent;
  let fixture: ComponentFixture<CustomerSelectorComponent>;
  let supabaseServiceSpy: jasmine.SpyObj<SupabaseService>;

  beforeEach(async () => {
    supabaseServiceSpy = jasmine.createSpyObj('SupabaseService', ['getCustomers']);
    supabaseServiceSpy.getCustomers.and.returnValue(Promise.resolve([]));

    await TestBed.configureTestingModule({
      imports: [CustomerSelectorComponent],
      providers: [
        { provide: SupabaseService, useValue: supabaseServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CustomerSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
