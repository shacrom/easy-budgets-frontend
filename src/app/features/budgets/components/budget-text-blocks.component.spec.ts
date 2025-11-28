import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { BudgetTextBlocksComponent } from './budget-text-blocks.component';
import { SupabaseService } from '../../../services/supabase.service';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { BudgetTextBlock } from '../../../models/budget-text-block.model';

describe('BudgetTextBlocksComponent', () => {
  let component: BudgetTextBlocksComponent;
  let fixture: ComponentFixture<BudgetTextBlocksComponent>;
  let supabaseServiceSpy: jasmine.SpyObj<SupabaseService>;

  const mockBlocks: BudgetTextBlock[] = [
    {
      id: 1,
      budgetId: 100,
      orderIndex: 0,
      sectionTitle: 'Mobiliario',
      heading: 'Bloque 1',
      subtotal: 100,
      descriptions: [
        { id: 10, textBlockId: 1, orderIndex: 0, title: 'D1', text: 'T1' }
      ]
    },
    {
      id: 2,
      budgetId: 100,
      orderIndex: 1,
      sectionTitle: 'Mobiliario',
      heading: 'Bloque 2',
      subtotal: 200,
      descriptions: []
    }
  ];

  beforeAll(() => {
    registerLocaleData(localeEs);
  });

  beforeEach(async () => {
    supabaseServiceSpy = jasmine.createSpyObj('SupabaseService', [
      'getTextBlocksForBudget',
      'addTextBlockToBudget',
      'updateBudgetTextBlock',
      'updateTextBlockSection'
    ]);

    // Default behavior
    supabaseServiceSpy.getTextBlocksForBudget.and.returnValue(Promise.resolve([...mockBlocks]));

    await TestBed.configureTestingModule({
      imports: [BudgetTextBlocksComponent],
      providers: [
        { provide: SupabaseService, useValue: supabaseServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BudgetTextBlocksComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('budgetId', 100);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load blocks and set section title on init', async () => {
    await fixture.whenStable();
    expect(supabaseServiceSpy.getTextBlocksForBudget).toHaveBeenCalledWith(100);
    expect(component['blocks']().length).toBe(2);
    expect(component['sectionTitle']()).toBe('Mobiliario');
  });

  it('should calculate grand total correctly', async () => {
    await fixture.whenStable();
    // 100 + 200 = 300
    expect(component['grandTotal']()).toBe(300);
  });

  it('should add new block', async () => {
    const newBlock = { id: 3, budgetId: 100, orderIndex: 2, heading: '', subtotal: 0 };
    supabaseServiceSpy.addTextBlockToBudget.and.returnValue(Promise.resolve(newBlock));
    // Mock reload to return new list
    supabaseServiceSpy.getTextBlocksForBudget.and.returnValue(Promise.resolve([...mockBlocks, newBlock]));

    await component['addNewBlock']();

    expect(supabaseServiceSpy.addTextBlockToBudget).toHaveBeenCalled();
    expect(supabaseServiceSpy.getTextBlocksForBudget).toHaveBeenCalledTimes(2); // Init + Reload
    expect(component['blocks']().length).toBe(3);
  });

  it('should update block locally and set unsaved changes', () => {
    const updatedBlock = { ...mockBlocks[0], heading: 'Updated Heading' };

    component['updateBlock'](updatedBlock);

    const blocks = component['blocks']();
    expect(blocks[0].heading).toBe('Updated Heading');
    expect(component['hasUnsavedChanges']()).toBeTrue();
  });

  it('should delete block locally and set unsaved changes', () => {
    component['deleteBlock'](1);

    const blocks = component['blocks']();
    expect(blocks.length).toBe(1);
    expect(blocks[0].id).toBe(2);
    expect(component['hasUnsavedChanges']()).toBeTrue();
  });

  it('should update section title and set unsaved changes', () => {
    const event = { target: { value: 'New Section Title' } } as any;

    component['updateSectionTitle'](event);

    expect(component['sectionTitle']()).toBe('New Section Title');
    expect(component['hasUnsavedChanges']()).toBeTrue();
  });

  it('should save changes (blocks and sections)', async () => {
    // Setup unsaved changes
    const event = { target: { value: 'Updated Title' } } as any;
    component['updateSectionTitle'](event);

    supabaseServiceSpy.updateBudgetTextBlock.and.returnValue(Promise.resolve({} as any));
    supabaseServiceSpy.updateTextBlockSection.and.returnValue(Promise.resolve({} as any));

    await component.saveChanges();

    // Should update blocks
    expect(supabaseServiceSpy.updateBudgetTextBlock).toHaveBeenCalledTimes(2); // 2 blocks
    // Should update sections (Block 1 has 1 section)
    expect(supabaseServiceSpy.updateTextBlockSection).toHaveBeenCalledTimes(1);

    // Should reload
    expect(supabaseServiceSpy.getTextBlocksForBudget).toHaveBeenCalledTimes(2);
    // Should clear unsaved changes
    expect(component['hasUnsavedChanges']()).toBeFalse();
  });
});
