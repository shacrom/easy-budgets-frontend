import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { BudgetTextBlockComponent } from './budget-text-block.component';
import { BudgetTextBlock } from '../../../models/budget-text-block.model';
import { SupabaseService } from '../../../services/supabase.service';

describe('BudgetTextBlockComponent', () => {
  let component: BudgetTextBlockComponent;
  let fixture: ComponentFixture<BudgetTextBlockComponent>;
  let supabaseServiceSpy: jasmine.SpyObj<SupabaseService>;

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
    supabaseServiceSpy = jasmine.createSpyObj('SupabaseService', [
      'deleteBudgetTextBlock',
      'addSectionToTextBlock',
      'updateTextBlockSection',
      'deleteTextBlockSection',
      'updateBudgetTextBlock',
      'uploadPublicAsset',
      'getTextBlockTemplates',
      'getTextBlockTemplateWithSections',
      'createTextBlockTemplate',
      'deleteTextBlockTemplate'
    ]);

    supabaseServiceSpy.getTextBlockTemplates.and.returnValue(Promise.resolve(mockTemplates));
    supabaseServiceSpy.getTextBlockTemplateWithSections.and.returnValue(Promise.resolve({
      id: 1,
      name: 'Template 1',
      provider: 'Provider 1',
      heading: 'Heading 1',
      sections: mockTemplateSections
    }));
    supabaseServiceSpy.createTextBlockTemplate.and.returnValue(Promise.resolve({ id: 3, name: 'New Template' }));
    supabaseServiceSpy.deleteTextBlockTemplate.and.returnValue(Promise.resolve());

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
    spyOn(window, 'confirm').and.returnValue(true);
    supabaseServiceSpy.deleteBudgetTextBlock.and.returnValue(Promise.resolve());

    let deletedId: number | undefined;
    component.blockDeleted.subscribe(id => deletedId = id);

    await component['deleteBlock']();

    expect(supabaseServiceSpy.deleteBudgetTextBlock).toHaveBeenCalledWith(1);
    expect(deletedId).toBe(1);
  });

  it('should NOT delete block when cancelled', async () => {
    spyOn(window, 'confirm').and.returnValue(false);

    await component['deleteBlock']();

    expect(supabaseServiceSpy.deleteBudgetTextBlock).not.toHaveBeenCalled();
  });

  it('should add description section', async () => {
    const newSection = { id: 11, textBlockId: 1, orderIndex: 1, title: '', text: '' };
    supabaseServiceSpy.addSectionToTextBlock.and.returnValue(Promise.resolve(newSection));

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
    spyOn(window, 'confirm').and.returnValue(true);
    supabaseServiceSpy.deleteTextBlockSection.and.returnValue(Promise.resolve());

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
    supabaseServiceSpy.deleteTextBlockSection.and.returnValue(Promise.resolve());
    supabaseServiceSpy.addSectionToTextBlock.and.callFake((params: any) => Promise.resolve({
      id: 100 + params.orderIndex,
      textBlockId: params.textBlockId,
      orderIndex: params.orderIndex,
      title: params.title,
      text: params.text
    }));
    spyOn(window, 'confirm').and.returnValue(true);

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
      jasmine.any(Array)
    );
    expect(component['isCreatingTemplate']()).toBeFalse();
  });

  it('should delete selected template', async () => {
    spyOn(window, 'confirm').and.returnValue(true);
    component['selectedTemplateId'].set(1);

    await component['deleteSelectedTemplate']();

    expect(supabaseServiceSpy.deleteTextBlockTemplate).toHaveBeenCalledWith(1);
    expect(component['selectedTemplateId']()).toBeNull();
  });
});
