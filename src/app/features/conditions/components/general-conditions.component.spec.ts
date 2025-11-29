import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GeneralConditionsComponent } from './general-conditions.component';
import { SupabaseService } from '../../../services/supabase.service';

describe('GeneralConditionsComponent', () => {
  let component: GeneralConditionsComponent;
  let fixture: ComponentFixture<GeneralConditionsComponent>;
  let supabaseServiceSpy: jasmine.SpyObj<SupabaseService>;

  const mockTemplates = [
    { id: 1, name: 'Template 1' },
    { id: 2, name: 'Template 2' }
  ];

  const mockSections = [
    { id: 1, title: 'Section 1', text: 'Text 1', orderIndex: 0 },
    { id: 2, title: 'Section 2', text: 'Text 2', orderIndex: 1 }
  ];

  beforeEach(async () => {
    supabaseServiceSpy = jasmine.createSpyObj('SupabaseService', [
      'getConditionTemplates',
      'getConditionTemplateSections',
      'createConditionTemplate',
      'deleteConditionTemplate',
      'saveBudgetConditions'
    ]);
    supabaseServiceSpy.getConditionTemplates.and.returnValue(Promise.resolve(mockTemplates));
    supabaseServiceSpy.getConditionTemplateSections.and.returnValue(Promise.resolve(mockSections));
    supabaseServiceSpy.createConditionTemplate.and.returnValue(Promise.resolve({ id: 3, name: 'New Template' }));
    supabaseServiceSpy.deleteConditionTemplate.and.returnValue(Promise.resolve());
    supabaseServiceSpy.saveBudgetConditions.and.returnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      imports: [GeneralConditionsComponent],
      providers: [
        { provide: SupabaseService, useValue: supabaseServiceSpy }
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
    expect(component['editMode']()).toBeTrue();
    component['toggleEditMode']();
    expect(component['editMode']()).toBeTrue(); // Should stay true
  });

  it('should update title', () => {
    const input = document.createElement('input');
    input.value = 'New Title';
    const event = { target: input } as any;

    component['updateTitle'](event);

    expect(component['title']()).toBe('New Title');
    expect(component['hasUnsavedChanges']()).toBeTrue();
  });

  it('should change template and load sections', async () => {
    const event = { target: { value: '1' } } as any;

    await component['changeTemplate'](event);

    expect(component['selectedTemplateId']()).toBe(1);
    expect(supabaseServiceSpy.getConditionTemplateSections).toHaveBeenCalledWith(1);
    expect(component['conditions']().length).toBe(2);
    expect(component['hasUnsavedChanges']()).toBeTrue();
  });

  it('should add condition', () => {
    const initialLength = component['conditions']().length;
    component['addCondition']();

    expect(component['conditions']().length).toBe(initialLength + 1);
    expect(component['hasUnsavedChanges']()).toBeTrue();
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
    expect(component['hasUnsavedChanges']()).toBeTrue();
  });

  it('should delete condition', () => {
    // Add a condition first
    component['addCondition']();
    const initialLength = component['conditions']().length;
    const conditionToDelete = component['conditions']()[0];

    component['deleteCondition'](conditionToDelete.id);

    expect(component['conditions']().length).toBe(initialLength - 1);
    expect(component['hasUnsavedChanges']()).toBeTrue();
  });

  it('should reset to template when template is selected', async () => {
    // First select a template
    component['selectedTemplateId'].set(1);

    await component['resetToTemplate']();

    expect(supabaseServiceSpy.getConditionTemplateSections).toHaveBeenCalledWith(1);
    expect(component['conditions']().length).toBe(2);
  });

  it('should save changes', async () => {
    spyOn(component.titleChanged, 'emit');
    spyOn(component.conditionsChanged, 'emit');

    component['title'].set('Saved Title');
    await component['saveChanges']();

    expect(component.titleChanged.emit).toHaveBeenCalledWith('Saved Title');
    expect(component.conditionsChanged.emit).toHaveBeenCalled();
    expect(component['hasUnsavedChanges']()).toBeFalse();
    expect(component['originalTitle']()).toBe('Saved Title');
  });

  it('should discard changes', () => {
    const originalTitle = component['title']();
    component['title'].set('Changed Title');
    component['hasUnsavedChanges'].set(true);

    component['discardChanges']();

    expect(component['title']()).toBe(originalTitle);
    expect(component['hasUnsavedChanges']()).toBeFalse();
  });
});
