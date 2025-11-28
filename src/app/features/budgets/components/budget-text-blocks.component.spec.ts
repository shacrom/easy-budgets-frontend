import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BudgetTextBlocksComponent } from './budget-text-blocks.component';
import { SupabaseService } from '../../../services/supabase.service';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';

describe('BudgetTextBlocksComponent', () => {
  let component: BudgetTextBlocksComponent;
  let fixture: ComponentFixture<BudgetTextBlocksComponent>;
  let supabaseServiceSpy: jasmine.SpyObj<SupabaseService>;

  beforeAll(() => {
    registerLocaleData(localeEs);
  });

  beforeEach(async () => {
    supabaseServiceSpy = jasmine.createSpyObj('SupabaseService', ['getTextBlocksForBudget', 'saveBudgetTextBlocks']);
    supabaseServiceSpy.getTextBlocksForBudget.and.returnValue(Promise.resolve([]));

    await TestBed.configureTestingModule({
      imports: [BudgetTextBlocksComponent],
      providers: [
        { provide: SupabaseService, useValue: supabaseServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BudgetTextBlocksComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('budgetId', 1);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load blocks on init', async () => {
    await fixture.whenStable();
    expect(supabaseServiceSpy.getTextBlocksForBudget).toHaveBeenCalledWith(1);
  });
});
