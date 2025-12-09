import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BudgetTextBlockComponent } from './budget-text-block.component';
import { BudgetTextBlock } from '../../../models/budget-text-block.model';
import { SupabaseService } from '../../../services/supabase.service';

describe('BudgetTextBlockComponent', () => {
  let component: BudgetTextBlockComponent;
  let fixture: ComponentFixture<BudgetTextBlockComponent>;
  let supabaseServiceSpy: {
    deleteBudgetTextBlock: ReturnType<typeof vi.fn>;
    addSectionToTextBlock: ReturnType<typeof vi.fn>;
    updateTextBlockSection: ReturnType<typeof vi.fn>;
    deleteTextBlockSection: ReturnType<typeof vi.fn>;
    updateBudgetTextBlock: ReturnType<typeof vi.fn>;
    uploadPublicAsset: ReturnType<typeof vi.fn>;
    getTextBlockTemplates: ReturnType<typeof vi.fn>;
    getTextBlockTemplateWithSections: ReturnType<typeof vi.fn>;
    createTextBlockTemplate: ReturnType<typeof vi.fn>;
    deleteTextBlockTemplate: ReturnType<typeof vi.fn>;
  };

  const mockBlock: BudgetTextBlock = {
    id: 1,
    budgetId: 1,
    sectionTitle: 'Test Section',
    heading: 'Test Header',
    descriptions: [
      { id: 10, textBlockId: 1, orderIndex: 0, title: 'Desc 1', text: 'Text 1' }
    ],
    imageUrl: undefined,
    link: undefined,
    subtotal: 100,
    orderIndex: 0
  };

  const mockTemplates = [
    { id: 1, name: 'Template 1', provider: 'Provider 1', heading: 'Heading 1' },
    { id: 2, name: 'Template 2', provider: 'Provider 2', heading: 'Heading 2' }
  ];

  const mockTemplateSections = [
    { id: 1, title: 'Section 1', text: 'Text 1', orderIndex: 0 },
    { id: 2, title: 'Section 2', text: 'Text 2', orderIndex: 1 }
  ];

  beforeEach(async () => {
    // Mock completo de SupabaseService para evitar llamadas reales
    supabaseServiceSpy = {
      deleteBudgetTextBlock: vi.fn(),
      addSectionToTextBlock: vi.fn(),
      updateTextBlockSection: vi.fn(),
      deleteTextBlockSection: vi.fn(),
      updateBudgetTextBlock: vi.fn(),
      uploadPublicAsset: vi.fn(),
      getTextBlockTemplates: vi.fn(),
      getTextBlockTemplateWithSections: vi.fn(),
      createTextBlockTemplate: vi.fn(),
      deleteTextBlockTemplate: vi.fn()
    };

    supabaseServiceSpy.getTextBlockTemplates.mockReturnValue(Promise.resolve(mockTemplates));
    supabaseServiceSpy.getTextBlockTemplateWithSections.mockReturnValue(Promise.resolve({
      id: 1,
      name: 'Template 1',
      provider: 'Provider 1',
      heading: 'Heading 1',
      sections: mockTemplateSections
    }));
    supabaseServiceSpy.createTextBlockTemplate.mockReturnValue(Promise.resolve({ id: 3, name: 'New Template' }));
    supabaseServiceSpy.deleteTextBlockTemplate.mockReturnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      imports: [BudgetTextBlockComponent],
      providers: [
        { provide: SupabaseService, useValue: supabaseServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BudgetTextBlockComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('block', mockBlock);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load templates on init', async () => {
    expect(supabaseServiceSpy.getTextBlockTemplates).toHaveBeenCalled();
    expect(component['templateOptions']().length).toBe(2);
  });

  it('should initialize sections from block input', () => {
    // Verificamos que la señal 'sections' se inicializa con los datos del input
    expect(component['sections']().length).toBe(1);
    expect(component['sections']()[0].title).toBe('Desc 1');
  });

  it('should delete block when confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    supabaseServiceSpy.deleteBudgetTextBlock.mockReturnValue(Promise.resolve());

    let deletedId: number | undefined;
    component.blockDeleted.subscribe(id => deletedId = id);

    await component['deleteBlock']();

    expect(supabaseServiceSpy.deleteBudgetTextBlock).toHaveBeenCalledWith(1);
    expect(deletedId).toBe(1);
  });

  it('should NOT delete block when cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    await component['deleteBlock']();

    expect(supabaseServiceSpy.deleteBudgetTextBlock).not.toHaveBeenCalled();
  });

  it('should add description section', async () => {
    const newSection = { id: 11, textBlockId: 1, orderIndex: 1, title: '', text: '' };
    supabaseServiceSpy.addSectionToTextBlock.mockReturnValue(Promise.resolve(newSection));

    let updatedBlock: BudgetTextBlock | undefined;
    component.blockUpdated.subscribe(b => updatedBlock = b);

    await component['addDescriptionSection']();

    expect(supabaseServiceSpy.addSectionToTextBlock).toHaveBeenCalled();
    // Debe actualizar el estado local
    expect(component['sections']().length).toBe(2);
    // Debe emitir el evento de actualización
    expect(updatedBlock?.descriptions?.length).toBe(2);
  });

  it('should update description section locally and emit event', () => {
    const event = { target: { value: 'New Title' } } as any;

    let updatedBlock: BudgetTextBlock | undefined;
    component.blockUpdated.subscribe(b => updatedBlock = b);

    // Simulamos la escritura del usuario
    component['updateDescriptionSection'](10, 'title', event);

    // El estado local debe actualizarse inmediatamente
    expect(component['sections']()[0].title).toBe('New Title');

    // El servicio NO debe llamarse NUNCA (ahora se guarda en el padre)
    expect(supabaseServiceSpy.updateTextBlockSection).not.toHaveBeenCalled();

    // Debe emitir el evento inmediatamente
    expect(updatedBlock).toBeDefined();
    expect(updatedBlock?.descriptions?.[0].title).toBe('New Title');
  });  it('should delete description section', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    supabaseServiceSpy.deleteTextBlockSection.mockReturnValue(Promise.resolve());

    let updatedBlock: BudgetTextBlock | undefined;
    component.blockUpdated.subscribe(b => updatedBlock = b);

    await component['deleteDescriptionSection'](10);

    expect(supabaseServiceSpy.deleteTextBlockSection).toHaveBeenCalledWith(10);
    expect(component['sections']().length).toBe(0);
    expect(updatedBlock?.descriptions?.length).toBe(0);
  });

  it('should update block field (heading)', () => {
    const event = { target: { value: 'New Heading' } } as any;

    let updatedBlock: BudgetTextBlock | undefined;
    component.blockUpdated.subscribe(b => updatedBlock = b);

    component['updateBlockField']('heading', event);

    expect(updatedBlock?.heading).toBe('New Heading');
  });

  it('should update block field (subtotal) as number', () => {
    const event = { target: { value: '500' } } as any;

    let updatedBlock: BudgetTextBlock | undefined;
    component.blockUpdated.subscribe(b => updatedBlock = b);

    component['updateBlockField']('subtotal', event);

    expect(updatedBlock?.subtotal).toBe(500);
  });

  it('should apply selected template', async () => {
    supabaseServiceSpy.deleteTextBlockSection.mockReturnValue(Promise.resolve());
    supabaseServiceSpy.addSectionToTextBlock.mockImplementation((params: any) => Promise.resolve({
      id: 100 + params.orderIndex,
      textBlockId: params.textBlockId,
      orderIndex: params.orderIndex,
      title: params.title,
      text: params.text
    }));
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    component['selectedTemplateId'].set(1);

    let updatedBlock: BudgetTextBlock | undefined;
    component.blockUpdated.subscribe(b => updatedBlock = b);

    await component['applySelectedTemplate']();

    expect(supabaseServiceSpy.getTextBlockTemplateWithSections).toHaveBeenCalledWith(1);
    expect(supabaseServiceSpy.deleteTextBlockSection).toHaveBeenCalled();
    expect(supabaseServiceSpy.addSectionToTextBlock).toHaveBeenCalled();
    expect(updatedBlock?.descriptions?.length).toBe(2);
  });

  it('should save current block as template', async () => {
    component['newTemplateName'].set('My New Template');

    await component['saveAsTemplate']();

    expect(supabaseServiceSpy.createTextBlockTemplate).toHaveBeenCalledWith(
      'My New Template',
      'Test Header',
      null,
      expect.any(Array)
    );
    expect(component['isCreatingTemplate']()).toBe(false);
  });

  it('should delete selected template', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component['selectedTemplateId'].set(1);

    await component['deleteSelectedTemplate']();

    expect(supabaseServiceSpy.deleteTextBlockTemplate).toHaveBeenCalledWith(1);
    expect(component['selectedTemplateId']()).toBeNull();
  });
});
