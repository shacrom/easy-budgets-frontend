import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CompositeBlockComponent } from './composite-block.component';
import { CompositeBlock } from '../../../../models/composite-block.model';
import { SupabaseService } from '../../../../services/supabase.service';

describe('CompositeBlockComponent', () => {
  let component: CompositeBlockComponent;
  let fixture: ComponentFixture<CompositeBlockComponent>;
  let supabaseServiceSpy: {
    deleteCompositeBlock: ReturnType<typeof vi.fn>;
    addSectionToCompositeBlock: ReturnType<typeof vi.fn>;
    updateCompositeBlockSection: ReturnType<typeof vi.fn>;
    deleteCompositeBlockSection: ReturnType<typeof vi.fn>;
    updateCompositeBlock: ReturnType<typeof vi.fn>;
    uploadPublicAsset: ReturnType<typeof vi.fn>;
    getCompositeBlockTemplates: ReturnType<typeof vi.fn>;
    getCompositeBlockTemplateWithSections: ReturnType<typeof vi.fn>;
    createCompositeBlockTemplate: ReturnType<typeof vi.fn>;
    deleteCompositeBlockTemplate: ReturnType<typeof vi.fn>;
  };

  const mockBlock: CompositeBlock = {
    id: 1,
    budgetId: 1,
    sectionTitle: 'Test Section',
    heading: 'Test Header',
    descriptions: [
      { id: 10, compositeBlockId: 1, orderIndex: 0, title: 'Desc 1', text: 'Text 1' }
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
    supabaseServiceSpy = {
      deleteCompositeBlock: vi.fn(),
      addSectionToCompositeBlock: vi.fn(),
      updateCompositeBlockSection: vi.fn(),
      deleteCompositeBlockSection: vi.fn(),
      updateCompositeBlock: vi.fn(),
      uploadPublicAsset: vi.fn(),
      getCompositeBlockTemplates: vi.fn(),
      getCompositeBlockTemplateWithSections: vi.fn(),
      createCompositeBlockTemplate: vi.fn(),
      deleteCompositeBlockTemplate: vi.fn()
    };

    supabaseServiceSpy.getCompositeBlockTemplates.mockReturnValue(Promise.resolve(mockTemplates));
    supabaseServiceSpy.getCompositeBlockTemplateWithSections.mockReturnValue(Promise.resolve({
      id: 1,
      name: 'Template 1',
      provider: 'Provider 1',
      heading: 'Heading 1',
      sections: mockTemplateSections
    }));
    supabaseServiceSpy.createCompositeBlockTemplate.mockReturnValue(Promise.resolve({ id: 3, name: 'New Template' }));
    supabaseServiceSpy.deleteCompositeBlockTemplate.mockReturnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      imports: [CompositeBlockComponent],
      providers: [
        { provide: SupabaseService, useValue: supabaseServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CompositeBlockComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('block', mockBlock);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load templates on init', async () => {
    expect(supabaseServiceSpy.getCompositeBlockTemplates).toHaveBeenCalled();
    expect(component['templateOptions']().length).toBe(2);
  });

  it('should initialize sections from block input', () => {
    expect(component['sections']().length).toBe(1);
    expect(component['sections']()[0].title).toBe('Desc 1');
  });

  it('should delete block when confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    supabaseServiceSpy.deleteCompositeBlock.mockReturnValue(Promise.resolve());

    let deletedId: number | undefined;
    component.blockDeleted.subscribe((id: number) => deletedId = id);

    await component['deleteBlock']();

    expect(supabaseServiceSpy.deleteCompositeBlock).toHaveBeenCalledWith(1);
    expect(deletedId).toBe(1);
  });

  it('should NOT delete block when cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    await component['deleteBlock']();

    expect(supabaseServiceSpy.deleteCompositeBlock).not.toHaveBeenCalled();
  });

  it('should add description section', async () => {
    const newSection = { id: 11, compositeBlockId: 1, orderIndex: 1, title: '', text: '' };
    supabaseServiceSpy.addSectionToCompositeBlock.mockReturnValue(Promise.resolve(newSection));

    let updatedBlock: CompositeBlock | undefined;
    component.blockUpdated.subscribe((b: CompositeBlock) => updatedBlock = b);

    await component['addDescriptionSection']();

    expect(supabaseServiceSpy.addSectionToCompositeBlock).toHaveBeenCalled();
    expect(component['sections']().length).toBe(2);
    expect(updatedBlock?.descriptions?.length).toBe(2);
  });

  it('should update description section locally and emit event', () => {
    const event = { target: { value: 'New Title' } } as any;

    let updatedBlock: CompositeBlock | undefined;
    component.blockUpdated.subscribe((b: CompositeBlock) => updatedBlock = b);

    component['updateDescriptionSection'](10, 'title', event);

    expect(component['sections']()[0].title).toBe('New Title');
    expect(supabaseServiceSpy.updateCompositeBlockSection).not.toHaveBeenCalled();
    expect(updatedBlock).toBeDefined();
    expect(updatedBlock?.descriptions?.[0].title).toBe('New Title');
  });

  it('should delete description section', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    supabaseServiceSpy.deleteCompositeBlockSection.mockReturnValue(Promise.resolve());

    let updatedBlock: CompositeBlock | undefined;
    component.blockUpdated.subscribe((b: CompositeBlock) => updatedBlock = b);

    await component['deleteDescriptionSection'](10);

    expect(supabaseServiceSpy.deleteCompositeBlockSection).toHaveBeenCalledWith(10);
    expect(component['sections']().length).toBe(0);
    expect(updatedBlock?.descriptions?.length).toBe(0);
  });

  it('should update block field (heading)', () => {
    const event = { target: { value: 'New Heading' } } as any;

    let updatedBlock: CompositeBlock | undefined;
    component.blockUpdated.subscribe((b: CompositeBlock) => updatedBlock = b);

    component['updateBlockField']('heading', event);

    expect(updatedBlock?.heading).toBe('New Heading');
  });

  it('should update block field (subtotal) as number', () => {
    const event = { target: { value: '500' } } as any;

    let updatedBlock: CompositeBlock | undefined;
    component.blockUpdated.subscribe((b: CompositeBlock) => updatedBlock = b);

    component['updateBlockField']('subtotal', event);

    expect(updatedBlock?.subtotal).toBe(500);
  });

  it('should apply selected template', async () => {
    supabaseServiceSpy.deleteCompositeBlockSection.mockReturnValue(Promise.resolve());
    supabaseServiceSpy.addSectionToCompositeBlock.mockImplementation((params: any) => Promise.resolve({
      id: 100 + params.orderIndex,
      compositeBlockId: params.compositeBlockId,
      orderIndex: params.orderIndex,
      title: params.title,
      text: params.text
    }));
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    component['selectedTemplateId'].set(1);

    let updatedBlock: CompositeBlock | undefined;
    component.blockUpdated.subscribe((b: CompositeBlock) => updatedBlock = b);

    await component['applySelectedTemplate']();

    expect(supabaseServiceSpy.getCompositeBlockTemplateWithSections).toHaveBeenCalledWith(1);
    expect(supabaseServiceSpy.deleteCompositeBlockSection).toHaveBeenCalled();
    expect(supabaseServiceSpy.addSectionToCompositeBlock).toHaveBeenCalled();
    expect(updatedBlock?.descriptions?.length).toBe(2);
  });

  it('should save current block as template', async () => {
    component['newTemplateName'].set('My New Template');

    await component['saveAsTemplate']();

    expect(supabaseServiceSpy.createCompositeBlockTemplate).toHaveBeenCalledWith(
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

    expect(supabaseServiceSpy.deleteCompositeBlockTemplate).toHaveBeenCalledWith(1);
    expect(component['selectedTemplateId']()).toBeNull();
  });
});
