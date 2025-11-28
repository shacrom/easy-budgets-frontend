import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CountertopEditorComponent } from './countertop-editor.component';
import { SupabaseService } from '../../../services/supabase.service';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';

describe('CountertopEditorComponent', () => {
  let component: CountertopEditorComponent;
  let fixture: ComponentFixture<CountertopEditorComponent>;
  let supabaseServiceSpy: jasmine.SpyObj<SupabaseService>;

  beforeAll(() => {
    registerLocaleData(localeEs);
  });

  beforeEach(async () => {
    supabaseServiceSpy = jasmine.createSpyObj('SupabaseService', ['getCountertopForBudget', 'saveCountertop', 'uploadImage']);
    // Mock return values
    supabaseServiceSpy.getCountertopForBudget.and.returnValue(Promise.resolve({
      budgetId: 1,
      model: 'Test Model',
      description: 'Test Desc',
      price: 100
    }));

    await TestBed.configureTestingModule({
      imports: [CountertopEditorComponent],
      providers: [
        { provide: SupabaseService, useValue: supabaseServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CountertopEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load countertop data when budgetId is provided', async () => {
    fixture.componentRef.setInput('budgetId', 1);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(supabaseServiceSpy.getCountertopForBudget).toHaveBeenCalledWith(1);
  });
});
