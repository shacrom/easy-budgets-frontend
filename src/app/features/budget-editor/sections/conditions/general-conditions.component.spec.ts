import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GeneralConditionsComponent } from './general-conditions.component';
import { SupabaseService } from '../../../../services/supabase.service';
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

describe('GeneralConditionsComponent', () => {
  let component: GeneralConditionsComponent;
  let fixture: ComponentFixture<GeneralConditionsComponent>;
  let supabaseServiceMock: {
    getConditionTemplates: Mock;
    getConditionTemplateSections: Mock;
    createConditionTemplate: Mock;
    deleteConditionTemplate: Mock;
    saveBudgetConditions: Mock;
  };

  const mockTemplates = [
    { id: 1, name: 'Template 1' },
    { id: 2, name: 'Template 2' }
  ];

  const mockSections = [
    { id: 1, title: 'Section 1', text: 'Text 1', orderIndex: 0 },
    { id: 2, title: 'Section 2', text: 'Text 2', orderIndex: 1 }
  ];

  beforeEach(async () => {
    supabaseServiceMock = {
      getConditionTemplates: vi.fn().mockResolvedValue(mockTemplates),
      getConditionTemplateSections: vi.fn().mockResolvedValue(mockSections),
      createConditionTemplate: vi.fn().mockResolvedValue({ id: 3, name: 'New Template' }),
      deleteConditionTemplate: vi.fn().mockResolvedValue(undefined),
      saveBudgetConditions: vi.fn().mockResolvedValue(undefined)
    };

    await TestBed.configureTestingModule({
      imports: [GeneralConditionsComponent],
      providers: [
        { provide: SupabaseService, useValue: supabaseServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GeneralConditionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have empty conditions by default', () => {
    expect(component['conditions']().length).toBe(0);
  });

  it('should always be in edit mode', () => {
    expect(component['editMode']()).toBe(true);
    component['toggleEditMode']();
    expect(component['editMode']()).toBe(true); // Should stay true
  });

  it('should update title', () => {
    const input = document.createElement('input');
    input.value = 'New Title';
    const event = { target: input } as any;

    component['updateTitle'](event);

    expect(component['title']()).toBe('New Title');
    expect(component['hasUnsavedChanges']()).toBe(true);
  });

  it('should change template and load sections', async () => {
    const event = { target: { value: '1' } } as any;

    await component['changeTemplate'](event);

    expect(component['selectedTemplateId']()).toBe(1);
    expect(supabaseServiceMock.getConditionTemplateSections).toHaveBeenCalledWith(1);
    expect(component['conditions']().length).toBe(2);
    expect(component['hasUnsavedChanges']()).toBe(true);
  });

  it('should add condition', () => {
    const initialLength = component['conditions']().length;
    component['addCondition']();

    expect(component['conditions']().length).toBe(initialLength + 1);
    expect(component['hasUnsavedChanges']()).toBe(true);
  });

  it('should update condition field', () => {
    // Add a condition first since we start with empty
    component['addCondition']();
    const condition = component['conditions']()[0];
    const input = document.createElement('input');
    input.value = 'Updated Text';
    const event = { target: input } as any;

    component['updateConditionField'](condition.id, 'text', event);

    const updatedCondition = component['conditions']().find(c => c.id === condition.id);
    expect(updatedCondition?.text).toBe('Updated Text');
    expect(component['hasUnsavedChanges']()).toBe(true);
  });

  it('should delete condition', () => {
    // Add a condition first
    component['addCondition']();
    const initialLength = component['conditions']().length;
    const conditionToDelete = component['conditions']()[0];

    component['deleteCondition'](conditionToDelete.id);

    expect(component['conditions']().length).toBe(initialLength - 1);
    expect(component['hasUnsavedChanges']()).toBe(true);
  });

  it('should reset to template when template is selected', async () => {
    // First select a template
    component['selectedTemplateId'].set(1);

    await component['resetToTemplate']();

    expect(supabaseServiceMock.getConditionTemplateSections).toHaveBeenCalledWith(1);
    expect(component['conditions']().length).toBe(2);
  });

  it('should save changes', async () => {
    const titleEmitSpy = vi.spyOn(component.titleChanged, 'emit');
    const conditionsEmitSpy = vi.spyOn(component.conditionsChanged, 'emit');

    component['title'].set('Saved Title');
    await component['saveChanges']();

    expect(titleEmitSpy).toHaveBeenCalledWith('Saved Title');
    expect(conditionsEmitSpy).toHaveBeenCalled();
    expect(component['hasUnsavedChanges']()).toBe(false);
    expect(component['originalTitle']()).toBe('Saved Title');
  });

  it('should discard changes', () => {
    const originalTitle = component['title']();
    component['title'].set('Changed Title');
    component['hasUnsavedChanges'].set(true);

    component['discardChanges']();

    expect(component['title']()).toBe(originalTitle);
    expect(component['hasUnsavedChanges']()).toBe(false);
  });
});
