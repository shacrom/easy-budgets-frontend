import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { CompositeBlocksComponent } from './composite-blocks.component';
import { SupabaseService } from '../../../../services/supabase.service';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { CompositeBlock } from '../../../../models/composite-block.model';

describe('CompositeBlocksComponent', () => {
  let component: CompositeBlocksComponent;
  let fixture: ComponentFixture<CompositeBlocksComponent>;
  let supabaseServiceSpy: {
    getCompositeBlocksForBudget: ReturnType<typeof vi.fn>;
    addCompositeBlockToBudget: ReturnType<typeof vi.fn>;
    updateCompositeBlock: ReturnType<typeof vi.fn>;
    updateCompositeBlockSection: ReturnType<typeof vi.fn>;
  };

  const mockBlocks: CompositeBlock[] = [
    {
      id: 1,
      budgetId: 100,
      orderIndex: 0,
      sectionTitle: 'Bloque Compuesto',
      heading: 'Bloque 1',
      subtotal: 100,
      descriptions: [
        { id: 10, compositeBlockId: 1, orderIndex: 0, title: 'D1', text: 'T1' }
      ]
    },
    {
      id: 2,
      budgetId: 100,
      orderIndex: 1,
      sectionTitle: 'Bloque Compuesto',
      heading: 'Bloque 2',
      subtotal: 200,
      descriptions: []
    }
  ];

  beforeAll(() => {
    registerLocaleData(localeEs);
  });

  beforeEach(async () => {
    supabaseServiceSpy = {
      getCompositeBlocksForBudget: vi.fn(),
      addCompositeBlockToBudget: vi.fn(),
      updateCompositeBlock: vi.fn(),
      updateCompositeBlockSection: vi.fn()
    };

    // Default behavior
    supabaseServiceSpy.getCompositeBlocksForBudget.mockReturnValue(Promise.resolve([...mockBlocks]));

    await TestBed.configureTestingModule({
      imports: [CompositeBlocksComponent],
      providers: [
        { provide: SupabaseService, useValue: supabaseServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CompositeBlocksComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('budgetId', 100);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load blocks and set section title on init', async () => {
    await fixture.whenStable();
    expect(supabaseServiceSpy.getCompositeBlocksForBudget).toHaveBeenCalledWith(100);
    expect(component['blocks']().length).toBe(2);
    expect(component['sectionTitle']()).toBe('Bloque Compuesto');
  });

  it('should calculate grand total correctly', async () => {
    await fixture.whenStable();
    // 100 + 200 = 300
    expect(component['grandTotal']()).toBe(300);
  });

  it('should add new block', async () => {
    const newBlock = { id: 3, budgetId: 100, orderIndex: 2, heading: '', subtotal: 0 };
    supabaseServiceSpy.addCompositeBlockToBudget.mockReturnValue(Promise.resolve(newBlock));
    // Mock reload to return new list
    supabaseServiceSpy.getCompositeBlocksForBudget.mockReturnValue(Promise.resolve([...mockBlocks, newBlock]));

    await component['addNewBlock']();

    expect(supabaseServiceSpy.addCompositeBlockToBudget).toHaveBeenCalled();
    expect(supabaseServiceSpy.getCompositeBlocksForBudget).toHaveBeenCalledTimes(2); // Init + Reload
    expect(component['blocks']().length).toBe(3);
  });

  it('should update block locally and set unsaved changes', () => {
    const updatedBlock = { ...mockBlocks[0], heading: 'Updated Heading' };

    component['updateBlock'](updatedBlock);

    const blocks = component['blocks']();
    expect(blocks[0].heading).toBe('Updated Heading');
    expect(component['hasUnsavedChanges']()).toBe(true);
  });

  it('should delete block locally and set unsaved changes', () => {
    component['deleteBlock'](1);

    const blocks = component['blocks']();
    expect(blocks.length).toBe(1);
    expect(blocks[0].id).toBe(2);
    expect(component['hasUnsavedChanges']()).toBe(true);
  });

  it('should update section title and set unsaved changes', () => {
    const event = { target: { value: 'New Section Title' } } as any;

    component['updateSectionTitle'](event);

    expect(component['sectionTitle']()).toBe('New Section Title');
    expect(component['hasUnsavedChanges']()).toBe(true);
  });

  it('should save changes (blocks and sections)', async () => {
    // Setup unsaved changes
    const event = { target: { value: 'Updated Title' } } as any;
    component['updateSectionTitle'](event);

    supabaseServiceSpy.updateCompositeBlock.mockReturnValue(Promise.resolve({} as any));
    supabaseServiceSpy.updateCompositeBlockSection.mockReturnValue(Promise.resolve({} as any));

    await component.saveChanges();

    // Should update blocks
    expect(supabaseServiceSpy.updateCompositeBlock).toHaveBeenCalledTimes(2); // 2 blocks
    // Should update sections (Block 1 has 1 section)
    expect(supabaseServiceSpy.updateCompositeBlockSection).toHaveBeenCalledTimes(1);

    // Should reload
    expect(supabaseServiceSpy.getCompositeBlocksForBudget).toHaveBeenCalledTimes(2);
    // Should clear unsaved changes
    expect(component['hasUnsavedChanges']()).toBe(false);
  });
});
